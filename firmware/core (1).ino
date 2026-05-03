/*
  core/core.ino

*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <SoftwareSerial.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_INA219.h>
#include <LiquidCrystal_I2C.h>
#include "driver/gpio.h"

// ================== WIFI + SERVER ==================
const char* ssid     = "ThiYen";
const char* password = "20052012";

const char* API_BASE = "https://api.smartfarm.k23bkdn.io.vn";

// Nếu HTTPS bị lỗi chứng chỉ, để true để ESP32 vẫn gửi được.
// Khi chạy sản phẩm chính thức có thể đổi sang false và dùng root CA.
const bool HTTPS_INSECURE = true;

// ================== RS485 NPK ==================
const int NPK_RX_PIN = 17; 
const int NPK_TX_PIN = 16;
const int RS485_DE_PIN = 5;
const int RS485_RE_PIN = 4;

SoftwareSerial mySerial(NPK_RX_PIN, NPK_TX_PIN);

// ================== I2C BH1750 + INA219 ==================
const int I2C_SDA_PIN = 21;
const int I2C_SCL_PIN = 22;

BH1750 lightMeter;
Adafruit_INA219 ina219;

bool bh1750Ready = false;
bool ina219Ready = false;

// ================== LCD 16x2 I2C ==================


const bool LCD_ENABLE = true;
const uint8_t LCD_ADDR = 0x27;
const uint8_t LCD_COLS = 16;
const uint8_t LCD_ROWS = 2;

LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
bool lcdReady = false;

String lcdCacheLine1 = "";
String lcdCacheLine2 = "";
String lcdEventLine1 = "";
String lcdEventLine2 = "";
bool lcdEventActive = false;
unsigned long lcdEventUntilMs = 0;
unsigned long lastLcdMs = 0;
unsigned long lastLcdPageMs = 0;
uint8_t lcdPage = 0;

const unsigned long LCD_REFRESH_MS = 2500;    
const unsigned long LCD_PAGE_MS    = 7000;    // tự đổi trang chậm hơn, tránh I2C chiếm CPU
const unsigned long LCD_IDLE_AFTER_BUTTON_MS = 1500; // sau khi nhấn nút/relay đổi, tạm ngưng LCD
const uint8_t LCD_PAGE_COUNT = 4;

// ================== BUTTON + RELAY ==================
const int btnPin1 = 13;
const int btnPin2 = 27;
const int btnPin3 = 26;
const int btnPin4 = 25;

const int ledPin1 = 12;
const int ledPin2 = 14;
const int ledPin3 = 32;
const int ledPin4 = 33;

bool btnStatus1 = false;
bool btnStatus2 = false;
bool btnStatus3 = false;
bool btnStatus4 = false;

bool btnRaw1 = false;
bool btnRaw2 = false;
bool btnRaw3 = false;
bool btnRaw4 = false;

unsigned long btnChange1 = 0;
unsigned long btnChange2 = 0;
unsigned long btnChange3 = 0;
unsigned long btnChange4 = 0;

bool relayState1 = false;
bool relayState2 = false;
bool relayState3 = false;
bool relayState4 = false;

// ================== BUTTON HOLD 1S / CHỐNG NHIỄU MOTOR ==================

const unsigned long RELAY_SYNC_RETRY_MS = 220;        // retry đồng bộ nhanh nhưng tránh spam server khi mạng chậm
const unsigned long POLL_AFTER_LOCAL_MS = 2500;       // tránh server trạng thái cũ ghi đè ngay sau khi bấm
const unsigned long BUTTON_SCAN_MS = 1;               // vẫn quét nút rất nhanh, không để cảm giác bị đơ
const unsigned long BUTTON_HOLD_MS = 1000;            // giữ nút đủ 1 giây thì mới bật/tắt relay
const unsigned long BUTTON_ACCEPT_LOCKOUT_MS = 700;   // khóa ngắn sau khi đã nhận 1 lệnh giữ nút
const unsigned long EMI_BLANK_AFTER_RELAY_MS = 350;   // bỏ qua nhiễu ngắn ngay sau khi relay/motor đổi trạng thái
const uint32_t BUTTON_ISR_DEBOUNCE_US = 180000;       // NC không dùng (đã bỏ attachInterrupt   r)

portMUX_TYPE buttonMux = portMUX_INITIALIZER_UNLOCKED;

volatile bool isrRelayState1 = false;
volatile bool isrRelayState2 = false;
volatile bool isrRelayState3 = false;
volatile bool isrRelayState4 = false;

volatile bool btnIrqDirty1 = false;
volatile bool btnIrqDirty2 = false;
volatile bool btnIrqDirty3 = false;
volatile bool btnIrqDirty4 = false;

volatile uint32_t btnLastUs1 = 0;
volatile uint32_t btnLastUs2 = 0;
volatile uint32_t btnLastUs3 = 0;
volatile uint32_t btnLastUs4 = 0;

bool pendingRelaySync = false;
unsigned long lastRelaySyncTryMs = 0;
unsigned long lastLocalButtonMs = 0;
unsigned long lastButtonScanMs = 0;
unsigned long ignoreButtonsUntilMs = 0;
unsigned long lastAcceptedButtonMs = 0;

struct HoldButtonState {
  bool pressed = false;        
  unsigned long pressedAt = 0;  
  bool actionDone = false;       
};

HoldButtonState holdBtn1;
HoldButtonState holdBtn2;
HoldButtonState holdBtn3;
HoldButtonState holdBtn4;

// ================== HTTP CLIENT ==================
WiFiClient normalClient;
WiFiClientSecure secureClient;

// ================== NTP ==================
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 7 * 3600, 60000);

// ================== TIMER ==================
unsigned long lastSensorMs = 0;
unsigned long lastModeMs   = 0;
unsigned long lastStatusMs = 0;
unsigned long lastWifiMs   = 0;

const unsigned long SENSOR_INTERVAL_MS = 60000;  // gửi sensor thưa 60s 1 lần để ESP32 ưu tiên nút nhấn
const unsigned long MODE_INTERVAL_MS   = 5000;   // mode không cần hỏi liên tục
const unsigned long STATUS_INTERVAL_MS = 450;    // Web điều khiển relay gần realtime

int currentMode = 0; // 0 = Manual, 1 = Auto

// ================== SENSOR DATA ==================
struct SensorData {
  float soilTemperature = 0;
  float soilHumidity = 0;
  float soilPH = 0;
  float lux = 0;
  float voltageV = 0;
  float currentA = 0;
  float powerW = 0;

  uint16_t soilConductivity = 0;
  uint16_t nitrogen = 0;
  uint16_t phosphorus = 0;
  uint16_t potassium = 0;

  bool npkValid = false;
  bool bh1750Valid = false;
  bool ina219Valid = false;
};

SensorData sensor;

// ================== HELPER URL ==================
String apiUrl(const String& path) {
  String base = String(API_BASE);
  if (base.endsWith("/")) base.remove(base.length() - 1);
  return base + path;
}

bool isHttpsUrl(const String& url) {
  return url.startsWith("https://") || url.startsWith("HTTPS://");
}

int httpGET(const String& url, String& payload, uint32_t timeoutMs = 6000) {
  payload = "";

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("HTTP skip: WiFi not connected");
    return -1000;
  }

  HTTPClient http;
  http.setTimeout(timeoutMs);
  http.setReuse(false);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setRedirectLimit(4);

  bool okBegin = false;

  if (isHttpsUrl(url)) {
    if (HTTPS_INSECURE) {
      secureClient.setInsecure();
    }
    okBegin = http.begin(secureClient, url);
  } else {
    okBegin = http.begin(normalClient, url);
  }

  if (!okBegin) {
    Serial.println("HTTP begin failed");
    return -1001;
  }

  http.addHeader("Accept", "application/json");
  http.addHeader("Cache-Control", "no-cache");
  http.addHeader("Connection", "close");
  int code = http.GET();

  if (code <= 0) {
    Serial.print("HTTP GET error: ");
    Serial.println(http.errorToString(code));
  }

  if (code > 0) {
    payload = http.getString();
  }

  http.end();
  return code;
}

String fmt(float value, uint8_t digits) {
  if (isnan(value) || isinf(value)) return "0";
  return String((double)value, (unsigned int)digits);
}

// ================== LCD HELPER PROTOTYPES ==================
String lcdPad16(String s);
String lcdRelayLine();
String lcdRelayNameByPin(int pin);
String lcdRelayNameByLedName(const char* ledName);
void lcdInit();
void lcdPrint2(const String& line1, const String& line2);
void lcdEvent(const String& line1, const String& line2, unsigned long durationMs = 1800);
bool lcdCanWriteNow();
void lcdService();

// ================== BUTTON ISR FUNCTIONS ==================
void IRAM_ATTR handleButtonInterrupt(volatile bool &relayShadow,
                                     volatile bool &dirtyFlag,
                                     volatile uint32_t &lastUs,
                                     gpio_num_t relayGpio) {
  uint32_t now = micros();

  portENTER_CRITICAL_ISR(&buttonMux);
  if ((uint32_t)(now - lastUs) >= BUTTON_ISR_DEBOUNCE_US) {
    lastUs = now;
    relayShadow = !relayShadow;
    gpio_set_level(relayGpio, relayShadow ? 1 : 0);
    dirtyFlag = true;
  }
  portEXIT_CRITICAL_ISR(&buttonMux);
}

void IRAM_ATTR button1ISR() {
  handleButtonInterrupt(isrRelayState1, btnIrqDirty1, btnLastUs1, (gpio_num_t)ledPin1);
}

void IRAM_ATTR button2ISR() {
  handleButtonInterrupt(isrRelayState2, btnIrqDirty2, btnLastUs2, (gpio_num_t)ledPin2);
}

void IRAM_ATTR button3ISR() {
  handleButtonInterrupt(isrRelayState3, btnIrqDirty3, btnLastUs3, (gpio_num_t)ledPin3);
}

void IRAM_ATTR button4ISR() {
  handleButtonInterrupt(isrRelayState4, btnIrqDirty4, btnLastUs4, (gpio_num_t)ledPin4);
}

bool hasButtonInterruptWaiting() {
  bool waiting;
  portENTER_CRITICAL(&buttonMux);
  waiting = btnIrqDirty1 || btnIrqDirty2 || btnIrqDirty3 || btnIrqDirty4;
  portEXIT_CRITICAL(&buttonMux);
  return waiting;
}

// ================== WIFI ==================
void connectWiFi() {
  Serial.println();
  Serial.println("Connecting to WiFi...");
  lcdPrint2("Ket noi WiFi", String(ssid));
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
    lcdPrint2("WiFi OK", WiFi.localIP().toString());
    delay(800);
  } else {
    Serial.println("WiFi connect timeout. Will retry in loop.");
    lcdPrint2("WiFi timeout", "Se thu lai...");
    delay(800);
  }
}

void keepWiFi() {
  if (millis() - lastWifiMs < 5000) return;
  lastWifiMs = millis();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost. Reconnecting...");
    lcdEvent("Mat WiFi", "Dang ket noi...", 2500);
    WiFi.disconnect();
    WiFi.begin(ssid, password);
  }
}

// ================== SETUP ==================
void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(btnPin1, INPUT_PULLUP);
  pinMode(btnPin2, INPUT_PULLUP);
  pinMode(btnPin3, INPUT_PULLUP);
  pinMode(btnPin4, INPUT_PULLUP);

  pinMode(ledPin1, OUTPUT);
  pinMode(ledPin2, OUTPUT);
  pinMode(ledPin3, OUTPUT);
  pinMode(ledPin4, OUTPUT);

  digitalWrite(ledPin1, LOW);
  digitalWrite(ledPin2, LOW);
  digitalWrite(ledPin3, LOW);
  digitalWrite(ledPin4, LOW);

  portENTER_CRITICAL(&buttonMux);
  isrRelayState1 = relayState1;
  isrRelayState2 = relayState2;
  isrRelayState3 = relayState3;
  isrRelayState4 = relayState4;
  portEXIT_CRITICAL(&buttonMux);

  // Không attachInterrupt cho nút vì tải motor/bơm có thể tạo nhiễu cạnh giả.
  // Nút sẽ được quét nhanh trong loop bằng processButtonsRobust().

  pinMode(RS485_DE_PIN, OUTPUT);
  pinMode(RS485_RE_PIN, OUTPUT);
  digitalWrite(RS485_DE_PIN, LOW);
  digitalWrite(RS485_RE_PIN, LOW);

  mySerial.begin(4800);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  lcdInit();

  bh1750Ready = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  Serial.print("BH1750: ");
  Serial.println(bh1750Ready ? "OK" : "NOT FOUND");

  ina219Ready = ina219.begin();
  if (ina219Ready) {
    ina219.setCalibration_32V_2A();
  }
  Serial.print("INA219: ");
  Serial.println(ina219Ready ? "OK" : "NOT FOUND");

  lcdEvent(String("BH:") + (bh1750Ready ? "OK" : "NO") + " INA:" + (ina219Ready ? "OK" : "NO"),
           "LCD san sang", 1800);

  connectWiFi();
  timeClient.begin();

  lastSensorMs = millis();  // không đọc sensor ngay lúc khởi động, ưu tiên nút nhấn trước
  lastModeMs = millis() - MODE_INTERVAL_MS;
  lastStatusMs = millis() - STATUS_INTERVAL_MS;
}

// ================== LOOP ==================
void loop() {
  serviceFastButtons();

  keepWiFi();
  serviceFastButtons();

  syncPendingRelayToServer();
  serviceFastButtons();


  if (pendingRelaySync) {
    delay(1);
    return;
  }

  // Gửi sensor thưa hơn. Sensor không được ưu tiên hơn nút nhấn.
  if (millis() - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = millis();

    readAllSensors();
    serviceFastButtons();

    if (!pendingRelaySync) {
      printSensorData();
      sendSensorData();
    } else {
      Serial.println("Skip send sensor: uu tien nut vat ly / relay sync");
    }
  }

  serviceFastButtons();

  if (!pendingRelaySync && millis() - lastModeMs >= MODE_INTERVAL_MS) {
    lastModeMs = millis();
    currentMode = getCheDo();
  }

  serviceFastButtons();

  if (!pendingRelaySync) {
    if (currentMode == 1) {
      hoatDongTheoThoiGian();
    } else {
      if ((millis() - lastLocalButtonMs >= POLL_AFTER_LOCAL_MS) && millis() - lastStatusMs >= STATUS_INTERVAL_MS) {
        lastStatusMs = millis();
        getStatusDevice();
      }
    }
  }

  lcdService();

  delay(1);
}

void serviceFastButtons() {
  // ko đặt HTTP blocking trong hàm này.
  processButtonsRobust();
}

// ================== READ SENSOR ==================
void readAllSensors() {
  sensor.npkValid = readNPK(sensor);

  if (bh1750Ready) {
    float lux = lightMeter.readLightLevel();
    if (!isnan(lux) && lux >= 0) {
      sensor.lux = lux;
      sensor.bh1750Valid = true;
    } else {
      sensor.bh1750Valid = false;
    }
  } else {
    sensor.lux = 0;
    sensor.bh1750Valid = false;
  }

  if (ina219Ready) {
    float busVoltage = ina219.getBusVoltage_V();
    float currentmA  = ina219.getCurrent_mA();
    float powermW    = ina219.getPower_mW();

    sensor.voltageV = busVoltage;
    sensor.currentA = currentmA / 1000.0;
    sensor.powerW   = powermW / 1000.0;
    sensor.ina219Valid = true;
  } else {
    sensor.voltageV = 0;
    sensor.currentA = 0;
    sensor.powerW = 0;
    sensor.ina219Valid = false;
  }
}

bool readNPK(SensorData& out) {
  byte queryData[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x07, 0x04, 0x08};
  byte receivedData[19];

  while (mySerial.available()) mySerial.read();

  digitalWrite(RS485_DE_PIN, HIGH);
  digitalWrite(RS485_RE_PIN, HIGH);
  delay(2);

  mySerial.write(queryData, sizeof(queryData));
  mySerial.flush();

  digitalWrite(RS485_DE_PIN, LOW);
  digitalWrite(RS485_RE_PIN, LOW);

  unsigned long start = millis();
  int idx = 0;

  while (millis() - start < 850 && idx < 19) {
    // Nếu đang đọc NPK mà người dùng nhấn nút thật, xử lý local ngay rồi thoát để sync server.
    serviceFastButtons();
    if (pendingRelaySync) {
      Serial.println("NPK read interrupted: uu tien nut vat ly");
      return false;
    }

    if (mySerial.available()) {
      receivedData[idx++] = mySerial.read();
    }
    delay(1);
  }

  if (idx < 19) {
    Serial.println("NPK timeout / not enough data");
    return false;
  }

  if (receivedData[0] != 0x01 || receivedData[1] != 0x03) {
    Serial.println("NPK response header invalid");
    return false;
  }

  uint16_t rawHumidity     = (receivedData[3] << 8) | receivedData[4];
  uint16_t rawTemperature  = (receivedData[5] << 8) | receivedData[6];
  uint16_t rawConductivity = (receivedData[7] << 8) | receivedData[8];
  uint16_t rawPH           = (receivedData[9] << 8) | receivedData[10];

  out.soilHumidity     = rawHumidity / 10.0;
  out.soilTemperature  = rawTemperature / 10.0;
  out.soilConductivity = rawConductivity;
  out.soilPH           = rawPH / 10.0;
  out.nitrogen         = (receivedData[11] << 8) | receivedData[12];
  out.phosphorus       = (receivedData[13] << 8) | receivedData[14];
  out.potassium        = (receivedData[15] << 8) | receivedData[16];

  return true;
}

void printSensorData() {
  Serial.println("===== SENSOR DATA =====");
  Serial.print("NPK valid: "); Serial.println(sensor.npkValid ? "YES" : "NO");
  Serial.print("Temp: "); Serial.print(sensor.soilTemperature); Serial.println(" C");
  Serial.print("Humi: "); Serial.print(sensor.soilHumidity); Serial.println(" %");
  Serial.print("EC: "); Serial.println(sensor.soilConductivity);
  Serial.print("pH: "); Serial.println(sensor.soilPH);
  Serial.print("NPK: ");
  Serial.print(sensor.nitrogen); Serial.print(" / ");
  Serial.print(sensor.phosphorus); Serial.print(" / ");
  Serial.println(sensor.potassium);

  Serial.print("BH1750 valid: "); Serial.println(sensor.bh1750Valid ? "YES" : "NO");
  Serial.print("Lux: "); Serial.print(sensor.lux); Serial.println(" lx");

  Serial.print("INA219 valid: "); Serial.println(sensor.ina219Valid ? "YES" : "NO");
  Serial.print("Voltage: "); Serial.print(sensor.voltageV, 3); Serial.println(" V");
  Serial.print("Current: "); Serial.print(sensor.currentA, 4); Serial.println(" A");
  Serial.print("Power: "); Serial.print(sensor.powerW, 3); Serial.println(" W");
  Serial.println("=======================");
}

// ================== SEND SENSOR ==================
void sendSensorData() {
  String url = apiUrl("/database/update.php");

  url += "?soilTemperature=" + fmt(sensor.soilTemperature, 2);
  url += "&soilHumidity=" + fmt(sensor.soilHumidity, 2);
  url += "&soilConductivity=" + String(sensor.soilConductivity);
  url += "&soilPH=" + fmt(sensor.soilPH, 2);
  url += "&nitrogen=" + String(sensor.nitrogen);
  url += "&phosphorus=" + String(sensor.phosphorus);
  url += "&potassium=" + String(sensor.potassium);

  url += "&lux=" + fmt(sensor.lux, 2);
  url += "&voltage_v=" + fmt(sensor.voltageV, 3);
  url += "&current_a=" + fmt(sensor.currentA, 4);
  url += "&power_w=" + fmt(sensor.powerW, 3);

  url += "&npk_valid=" + String(sensor.npkValid ? 1 : 0);
  url += "&bh1750_valid=" + String(sensor.bh1750Valid ? 1 : 0);
  url += "&ina219_valid=" + String(sensor.ina219Valid ? 1 : 0);

  Serial.print("GET: ");
  Serial.println(url);

  String payload;
  int code = httpGET(url, payload, 900);

  Serial.print("HTTP code: ");
  Serial.println(code);
  Serial.print("Response: ");
  Serial.println(payload);

  if (code >= 200 && code < 300) {
    lcdEvent("Gui sensor OK", String("HTTP ") + String(code), 1200);
  } else {
    lcdEvent("Gui sensor loi", String("HTTP ") + String(code), 1800);
  }
}

// ================== MODE ==================
int getCheDo() {
  String payload;
  int code = httpGET(apiUrl("/database/getmode.php"), payload, 900);

  if (code > 0) {
    payload.trim();

    if (payload.startsWith("{")) {
      StaticJsonDocument<128> doc;
      if (deserializeJson(doc, payload) == DeserializationError::Ok) {
        int mode = doc["mode"] | 0;
        Serial.print("Mode JSON: ");
        Serial.println(mode);
        return mode ? 1 : 0;
      }
    }

    int mode = payload.toInt();
    Serial.print("Mode: ");
    Serial.println(mode);
    return mode ? 1 : 0;
  }

  Serial.print("Get mode failed, HTTP code: ");
  Serial.println(code);
  return currentMode;
}

// ================== MANUAL CONTROL FROM WEB ==================
void getStatusDevice() {
  String payload;
  int code = httpGET(apiUrl("/database/getLedStatus.php"), payload, 800);

  if (code <= 0) {
    Serial.print("Get LED status failed, HTTP code: ");
    Serial.println(code);
    return;
  }

  Serial.print("JSON Receive: ");
  Serial.println(payload);

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload);

  if (err) {
    Serial.print("Parse relay JSON failed: ");
    Serial.println(err.c_str());
    return;
  }

  bool s1 = (int)(doc["led1"] | 0);
  bool s2 = (int)(doc["led2"] | 0);
  bool s3 = (int)(doc["led3"] | 0);
  bool s4 = (int)(doc["led4"] | 0);

  setRelayLocal(ledPin1, relayState1, s1);
  setRelayLocal(ledPin2, relayState2, s2);
  setRelayLocal(ledPin3, relayState3, s3);
  setRelayLocal(ledPin4, relayState4, s4);
}


// ================== BUTTON HOLD 1S PROCESSING ==================
void setButtonIgnoreWindow(unsigned long durationMs) {
  unsigned long until = millis() + durationMs;
  if ((long)(until - ignoreButtonsUntilMs) > 0) {
    ignoreButtonsUntilMs = until;
  }
}

uint8_t countRawPressedButtons() {
  uint8_t count = 0;
  if (digitalRead(btnPin1) == LOW) count++;
  if (digitalRead(btnPin2) == LOW) count++;
  if (digitalRead(btnPin3) == LOW) count++;
  if (digitalRead(btnPin4) == LOW) count++;
  return count;
}

void updateHoldButtonState(HoldButtonState &st, int btnPin, unsigned long now) {
  bool isPressed = (digitalRead(btnPin) == LOW);

  if (isPressed) {
    if (!st.pressed) {
      st.pressed = true;
      st.pressedAt = now;
      st.actionDone = false;
    }
  } else {
    // Nhả nút thì cho phép lần giữ kế tiếp được toggle lại.
    st.pressed = false;
    st.pressedAt = 0;
    st.actionDone = false;
  }
}

unsigned long holdDurationMs(const HoldButtonState &st, unsigned long now) {
  if (!st.pressed || st.pressedAt == 0) return 0;
  return now - st.pressedAt;
}

bool holdReady(const HoldButtonState &st, unsigned long now) {
  return st.pressed && !st.actionDone && holdDurationMs(st, now) >= BUTTON_HOLD_MS;
}

void markAllCurrentlyPressedAsHandled() {
  if (holdBtn1.pressed) holdBtn1.actionDone = true;
  if (holdBtn2.pressed) holdBtn2.actionDone = true;
  if (holdBtn3.pressed) holdBtn3.actionDone = true;
  if (holdBtn4.pressed) holdBtn4.actionDone = true;
}

void resetButtonFiltersToCurrentRaw() {
  // Giữ lại hàm này để các đoạn code cũ/LCD còn gọi được.
  unsigned long now = millis();
  holdBtn1.pressed = (digitalRead(btnPin1) == LOW);
  holdBtn2.pressed = (digitalRead(btnPin2) == LOW);
  holdBtn3.pressed = (digitalRead(btnPin3) == LOW);
  holdBtn4.pressed = (digitalRead(btnPin4) == LOW);

  holdBtn1.pressedAt = holdBtn1.pressed ? now : 0;
  holdBtn2.pressedAt = holdBtn2.pressed ? now : 0;
  holdBtn3.pressedAt = holdBtn3.pressed ? now : 0;
  holdBtn4.pressedAt = holdBtn4.pressed ? now : 0;

  holdBtn1.actionDone = false;
  holdBtn2.actionDone = false;
  holdBtn3.actionDone = false;
  holdBtn4.actionDone = false;
}

void acceptPhysicalButton(int ledPin, bool &relayState, const char* ledName) {
  bool newStatus = !relayState;
  setRelayLocal(ledPin, relayState, newStatus);

  pendingRelaySync = true;
  lastLocalButtonMs = millis();
  lastStatusMs = millis();
  lastAcceptedButtonMs = millis();
  setButtonIgnoreWindow(BUTTON_ACCEPT_LOCKOUT_MS);

  Serial.print("Physical hold accepted -> ");
  Serial.print(ledName);
  Serial.print(": ");
  Serial.println(newStatus ? "ON" : "OFF");

  lcdEvent(String("Giu nut ") + lcdRelayNameByLedName(ledName) + (newStatus ? " BAT" : " TAT"),
           "Sync server...", 1800);

  Serial.print("Relay local state: ");
  Serial.print(relayState1 ? 1 : 0); Serial.print("/");
  Serial.print(relayState2 ? 1 : 0); Serial.print("/");
  Serial.print(relayState3 ? 1 : 0); Serial.print("/");
  Serial.println(relayState4 ? 1 : 0);
}

void processButtonsRobust() {
  unsigned long now = millis();

  if ((now - lastButtonScanMs) < BUTTON_SCAN_MS) return;
  lastButtonScanMs = now;

  updateHoldButtonState(holdBtn1, btnPin1, now);
  updateHoldButtonState(holdBtn2, btnPin2, now);
  updateHoldButtonState(holdBtn3, btnPin3, now);
  updateHoldButtonState(holdBtn4, btnPin4, now);

  // Sau khi relay/motor vừa đổi trạng thái thì chờ ngắn để tránh xung nhiễu.
  // Vẫn cập nhật trạng thái nút ở trên, nhưng chưa nhận lệnh mới.
  if ((long)(now - ignoreButtonsUntilMs) < 0) {
    return;
  }

  bool r1 = holdReady(holdBtn1, now);
  bool r2 = holdReady(holdBtn2, now);
  bool r3 = holdReady(holdBtn3, now);
  bool r4 = holdReady(holdBtn4, now);

  uint8_t readyCount = 0;
  if (r1) readyCount++;
  if (r2) readyCount++;
  if (r3) readyCount++;
  if (r4) readyCount++;

  if (readyCount == 0) return;

  if (readyCount > 1) {

    markAllCurrentlyPressedAsHandled();
    Serial.println("Button hold ignored: multiple buttons held 1s");
    lcdEvent("Nhieu nut dang giu", "Bo qua lenh", 1800);
    setButtonIgnoreWindow(BUTTON_ACCEPT_LOCKOUT_MS);
    return;
  }

  if ((now - lastAcceptedButtonMs) < BUTTON_ACCEPT_LOCKOUT_MS) return;

  if (r1) {
    holdBtn1.actionDone = true;
    markAllCurrentlyPressedAsHandled();
    acceptPhysicalButton(ledPin1, relayState1, "led1");
  } else if (r2) {
    holdBtn2.actionDone = true;
    markAllCurrentlyPressedAsHandled();
    acceptPhysicalButton(ledPin2, relayState2, "led2");
  } else if (r3) {
    holdBtn3.actionDone = true;
    markAllCurrentlyPressedAsHandled();
    acceptPhysicalButton(ledPin3, relayState3, "led3");
  } else if (r4) {
    holdBtn4.actionDone = true;
    markAllCurrentlyPressedAsHandled();
    acceptPhysicalButton(ledPin4, relayState4, "led4");
  }
}

// ================== BUTTON INTERRUPT PROCESSING - KHONG DUNG NUA ==================
void processButtonInterruptEvents() {
  bool d1, d2, d3, d4;
  bool s1, s2, s3, s4;

  portENTER_CRITICAL(&buttonMux);
  d1 = btnIrqDirty1;
  d2 = btnIrqDirty2;
  d3 = btnIrqDirty3;
  d4 = btnIrqDirty4;

  s1 = isrRelayState1;
  s2 = isrRelayState2;
  s3 = isrRelayState3;
  s4 = isrRelayState4;

  btnIrqDirty1 = false;
  btnIrqDirty2 = false;
  btnIrqDirty3 = false;
  btnIrqDirty4 = false;
  portEXIT_CRITICAL(&buttonMux);

  if (!(d1 || d2 || d3 || d4)) return;

  relayState1 = s1;
  relayState2 = s2;
  relayState3 = s3;
  relayState4 = s4;

  pendingRelaySync = true;
  lastLocalButtonMs = millis();
  lastStatusMs = millis();

  Serial.print("Button IRQ -> relay: ");
  Serial.print(relayState1 ? 1 : 0); Serial.print("/");
  Serial.print(relayState2 ? 1 : 0); Serial.print("/");
  Serial.print(relayState3 ? 1 : 0); Serial.print("/");
  Serial.println(relayState4 ? 1 : 0);
}

void syncPendingRelayToServer() {
  if (!pendingRelaySync) return;
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - lastRelaySyncTryMs < RELAY_SYNC_RETRY_MS) return;

  lastRelaySyncTryMs = millis();

  if (sendAllRelayStatesToServer(900)) {
    pendingRelaySync = false;
    lastLocalButtonMs = millis();
    lastStatusMs = millis();
    Serial.println("Button relay sync OK + server confirmed");
    lcdEvent("Server OK", lcdRelayLine(), 1200);
  } else {
    // Giu pendingRelaySync = true de retry lien tuc. Khong cho getStatusDevice lay trang thai cu ghi de phan cung.
    static unsigned long lastLcdSyncFailMs = 0;
    lastStatusMs = millis();
    Serial.println("Button relay sync failed / not confirmed, will retry");
    if (millis() - lastLcdSyncFailMs > 2500) {
      lastLcdSyncFailMs = millis();
      lcdEvent("Sync relay loi", "Dang thu lai...", 1600);
    }
  }
}

bool sendAllRelayStatesToServer(uint32_t timeoutMs) {
  String url = apiUrl("/database/update.php");
  url += "?led1=" + String(relayState1 ? 1 : 0);
  url += "&led2=" + String(relayState2 ? 1 : 0);
  url += "&led3=" + String(relayState3 ? 1 : 0);
  url += "&led4=" + String(relayState4 ? 1 : 0);
  url += "&source=esp32_fast_button";
  url += "&device_ms=" + String(millis());
  url += "&_=" + String(millis());

  String payload;
  int code = httpGET(url, payload, timeoutMs);

  Serial.print("SYNC RELAY code: ");
  Serial.println(code);
  Serial.print("SYNC RELAY response: ");
  Serial.println(payload);

  if (code < 200 || code >= 300) return false;

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.print("SYNC RELAY JSON invalid: ");
    Serial.println(err.c_str());
    return false;
  }

  if (!((bool)(doc["ok"] | false))) {
    Serial.println("SYNC RELAY server ok=false");
    return false;
  }

  bool c1 = ((int)(doc["led1"] | -1)) == (relayState1 ? 1 : 0);
  bool c2 = ((int)(doc["led2"] | -1)) == (relayState2 ? 1 : 0);
  bool c3 = ((int)(doc["led3"] | -1)) == (relayState3 ? 1 : 0);
  bool c4 = ((int)(doc["led4"] | -1)) == (relayState4 ? 1 : 0);

  if (!(c1 && c2 && c3 && c4)) {
    Serial.println("SYNC RELAY server echo mismatch, retry");
    return false;
  }

  return true;
}

void syncRelayShadowFromLocalState(int pin, bool state) {
  portENTER_CRITICAL(&buttonMux);
  if (pin == ledPin1) isrRelayState1 = state;
  else if (pin == ledPin2) isrRelayState2 = state;
  else if (pin == ledPin3) isrRelayState3 = state;
  else if (pin == ledPin4) isrRelayState4 = state;
  portEXIT_CRITICAL(&buttonMux);
}

// ================== BUTTON ==================
void checkButtonState(int pin, bool &stablePressed, bool &lastRawPressed, unsigned long &lastChangeMs,
                      int ledPin, bool &relayState, const char* ledName) {
  const unsigned long DEBOUNCE_MS = 40;
  unsigned long now = millis();
  bool rawPressed = (digitalRead(pin) == LOW); // INPUT_PULLUP: nhấn = LOW

  if (rawPressed != lastRawPressed) {
    lastRawPressed = rawPressed;
    lastChangeMs = now;
  }

  if ((now - lastChangeMs) < DEBOUNCE_MS) return;

  if (rawPressed != stablePressed) {
    stablePressed = rawPressed;

    // Chỉ toggle ở cạnh nhấn xuống, không chờ người dùng nhả nút.
    if (stablePressed) {
      bool newStatus = !relayState;
      setRelayLocal(ledPin, relayState, newStatus); // Relay đổi ngay lập tức.

      Serial.print(ledName);
      Serial.print(": ");
      Serial.println(newStatus ? "ON" : "OFF");

      // Gửi lên  control.php 
      sendButtonState(ledName, newStatus);

      // Tránh vừa bấm nút xong lại bị lần poll kế tiếp lấy trạng thái cũ ghi đè quá sớm.
      lastStatusMs = millis();
    }
  }
}

void sendButtonState(const char* ledName, bool status) {
  String url = apiUrl("/database/update.php");
  url += "?led=" + String(ledName);
  url += "&status=" + String(status ? 1 : 0);

  Serial.print("GET: ");
  Serial.println(url);

  String payload;
  int code = httpGET(url, payload, 800);

  Serial.print("HTTP code: ");
  Serial.println(code);
  Serial.print("Response: ");
  Serial.println(payload);
}

void setRelayLocal(int pin, bool &oldState, bool newState) {
  if (oldState == newState) {
    syncRelayShadowFromLocalState(pin, newState);
    return;
  }
  oldState = newState;
  digitalWrite(pin, newState ? HIGH : LOW);
  syncRelayShadowFromLocalState(pin, newState);

  // Khi relay/motor vừa đổi trạng thái, nguồn và dây tín hiệu dễ bị nhiễu.
  // Bỏ qua nút trong một khoảng ngắn để tránh tự nhảy relay ngược lại.
  setButtonIgnoreWindow(EMI_BLANK_AFTER_RELAY_MS);

  lcdEvent(lcdRelayNameByPin(pin) + String(newState ? " BAT" : " TAT"), lcdRelayLine(), 1400);
}

// ================== LCD 16x2 DISPLAY ==================
String lcdPad16(String s) {
  s.replace("\r", " ");
  s.replace("\n", " ");
  if (s.length() > LCD_COLS) {
    return s.substring(0, LCD_COLS);
  }
  while (s.length() < LCD_COLS) s += " ";
  return s;
}

String lcdRelayLine() {
  String s = "R:";
  s += relayState1 ? "1" : "0";
  s += relayState2 ? "1" : "0";
  s += relayState3 ? "1" : "0";
  s += relayState4 ? "1" : "0";
  s += currentMode == 1 ? " AUTO" : " MAN";
  return s;
}

String lcdRelayNameByPin(int pin) {
  if (pin == ledPin1) return "R1";
  if (pin == ledPin2) return "R2";
  if (pin == ledPin3) return "R3";
  if (pin == ledPin4) return "R4";
  return "RELAY";
}

String lcdRelayNameByLedName(const char* ledName) {
  if (strcmp(ledName, "led1") == 0) return "R1";
  if (strcmp(ledName, "led2") == 0) return "R2";
  if (strcmp(ledName, "led3") == 0) return "R3";
  if (strcmp(ledName, "led4") == 0) return "R4";
  return "RELAY";
}

void lcdInit() {
  if (!LCD_ENABLE) return;

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcdReady = true;
  lcdPrint2("GETPOST ESP32", "Khoi dong...");
}

void lcdPrint2(const String& line1, const String& line2) {
  if (!LCD_ENABLE || !lcdReady) return;

  String l1 = lcdPad16(line1);
  String l2 = lcdPad16(line2);

  if (l1 == lcdCacheLine1 && l2 == lcdCacheLine2) return;

  if (l1 != lcdCacheLine1) {
    lcd.setCursor(0, 0);
    lcd.print(l1);
    lcdCacheLine1 = l1;
  }

  if (l2 != lcdCacheLine2) {
    lcd.setCursor(0, 1);
    lcd.print(l2);
    lcdCacheLine2 = l2;
  }
}

void lcdEvent(const String& line1, const String& line2, unsigned long durationMs) {
  if (!LCD_ENABLE || !lcdReady) return;

  lcdEventLine1 = line1;
  lcdEventLine2 = line2;
  lcdEventUntilMs = millis() + durationMs;
  lcdEventActive = true;
}

bool lcdCanWriteNow() {
  unsigned long now = millis();

  if (pendingRelaySync) return false;
  if (countRawPressedButtons() > 0) return false;
  if ((long)(now - ignoreButtonsUntilMs) < 0) return false;
  if ((now - lastAcceptedButtonMs) < LCD_IDLE_AFTER_BUTTON_MS) return false;
  if ((now - lastLocalButtonMs) < LCD_IDLE_AFTER_BUTTON_MS) return false;

  return true;
}

void lcdService() {
  if (!LCD_ENABLE || !lcdReady) return;

  unsigned long now = millis();
  if (now - lastLcdMs < LCD_REFRESH_MS) return;


  if (!lcdCanWriteNow()) return;

  lastLcdMs = now;

  if (lcdEventActive) {
    if ((long)(now - lcdEventUntilMs) < 0) {
      lcdPrint2(lcdEventLine1, lcdEventLine2);
      return;
    }
    lcdEventActive = false;
    lastLcdPageMs = now;
  }

  if (now - lastLcdPageMs >= LCD_PAGE_MS) {
    lastLcdPageMs = now;
    lcdPage = (lcdPage + 1) % LCD_PAGE_COUNT;
  }

  String line1;
  String line2;

  switch (lcdPage) {
    case 0:
      line1 = WiFi.status() == WL_CONNECTED ? "WiFi OK" : "WiFi LOST";
      line1 += currentMode == 1 ? " AUTO" : " MAN";
      line2 = lcdRelayLine();
      break;

    case 1:
      if (sensor.npkValid) {
        line1 = "T:" + fmt(sensor.soilTemperature, 1) + "C H:" + fmt(sensor.soilHumidity, 0) + "%";
        line2 = "pH:" + fmt(sensor.soilPH, 1) + " EC:" + String(sensor.soilConductivity);
      } else {
        line1 = "NPK chua co DL";
        line2 = "Dang doc RS485";
      }
      break;

    case 2:
      line1 = sensor.bh1750Valid ? ("Lux:" + fmt(sensor.lux, 0) + " lx") : "BH1750 loi";
      if (sensor.npkValid) {
        line2 = "NPK:" + String(sensor.nitrogen) + "/" + String(sensor.phosphorus) + "/" + String(sensor.potassium);
      } else {
        line2 = "NPK:--/--/--";
      }
      break;

    default:
      if (sensor.ina219Valid) {
        line1 = "V:" + fmt(sensor.voltageV, 2) + " I:" + fmt(sensor.currentA, 2);
        line2 = "P:" + fmt(sensor.powerW, 2) + "W";
      } else {
        line1 = "INA219 loi";
        line2 = "Kiem tra I2C";
      }
      break;
  }

  lcdPrint2(line1, line2);
}

// ================== AUTO TIME CONTROL ==================
void hoatDongTheoThoiGian() {
  static unsigned long lastAutoRunMs = 0;
  if (millis() - lastAutoRunMs < 1000) return;
  lastAutoRunMs = millis();

  timeClient.update();
  String currentTime = timeClient.getFormattedTime().substring(0, 5);
  Serial.println("Thời gian hiện tại: " + currentTime);

  String payload;
  int code = httpGET(apiUrl("/database/getTimeOnOff.php"), payload, 1000);

  if (code <= 0) {
    Serial.print("Get time config failed, HTTP code: ");
    Serial.println(code);
    return;
  }

  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload);

  if (error) {
    Serial.print("Parse time JSON failed: ");
    Serial.println(error.c_str());
    Serial.println(payload);
    return;
  }

  for (JsonObject item : doc.as<JsonArray>()) {
    const char* led_name = item["led_name"] | "";
    const char* turn_on_time = item["turn_on_time"] | "00:00";
    const char* turn_off_time = item["turn_off_time"] | "00:00";

    if (strcmp(led_name, "LED1") == 0) {
      controlRelayByTime(ledPin1, relayState1, turn_on_time, turn_off_time, currentTime, "led1");
    } else if (strcmp(led_name, "LED2") == 0) {
      controlRelayByTime(ledPin2, relayState2, turn_on_time, turn_off_time, currentTime, "led2");
    } else if (strcmp(led_name, "LED3") == 0) {
      controlRelayByTime(ledPin3, relayState3, turn_on_time, turn_off_time, currentTime, "led3");
    } else if (strcmp(led_name, "LED4") == 0) {
      controlRelayByTime(ledPin4, relayState4, turn_on_time, turn_off_time, currentTime, "led4");
    }
  }
}

bool isTimeInRange(const String& now, const String& onTime, const String& offTime) {
  if (onTime == offTime) return false;

  // Trường hợp bình thường: vdbật 08:00, tắt 17:00.
  if (onTime < offTime) {
    return now >= onTime && now < offTime;
  }

  // Trường hợp qua ngày: bật 22:00, tắt 05:00.
  return now >= onTime || now < offTime;
}

void controlRelayByTime(int pin, bool &oldState, const char* turnOn, const char* turnOff, const String& currentTime, const char* ledName) {
  bool shouldOn = isTimeInRange(currentTime, String(turnOn), String(turnOff));

  if (oldState != shouldOn) {
    setRelayLocal(pin, oldState, shouldOn);
    sendButtonState(ledName, shouldOn);

    lcdEvent(String("AUTO ") + lcdRelayNameByLedName(ledName) + (shouldOn ? " BAT" : " TAT"),
             String(turnOn) + "-" + String(turnOff), 1800);

    Serial.print(ledName);
    Serial.print(shouldOn ? " AUTO ON " : " AUTO OFF ");
    Serial.print(turnOn);
    Serial.print(" -> ");
    Serial.println(turnOff);
  }
}

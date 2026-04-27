#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SoftwareSerial.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_INA219.h>



// ================== WIFI + SERVER ==================
const char* WIFI_SSID = "VC Analog 2";
const char* WIFI_PASS = "Hien79830304@";

// ĐỔI THÀNH IP/DOMAIN SERVER NODE.JS CỦA BẠN
// Ví dụ local: "http://192.168.1.100:3001" (IP máy chạy server, KHÔNG dùng localhost vì ESP32 là thiết bị riêng)
// Ví dụ production: "https://api.smartfarm.k23bkdn.io.vn"
const char* BASE_URL = "https://api.k23bkdn.io.vn";

String URL_UPDATE    = String(BASE_URL) + "/database/update.php";
String URL_GET_RELAY = String(BASE_URL) + "/database/getLedStatus.php";
String URL_GET_MODE  = String(BASE_URL) + "/database/getmode.php";
String URL_GET_TIME  = String(BASE_URL) + "/database/getTimeOnOff.php";

// ================== I2C ==================
const int I2C_SDA = 21;
const int I2C_SCL = 22;

// ================== RS485 NPK SENSOR ==================
SoftwareSerial npkSerial(17, 16);  // RX, TX
const int RS485_DE = 5;
const int RS485_RE = 4;

struct SoilData {
  float temperature = 0;
  float humidity = 0;
  uint16_t conductivity = 0;
  float ph = 0;
  uint16_t nitrogen = 0;
  uint16_t phosphorus = 0;
  uint16_t potassium = 0;
  bool valid = false;
};

SoilData soil;

// ================== BH1750 LIGHT SENSOR ==================
BH1750 lightMeter;
bool bh1750Ready = false;
float luxValue = 0;

// ================== INA219 POWER SENSOR ==================
Adafruit_INA219 ina219;
bool ina219Ready = false;

float busVoltageV = 0;      // Điện áp bus từ INA219
float shuntVoltageMv = 0;   // Điện áp trên shunt, đơn vị mV
float loadVoltageV = 0;     // Điện áp tải = bus + shunt/1000
float currentA = 0;         // Dòng điện A
float powerW = 0;           // Công suất W

// ================== RELAY + BUTTON ==================
const int BUTTON_PINS[4] = {13, 27, 26, 25};
const int RELAY_PINS[4]  = {12, 14, 32, 33};

const char* RELAY_DB_NAME[4]   = {"led1", "led2", "led3", "led4"};
const char* RELAY_TIME_NAME[4] = {"LED1", "LED2", "LED3", "LED4"};

const int RELAY_ON  = HIGH;
const int RELAY_OFF = LOW;

bool relayState[4] = {false, false, false, false};
bool lastButtonRaw[4] = {HIGH, HIGH, HIGH, HIGH};
unsigned long lastButtonChangeMs[4] = {0, 0, 0, 0};
const unsigned long BUTTON_DEBOUNCE_MS = 180;

// ================== TIME / MODE ==================
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 7 * 3600, 60000);

// 0 = manual, 1 = auto theo thời gian
int currentMode = 0;

// ================== TASK INTERVALS ==================
unsigned long lastSensorMs = 0;
unsigned long lastModeMs = 0;
unsigned long lastRelayPollMs = 0;
unsigned long lastScheduleMs = 0;

const unsigned long SENSOR_INTERVAL_MS = 6000;
const unsigned long MODE_INTERVAL_MS = 5000;
const unsigned long RELAY_POLL_INTERVAL_MS = 2000;
const unsigned long SCHEDULE_INTERVAL_MS = 10000;

// =====================================================
// WIFI
// =====================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Connecting WiFi");
  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connect timeout. ESP32 will retry in loop.");
  }
}

// =====================================================
// HTTP / HTTPS GET
// =====================================================
bool httpGetString(const String& url, String& payload) {
  payload = "";

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("HTTP skip: WiFi not connected");
    return false;
  }

  HTTPClient http;
  int code = -1;

  Serial.print("GET: ");
  Serial.println(url);

  if (url.startsWith("https://")) {
    WiFiClientSecure client;
    client.setInsecure();

    if (!http.begin(client, url)) {
      Serial.println("HTTPS begin failed");
      return false;
    }

    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    code = http.GET();
  } else {
    WiFiClient client;

    if (!http.begin(client, url)) {
      Serial.println("HTTP begin failed");
      return false;
    }

    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    code = http.GET();
  }

  Serial.print("HTTP code: ");
  Serial.println(code);

  if (code > 0) {
    payload = http.getString();
    http.end();
    return true;
  }

  Serial.print("HTTP GET failed: ");
  Serial.println(code);
  http.end();
  return false;
}

String urlEncodeValue(const String& value) {
  String out = "";
  char c;
  char code0;
  char code1;

  for (int i = 0; i < value.length(); i++) {
    c = value.charAt(i);
    if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
      out += c;
    } else {
      code1 = (c & 0xF) + '0';
      if ((c & 0xF) > 9) code1 = (c & 0xF) - 10 + 'A';
      c = (c >> 4) & 0xF;
      code0 = c + '0';
      if (c > 9) code0 = c - 10 + 'A';
      out += '%';
      out += code0;
      out += code1;
    }
  }

  return out;
}

// =====================================================
// RELAY
// =====================================================
uint8_t getActiveRelayMask() {
  uint8_t mask = 0;
  for (int i = 0; i < 4; i++) {
    if (relayState[i]) mask |= (1 << i);
  }
  return mask;
}

void sendRelayState(uint8_t index, bool status) {
  if (index >= 4) return;

  String url = URL_UPDATE;
  url += "?led=";
  url += RELAY_DB_NAME[index];
  url += "&status=";
  url += status ? "1" : "0";

  String payload;
  if (httpGetString(url, payload)) {
    Serial.print("Sync relay server: ");
    Serial.println(payload);
  }
}

void setRelay(uint8_t index, bool on, bool syncServer = false) {
  if (index >= 4) return;

  if (relayState[index] == on && !syncServer) return;

  relayState[index] = on;
  digitalWrite(RELAY_PINS[index], on ? RELAY_ON : RELAY_OFF);

  Serial.print("Relay ");
  Serial.print(index + 1);
  Serial.print(" = ");
  Serial.println(on ? "ON" : "OFF");

  if (syncServer) {
    sendRelayState(index, on);
  }
}

// =====================================================
// BH1750 + INA219
// =====================================================
void setupSensorsI2C() {
  Wire.begin(I2C_SDA, I2C_SCL);

  bh1750Ready = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  if (bh1750Ready) {
    Serial.println("BH1750 OK");
  } else {
    Serial.println("BH1750 not found. Check SDA/SCL/VCC/GND.");
  }

  ina219Ready = ina219.begin(&Wire);
  if (ina219Ready) {
    // Phù hợp dải đo thông dụng. Nếu hệ của bạn dòng lớn hơn, cần module/shunt phù hợp.
    ina219.setCalibration_32V_2A();
    Serial.println("INA219 OK");
  } else {
    Serial.println("INA219 not found. Check SDA/SCL/VCC/GND/address.");
  }
}

float readLux() {
  if (!bh1750Ready) return -1;
  float lux = lightMeter.readLightLevel();
  if (lux < 0) return -1;
  return lux;
}

void readIna219() {
  if (!ina219Ready) {
    busVoltageV = 0;
    shuntVoltageMv = 0;
    loadVoltageV = 0;
    currentA = 0;
    powerW = 0;
    return;
  }

  shuntVoltageMv = ina219.getShuntVoltage_mV();
  busVoltageV = ina219.getBusVoltage_V();

  float currentMa = ina219.getCurrent_mA();
  float powerMw = ina219.getPower_mW();

  loadVoltageV = busVoltageV + (shuntVoltageMv / 1000.0f);
  currentA = currentMa / 1000.0f;
  powerW = powerMw / 1000.0f;

  // Chống nhảy số nhỏ quanh 0A
  if (fabs(currentA) < 0.003f) currentA = 0.0f;
  if (fabs(powerW) < 0.02f) powerW = 0.0f;
}

// =====================================================
// NPK RS485
// =====================================================
bool readNPK(SoilData& out) {
  byte queryData[] = {
    0x01, 0x03, 0x00, 0x00,
    0x00, 0x07, 0x04, 0x08
  };

  byte receivedData[19];

  while (npkSerial.available()) npkSerial.read();

  digitalWrite(RS485_DE, HIGH);
  digitalWrite(RS485_RE, HIGH);
  delay(5);

  npkSerial.write(queryData, sizeof(queryData));
  npkSerial.flush();

  digitalWrite(RS485_DE, LOW);
  digitalWrite(RS485_RE, LOW);

  unsigned long start = millis();
  while (npkSerial.available() < (int)sizeof(receivedData) && millis() - start < 1200) {
    delay(5);
  }

  if (npkSerial.available() < (int)sizeof(receivedData)) {
    Serial.println("NPK timeout / not enough data");
    return false;
  }

  npkSerial.readBytes(receivedData, sizeof(receivedData));

  out.humidity     = ((receivedData[3]  << 8) | receivedData[4])  / 10.0f;
  out.temperature  = ((receivedData[5]  << 8) | receivedData[6])  / 10.0f;
  out.conductivity =  (receivedData[7]  << 8) | receivedData[8];
  out.ph           = ((receivedData[9]  << 8) | receivedData[10]) / 10.0f;
  out.nitrogen     =  (receivedData[11] << 8) | receivedData[12];
  out.phosphorus   =  (receivedData[13] << 8) | receivedData[14];
  out.potassium    =  (receivedData[15] << 8) | receivedData[16];
  out.valid = true;

  return true;
}

// =====================================================
// SEND SENSOR DATA
// =====================================================
void sendSensorData() {
  if (!soil.valid) {
    Serial.println("Skip send sensor: NPK not valid yet");
    return;
  }

  String url = URL_UPDATE;
  url += "?soilTemperature=" + String(soil.temperature, 1);
  url += "&soilHumidity=" + String(soil.humidity, 1);
  url += "&soilConductivity=" + String(soil.conductivity);
  url += "&soilPH=" + String(soil.ph, 1);
  url += "&nitrogen=" + String(soil.nitrogen);
  url += "&phosphorus=" + String(soil.phosphorus);
  url += "&potassium=" + String(soil.potassium);
  url += "&lux=" + String(luxValue, 2);
  url += "&voltageV=" + String(loadVoltageV, 3);
  url += "&busVoltageV=" + String(busVoltageV, 3);
  url += "&shuntVoltageMv=" + String(shuntVoltageMv, 3);
  url += "&currentA=" + String(currentA, 4);
  url += "&powerW=" + String(powerW, 4);
  url += "&activeRelays=" + String(getActiveRelayMask());

  String payload;

  Serial.print("Send sensor: ");
  Serial.println(url);

  if (httpGetString(url, payload)) {
    Serial.print("Server: ");
    Serial.println(payload);
  }
}

// =====================================================
// MODE
// =====================================================
void pollMode() {
  String payload;

  if (httpGetString(URL_GET_MODE, payload)) {
    payload.trim();

    // Hỗ trợ server trả "0", "1" hoặc JSON {"mode":1}
    if (payload.startsWith("{")) {
      StaticJsonDocument<256> doc;
      if (deserializeJson(doc, payload) == DeserializationError::Ok) {
        currentMode = doc["mode"] | doc["autoMode"] | 0;
      }
    } else {
      currentMode = payload.toInt();
    }

    Serial.print("Mode = ");
    Serial.println(currentMode ? "AUTO" : "MANUAL");
  }
}

// =====================================================
// MANUAL RELAY STATUS FROM SERVER
// =====================================================
void pollRelayStatusManual() {
  String payload;

  if (!httpGetString(URL_GET_RELAY, payload)) {
    Serial.println("Get relay status failed");
    return;
  }

  payload.trim();

  Serial.println("===== RELAY PAYLOAD =====");
  Serial.println(payload);
  Serial.println("=========================");

  StaticJsonDocument<768> doc;
  DeserializationError err = deserializeJson(doc, payload);

  if (err) {
    Serial.print("Parse relay JSON failed: ");
    Serial.println(err.c_str());
    return;
  }

  bool led[4] = {false, false, false, false};

  for (int i = 0; i < 4; i++) {
    const char* key = RELAY_DB_NAME[i];

    if (doc[key].is<int>()) {
      led[i] = doc[key].as<int>() == 1;
    } else if (doc[key].is<const char*>()) {
      led[i] = String(doc[key].as<const char*>()) == "1";
    } else if (doc[key].is<bool>()) {
      led[i] = doc[key].as<bool>();
    }
  }

  Serial.print("Relay from server: ");
  Serial.print(led[0]); Serial.print(" / ");
  Serial.print(led[1]); Serial.print(" / ");
  Serial.print(led[2]); Serial.print(" / ");
  Serial.println(led[3]);

  for (int i = 0; i < 4; i++) setRelay(i, led[i]);
}

// =====================================================
// AUTO SCHEDULE
// =====================================================
void pollScheduleAuto() {
  timeClient.update();
  String currentTime = timeClient.getFormattedTime().substring(0, 5);

  String payload;
  if (!httpGetString(URL_GET_TIME, payload)) return;

  StaticJsonDocument<1536> doc;
  DeserializationError err = deserializeJson(doc, payload);

  if (err) {
    Serial.println("Parse schedule JSON failed");
    Serial.println(payload);
    return;
  }

  for (JsonObject item : doc.as<JsonArray>()) {
    const char* ledName = item["led_name"] | "";
    const char* turnOn  = item["turn_on_time"] | "00:00";
    const char* turnOff = item["turn_off_time"] | "00:00";

    for (int i = 0; i < 4; i++) {
      if (strcmp(ledName, RELAY_TIME_NAME[i]) == 0) {
        bool shouldOn = (currentTime >= String(turnOn) && currentTime < String(turnOff));
        setRelay(i, shouldOn, true);
      }
    }
  }
}

// =====================================================
// BUTTON
// =====================================================
void handleButtons() {
  unsigned long now = millis();

  for (int i = 0; i < 4; i++) {
    bool raw = digitalRead(BUTTON_PINS[i]);

    if (raw != lastButtonRaw[i]) {
      lastButtonRaw[i] = raw;
      lastButtonChangeMs[i] = now;
    }

    if (raw == LOW && (now - lastButtonChangeMs[i] > BUTTON_DEBOUNCE_MS)) {
      bool newState = !relayState[i];
      setRelay(i, newState, true);

      while (digitalRead(BUTTON_PINS[i]) == LOW) delay(5);

      lastButtonRaw[i] = HIGH;
      lastButtonChangeMs[i] = millis();
    }
  }
}

// =====================================================
// SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("ESP32 START - NPK + BH1750 + INA219 + HTTPS");

  connectWiFi();

  for (int i = 0; i < 4; i++) {
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
    pinMode(RELAY_PINS[i], OUTPUT);
    relayState[i] = false;
    digitalWrite(RELAY_PINS[i], RELAY_OFF);
  }

  npkSerial.begin(4800);
  pinMode(RS485_DE, OUTPUT);
  pinMode(RS485_RE, OUTPUT);
  digitalWrite(RS485_DE, LOW);
  digitalWrite(RS485_RE, LOW);

  setupSensorsI2C();

  timeClient.begin();
  pollMode();

  Serial.println("Setup done");
}

// =====================================================
// LOOP
// =====================================================
void loop() {
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  handleButtons();

  if (now - lastModeMs >= MODE_INTERVAL_MS) {
    lastModeMs = now;
    pollMode();
  }

  if (currentMode == 0 && now - lastRelayPollMs >= RELAY_POLL_INTERVAL_MS) {
    lastRelayPollMs = now;
    pollRelayStatusManual();
  }

  if (currentMode == 1 && now - lastScheduleMs >= SCHEDULE_INTERVAL_MS) {
    lastScheduleMs = now;
    pollScheduleAuto();
  }

  if (now - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = now;

    if (readNPK(soil)) Serial.println("NPK OK");

    luxValue = readLux();
    readIna219();

    Serial.println("===== SENSOR DATA =====");
    Serial.printf("Temp: %.1f C\n", soil.temperature);
    Serial.printf("Humi: %.1f %%\n", soil.humidity);
    Serial.printf("EC: %u\n", soil.conductivity);
    Serial.printf("pH: %.1f\n", soil.ph);
    Serial.printf("NPK: %u / %u / %u\n", soil.nitrogen, soil.phosphorus, soil.potassium);
    Serial.printf("Lux: %.2f lx\n", luxValue);
    Serial.printf("Voltage: %.3f V\n", loadVoltageV);
    Serial.printf("Bus voltage: %.3f V\n", busVoltageV);
    Serial.printf("Shunt: %.3f mV\n", shuntVoltageMv);
    Serial.printf("Current: %.4f A\n", currentA);
    Serial.printf("Power: %.4f W\n", powerW);
    Serial.printf("Active relay mask: %u\n", getActiveRelayMask());
    Serial.println("=======================");

    sendSensorData();
  }
}

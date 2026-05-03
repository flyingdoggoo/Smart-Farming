export interface SensorData {
  id: number;
  temp: number | null;
  humi: number | null;
  ec: number | null;
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  lux: number | null;
  voltageV: number | null;
  busVoltageV: number | null;
  shuntVoltageMv: number | null;
  currentA: number | null;
  powerW: number | null;
  npkValid?: boolean;
  bh1750Valid?: boolean;
  ina219Valid?: boolean;
  activeRelays: number;
  last_reading_time: string | null;
}

export interface RelayStatus {
  ok: boolean;
  led1: number;
  led2: number;
  led3: number;
  led4: number;
  updated_at: string | null;
}

export interface Schedule {
  id: number;
  led_name: string;
  turn_on_time: string;
  turn_off_time: string;
}

export interface User {
  id: number;
  fname: string;
  username: string;
}

export interface PredictionCandidate {
  prediction: string;
  prediction_en?: string | null;
  confidence: number | null;
  crop_id?: number | null;
}

export interface PredictionResult {
  ok: boolean;
  prediction: string | null;
  prediction_en?: string;
  model: string;
  model_version?: string | null;
  confidence: number | null;
  crop_id?: number | null;
  top_predictions?: PredictionCandidate[];
}

export interface WeatherData {
  ok: boolean;
  source: 'open-meteo';
  cached: boolean;
  updatedAt: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: {
    time: string;
    weatherCode: number;
    weatherText: string;
    isDay: number;
    temperatureC: number;
    apparentTemperatureC: number;
    humidityPct: number;
    windSpeedKmh: number;
    windDirectionDeg: number;
  };
  today: {
    tempMinC: number;
    tempMaxC: number;
    precipitationProbabilityMaxPct: number;
    uvIndexMax: number;
    sunrise: string;
    sunset: string;
  };
}

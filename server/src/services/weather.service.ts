const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_LAT = Number(process.env.WEATHER_DEFAULT_LAT || 16.06361637075538);
const DEFAULT_LON = Number(process.env.WEATHER_DEFAULT_LON || 108.15452219088864);
const DEFAULT_LOCATION_NAME = process.env.WEATHER_DEFAULT_NAME || 'Da Nang';
const CACHE_TTL_MS = Math.max(60, Number(process.env.WEATHER_CACHE_TTL_SEC || 1800)) * 1000;

interface WeatherCacheEntry {
  expiresAt: number;
  payload: WeatherTodayPayload;
}

export interface WeatherTodayPayload {
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
    precipitationSumMm: number;
    uvIndexMax: number;
    sunrise: string;
    sunset: string;
  };
}

const weatherCache = new Map<string, WeatherCacheEntry>();

function weatherCodeToText(code: number, isDay: number): string {
  const daytime = isDay === 1;
  switch (code) {
    case 0:
      return daytime ? 'Troi quang' : 'Troi quang dem';
    case 1:
      return daytime ? 'Chu yeu quang' : 'It may';
    case 2:
      return 'May rai rac';
    case 3:
      return 'Nhieu may';
    case 45:
    case 48:
      return 'Suong mu';
    case 51:
    case 53:
    case 55:
      return 'Mua phun';
    case 61:
    case 63:
    case 65:
      return 'Mua';
    case 66:
    case 67:
      return 'Mua dong bang';
    case 71:
    case 73:
    case 75:
      return 'Tuyet roi';
    case 77:
      return 'Hat bang';
    case 80:
    case 81:
    case 82:
      return 'Mua rao';
    case 85:
    case 86:
      return 'Mua tuyet rao';
    case 95:
      return 'Giong';
    case 96:
    case 99:
      return 'Giong co mua da';
    default:
      return 'Khong xac dinh';
  }
}

function normalizeCoordinate(raw: number | undefined, fallback: number): number {
  if (raw === undefined || Number.isNaN(raw) || !Number.isFinite(raw)) {
    return fallback;
  }
  return raw;
}

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
}

export async function getTodayWeather(input: {
  latitude?: number;
  longitude?: number;
  locationName?: string;
}): Promise<WeatherTodayPayload> {
  const latitude = normalizeCoordinate(input.latitude, DEFAULT_LAT);
  const longitude = normalizeCoordinate(input.longitude, DEFAULT_LON);
  const locationName = (input.locationName || DEFAULT_LOCATION_NAME).trim() || DEFAULT_LOCATION_NAME;
  const key = cacheKey(latitude, longitude);

  const now = Date.now();
  const cached = weatherCache.get(key);
  if (cached && cached.expiresAt > now) {
    return { ...cached.payload, cached: true };
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: 'auto',
    forecast_days: '1',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset',
  });

  const response = await fetch(`${WEATHER_API_URL}?${params.toString()}`);
  if (!response.ok) {
    throw { status: 502, message: 'Weather API khong phan hoi' };
  }

  const data: any = await response.json();
  if (!data?.current || !data?.daily) {
    throw { status: 502, message: 'Weather API tra du lieu khong hop le' };
  }

  const weatherCode = Number(data.current.weather_code ?? -1);
  const isDay = Number(data.current.is_day ?? 1);

  const payload: WeatherTodayPayload = {
    source: 'open-meteo',
    cached: false,
    updatedAt: new Date().toISOString(),
    location: {
      name: locationName,
      latitude,
      longitude,
      timezone: String(data.timezone || 'auto'),
    },
    current: {
      time: String(data.current.time || new Date().toISOString()),
      weatherCode,
      weatherText: weatherCodeToText(weatherCode, isDay),
      isDay,
      temperatureC: Number(data.current.temperature_2m ?? 0),
      apparentTemperatureC: Number(data.current.apparent_temperature ?? 0),
      humidityPct: Number(data.current.relative_humidity_2m ?? 0),
      windSpeedKmh: Number(data.current.wind_speed_10m ?? 0),
      windDirectionDeg: Number(data.current.wind_direction_10m ?? 0),
    },
    today: {
      tempMinC: Number(data.daily.temperature_2m_min?.[0] ?? 0),
      tempMaxC: Number(data.daily.temperature_2m_max?.[0] ?? 0),
      precipitationProbabilityMaxPct: Number(data.daily.precipitation_probability_max?.[0] ?? 0),
      precipitationSumMm: Number(data.daily.precipitation_sum?.[0] ?? 0),
      uvIndexMax: Number(data.daily.uv_index_max?.[0] ?? 0),
      sunrise: String(data.daily.sunrise?.[0] || ''),
      sunset: String(data.daily.sunset?.[0] || ''),
    },
  };

  weatherCache.set(key, {
    expiresAt: now + CACHE_TTL_MS,
    payload,
  });

  return payload;
}

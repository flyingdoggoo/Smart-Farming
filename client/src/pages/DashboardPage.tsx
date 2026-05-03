import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudSun, Droplets, Thermometer, Umbrella, Wind } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../services/api';
import type { SensorData, WeatherData } from '../types';

interface HistoryPoint {
  timeLabel: string;
  temp: number | null;
  humi: number | null;
  ec: number | null;
  ph: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
}

type SoilMetricKey = Exclude<keyof HistoryPoint, 'timeLabel'>;

interface SoilCardConfig {
  key: SoilMetricKey;
  label: string;
  unit: string;
  color: string;
}

const SOIL_CARD_CONFIG: SoilCardConfig[] = [
  { key: 'temp', label: 'Nhiệt độ đất', unit: '°C', color: '#c62828' },
  { key: 'humi', label: 'Độ ẩm đất', unit: '%', color: '#1565c0' },
  { key: 'ec', label: 'EC', unit: '', color: '#ef6c00' },
  { key: 'ph', label: 'pH', unit: '', color: '#2e7d32' },
  { key: 'nitrogen', label: 'Nitơ N', unit: 'mg/kg', color: '#00695c' },
  { key: 'phosphorus', label: 'Phospho P', unit: 'mg/kg', color: '#512da8' },
  { key: 'potassium', label: 'Kali K', unit: 'mg/kg', color: '#00838f' },
];

function formatValue(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--';
  }
  return Number(value).toFixed(digits);
}

function formatTimestamp(input: string | null | undefined): string {
  if (!input) {
    return '--';
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleString('vi-VN');
}

function formatClock(input: string | null | undefined): string {
  if (!input) {
    return '--';
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function MiniTrendChart(props: {
  data: HistoryPoint[];
  dataKey: SoilMetricKey;
  color: string;
}) {
  const { data, dataKey, color } = props;
  const hasData = data.some((point) => typeof point[dataKey] === 'number');

  if (!hasData) {
    return <div className="soil-card-empty-chart">No trend</div>;
  }

  return (
    <div className="soil-card-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Tooltip
            formatter={(value: any) => (
              typeof value === 'number' ? value.toFixed(2) : (value ?? '--')
            )}
            labelFormatter={() => ''}
            contentStyle={{
              border: '1px solid var(--outline-variant)',
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPage() {
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const loadLatestSensor = useCallback(async () => {
    try {
      const response = await api.get<SensorData>('/sensor/latest');
      setSensor(response.data);
    } catch (error) {
      console.error('Load latest sensor error:', error);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const response = await api.get('/sensor/history?limit=80&days=2');
      const raw = response.data;
      const rows: HistoryPoint[] = (raw.reg_date || []).map((time: string, index: number) => {
        const date = new Date(time);
        const timeLabel = Number.isNaN(date.getTime())
          ? '--'
          : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        return {
          timeLabel,
          temp: raw.soilTemperature?.[index] ?? null,
          humi: raw.soilHumidity?.[index] ?? null,
          ec: raw.soilConductivity?.[index] ?? null,
          ph: raw.soilPH?.[index] ?? null,
          nitrogen: raw.nitrogen?.[index] ?? null,
          phosphorus: raw.phosphorus?.[index] ?? null,
          potassium: raw.potassium?.[index] ?? null,
        };
      });

      setHistory(rows.slice(-60));
    } catch (error) {
      console.error('Load sensor history error:', error);
    }
  }, []);

  const loadWeather = useCallback(async () => {
    try {
      const response = await api.get<WeatherData>('/weather/today?name=Da%20Nang');
      if (response.data.ok) {
        setWeather(response.data);
      }
    } catch (error) {
      console.error('Load weather today error:', error);
    }
  }, []);

  useEffect(() => {
    loadLatestSensor();
    loadHistory();
    loadWeather();

    const sensorTimer = setInterval(() => {
      loadLatestSensor();
      loadHistory();
    }, 12000);

    const weatherTimer = setInterval(() => {
      loadWeather();
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(sensorTimer);
      clearInterval(weatherTimer);
    };
  }, [loadLatestSensor, loadHistory, loadWeather]);

  const soilCardValues = useMemo<Record<SoilMetricKey, number | null>>(() => {
    const src = sensor || ({} as SensorData);
    return {
      temp: src.temp,
      humi: src.humi,
      ec: src.ec,
      ph: src.ph,
      nitrogen: src.nitrogen,
      phosphorus: src.phosphorus,
      potassium: src.potassium,
    };
  }, [sensor]);

  return (
    <div className="fade-in dashboard-page">
      <div className="page-header">
        <div>
          <h1>Tổng quan Hệ thống</h1>
          <p>Thông số cảm biến đất và thời tiết hôm nay.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="card soil-panel">
          <div className="card-body">
            <div className="dashboard-section-head">
              <h2 className="text-h3">Thông số Cảm biến Đất</h2>
              <span className="text-body-md text-muted">
                Cập nhật: {formatTimestamp(sensor?.last_reading_time)}
              </span>
            </div>

            <div className="soil-card-grid">
              {SOIL_CARD_CONFIG.map((card) => (
                <article key={card.key} className="soil-card">
                  <div className="soil-card-meta">
                    <span className="soil-card-title">{card.label}</span>
                  </div>
                  <div className="soil-card-value-row">
                    <span className="soil-card-value">
                      {formatValue(soilCardValues[card.key], card.key === 'nitrogen' || card.key === 'phosphorus' || card.key === 'potassium' ? 0 : 1)}
                    </span>
                    {card.unit && <span className="soil-card-unit">{card.unit}</span>}
                  </div>
                  <MiniTrendChart data={history} dataKey={card.key} color={card.color} />
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="dashboard-side-col" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <section className="card weather-panel">
            <div className="card-body weather-panel-body">
              <div className="weather-top">
                <div>
                  <div className="weather-label">Thời tiết hôm nay</div>
                  <h3>{weather?.location.name || 'Da Nang'}</h3>
                </div>
                <CloudSun size={36} />
              </div>

              <div className="weather-main">
                <span className="weather-temp">
                  {formatValue(weather?.current.temperatureC, 1)}°
                </span>
                <span className="weather-text">
                  {weather?.current.weatherText || '--'}
                </span>
              </div>

              <div className="weather-stat-grid">
                <div className="weather-stat-card">
                  <Droplets size={16} />
                  <span>{formatValue(weather?.current.humidityPct, 0)}%</span>
                </div>
                <div className="weather-stat-card">
                  <Wind size={16} />
                  <span>{formatValue(weather?.current.windSpeedKmh, 1)} km/h</span>
                </div>
                <div className="weather-stat-card">
                  <Umbrella size={16} />
                  <span>{formatValue(weather?.today.precipitationProbabilityMaxPct, 0)}%</span>
                </div>
                <div className="weather-stat-card">
                  <Thermometer size={16} />
                  <span>
                    {formatValue(weather?.today.tempMinC, 1)}° / {formatValue(weather?.today.tempMaxC, 1)}°
                  </span>
                </div>
              </div>

              <div className="weather-footer">
                <span>Bình minh: {formatClock(weather?.today.sunrise)}</span>
                <span>Hoàng hôn: {formatClock(weather?.today.sunset)}</span>
              </div>
            </div>
          </section>

          <section className="card energy-panel" style={{ flex: 1 }}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="dashboard-section-head" style={{ marginBottom: '1rem' }}>
                <h2 className="text-h4" style={{ margin: 0 }}>Năng lượng & Trạng thái</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="energy-stat" style={{ background: 'var(--surface-variant)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Ánh sáng</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {formatValue(sensor?.lux, 0)} <span style={{ fontSize: '1rem', fontWeight: 400 }}>lux</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: (sensor?.lux ?? 0) < 1000 ? 'var(--warning)' : 'var(--success)', marginTop: '0.25rem' }}>
                    {(sensor?.lux ?? 0) < 1000 ? 'Ánh sáng thấp' : 'BH1750 ổn định'}
                  </div>
                </div>
                <div className="energy-stat" style={{ background: 'var(--surface-variant)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Công suất</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--error)' }}>
                    {formatValue(sensor?.powerW, 2)} <span style={{ fontSize: '1rem', fontWeight: 400 }}>W</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    {formatValue(sensor?.voltageV, 2)}V - {formatValue(sensor?.currentA, 3)}A
                  </div>
                </div>
              </div>

              <div className="sensor-status" style={{ marginTop: 'auto', borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>Trạng thái Cảm biến</div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sensor?.npkValid ? 'var(--success)' : 'var(--error)' }}></div>
                    NPK
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sensor?.bh1750Valid ? 'var(--success)' : 'var(--error)' }}></div>
                    BH1750
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sensor?.ina219Valid ? 'var(--success)' : 'var(--error)' }}></div>
                    INA219
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

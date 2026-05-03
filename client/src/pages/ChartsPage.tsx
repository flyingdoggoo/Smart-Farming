import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { CalendarDays, Download, MoreVertical } from 'lucide-react';
import api from '../services/api';

export default function ChartsPage() {
  const [days, setDays] = useState(7);
  const [npkData, setNpkData] = useState<any[]>([]);
  const [soilData, setSoilData] = useState<any[]>([]);
  const [temperatureThreshold, setTemperatureThreshold] = useState(35);

  const downsample = (rows: any[], maxPoints = 180) => {
    if (rows.length <= maxPoints) return rows;
    const step = Math.ceil(rows.length / maxPoints);
    return rows.filter((_, idx) => idx % step === 0);
  };

  const load = useCallback(async () => {
    try {
      const [historyRes, settingsRes] = await Promise.all([
        api.get(`/sensor/history?limit=1000&days=${days}`),
        api.get('/settings'),
      ]);
      const d = historyRes.data;

      const rawPoints = (d.reg_date || []).map((date: string, i: number) => {
        const dt = date ? new Date(date) : null;
        const time = dt
          ? dt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : '--';

        return {
          time,
          nitrogen: d.nitrogen?.[i] ?? null,
          phosphorus: d.phosphorus?.[i] ?? null,
          potassium: d.potassium?.[i] ?? null,
          temperature: d.soilTemperature?.[i] ?? null,
          humidity: d.soilHumidity?.[i] ?? null,
          ec: d.soilConductivity?.[i] ?? null,
          ph: d.soilPH?.[i] ?? null,
          lux: d.lux?.[i] ?? null,
          voltageV: d.voltageV?.[i] ?? null,
          currentA: d.currentA?.[i] ?? null,
          powerW: d.powerW?.[i] ?? null,
        };
      });

      const sampled = downsample(rawPoints);
      setNpkData(sampled);
      setSoilData(sampled);
      setTemperatureThreshold(Number(settingsRes.data.temperatureThreshold ?? 35));
    } catch (e) {
      console.error(e);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const avgTemp = soilData.length
    ? (
      soilData.reduce((sum, row) => sum + (Number(row.temperature) || 0), 0) /
      Math.max(1, soilData.filter((row) => row.temperature != null).length)
    ).toFixed(1)
    : '--';

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Phân tích Dữ liệu</h1>
          <p>Dữ liệu lịch sử và xu hướng chi tiết</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => setDays(days === 7 ? 30 : 7)}>
            <CalendarDays size={16} /> {days} Ngày gần đây
          </button>
          <button className="btn btn-primary">
            <Download size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* NPK Chart */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>Biến động NPK theo thời gian thực tế</h3>
            <button className="topbar-icon-btn"><MoreVertical size={18} /></button>
          </div>
          <div style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={npkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="nitrogen" stroke="#00affe" name="Nitrogen (N)" strokeWidth={2.2} dot={false} connectNulls />
                <Line type="monotone" dataKey="phosphorus" stroke="#1a237e" name="Phosphorus (P)" strokeWidth={2.2} dot={false} connectNulls />
                <Line type="monotone" dataKey="potassium" stroke="#0891b2" name="Potassium (K)" strokeWidth={2.2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Temperature Chart */}
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>Biến động nhiệt độ, độ ẩm, pH, EC</h3>
            <span className="badge badge-success">Avg Temp: {avgTemp}°C</span>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={soilData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <ReferenceLine y={temperatureThreshold} stroke="var(--error)" strokeDasharray="5 5" label={{ value: `Threshold ${temperatureThreshold}°C`, fill: 'var(--error)', fontSize: 11 }} />
                <Line type="monotone" dataKey="temperature" stroke="#1a237e" name="Nhiệt độ (°C)" strokeWidth={2.1} dot={false} connectNulls />
                <Line type="monotone" dataKey="humidity" stroke="#00affe" name="Độ ẩm (%)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="ph" stroke="#16a34a" name="pH" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="ec" stroke="#f97316" name="EC" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Energy Chart */}
      <div className="card" style={{ marginTop: 'var(--space-md)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>Biến động Ánh sáng & Năng lượng</h3>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={soilData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="powerW" stroke="#ef4444" name="Công suất (W)" strokeWidth={2.1} dot={false} connectNulls />
                <Line yAxisId="left" type="monotone" dataKey="voltageV" stroke="#f59e0b" name="Điện áp (V)" strokeWidth={2} dot={false} connectNulls />
                <Line yAxisId="left" type="monotone" dataKey="currentA" stroke="#10b981" name="Dòng (A)" strokeWidth={2} dot={false} connectNulls />
                <Line yAxisId="right" type="monotone" dataKey="lux" stroke="#3b82f6" name="Ánh sáng (Lux)" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

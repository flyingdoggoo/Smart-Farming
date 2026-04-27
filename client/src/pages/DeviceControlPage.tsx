import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Waves, Fan, CloudRain } from 'lucide-react';
import api from '../services/api';

const devices = [
  { key: 'led1', label: 'Đèn sợi đốt', icon: Lightbulb, zone: 'Zone A' },
  { key: 'led2', label: 'Máy bơm chìm', icon: Waves, zone: 'Tank 1' },
  { key: 'led3', label: 'Máy quạt', icon: Fan, zone: 'Greenhouse' },
  { key: 'led4', label: 'Phun sương', icon: CloudRain, zone: 'Zone B' },
];

export default function DeviceControlPage() {
  const [relays, setRelays] = useState<Record<string, number>>({ led1: 0, led2: 0, led3: 0, led4: 0 });
  const [mode, setMode] = useState<number>(0);
  const [loading, setLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [relayRes, modeRes] = await Promise.all([
        api.get('/relay'),
        api.get('/mode')
      ]);
      setRelays({ led1: relayRes.data.led1, led2: relayRes.data.led2, led3: relayRes.data.led3, led4: relayRes.data.led4 });
      if (modeRes.data && modeRes.data.mode !== undefined) {
        setMode(modeRes.data.mode);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function toggleMode() {
    setLoading('mode');
    try {
      const newMode = mode === 1 ? 0 : 1;
      await api.put('/mode', { mode: newMode });
      setMode(newMode);
    } catch (e) { console.error(e); }
    setLoading(null);
  }

  async function toggleRelay(key: string) {
    setLoading(key);
    try {
      const newStatus = relays[key] === 1 ? 0 : 1;
      await api.put(`/relay/${key}`, { status: newStatus });
      setRelays(prev => ({ ...prev, [key]: newStatus }));
    } catch (e) { console.error(e); }
    setLoading(null);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Điều khiển Thiết bị</h1>
          <p>Giám sát và quản lý các thiết bị thực thi theo thời gian thực.</p>
        </div>
        <div className="badge badge-success">
          <span className="live-dot" />
          <span>Hệ thống Trực tuyến</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 24, background: mode === 1 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'var(--surface-container-lowest)', border: mode === 1 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(15, 23, 42, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: mode === 1 ? '#166534' : 'var(--on-surface)', marginBottom: 8 }}>Chế độ Điều khiển Tự động</h2>
            <p style={{ color: mode === 1 ? '#15803d' : 'var(--on-surface-variant)', margin: 0, fontSize: 14 }}>
              {mode === 1 
                ? 'Hệ thống đang tự động bật/tắt thiết bị theo lịch trình. Chức năng điều khiển thủ công đang bị khóa.' 
                : 'Hệ thống đang ở chế độ thủ công. Bạn có thể tự do điều khiển thiết bị bên dưới.'}
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={mode === 1}
              onChange={toggleMode}
              disabled={loading === 'mode'}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="grid grid-4">
        {devices.map((dev) => {
          const on = relays[dev.key] === 1;
          return (
            <div key={dev.key} className="card" style={{
              background: on ? 'linear-gradient(135deg, #f0f7ff, #e8f4fd)' : 'var(--surface-container-lowest)',
              border: on ? '1px solid rgba(0, 175, 254, 0.2)' : '1px solid rgba(15, 23, 42, 0.06)',
              opacity: mode === 1 ? 0.6 : 1,
            }}>
              <div className="card-body" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-full)',
                    background: on ? 'rgba(0, 175, 254, 0.15)' : 'var(--surface-container)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: on ? 'var(--secondary-container)' : 'var(--on-surface-variant)',
                  }}>
                    <dev.icon size={24} />
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleRelay(dev.key)}
                      disabled={loading === dev.key || mode === 1}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 4 }}>
                  {dev.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge ${on ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 11 }}>
                    {on ? 'ACTIVE' : 'STANDBY'}
                  </span>
                  <span className="text-label-sm text-muted">{dev.zone}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

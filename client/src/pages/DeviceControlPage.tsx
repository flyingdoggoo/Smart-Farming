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
  const [loading, setLoading] = useState<string | null>(null);

  const loadRelays = useCallback(async () => {
    try {
      const res = await api.get('/relay');
      setRelays({ led1: res.data.led1, led2: res.data.led2, led3: res.data.led3, led4: res.data.led4 });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadRelays();
    const interval = setInterval(loadRelays, 3000);
    return () => clearInterval(interval);
  }, [loadRelays]);

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

      <div className="grid grid-4">
        {devices.map((dev) => {
          const on = relays[dev.key] === 1;
          return (
            <div key={dev.key} className="card" style={{
              background: on ? 'linear-gradient(135deg, #f0f7ff, #e8f4fd)' : 'var(--surface-container-lowest)',
              border: on ? '1px solid rgba(0, 175, 254, 0.2)' : '1px solid rgba(15, 23, 42, 0.06)',
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
                      disabled={loading === dev.key}
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

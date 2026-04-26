import { useState, useEffect, useCallback } from 'react';
import { Hand, CalendarClock, Plus, Trash2, Save, X } from 'lucide-react';
import api from '../services/api';
import type { Schedule } from '../types';

export default function SchedulePage() {
  const [mode, setMode] = useState(0);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editing, setEditing] = useState<Partial<Schedule> | null>(null);

  const load = useCallback(async () => {
    try {
      const [modeRes, schedRes] = await Promise.all([
        api.get('/mode'),
        api.get('/schedule'),
      ]);
      setMode(modeRes.data.mode);
      setSchedules(schedRes.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleMode(newMode: number) {
    await api.put('/mode', { mode: newMode });
    setMode(newMode);
  }

  async function saveSchedule() {
    if (!editing) return;
    try {
      if (editing.id) {
        await api.put(`/schedule/${editing.id}`, {
          ledName: editing.led_name,
          turnOnTime: editing.turn_on_time,
          turnOffTime: editing.turn_off_time,
        });
      } else {
        await api.post('/schedule', {
          ledName: editing.led_name,
          turnOnTime: editing.turn_on_time,
          turnOffTime: editing.turn_off_time,
        });
      }
      setEditing(null);
      load();
    } catch (e) { console.error(e); }
  }

  async function deleteSchedule(id: number) {
    await api.delete(`/schedule/${id}`);
    load();
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Điều khiển & Lịch trình</h1>
          <p>Quản lý hoạt động thiết bị và thời gian tự động.</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
        <div className="card-body">
          <h3 className="card-title">Chế độ Hoạt động</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <button
              className={mode === 0 ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => toggleMode(0)}
              style={{ minHeight: 56, fontSize: 16 }}
            >
              <Hand size={20} /> Điều khiển Thủ công
            </button>
            <button
              className={mode === 1 ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => toggleMode(1)}
              style={{ minHeight: 56, fontSize: 16 }}
            >
              <CalendarClock size={20} /> Lịch trình Tự động
            </button>
          </div>
        </div>
      </div>

      {/* Schedule table */}
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>Lịch trình Tự động hóa</h3>
            <button className="btn btn-primary" onClick={() => setEditing({ led_name: 'LED1', turn_on_time: '08:00', turn_off_time: '18:00' })}>
              <Plus size={16} /> Thêm Mới
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Thiết bị</th>
                <th>Thời gian Bật</th>
                <th>Thời gian Tắt</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.led_name}</td>
                  <td>🕐 {s.turn_on_time}</td>
                  <td>🕐 {s.turn_off_time}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline" style={{ padding: '6px 12px', minHeight: 32 }} onClick={() => setEditing(s)}>Sửa</button>
                      <button className="btn btn-outline" style={{ padding: '6px 12px', minHeight: 32, color: 'var(--error)' }} onClick={() => deleteSchedule(s.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: 32 }}>Chưa có lịch tự động</td></tr>
              )}
            </tbody>
          </table>

          {/* Edit form */}
          {editing && (
            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-container-low)' }}>
              <h4 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>{editing.id ? 'Chỉnh sửa' : 'Thêm mới'} lịch</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                <div>
                  <label className="form-label">Thiết bị</label>
                  <select className="input-field" value={editing.led_name || ''} onChange={e => setEditing({ ...editing, led_name: e.target.value })}>
                    <option value="LED1">LED1 - Đèn sợi đốt</option>
                    <option value="LED2">LED2 - Máy bơm</option>
                    <option value="LED3">LED3 - Máy quạt</option>
                    <option value="LED4">LED4 - Phun sương</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Thời gian Bật</label>
                  <input className="input-field" type="time" value={editing.turn_on_time || ''} onChange={e => setEditing({ ...editing, turn_on_time: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Thời gian Tắt</label>
                  <input className="input-field" type="time" value={editing.turn_off_time || ''} onChange={e => setEditing({ ...editing, turn_off_time: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-md)', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setEditing(null)}><X size={16} /> Hủy</button>
                <button className="btn btn-primary" onClick={saveSchedule}><Save size={16} /> Lưu Lịch trình</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

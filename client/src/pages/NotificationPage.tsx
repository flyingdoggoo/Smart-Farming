import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: Date;
}

export default function NotificationPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSystemStatus() {
      try {
        const newAlerts: Alert[] = [];
        
        // Lấy thông số mới nhất và cài đặt
        const [sensorRes, settingsRes] = await Promise.all([
          api.get('/sensor/latest'),
          api.get('/settings')
        ]);

        const data = sensorRes.data;
        const settings = settingsRes.data;

        // Check Temperature
        if (data.temp !== null && settings.temperatureThreshold) {
          if (data.temp > settings.temperatureThreshold) {
            newAlerts.push({
              id: 'temp_high',
              type: 'error',
              title: 'Cảnh báo Nhiệt độ cao!',
              message: `Nhiệt độ hiện tại (${data.temp}°C) đang vượt ngưỡng an toàn (${settings.temperatureThreshold}°C). Vui lòng kiểm tra hệ thống làm mát.`,
              timestamp: new Date()
            });
          }
        }

        // Check Humidity
        if (data.humi !== null) {
          if (data.humi < 40) {
            newAlerts.push({
              id: 'humi_low',
              type: 'warning',
              title: 'Độ ẩm đất thấp',
              message: `Độ ẩm hiện tại (${data.humi}%) ở mức thấp. Khuyến nghị bật máy bơm chìm.`,
              timestamp: new Date()
            });
          }
        }

        // Welcome notification
        newAlerts.push({
          id: 'welcome',
          type: 'info',
          title: 'Hệ thống Smart Farming đang hoạt động',
          message: 'Hệ thống đang thu thập dữ liệu và giám sát môi trường theo thời gian thực.',
          timestamp: new Date()
        });

        setAlerts(newAlerts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle color="var(--error)" size={24} />;
      case 'warning': return <AlertTriangle color="var(--warning)" size={24} />;
      case 'success': return <CheckCircle2 color="var(--success)" size={24} />;
      default: return <Info color="var(--primary)" size={24} />;
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Thông báo Hệ thống</h1>
          <p>Xem các cảnh báo và cập nhật trạng thái hoạt động của hệ thống.</p>
        </div>
        <div className="badge badge-neutral">
          <Bell size={14} />
          <span>{alerts.length} Thông báo</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-variant)' }}>
            Đang tải thông báo...
          </div>
        ) : alerts.length > 0 ? (
          alerts.map(alert => (
            <div key={alert.id} className="card" style={{ 
              borderLeft: `4px solid var(--${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'success' : 'primary'})` 
            }}>
              <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ 
                  background: 'var(--surface-container-lowest)', 
                  padding: 12, 
                  borderRadius: 'var(--radius-full)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {getIcon(alert.type)}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: 'var(--on-surface)' }}>{alert.title}</h3>
                  <p style={{ margin: '0 0 8px 0', color: 'var(--on-surface-variant)', fontSize: 14 }}>{alert.message}</p>
                  <div className="text-label-sm text-muted">
                    {alert.timestamp.toLocaleTimeString('vi-VN')} - {alert.timestamp.toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-variant)' }}>
              <CheckCircle2 size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <div>Không có thông báo hoặc cảnh báo nào.<br/>Hệ thống đang hoạt động ổn định.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

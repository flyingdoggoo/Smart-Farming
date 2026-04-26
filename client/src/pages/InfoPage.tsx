import { Cpu, Wifi, GraduationCap, ExternalLink } from 'lucide-react';

export default function InfoPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Thông tin Hệ thống</h1>
          <p>Bảng điều khiển IoT Nông nghiệp Thông minh - NCKH DUT</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        <div className="card">
          <div className="card-body">
            <h3 className="card-title">🔧 Phần cứng</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { icon: Cpu, label: 'MCU', value: 'ESP32 DevKit V1' },
                { icon: Wifi, label: 'Connectivity', value: 'WiFi 2.4GHz + HTTPS' },
                { icon: Cpu, label: 'Soil Sensor', value: 'NPK RS485 7-in-1' },
                { icon: Cpu, label: 'Light Sensor', value: 'BH1750 (I2C)' },
                { icon: Cpu, label: 'Power Sensor', value: 'INA219 (I2C)' },
                { icon: Cpu, label: 'Actuators', value: '4× Relay (12/14/32/33)' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface-container)' }}>
                  <span className="text-muted">{item.label}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">💻 Cấu trúc Phần mềm</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { label: 'Frontend', value: 'React 19 + Vite + TypeScript' },
                { label: 'Backend', value: 'Node.js + Express + Prisma' },
                { label: 'Database', value: 'PostgreSQL 16 (Docker)' },
                { label: 'ML Server', value: 'Flask + scikit-learn (Random Forest)' },
                { label: 'Charts', value: 'Recharts' },
                { label: 'Auth', value: 'JWT + bcrypt' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface-container)' }}>
                  <span className="text-muted">{item.label}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-body">
            <h3 className="card-title">🎓 Thông tin dự án</h3>
            <p className="text-body-lg" style={{ marginBottom: 'var(--space-md)' }}>
              Dự án Nghiên Cứu Khoa Học - Hệ thống giám sát và điều khiển nông nghiệp thông minh.
              Sử dụng ESP32 thu thập dữ liệu cảm biến đất (nhiệt độ, độ ẩm, EC, pH, NPK), cảm biến ánh sáng BH1750 và cảm biến điện INA219.
              Tích hợp mô hình Machine Learning dự đoán cây trồng phù hợp dựa trên thông số đất.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div className="badge badge-neutral" style={{ padding: '8px 16px' }}>
                <GraduationCap size={16} /> DUT
              </div>
              <div className="badge badge-neutral" style={{ padding: '8px 16px' }}>
                <Cpu size={16} /> NCKH 2024-2025
              </div>
              <div className="badge badge-neutral" style={{ padding: '8px 16px' }}>
                <ExternalLink size={16} /> Smart Farming v2.0
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

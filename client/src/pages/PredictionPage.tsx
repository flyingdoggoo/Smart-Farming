import { useState } from 'react';
import type { FormEvent } from 'react';
import { Sliders, Beaker, Thermometer, Droplets, FlaskConical, CloudRain, Leaf, RefreshCw, Info } from 'lucide-react';
import api from '../services/api';
import type { PredictionCandidate, PredictionResult } from '../types';

const fields = [
  { name: 'Nitrogen', label: 'Nitrogen (N) Ratio', placeholder: 'e.g., 90', icon: Beaker },
  { name: 'Phosporus', label: 'Phosphorus (P) Ratio', placeholder: 'e.g., 42', icon: Beaker },
  { name: 'Potassium', label: 'Potassium (K) Ratio', placeholder: 'e.g., 43', icon: Beaker },
  { name: 'Temperature', label: 'Temperature (°C)', placeholder: 'e.g., 25.5', icon: Thermometer },
  { name: 'Humidity', label: 'Humidity (%)', placeholder: 'e.g., 82.0', icon: Droplets },
  { name: 'pH', label: 'pH Level', placeholder: 'e.g., 6.5', icon: FlaskConical },
  { name: 'Rainfall', label: 'Rainfall (mm)', placeholder: 'e.g., 200.5', icon: CloudRain },
];

function formatConfidence(value: number | null): string {
  return value !== null ? `${value}%` : 'N/A';
}

function sortByConfidenceDesc(predictions: PredictionCandidate[]): PredictionCandidate[] {
  return [...predictions].sort((left, right) => {
    const leftValue = left.confidence ?? -1;
    const rightValue = right.confidence ?? -1;
    return rightValue - leftValue;
  });
}

export default function PredictionPage() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [error, setError] = useState('');

  async function handleAutoFill() {
    setAutofilling(true);
    try {
      const [sensorRes, weatherRes] = await Promise.all([
        api.get('/sensor/latest'),
        api.get('/weather/today')
      ]);
      const data = sensorRes.data;
      const weather = weatherRes.data;

      if (data) {
        setFormData(prev => ({
          ...prev,
          Temperature: data.temp !== null ? String(data.temp) : prev.Temperature || '',
          Humidity: data.humi !== null ? String(data.humi) : prev.Humidity || '',
          pH: data.ph !== null ? String(data.ph) : prev.pH || '',
          Nitrogen: data.nitrogen !== null ? String(data.nitrogen) : prev.Nitrogen || '',
          Phosporus: data.phosphorus !== null ? String(data.phosphorus) : prev.Phosporus || '',
          Potassium: data.potassium !== null ? String(data.potassium) : prev.Potassium || '',
          Rainfall: weather?.today?.precipitationSumMm !== undefined ? String(weather.today.precipitationSumMm) : prev.Rainfall || '',
        }));
      }
    } catch (e) {
      console.error('Lỗi khi tự động điền:', e);
    } finally {
      setAutofilling(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/predict', formData);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể kết nối ML server');
    } finally {
      setLoading(false);
    }
  }

  const topPredictions = result
    ? sortByConfidenceDesc(
        result.top_predictions && result.top_predictions.length > 0
          ? result.top_predictions
          : result.prediction
            ? [{
                prediction: result.prediction,
                prediction_en: result.prediction_en ?? null,
                confidence: result.confidence,
                crop_id: result.crop_id ?? null,
              }]
            : []
      )
    : [];

  const bestPrediction = topPredictions[0] ?? null;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Gợi ý Cây trồng AI</h1>
          <p>Nhập các thông số đất và môi trường bên dưới. Mô hình máy học sẽ phân tích dữ liệu để dự đoán loại cây trồng phù hợp nhất.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-md)', alignItems: 'start' }}>
        {/* Input form */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Sliders size={20} /> Thông số Môi trường
              </h3>
              <button 
                type="button" 
                onClick={handleAutoFill} 
                disabled={autofilling}
                className="btn btn-primary" 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, 
                  padding: '6px 16px', minHeight: '36px', 
                  borderRadius: 'var(--radius-full)'
                }}
              >
                <RefreshCw size={14} style={{ animation: autofilling ? 'spin 1s linear infinite' : 'none' }} /> 
                {autofilling ? 'Đang lấy dữ liệu...' : 'Tự động lấy dữ liệu'}
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                {fields.map((f) => (
                  <div key={f.name} style={f.name === 'Rainfall' ? { gridColumn: '1 / -1' } : {}}>
                    <label className="form-label">{f.label}</label>
                    <div className="input-with-icon">
                      <f.icon />
                      <input
                        className="input-field"
                        type="number"
                        step="any"
                        placeholder={f.placeholder}
                        value={formData[f.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 'var(--space-lg)', minHeight: 52, fontSize: 16 }}>
                {loading ? <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Đang dự đoán...</> : <><Leaf size={18} /> Nhận Gợi ý</>}
              </button>
            </form>
          </div>
        </div>

        {/* Result panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="card" style={{ background: result ? 'linear-gradient(180deg, var(--surface-container-lowest) 0%, var(--surface-container-low) 100%)' : undefined }}>
            <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
              <div className="text-label-sm" style={{ color: 'var(--secondary)', marginBottom: 'var(--space-md)' }}>
                KẾT QUẢ DỰ ĐOÁN AI
              </div>

              {result ? (
                <>
                  <p className="text-body-md text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                    Danh sách dưới đây được sắp xếp theo confidence giảm dần để bạn chọn cây trồng phù hợp nhất.
                  </p>

                  {topPredictions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--outline-variant)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 'var(--space-md)' }}>
                      {topPredictions.map((candidate, index) => (
                        <div
                          key={`${candidate.crop_id ?? candidate.prediction}-${index}`}
                          style={{
                            background: 'var(--surface-container-lowest)',
                            padding: 'var(--space-sm) var(--space-md)',
                            display: 'grid',
                            gridTemplateColumns: '56px 1fr auto',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                            {candidate.crop_id !== null && candidate.crop_id !== undefined && (
                              <img
                                src={`/assets/crops/${candidate.crop_id}.jpg?v=2`}
                                alt={candidate.prediction}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <Leaf size={20} color="var(--primary)" />
                          </div>

                          <div>
                            <div style={{ fontSize: index === 0 ? 20 : 16, fontWeight: index === 0 ? 800 : 700, color: 'var(--on-surface)' }}>
                              {candidate.prediction}
                            </div>
                            <div className="text-label-sm text-muted">#{index + 1}</div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div className="text-label-sm text-muted">Confidence</div>
                            <div style={{ fontSize: index === 0 ? 24 : 18, fontWeight: 800 }}>
                              {formatConfidence(candidate.confidence)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="login-error" style={{ textAlign: 'left', marginBottom: 'var(--space-md)' }}>
                      Không nhận được danh sách cây trồng từ mô hình.
                    </div>
                  )}

                  {bestPrediction && (
                    <p className="text-body-md text-muted" style={{ marginBottom: 'var(--space-md)', textAlign: 'left' }}>
                      Dựa trên thông số đầu vào, <strong>{bestPrediction.prediction}</strong> đang là lựa chọn tối ưu nhất.
                    </p>
                  )}
                </>
              ) : error ? (
                <div className="login-error" style={{ textAlign: 'left' }}>{error}</div>
              ) : (
                <div style={{ color: 'var(--on-surface-variant)', padding: 32 }}>
                  Nhập thông số và bấm "Get Recommendation" để nhận kết quả dự đoán.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
                <Info size={18} color="var(--secondary)" /> Cách hoạt động
              </h4>
              <p className="text-body-md text-muted">
                Công cụ dự đoán sử dụng mô hình Random Forest được huấn luyện trên hàng ngàn bộ dữ liệu nông nghiệp để ánh xạ các thông số NPK và điều kiện khí hậu vào loại cây trồng phù hợp nhất.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

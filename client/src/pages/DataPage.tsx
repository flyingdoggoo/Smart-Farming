import { useState, useEffect, useCallback } from 'react';
import { Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function DataPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/sensor/table?page=${page}&perPage=${perPage}&sortOrder=${sortOrder}`);
      setRows(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (e) { console.error(e); }
  }, [page, perPage, sortOrder]);

  useEffect(() => { load(); }, [load]);

  const v = (val: any, d = 1) => val != null ? Number(val).toFixed(d) : '--';

  function exportCSV() {
    if (!rows.length) return;
    const headers = ['ID', 'Timestamp', 'Temp', 'Humidity', 'EC', 'pH', 'N', 'P', 'K', 'Lux', 'Voltage', 'Current', 'Power', 'NPK OK', 'BH1750 OK', 'INA219 OK'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [r.id, r.regDate, r.soilTemperature, r.soilHumidity, r.soilConductivity, r.soilPH, r.nitrogen, r.phosphorus, r.potassium, r.lux, r.voltageV, r.currentA, r.powerW, r.npkValid, r.bh1750Valid, r.ina219Valid].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sensor_data.csv'; a.click();
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Dữ liệu Cảm biến</h1>
          <p>Lịch sử dữ liệu chi tiết từ tất cả các trạm.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input-field" style={{ width: 200 }} value={sortOrder} onChange={e => { setSortOrder(e.target.value as any); setPage(1); }}>
          <option value="desc">Sắp xếp: Mới nhất</option>
          <option value="asc">Sắp xếp: Cũ nhất</option>
        </select>
        <select className="input-field" style={{ width: 140 }} value={perPage} onChange={e => { setPerPage(+e.target.value); setPage(1); }}>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
          <option value="100">100 / trang</option>
        </select>
        <button className="btn btn-outline" onClick={load}><Filter size={16} /> Lọc Dữ liệu</button>
        <button className="btn btn-primary" onClick={exportCSV}><Download size={16} /> Xuất CSV</button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Thời gian</th>
                <th>Nhiệt độ (°C)</th>
                <th>Độ ẩm (%)</th>
                <th>EC (mS/cm)</th>
                <th>pH</th>
                <th>N (mg/kg)</th>
                <th>P (mg/kg)</th>
                <th>K (mg/kg)</th>
                <th>Ánh sáng (Lux)</th>
                <th>Điện áp (V)</th>
                <th>Dòng (A)</th>
                <th>Công suất (W)</th>
                <th>Lỗi Cảm Biến</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--on-surface-variant)' }}>#{r.id}</td>
                  <td>{r.regDate ? new Date(r.regDate).toLocaleString('vi') : '--'}</td>
                  <td>{v(r.soilTemperature)}</td>
                  <td>{v(r.soilHumidity)}</td>
                  <td className={r.soilConductivity > 1800 ? 'anomaly' : ''}>{v(r.soilConductivity)}</td>
                  <td>{v(r.soilPH)}</td>
                  <td className={r.nitrogen < 100 ? 'anomaly' : ''}>{v(r.nitrogen, 0)}</td>
                  <td>{v(r.phosphorus, 0)}</td>
                  <td>{v(r.potassium, 0)}</td>
                  <td>{v(r.lux, 0)}</td>
                  <td>{v(r.voltageV, 2)}</td>
                  <td>{v(r.currentA, 3)}</td>
                  <td>{v(r.powerW, 2)}</td>
                  <td style={{ fontSize: '12px' }}>
                    {!r.npkValid && <span style={{ color: 'var(--error)', marginRight: 4 }}>NPK</span>}
                    {!r.bh1750Valid && <span style={{ color: 'var(--error)', marginRight: 4 }}>BH1750</span>}
                    {!r.ina219Valid && <span style={{ color: 'var(--error)' }}>INA219</span>}
                    {(r.npkValid && r.bh1750Valid && r.ina219Valid) ? <span style={{ color: 'var(--success)' }}>OK</span> : ''}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={16} style={{ textAlign: 'center', padding: 48, color: 'var(--on-surface-variant)' }}>Chưa có dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)' }}>
        <span className="text-body-md text-muted">
          Hiển thị {Math.min((page - 1) * perPage + 1, total)} đến {Math.min(page * perPage, total)} trong tổng số <strong>{total}</strong> bản ghi
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="btn btn-outline" style={{ padding: '6px 10px', minHeight: 32 }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + 1;
            return (
              <button key={p} className={p === page ? 'btn btn-primary' : 'btn btn-outline'} style={{ padding: '6px 12px', minHeight: 32, minWidth: 36 }} onClick={() => setPage(p)}>
                {p}
              </button>
            );
          })}
          {totalPages > 5 && <span style={{ padding: '0 8px', color: 'var(--on-surface-variant)' }}>...</span>}
          {totalPages > 5 && (
            <button className="btn btn-outline" style={{ padding: '6px 12px', minHeight: 32 }} onClick={() => setPage(totalPages)}>{totalPages}</button>
          )}
          <button className="btn btn-outline" style={{ padding: '6px 10px', minHeight: 32 }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

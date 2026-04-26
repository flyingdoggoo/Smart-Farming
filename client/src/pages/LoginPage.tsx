import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User } from 'lucide-react';
import api from '../services/api';
import dutLogo from '../assets/dut-logo.jpg';
import heroImage from '../assets/hero.png';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell fade-in">
        <div className="login-visual">
          <img src={heroImage} alt="Smart Farm" className="login-visual-image" />
          <div className="login-visual-overlay" />
          <div className="login-visual-content">
            <img src={dutLogo} alt="DUT Logo" className="login-dut-logo" />
            <h1>Nền tảng Nông nghiệp Thông minh</h1>
            <p>Giám sát cảm biến đất và vận hành hệ thống IoT theo thời gian thực.</p>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-title-wrap">
            <div className="login-brand-line">
              <img src={dutLogo} alt="DUT Logo" className="login-inline-logo" />
              <span>Smart Farming</span>
            </div>
            <h2>Chào mừng Trở lại</h2>
            <p>Đăng nhập để truy cập hệ thống.</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  className="input-field"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  className="input-field"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button className="btn btn-primary login-submit-btn" type="submit" disabled={loading}>
              <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="login-footnote">
            © 2026 Smart Farming • DUT
          </div>
        </div>
      </div>
    </div>
  );
}

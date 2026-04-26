import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarClock, LineChart, Database, Brain, Info,
  Cpu, Wifi, Bell, HelpCircle, LogOut
} from 'lucide-react';
import dutLogo from '../assets/dut-logo.jpg';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/control', label: 'Control & Schedule', icon: CalendarClock },
  { to: '/charts', label: 'Charts', icon: LineChart },
  { to: '/data', label: 'Data', icon: Database },
  { to: '/predict', label: 'AI Prediction', icon: Brain },
  { to: '/info', label: 'Info', icon: Info },
];

const systemItems = [
  { icon: Cpu, label: 'ESP32' },
  { icon: Wifi, label: 'IoT' },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={dutLogo} alt="DUT Logo" className="sidebar-brand-logo" />
          <div className="sidebar-brand-text">
            <h2>Smart Farming</h2>
            <span>Monitoring</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="sidebar-section-label">System</div>
          {systemItems.map((item) => (
            <div key={item.label} className="sidebar-nav-item" style={{ cursor: 'default', opacity: 0.7 }}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item" onClick={handleLogout} style={{ width: '100%', color: 'var(--error)' }}>
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Topbar */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">Dashboard</div>
          <div className="topbar-right">
            <button className="topbar-icon-btn"><Bell size={20} /></button>
            <button className="topbar-icon-btn"><HelpCircle size={20} /></button>
            <div className="topbar-avatar">
              {(user.fname || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

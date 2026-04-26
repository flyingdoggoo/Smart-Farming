import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DeviceControlPage from './pages/DeviceControlPage';
import SchedulePage from './pages/SchedulePage';
import ChartsPage from './pages/ChartsPage';
import DataPage from './pages/DataPage';
import PredictionPage from './pages/PredictionPage';
import InfoPage from './pages/InfoPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="control" element={<DeviceControlPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="charts" element={<ChartsPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="predict" element={<PredictionPage />} />
          <Route path="info" element={<InfoPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

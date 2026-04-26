import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import authRoutes from './routes/auth.routes';
import sensorRoutes from './routes/sensor.routes';
import relayRoutes from './routes/relay.routes';
import modeRoutes from './routes/mode.routes';
import scheduleRoutes from './routes/schedule.routes';
import settingsRoutes from './routes/settings.routes';
import predictRoutes from './routes/predict.routes';
import weatherRoutes from './routes/weather.routes';
import legacyRoutes from './routes/legacy.routes';
import alertRoutes from './routes/alert.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/relay', relayRoutes);
app.use('/api/mode', modeRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/predict', predictRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/database', legacyRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'NCKH Smart Farming API is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🌱 Smart Farming API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

export default app;

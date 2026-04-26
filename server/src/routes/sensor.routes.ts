import { Router } from 'express';
import * as sensorController from '../controllers/sensor.controller';

const router = Router();

// GET /api/sensor/latest — dữ liệu cảm biến mới nhất
router.get('/latest', sensorController.getLatest);

// GET /api/sensor/history — dữ liệu cho biểu đồ
router.get('/history', sensorController.getHistory);

// GET /api/sensor/table — paginated data for table view
router.get('/table', sensorController.getTable);

// GET /api/sensor — ESP32 gửi data qua GET (tương thích firmware cũ)
// POST /api/sensor — Web app gửi data
router.all('/', sensorController.insertData);

export default router;

import { Router } from 'express';
import * as scheduleController from '../controllers/schedule.controller';

const router = Router();

// GET /api/schedule — lấy toàn bộ lịch
router.get('/', scheduleController.getAll);

// POST /api/schedule — tạo lịch mới
router.post('/', scheduleController.create);

// PUT /api/schedule/:id — cập nhật lịch
router.put('/:id', scheduleController.update);

// DELETE /api/schedule/:id — xóa lịch
router.delete('/:id', scheduleController.remove);

export default router;

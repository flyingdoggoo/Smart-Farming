import { Router } from 'express';
import * as weatherController from '../controllers/weather.controller';

const router = Router();

// GET /api/weather/today
router.get('/today', weatherController.getToday);

export default router;

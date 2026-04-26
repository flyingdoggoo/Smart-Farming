import { Router } from 'express';
import * as alertController from '../controllers/alert.controller';

const router = Router();

// GET /api/alerts/temperature/check
router.get('/temperature/check', alertController.checkTemperature);

export default router;

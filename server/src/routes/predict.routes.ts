import { Router } from 'express';
import * as predictController from '../controllers/predict.controller';

const router = Router();

// POST /api/predict
router.post('/', predictController.predict);

export default router;

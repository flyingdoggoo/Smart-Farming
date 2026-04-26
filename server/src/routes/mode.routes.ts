import { Router } from 'express';
import * as modeController from '../controllers/mode.controller';

const router = Router();

// GET /api/mode
router.get('/', modeController.getMode);

// PUT /api/mode
router.put('/', modeController.updateMode);

export default router;

import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';

const router = Router();

// GET /api/settings
router.get('/', settingsController.getSettings);

// PUT /api/settings
router.put('/', settingsController.updateSettings);

export default router;

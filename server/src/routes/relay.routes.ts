import { Router } from 'express';
import * as relayController from '../controllers/relay.controller';

const router = Router();

// GET /api/relay — lấy trạng thái relay (cho ESP32 + web)
router.get('/', relayController.getStatus);

// PUT /api/relay/:name — toggle relay từ web
router.put('/:name', relayController.toggle);

export default router;

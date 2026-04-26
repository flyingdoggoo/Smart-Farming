import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me
router.get('/me', authMiddleware, authController.getMe);

export default router;

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as authService from '../services/auth.service';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { fname, username, password } = req.body;

    if (!fname || !username || !password) {
      res.status(400).json({ ok: false, message: 'Thiếu thông tin đăng ký' });
      return;
    }

    const result = await authService.register({ fname, username, password });
    res.status(201).json({ ok: true, message: 'Đăng ký thành công', ...result });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ ok: false, message: error.message });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ ok: false, message: 'Thiếu username hoặc password' });
      return;
    }

    const result = await authService.login({ username, password });
    res.json({ ok: true, message: 'Đăng nhập thành công', ...result });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ ok: false, message: error.message });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await authService.getMe(req.userId!);
    res.json({ ok: true, user });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ ok: false, message: error.message });
      return;
    }
    console.error('Me error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

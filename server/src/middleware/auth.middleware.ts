import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, message: 'Token không hợp lệ hoặc thiếu' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
      userId: number;
      username: string;
    };

    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch {
    res.status(401).json({ ok: false, message: 'Token hết hạn hoặc không hợp lệ' });
  }
}

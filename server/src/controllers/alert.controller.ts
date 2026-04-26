import { Request, Response } from 'express';
import * as alertService from '../services/alert.service';

export async function checkTemperature(_req: Request, res: Response): Promise<void> {
  try {
    const result = await alertService.checkAndNotifyTemperatureAlert('manual-api');
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('Check temperature alert error:', error);
    res.status(500).json({ ok: false, message: error.message || 'Lỗi kiểm tra cảnh báo nhiệt độ' });
  }
}

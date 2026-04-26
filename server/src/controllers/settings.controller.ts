import { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';
import { parseRequiredNumber } from '../utils/request-value';

export async function getSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await settingsService.getSettings();
    res.json({ ok: true, ...settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const parsed = parseRequiredNumber(req.body as Record<string, unknown>, 'temperatureThreshold');
    if (parsed.error) {
      res.status(400).json({ ok: false, message: parsed.error });
      return;
    }

    await settingsService.updateSettings(parsed.value as number);
    res.json({ ok: true, message: 'Update settings OK' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

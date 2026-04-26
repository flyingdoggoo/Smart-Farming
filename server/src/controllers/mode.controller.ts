import { Request, Response } from 'express';
import * as modeService from '../services/mode.service';
import { parseRequiredNumber } from '../utils/request-value';

export async function getMode(_req: Request, res: Response): Promise<void> {
  try {
    const mode = await modeService.getMode();
    res.json({ ok: true, mode });
  } catch (error) {
    console.error('Get mode error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function updateMode(req: Request, res: Response): Promise<void> {
  try {
    const parsedMode = parseRequiredNumber(req.body as Record<string, unknown>, 'mode');
    if (parsedMode.error) {
      res.status(400).json({ ok: false, message: parsedMode.error });
      return;
    }

    const modeValue = await modeService.updateMode(parsedMode.value as number);
    res.json({ ok: true, message: 'Update mode OK', mode: modeValue });
  } catch (error) {
    console.error('Update mode error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

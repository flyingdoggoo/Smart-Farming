import { Request, Response } from 'express';
import * as predictService from '../services/predict.service';
import { parseRequiredNumber } from '../utils/request-value';

export async function predict(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as Record<string, unknown>;
    const parsed = {
      Nitrogen: parseRequiredNumber(payload, 'Nitrogen'),
      Phosporus: parseRequiredNumber(payload, 'Phosporus'),
      Potassium: parseRequiredNumber(payload, 'Potassium'),
      Temperature: parseRequiredNumber(payload, 'Temperature'),
      Humidity: parseRequiredNumber(payload, 'Humidity'),
      pH: parseRequiredNumber(payload, 'pH'),
      Rainfall: parseRequiredNumber(payload, 'Rainfall'),
    };

    const validationErrors = Object.values(parsed)
      .filter(item => item.error)
      .map(item => item.error as string);

    if (validationErrors.length > 0) {
      res.status(400).json({
        ok: false,
        message: validationErrors.join('; '),
      });
      return;
    }

    const result = await predictService.predict({
      Nitrogen: parsed.Nitrogen.value as number,
      Phosporus: parsed.Phosporus.value as number,
      Potassium: parsed.Potassium.value as number,
      Temperature: parsed.Temperature.value as number,
      Humidity: parsed.Humidity.value as number,
      pH: parsed.pH.value as number,
      Rainfall: parsed.Rainfall.value as number,
    });

    res.json({ ok: true, ...result });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ ok: false, message: error.message });
      return;
    }
    console.error('Predict error:', error);
    res.status(502).json({ ok: false, message: 'Không thể kết nối ML server' });
  }
}

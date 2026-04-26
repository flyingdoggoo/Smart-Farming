import { Request, Response } from 'express';
import * as weatherService from '../services/weather.service';

export async function getToday(req: Request, res: Response): Promise<void> {
  try {
    const latitude = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
    const longitude = req.query.lon !== undefined ? Number(req.query.lon) : undefined;
    const locationName = req.query.name !== undefined ? String(req.query.name) : undefined;

    if (req.query.lat !== undefined && Number.isNaN(latitude)) {
      res.status(400).json({ ok: false, message: 'lat khong hop le' });
      return;
    }

    if (req.query.lon !== undefined && Number.isNaN(longitude)) {
      res.status(400).json({ ok: false, message: 'lon khong hop le' });
      return;
    }

    const data = await weatherService.getTodayWeather({
      latitude,
      longitude,
      locationName,
    });

    res.json({ ok: true, ...data });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ ok: false, message: error.message });
      return;
    }

    console.error('Get weather today error:', error);
    res.status(500).json({ ok: false, message: 'Loi server lay du lieu thoi tiet' });
  }
}

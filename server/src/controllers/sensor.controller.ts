import { Request, Response } from 'express';
import * as sensorService from '../services/sensor.service';
import * as alertService from '../services/alert.service';
import { parseOptionalInteger, parseOptionalNumber, parseRequiredNumber } from '../utils/request-value';

export async function getLatest(_req: Request, res: Response): Promise<void> {
  try {
    const data = await sensorService.getLatest();
    res.json(data);
  } catch (error) {
    console.error('Get latest sensor error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 40;
    const days = parseInt(req.query.days as string) || 0;
    const data = await sensorService.getHistory(limit, days);
    res.json(data);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function getTable(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 50;
    const sortField = (req.query.sortField as string) || 'regDate';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' as const : 'desc' as const;

    const result = await sensorService.getTable(page, perPage, sortField, sortOrder);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function insertData(req: Request, res: Response): Promise<void> {
  try {
    const params = (req.method === 'GET' ? req.query : req.body) as Record<string, unknown>;
    const parsed = {
      soilTemperature: parseRequiredNumber(params, 'soilTemperature'),
      soilHumidity: parseRequiredNumber(params, 'soilHumidity'),
      soilConductivity: parseRequiredNumber(params, 'soilConductivity'),
      soilPH: parseRequiredNumber(params, 'soilPH'),
      nitrogen: parseRequiredNumber(params, 'nitrogen'),
      phosphorus: parseRequiredNumber(params, 'phosphorus'),
      potassium: parseRequiredNumber(params, 'potassium'),
      lux: parseOptionalNumber(params, 'lux'),
      voltageV: parseOptionalNumber(params, 'voltageV'),
      busVoltageV: parseOptionalNumber(params, 'busVoltageV'),
      shuntVoltageMv: parseOptionalNumber(params, 'shuntVoltageMv'),
      currentA: parseOptionalNumber(params, 'currentA'),
      powerW: parseOptionalNumber(params, 'powerW'),
      activeRelays: parseOptionalInteger(params, 'activeRelays', 0),
    };

    const validationErrors = Object.values(parsed)
      .filter(item => item.error)
      .map(item => item.error as string);

    if (validationErrors.length > 0) {
      res.status(400).json({ ok: false, message: validationErrors.join('; ') });
      return;
    }

    const data = await sensorService.insertSensorData({
      soilTemperature: parsed.soilTemperature.value as number,
      soilHumidity: parsed.soilHumidity.value as number,
      soilConductivity: parsed.soilConductivity.value as number,
      soilPH: parsed.soilPH.value as number,
      nitrogen: parsed.nitrogen.value as number,
      phosphorus: parsed.phosphorus.value as number,
      potassium: parsed.potassium.value as number,
      lux: parsed.lux.value,
      voltageV: parsed.voltageV.value,
      busVoltageV: parsed.busVoltageV.value,
      shuntVoltageMv: parsed.shuntVoltageMv.value,
      currentA: parsed.currentA.value,
      powerW: parsed.powerW.value,
      activeRelays: parsed.activeRelays.value,
    });

    try {
      await alertService.checkAndNotifyTemperatureAlert('sensor-insert');
    } catch (alertError) {
      // Never fail sensor ingestion because of external alert channel issues.
      console.error('Temperature alert warning:', alertError);
    }

    res.json({ ok: true, message: 'Update sensor data OK', id: data.id });
  } catch (error) {
    console.error('Insert sensor error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

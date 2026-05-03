import { Request, Response } from 'express';
import * as legacyService from '../services/legacy.service';
import * as modeService from '../services/mode.service';
import * as relayService from '../services/relay.service';
import * as sensorService from '../services/sensor.service';
import * as settingsService from '../services/settings.service';
import * as alertService from '../services/alert.service';
import { getSingleValue } from '../utils/request-value';

function applyRedirect(res: Response, redirect: { target: string; statusCode?: number }) {
  if (redirect.statusCode) {
    res.redirect(redirect.statusCode, redirect.target);
    return;
  }
  res.redirect(redirect.target);
}

export async function updatePhpCompat(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as Record<string, unknown>;

    const ledName = getSingleValue(query, 'led');
    const statusParam = getSingleValue(query, 'status');

    if (ledName && statusParam !== undefined) {
      const result = await relayService.toggleRelay(ledName, parseInt(statusParam, 10) === 1);
      res.json({ ok: true, message: 'Update relay OK', ...result });
      return;
    }

    const led1 = getSingleValue(query, 'led1');
    const led2 = getSingleValue(query, 'led2');
    const led3 = getSingleValue(query, 'led3');
    const led4 = getSingleValue(query, 'led4');

    if (led1 !== undefined && led2 !== undefined && led3 !== undefined && led4 !== undefined) {
      const result = await relayService.batchUpdateRelays(
        parseInt(led1, 10) === 1,
        parseInt(led2, 10) === 1,
        parseInt(led3, 10) === 1,
        parseInt(led4, 10) === 1,
      );
      res.json({ ok: true, message: 'Batch update relay OK', ...result });
      return;
    }

    const redirect = legacyService.resolveUpdateRedirect(req.query);
    applyRedirect(res, redirect);
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ ok: false, message: error.message });
      return;
    }
    console.error('Legacy update.php error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function getLedStatusPhpCompat(_req: Request, res: Response): Promise<void> {
  try {
    const status = await relayService.getAllRelayStatus();
    res.json({ ok: true, ...status });
  } catch (error) {
    console.error('Legacy getLedStatus.php error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function getModePhpCompat(_req: Request, res: Response): Promise<void> {
  try {
    const mode = await modeService.getMode();
    res.type('text/plain').send(String(mode));
  } catch (error) {
    console.error('Legacy getmode.php error:', error);
    res.type('text/plain').send('0');
  }
}

export function getTimeOnOffPhpCompat(_req: Request, res: Response): void {
  applyRedirect(res, legacyService.resolveScheduleRedirect());
}

export async function getSensorDataPhpCompat(_req: Request, res: Response): Promise<void> {
  try {
    const data = await sensorService.getLatestLegacySensorData();
    res.json(data);
  } catch (error) {
    console.error('Legacy getSensorData.php error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function getReadingsAjaxPhpCompat(_req: Request, res: Response): Promise<void> {
  try {
    const data = await sensorService.getLatest();
    res.json(data);
  } catch (error) {
    console.error('Legacy get_readings_ajax.php error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function getThresholdPhpCompat(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await settingsService.getSettings();
    res.type('text/plain').send(String(settings.temperatureThreshold));
  } catch (error) {
    console.error('Legacy getThreshhold.php error:', error);
    res.type('text/plain').send('0');
  }
}

export async function checkSensorPhpCompat(_req: Request, res: Response): Promise<void> {
  try {
    const result = await alertService.checkAndNotifyTemperatureAlert('legacy-checkSensor.php');
    res.json({
      status: result.notificationSent ? 'alert_sent' : (result.aboveThreshold ? 'cooldown' : 'ok'),
      message: result.reason,
      threshold: result.threshold,
      currentTemperature: result.currentTemperature,
      aboveThreshold: result.aboveThreshold,
    });
  } catch (error: any) {
    console.error('Legacy checkSensor.php error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi gửi cảnh báo Telegram',
    });
  }
}

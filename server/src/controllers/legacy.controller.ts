import { Request, Response } from 'express';
import * as legacyService from '../services/legacy.service';
import * as modeService from '../services/mode.service';
import * as sensorService from '../services/sensor.service';
import * as settingsService from '../services/settings.service';
import * as alertService from '../services/alert.service';

function applyRedirect(res: Response, redirect: { target: string; statusCode?: number }) {
  if (redirect.statusCode) {
    res.redirect(redirect.statusCode, redirect.target);
    return;
  }
  res.redirect(redirect.target);
}

export function updatePhpCompat(req: Request, res: Response): void {
  const redirect = legacyService.resolveUpdateRedirect(req.query);
  applyRedirect(res, redirect);
}

export function getLedStatusPhpCompat(_req: Request, res: Response): void {
  applyRedirect(res, legacyService.resolveRelayRedirect());
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

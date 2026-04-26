import { Request, Response } from 'express';
import * as scheduleService from '../services/schedule.service';
import { getSingleValue } from '../utils/request-value';

const LED_NAME_REGEX = /^LED[1-4]$/i;
const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeLedName(value: string): string {
  return value.trim().toUpperCase();
}

function validateScheduleInput(payload: Record<string, unknown>, partial = false): string[] {
  const errors: string[] = [];

  const ledName = getSingleValue(payload, 'ledName');
  const turnOnTime = getSingleValue(payload, 'turnOnTime');
  const turnOffTime = getSingleValue(payload, 'turnOffTime');

  if (!partial || ledName !== undefined) {
    if (!ledName || !LED_NAME_REGEX.test(ledName.trim())) {
      errors.push('ledName phải là LED1, LED2, LED3 hoặc LED4');
    }
  }

  if (!partial || turnOnTime !== undefined) {
    if (!turnOnTime || !HH_MM_REGEX.test(turnOnTime.trim())) {
      errors.push('turnOnTime phải theo định dạng HH:mm');
    }
  }

  if (!partial || turnOffTime !== undefined) {
    if (!turnOffTime || !HH_MM_REGEX.test(turnOffTime.trim())) {
      errors.push('turnOffTime phải theo định dạng HH:mm');
    }
  }

  return errors;
}

function parseScheduleId(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function getAll(_req: Request, res: Response): Promise<void> {
  try {
    const schedules = await scheduleService.getAll();
    res.json(schedules);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as Record<string, unknown>;
    const errors = validateScheduleInput(payload);
    if (errors.length > 0) {
      res.status(400).json({ ok: false, message: errors.join('; ') });
      return;
    }

    const schedule = await scheduleService.create({
      ledName: normalizeLedName(getSingleValue(payload, 'ledName') as string),
      turnOnTime: (getSingleValue(payload, 'turnOnTime') as string).trim(),
      turnOffTime: (getSingleValue(payload, 'turnOffTime') as string).trim(),
    });

    res.status(201).json({ ok: true, message: 'Tạo lịch thành công', data: schedule });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = parseScheduleId(req.params.id as string);
    if (!id) {
      res.status(400).json({ ok: false, message: 'ID lịch không hợp lệ' });
      return;
    }

    const payload = req.body as Record<string, unknown>;
    const errors = validateScheduleInput(payload, true);
    if (errors.length > 0) {
      res.status(400).json({ ok: false, message: errors.join('; ') });
      return;
    }

    const ledName = getSingleValue(payload, 'ledName');
    const turnOnTime = getSingleValue(payload, 'turnOnTime');
    const turnOffTime = getSingleValue(payload, 'turnOffTime');

    if (ledName === undefined && turnOnTime === undefined && turnOffTime === undefined) {
      res.status(400).json({ ok: false, message: 'Không có trường nào để cập nhật' });
      return;
    }

    const schedule = await scheduleService.update(id, {
      ...(ledName !== undefined && { ledName: normalizeLedName(ledName) }),
      ...(turnOnTime !== undefined && { turnOnTime: turnOnTime.trim() }),
      ...(turnOffTime !== undefined && { turnOffTime: turnOffTime.trim() }),
    });

    res.json({ ok: true, message: 'Cập nhật lịch thành công', data: schedule });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const id = parseScheduleId(req.params.id as string);
    if (!id) {
      res.status(400).json({ ok: false, message: 'ID lịch không hợp lệ' });
      return;
    }

    await scheduleService.remove(id);
    res.json({ ok: true, message: 'Xóa lịch thành công' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

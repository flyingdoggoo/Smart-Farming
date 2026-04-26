import { Request, Response } from 'express';
import * as relayService from '../services/relay.service';

export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    // ESP32 compat: toggle via GET /api/relay?led=led1&status=1
    const ledName = req.query.led as string;
    const statusParam = req.query.status as string;

    if (ledName && statusParam !== undefined) {
      const result = await relayService.toggleRelay(ledName, parseInt(statusParam) === 1);
      res.json({ ok: true, message: 'Update relay OK', ...result });
      return;
    }

    const status = await relayService.getAllRelayStatus();
    res.json({ ok: true, ...status });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ ok: false, message: error.message });
      return;
    }
    console.error('Relay GET error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

export async function toggle(req: Request, res: Response): Promise<void> {
  try {
    const name = req.params.name as string;
    const { status } = req.body;
    const boolStatus = status === 1 || status === true;

    const result = await relayService.toggleRelay(name, boolStatus);
    res.json({ ok: true, message: 'Update relay OK', ...result });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ ok: false, message: error.message });
      return;
    }
    console.error('Relay PUT error:', error);
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
}

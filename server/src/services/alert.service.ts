import * as settingsService from './settings.service';
import * as sensorService from './sensor.service';

interface AlertState {
  lastWasAboveThreshold: boolean;
  lastSentAtMs: number | null;
}

export interface TemperatureAlertResult {
  enabled: boolean;
  threshold: number;
  currentTemperature: number | null;
  aboveThreshold: boolean;
  notificationSent: boolean;
  reason: string;
  telegramResponse?: unknown;
}

const alertState: AlertState = {
  lastWasAboveThreshold: false,
  lastSentAtMs: null,
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function getTelegramConfig() {
  const enabled = parseBoolean(process.env.TELEGRAM_ALERT_ENABLED, true);
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  const parseMode = (process.env.TELEGRAM_PARSE_MODE || 'HTML').trim();
  const cooldownSec = Math.max(30, Number(process.env.TELEGRAM_ALERT_COOLDOWN_SEC || 1800));

  return {
    enabled,
    botToken,
    chatId,
    parseMode,
    cooldownMs: cooldownSec * 1000,
    dashboardUrl: (process.env.ALERT_DASHBOARD_URL || process.env.CLIENT_URL || '').trim(),
  };
}

function buildAlertMessage(currentTemperature: number, threshold: number, dashboardUrl: string): string {
  const lines = [
    'CẢNH BÁO NHIỆT ĐỘ',
    `Nhiệt độ hiện tại: ${currentTemperature.toFixed(1)}°C`,
    `Ngưỡng cài đặt: ${threshold.toFixed(1)}°C`,
    `Thời gian: ${new Date().toLocaleString('vi-VN')}`,
  ];

  if (dashboardUrl) {
    lines.push(`Dashboard: ${dashboardUrl}`);
  }

  return lines.join('\n');
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: string,
): Promise<unknown> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(`Telegram API error: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

function shouldSendAlert(nowMs: number, cooldownMs: number): boolean {
  if (!alertState.lastWasAboveThreshold) {
    return true;
  }

  if (alertState.lastSentAtMs === null) {
    return true;
  }

  return nowMs - alertState.lastSentAtMs >= cooldownMs;
}

export async function checkAndNotifyTemperatureAlert(source: string): Promise<TemperatureAlertResult> {
  const { temperatureThreshold } = await settingsService.getSettings();
  const latest = await sensorService.getLatest();
  const currentTemperature = latest.temp;
  const threshold = Number(temperatureThreshold || 0);
  const aboveThreshold = currentTemperature !== null && currentTemperature > threshold;

  const config = getTelegramConfig();
  if (!config.enabled) {
    return {
      enabled: false,
      threshold,
      currentTemperature,
      aboveThreshold,
      notificationSent: false,
      reason: 'TELEGRAM_ALERT_ENABLED=false',
    };
  }

  if (!config.botToken || !config.chatId) {
    return {
      enabled: false,
      threshold,
      currentTemperature,
      aboveThreshold,
      notificationSent: false,
      reason: 'Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID',
    };
  }

  if (currentTemperature === null) {
    return {
      enabled: true,
      threshold,
      currentTemperature: null,
      aboveThreshold: false,
      notificationSent: false,
      reason: 'Chưa có dữ liệu nhiệt độ',
    };
  }

  if (!aboveThreshold) {
    alertState.lastWasAboveThreshold = false;
    return {
      enabled: true,
      threshold,
      currentTemperature,
      aboveThreshold: false,
      notificationSent: false,
      reason: 'Nhiệt độ bình thường',
    };
  }

  const nowMs = Date.now();
  if (!shouldSendAlert(nowMs, config.cooldownMs)) {
    alertState.lastWasAboveThreshold = true;
    return {
      enabled: true,
      threshold,
      currentTemperature,
      aboveThreshold: true,
      notificationSent: false,
      reason: `Vượt ngưỡng nhưng đang trong cooldown (${Math.floor(config.cooldownMs / 1000)}s)`,
    };
  }

  const message = buildAlertMessage(currentTemperature, threshold, config.dashboardUrl);
  const telegramResponse = await sendTelegramMessage(
    config.botToken,
    config.chatId,
    message,
    config.parseMode,
  );

  alertState.lastWasAboveThreshold = true;
  alertState.lastSentAtMs = nowMs;

  return {
    enabled: true,
    threshold,
    currentTemperature,
    aboveThreshold: true,
    notificationSent: true,
    reason: `Đã gửi cảnh báo từ nguồn ${source}`,
    telegramResponse,
  };
}

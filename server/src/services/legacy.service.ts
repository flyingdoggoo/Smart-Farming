import { ParsedQs } from 'qs';
import { getSingleValue } from '../utils/request-value';

interface RedirectResult {
  target: string;
  statusCode?: number;
}

function toSearchParams(query: ParsedQs): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined) {
          params.append(key, String(item));
        }
      });
      return;
    }

    if (value !== undefined) {
      params.append(key, String(value));
    }
  });

  return params;
}

export function resolveUpdateRedirect(query: ParsedQs): RedirectResult {
  const queryAsRecord = query as Record<string, unknown>;
  const led = getSingleValue(queryAsRecord, 'led');
  const status = getSingleValue(queryAsRecord, 'status');

  if (led && status !== undefined) {
    const relayParams = new URLSearchParams({ led, status });
    return { target: `/api/relay?${relayParams.toString()}` };
  }

  const sensorParams = toSearchParams(query);
  const sensorQueryString = sensorParams.toString();
  const sensorTarget = sensorQueryString.length > 0
    ? `/api/sensor?${sensorQueryString}`
    : '/api/sensor';

  return { target: sensorTarget, statusCode: 307 };
}

export function resolveRelayRedirect(): RedirectResult {
  return { target: '/api/relay' };
}

export function resolveModeRedirect(): RedirectResult {
  return { target: '/api/mode' };
}

export function resolveScheduleRedirect(): RedirectResult {
  return { target: '/api/schedule' };
}

export function resolveLatestSensorRedirect(): RedirectResult {
  return { target: '/api/sensor/latest' };
}

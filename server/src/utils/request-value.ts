export function getSingleValue(source: Record<string, unknown>, key: string): string | undefined {
  const rawValue = source[key];

  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  if (Array.isArray(rawValue)) {
    if (rawValue.length === 0) {
      return undefined;
    }
    return String(rawValue[0]);
  }

  return String(rawValue);
}

export function parseRequiredNumber(
  source: Record<string, unknown>,
  key: string,
): { value?: number; error?: string } {
  const raw = getSingleValue(source, key);
  if (raw === undefined || raw.trim() === '') {
    return { error: `${key} is required` };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { error: `${key} must be a valid number` };
  }

  return { value };
}

export function parseOptionalNumber(
  source: Record<string, unknown>,
  key: string,
): { value: number | null; error?: string } {
  const raw = getSingleValue(source, key);
  if (raw === undefined || raw.trim() === '') {
    return { value: null };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { value: null, error: `${key} must be a valid number` };
  }

  return { value };
}

export function parseOptionalInteger(
  source: Record<string, unknown>,
  key: string,
  fallback: number,
): { value: number; error?: string } {
  const raw = getSingleValue(source, key);
  if (raw === undefined || raw.trim() === '') {
    return { value: fallback };
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return { value: fallback, error: `${key} must be a valid integer` };
  }

  return { value };
}

export function parseOptionalBoolean(
  source: Record<string, unknown>,
  key: string,
  fallback: boolean,
): { value: boolean; error?: string } {
  const raw = getSingleValue(source, key);
  if (raw === undefined || raw.trim() === '') {
    return { value: fallback };
  }

  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return { value: true };
  if (['0', 'false', 'no', 'off'].includes(normalized)) return { value: false };

  return { value: fallback, error: `${key} must be a valid boolean` };
}

export function parseFirstOptionalNumber(
  source: Record<string, unknown>,
  ...keys: string[]
): { value: number | null; error?: string } {
  for (const key of keys) {
    const res = parseOptionalNumber(source, key);
    if (res.value !== null || res.error) {
      return res;
    }
  }
  return { value: null };
}

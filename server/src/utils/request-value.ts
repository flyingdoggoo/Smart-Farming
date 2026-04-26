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

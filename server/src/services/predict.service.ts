const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8080';

export interface PredictInput {
  Nitrogen: number;
  Phosporus: number;
  Potassium: number;
  Temperature: number;
  Humidity: number;
  pH: number;
  Rainfall: number;
}

interface PredictionCandidate {
  prediction: string;
  prediction_en: string | null;
  confidence: number | null;
  crop_id: number | null;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toNullableInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  return null;
}

function normalizeTopPredictions(raw: unknown): PredictionCandidate[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item): PredictionCandidate | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const prediction = toNullableString(candidate.prediction);
      if (!prediction) {
        return null;
      }

      return {
        prediction,
        prediction_en: toNullableString(candidate.prediction_en),
        confidence: toNullableNumber(candidate.confidence),
        crop_id: toNullableInteger(candidate.crop_id),
      };
    })
    .filter((item): item is PredictionCandidate => item !== null);
}

export async function predict(input: PredictInput) {
  const formBody = new URLSearchParams({
    Nitrogen: String(input.Nitrogen),
    Phosporus: String(input.Phosporus),
    Potassium: String(input.Potassium),
    Temperature: String(input.Temperature),
    Humidity: String(input.Humidity),
    pH: String(input.pH),
    Rainfall: String(input.Rainfall),
  });

  const response = await fetch(`${ML_SERVER_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });

  if (!response.ok) {
    throw { status: 502, message: 'ML server không phản hồi' };
  }

  const data = (await response.json()) as Record<string, unknown>;

  const prediction = toNullableString(data.prediction) ?? toNullableString(data.result);
  const predictionEn = toNullableString(data.prediction_en);
  const confidence = toNullableNumber(data.confidence);
  const cropId = toNullableInteger(data.crop_id);
  const topPredictions = normalizeTopPredictions(data.top_predictions);

  if (topPredictions.length === 0 && prediction) {
    topPredictions.push({
      prediction,
      prediction_en: predictionEn,
      confidence,
      crop_id: cropId,
    });
  }

  return {
    prediction,
    prediction_en: predictionEn,
    model: toNullableString(data.model_name) ?? 'RandomForest',
    model_version: toNullableString(data.model_version),
    confidence,
    crop_id: cropId,
    top_predictions: topPredictions,
  };
}

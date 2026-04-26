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

  const data: any = await response.json();

  return {
    prediction: data.prediction || data.result || null,
    prediction_en: data.prediction_en || null,
    model: data.model_name || 'RandomForest',
    model_version: data.model_version || null,
    confidence: data.confidence || null,
    crop_id: data.crop_id || null,
  };
}

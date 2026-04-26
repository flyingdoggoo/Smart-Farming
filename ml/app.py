from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import os
import json

app = Flask(__name__)
CORS(app)

# Load models
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')


def _resolve_model_version():
    env_version = os.getenv('ML_MODEL_VERSION')
    if env_version and env_version.strip():
        normalized = env_version.strip().lower()
        if normalized not in ('auto', 'latest'):
            return env_version.strip()

    latest_path = os.path.join(MODEL_DIR, 'latest_version.txt')
    if os.path.exists(latest_path):
        try:
            with open(latest_path, 'r', encoding='utf-8') as f:
                value = f.read().strip()
                if value:
                    return value
        except Exception:
            pass

    return 'v1'


MODEL_VERSION = _resolve_model_version()
VERSION_DIR = os.path.join(MODEL_DIR, 'versions', MODEL_VERSION)


def _load_pickle(path):
    with open(path, 'rb') as f:
        return pickle.load(f)


def _load_model_bundle():
    use_version_dir = os.path.isdir(VERSION_DIR)
    artifact_dir = VERSION_DIR if use_version_dir else MODEL_DIR

    model_obj = _load_pickle(os.path.join(artifact_dir, 'model.pkl'))
    standard_scaler = _load_pickle(os.path.join(artifact_dir, 'standscaler.pkl'))
    minmax_scaler = _load_pickle(os.path.join(artifact_dir, 'minmaxscaler.pkl'))

    metadata = {
        'requested_model_version': MODEL_VERSION,
        'model_version': MODEL_VERSION if use_version_dir else 'legacy',
        'artifact_dir': artifact_dir,
        'model_name': type(model_obj).__name__,
    }

    metadata_path = os.path.join(artifact_dir, 'training_metrics.json')
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r', encoding='utf-8') as meta_file:
                metrics = json.load(meta_file)
                metadata['model_name'] = metrics.get('selected_model', metadata['model_name'])
                metadata['training_timestamp'] = metrics.get('training_timestamp')
        except Exception:
            pass

    return model_obj, standard_scaler, minmax_scaler, metadata


model, sc, mx, MODEL_META = _load_model_bundle()

crop_dict = {
    1: "Gạo", 2: "Ngô", 3: "Đay", 4: "Bông", 5: "Dừa", 6: "Đu đủ", 7: "Cam",
    8: "Táo", 9: "Dưa lưới", 10: "Dưa hấu", 11: "Nho", 12: "Xoài", 13: "Chuối",
    14: "Lựu", 15: "Đậu lăng", 16: "Đậu đen", 17: "Đậu xanh", 18: "Đậu bướm",
    19: "Đậu bồ câu", 20: "Đậu thận", 21: "Đậu gà", 22: "Cà phê"
}

crop_dict_en = {
    1: "Rice", 2: "Maize", 3: "Jute", 4: "Cotton", 5: "Coconut", 6: "Papaya", 7: "Orange",
    8: "Apple", 9: "Muskmelon", 10: "Watermelon", 11: "Grapes", 12: "Mango", 13: "Banana",
    14: "Pomegranate", 15: "Lentil", 16: "Blackgram", 17: "Mungbean", 18: "Mothbeans",
    19: "Pigeonpeas", 20: "Kidneybeans", 21: "Chickpea", 22: "Coffee"
}

@app.route('/')
def index():
    return jsonify({"ok": True, "message": "ML Crop Prediction Server is running", "model": MODEL_META})


@app.route('/model-info')
def model_info():
    return jsonify({"ok": True, "model": MODEL_META})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        N = float(request.form.get('Nitrogen', 0))
        P = float(request.form.get('Phosporus', 0))
        K = float(request.form.get('Potassium', 0))
        temp = float(request.form.get('Temperature', 0))
        humidity = float(request.form.get('Humidity', 0))
        ph = float(request.form.get('pH', 0))
        rainfall = float(request.form.get('Rainfall', 0))

        feature_list = [N, P, K, temp, humidity, ph, rainfall]
        single_pred = np.array(feature_list).reshape(1, -1)

        mx_features = mx.transform(single_pred)
        sc_mx_features = sc.transform(mx_features)
        prediction = model.predict(sc_mx_features)

        pred_id = int(prediction[0])
        crop_vi = crop_dict.get(pred_id, "Không xác định")
        crop_en = crop_dict_en.get(pred_id, "Unknown")

        # Get prediction probabilities if available
        confidence = None
        if hasattr(model, 'predict_proba'):
            proba = model.predict_proba(sc_mx_features)
            confidence = round(float(np.max(proba)) * 100, 1)

        return jsonify({
            "ok": True,
            "prediction": crop_vi,
            "prediction_en": crop_en,
            "confidence": confidence,
            "crop_id": pred_id,
            "model_name": MODEL_META.get('model_name', 'Unknown'),
            "model_version": MODEL_META.get('model_version', 'legacy')
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)

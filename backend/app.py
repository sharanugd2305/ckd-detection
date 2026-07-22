from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np

app = Flask(__name__)
CORS(app)

model  = joblib.load('model/rf_model.pkl')
scaler = joblib.load('model/scaler.pkl')

FEATURES = [
    'Age', 'BMI', 'HbA1c', 'SerumCreatinine', 'BUNLevels',
    'GFR', 'HemoglobinLevels', 'CholesterolTotal',
    'ProteinInUrine', 'UrinaryTractInfections',
    'FamilyHistoryKidneyDisease'
]

@app.route('/')
def home():
    return jsonify({'status': 'CKD API is running'})

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    features = [float(data[f]) for f in FEATURES]
    scaled   = scaler.transform([features])
    pred     = model.predict(scaled)[0]
    prob     = model.predict_proba(scaled)[0][1]

    return jsonify({
        'prediction': int(pred),
        'label':      'CKD Detected' if pred == 1 else 'No CKD Detected',
        'confidence': round(float(prob) * 100, 2)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
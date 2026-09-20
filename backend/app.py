import json
import os
from datetime import datetime, timezone
from functools import wraps

import joblib
import numpy as np
import pandas as pd
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from sqlalchemy import Column, DateTime, Float, Integer, JSON, String, create_engine, desc, inspect, text
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'model')
DATASET_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'data', 'ckd_1659.csv'))
load_dotenv(os.path.join(BASE_DIR, '.env'))

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(BASE_DIR, 'nephroscan.db')}")
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql+psycopg://', 1)
elif DATABASE_URL.startswith('postgresql://') and '+psycopg' not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {},
)
Session = scoped_session(sessionmaker(bind=engine, autoflush=False))
Base = declarative_base()


class PredictionHistory(Base):
    __tablename__ = 'prediction_history'

    id = Column(Integer, primary_key=True)
    clerk_user_id = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    inputs = Column(JSON, nullable=False)
    probability = Column(Float, nullable=False)
    label = Column(String(80), nullable=False)
    risk_level = Column(String(80), nullable=False)
    ckd_stage = Column(String(40), nullable=True)
    result_details = Column(JSON, nullable=True)


Base.metadata.create_all(engine)

# Keep deployments created before detailed history was added compatible.
if 'result_details' not in {column['name'] for column in inspect(engine).get_columns('prediction_history')}:
    with engine.begin() as connection:
        connection.execute(text('ALTER TABLE prediction_history ADD COLUMN result_details JSON'))


@app.teardown_appcontext
def remove_database_session(error=None):
    Session.remove()

CLERK_SECRET_KEY = os.getenv('CLERK_SECRET_KEY')
clerk_client = Clerk(bearer_auth=CLERK_SECRET_KEY) if CLERK_SECRET_KEY else None


def optional_clerk_auth(view):
    @wraps(view)
    def authenticated_or_guest_view(*args, **kwargs):
        g.clerk_user_id = None
        authorization = request.headers.get('Authorization', '')
        if not authorization:
            return view(*args, **kwargs)
        if clerk_client is None:
            return jsonify({'error': 'Backend authentication is not configured.'}), 503

        try:
            state = clerk_client.authenticate_request(
                request,
                AuthenticateRequestOptions(secret_key=CLERK_SECRET_KEY),
            )
        except Exception:
            return jsonify({'error': 'Unable to verify the Clerk session.'}), 401

        if not state.is_authenticated or not state.payload or not state.payload.get('sub'):
            return jsonify({'error': 'Your Clerk session is invalid or expired.'}), 401

        g.clerk_user_id = state.payload['sub']
        return view(*args, **kwargs)

    return authenticated_or_guest_view


def require_clerk_auth(view):
    @wraps(view)
    def protected_view(*args, **kwargs):
        if clerk_client is None:
            return jsonify({'error': 'Backend authentication is not configured.'}), 503
        try:
            state = clerk_client.authenticate_request(
                request,
                AuthenticateRequestOptions(secret_key=CLERK_SECRET_KEY),
            )
        except Exception:
            return jsonify({'error': 'Unable to verify the Clerk session.'}), 401
        if not state.is_authenticated or not state.payload or not state.payload.get('sub'):
            return jsonify({'error': 'A valid Clerk sign-in is required.'}), 401
        g.clerk_user_id = state.payload['sub']
        return view(*args, **kwargs)
    return protected_view

with open(os.path.join(MODEL_DIR, 'model_summary.json'), 'r', encoding='utf-8') as f:
    MODEL_SUMMARY = json.load(f)

winner = 'XGBoost'
model = joblib.load(os.path.join(MODEL_DIR, 'xgb_model.pkl'))
scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))

FEATURES = [
    'Age', 'BMI', 'HbA1c', 'SerumCreatinine', 'BUNLevels',
    'GFR', 'HemoglobinLevels', 'CholesterolTotal',
    'ProteinInUrine', 'UrinaryTractInfections',
    'FamilyHistoryKidneyDisease'
]

try:
    DATASET = pd.read_csv(DATASET_PATH)
    FEATURE_MEDIANS = DATASET[FEATURES].median(numeric_only=False).to_dict()
    FEATURE_MEDIANS = {k: float(v) if pd.notna(v) else 0.0 for k, v in FEATURE_MEDIANS.items()}
except Exception:
    FEATURE_MEDIANS = {
        'Age': 55.0,
        'BMI': 25.0,
        'HbA1c': 5.8,
        'SerumCreatinine': 1.1,
        'BUNLevels': 18.0,
        'GFR': 90.0,
        'HemoglobinLevels': 12.5,
        'CholesterolTotal': 180.0,
        'ProteinInUrine': 0.15,
        'UrinaryTractInfections': 0.0,
        'FamilyHistoryKidneyDisease': 0.0,
    }


def calculate_bmi_from_height_weight(raw_data):
    if not isinstance(raw_data, dict):
        return None

    height = raw_data.get('HeightCm')
    weight = raw_data.get('WeightKg')

    if height is None or weight is None:
        return None

    try:
        height_cm = float(height)
        weight_kg = float(weight)
    except (TypeError, ValueError):
        return None

    if height_cm <= 0 or weight_kg <= 0:
        return None

    height_m = height_cm / 100.0
    return weight_kg / (height_m * height_m)


def normalize_user_data(raw_data):
    if not isinstance(raw_data, dict):
        return {}

    normalized = {}
    for key in FEATURES:
        if key == 'BMI':
            value = raw_data.get(key)
            if value is None or value == '':
                computed_bmi = calculate_bmi_from_height_weight(raw_data)
                normalized[key] = computed_bmi if computed_bmi is not None else FEATURE_MEDIANS.get(key, 25.0)
                continue
            try:
                normalized[key] = float(value)
            except (TypeError, ValueError):
                computed_bmi = calculate_bmi_from_height_weight(raw_data)
                normalized[key] = computed_bmi if computed_bmi is not None else FEATURE_MEDIANS.get(key, 25.0)
            continue

        value = raw_data.get(key)
        if value is None or value == '':
            normalized[key] = FEATURE_MEDIANS.get(key, 0.0)
            continue
        try:
            num_value = float(value)
        except (TypeError, ValueError):
            num_value = FEATURE_MEDIANS.get(key, 0.0)
        normalized[key] = num_value

    return normalized


def get_defaulted_fields(raw_data):
    if not isinstance(raw_data, dict):
        return {}

    defaulted = {}
    for key in FEATURES:
        value = raw_data.get(key)
        if value is None or (isinstance(value, str) and value.strip() == ''):
            defaulted[key] = FEATURE_MEDIANS.get(key, 0.0)
    return defaulted


# ── Clinical Risk Adjustment ──────────────────────────────────────────────────
# Blends calibrated model probability with a feature-based clinical score to
# prevent extreme swings for borderline patients.  The model drives 70% of
# the final probability; the clinical score provides a 30% guardrail based
# on established CKD risk indicators.
def clinical_risk_adjustment(model_prob, data):
    """Return (blended_probability, overridden_prediction)."""

    gfr       = float(data.get('GFR', FEATURE_MEDIANS.get('GFR', 90.0)))
    creat     = float(data.get('SerumCreatinine', FEATURE_MEDIANS.get('SerumCreatinine', 1.1)))
    protein   = float(data.get('ProteinInUrine', FEATURE_MEDIANS.get('ProteinInUrine', 0.15)))
    hemo      = float(data.get('HemoglobinLevels', FEATURE_MEDIANS.get('HemoglobinLevels', 12.5)))
    family    = float(data.get('FamilyHistoryKidneyDisease', FEATURE_MEDIANS.get('FamilyHistoryKidneyDisease', 0.0)))
    age       = float(data.get('Age', FEATURE_MEDIANS.get('Age', 55.0)))

    # --- Build a 0-1 clinical risk score from key CKD indicators ---
    scores = []

    # GFR (most important CKD staging criterion)
    if gfr >= 90:
        scores.append(0.05)
    elif gfr >= 60:
        scores.append(0.25)
    elif gfr >= 45:
        scores.append(0.55)
    elif gfr >= 30:
        scores.append(0.75)
    elif gfr >= 15:
        scores.append(0.90)
    else:
        scores.append(1.00)

    # Serum Creatinine (ratio to upper-normal 1.2 mg/dL)
    cr_ratio = creat / 1.2
    if cr_ratio <= 1.0:
        scores.append(0.05)
    elif cr_ratio <= 1.5:
        scores.append(0.25)
    elif cr_ratio <= 2.5:
        scores.append(0.50)
    elif cr_ratio <= 3.5:
        scores.append(0.75)
    else:
        scores.append(0.95)

    # Proteinuria
    if protein < 0.15:
        scores.append(0.05)
    elif protein < 0.5:
        scores.append(0.20)
    elif protein < 1.5:
        scores.append(0.45)
    elif protein < 3.0:
        scores.append(0.70)
    else:
        scores.append(0.90)

    # Hemoglobin (low = anemia, common in CKD)
    if hemo >= 12.0:
        scores.append(0.05)
    elif hemo >= 10.0:
        scores.append(0.35)
    else:
        scores.append(0.70)

    # Family history (binary risk bump)
    scores.append(0.30 if family >= 1 else 0.05)

    # Age (higher age = higher baseline risk)
    if age < 40:
        scores.append(0.05)
    elif age < 60:
        scores.append(0.15)
    else:
        scores.append(0.30)

    # Weighted average — GFR and creatinine carry the most clinical weight
    weights = [0.30, 0.25, 0.18, 0.10, 0.10, 0.07]
    clinical_score = sum(s * w for s, w in zip(scores, weights))

    # Blend: 65% model + 35% clinical
    blended = 0.65 * model_prob + 0.35 * clinical_score

    # Clamp to [0.01, 0.99] — never show absolute 0% or 100%
    blended = max(0.01, min(0.99, blended))

    # Use blended probability for the binary label (threshold 0.45)
    pred = 1 if blended >= 0.45 else 0

    return blended, pred


def build_clinical_summary(data, pred):
    age = float(data.get('Age', FEATURE_MEDIANS.get('Age', 55.0)))
    gfr = float(data.get('GFR', FEATURE_MEDIANS.get('GFR', 90.0)))
    creatinine = float(data.get('SerumCreatinine', FEATURE_MEDIANS.get('SerumCreatinine', 1.1)))
    hba1c = float(data.get('HbA1c', FEATURE_MEDIANS.get('HbA1c', 5.8)))
    protein = float(data.get('ProteinInUrine', FEATURE_MEDIANS.get('ProteinInUrine', 0.15)))
    uti = float(data.get('UrinaryTractInfections', FEATURE_MEDIANS.get('UrinaryTractInfections', 0.0)))
    family = float(data.get('FamilyHistoryKidneyDisease', FEATURE_MEDIANS.get('FamilyHistoryKidneyDisease', 0.0)))

    factors = []
    if age >= 60:
        factors.append(f"older age ({int(age)} years)")
    if gfr < 60:
        factors.append(f"low GFR ({gfr:.1f} mL/min)")
    if creatinine > 1.2:
        factors.append(f"high creatinine ({creatinine:.1f} mg/dL)")
    if hba1c > 6.5:
        factors.append(f"elevated HbA1c ({hba1c:.1f}%)")
    if protein > 0.15:
        factors.append(f"protein in urine ({protein:.2f} g/day)")
    if uti >= 2:
        factors.append(f"recurrent UTIs ({int(uti)} episodes)")
    if family == 1:
        factors.append("family history of kidney disease")

    if pred == 1:
        if factors:
            summary = "Main drivers: " + ", ".join(factors[:4]) + ". This pattern points to CKD risk."
        else:
            summary = "The model is predicting CKD mainly because of the entered clinical pattern and the filled baseline values."
    else:
        if factors:
            summary = "There are some risk signals, but the overall model result remains low risk because the entered profile is still below the CKD threshold."
        else:
            summary = "No major CKD warning signs were identified from the entered values, and missing fields were filled with dataset medians for the model."

    return {
        'risk_factors': factors,

        'interpretation': summary,
    }


def get_risk_level(prob):
    if prob < 0.30:
        return "Low Risk", "#34C78A"
    if prob < 0.55:
        return "Moderate Risk", "#F5A623"
    if prob < 0.75:
        return "High Risk", "#F05D5D"
    return "Very High Risk", "#C0392B"

# ── Age Group Classification ───────────────────────────────────────────────────
def get_age_group(age):
    if age < 20:
        return "under_20", "Under 20 years (outside the current dataset range)"
    elif age < 40:
        return "youngadult", "Young Adult (20-39 years)"
    elif age < 60:
        return "adult", "Adult (40-59 years)"
    else:
        return "senior", "Senior (60+ years)"

# ── Age-Adjusted Normal Ranges ─────────────────────────────────────────────────
def get_normal_ranges(age):
    # This project is trained on CKD data for adult patients aged 20-90.
    # Pediatric ranges are intentionally omitted because they are not represented in the dataset.
    return { 'creatinine': (0.6, 1.2), 'bun': (8, 25),
             'gfr': (90, 120), 'hemoglobin': (12, 17) }

# ── CKD Stage from GFR ────────────────────────────────────────────────────────
def get_ckd_stage(gfr, age):
    if age < 20:
        if gfr >= 90: return None, "Normal or High"
        elif gfr >= 60: return "Stage 1-2", "Mildly Decreased"
        elif gfr >= 45: return "Stage 3a", "Mildly to Moderately Decreased"
        elif gfr >= 30: return "Stage 3b", "Moderately to Severely Decreased"
        elif gfr >= 15: return "Stage 4", "Severely Decreased"
        else: return "Stage 5", "Kidney Failure (End Stage)"
    else:
        if gfr >= 90: return None, "Normal or High"
        elif gfr >= 60: return "Stage 1-2", "Mildly Decreased"
        elif gfr >= 45: return "Stage 3a", "Mildly to Moderately Decreased"
        elif gfr >= 30: return "Stage 3b", "Moderately to Severely Decreased"
        elif gfr >= 15: return "Stage 4", "Severely Decreased"
        else: return "Stage 5", "Kidney Failure (End Stage)"

# ── Early Warning Flags ───────────────────────────────────────────────────────
def get_early_warnings(data, age_group, age, norms):
    warnings = []
    creat  = float(data.get('SerumCreatinine', 1.0))
    gfr    = float(data.get('GFR', 90))
    protein= float(data.get('ProteinInUrine', 0))
    hba1c  = float(data.get('HbA1c', 5.0))
    uti    = float(data.get('UrinaryTractInfections', 0))
    family = float(data.get('FamilyHistoryKidneyDisease', 0))
    cr_min, cr_max = norms['creatinine']

    if age_group == 'under_20':
        warnings.append({ "level": "alert",
            "msg": f"Patient age {int(age)} is outside the current CKD dataset range (20-90 years). Model interpretation should be treated cautiously." })
    elif age_group == 'youngadult':
        warnings.append({ "level": "alert",
            "msg": "CKD in young adults (20-39) is often asymptomatic and discovered late. Early detection now can prevent kidney failure for decades." })
        if creat > cr_max:
            warnings.append({ "level": "danger",
                "msg": f"Elevated creatinine ({creat} mg/dL) in a young adult is unusual. Immediate kidney function evaluation required." })
        if hba1c > 6.5:
            warnings.append({ "level": "warning",
                "msg": f"HbA1c of {hba1c}% indicates diabetes. Diabetic nephropathy can develop silently in young adults." })
        if gfr < 90:
            warnings.append({ "level": "danger",
                "msg": f"GFR of {gfr} mL/min is below normal for your age. Reduced GFR in young adults is an early CKD warning sign." })
    else:
        if creat > cr_max:
            warnings.append({ "level": "danger",
                "msg": f"Serum creatinine ({creat} mg/dL) is above the normal adult reference range ({cr_min}-{cr_max} mg/dL)." })
        if protein > 0.1:
            warnings.append({ "level": "danger",
                "msg": f"Protein in urine ({protein} g/day) detected. Persistent proteinuria is a major CKD warning sign." })
        if gfr < 60:
            warnings.append({ "level": "warning",
                "msg": f"GFR of {gfr} mL/min indicates reduced kidney function and warrants clinical review." })

    return warnings[:4]

# ── Recommendations ───────────────────────────────────────────────────────────
def get_recommendations(data, pred, age_group, age, norms):
    recs   = []
    gfr    = float(data.get('GFR', 90))
    creat  = float(data.get('SerumCreatinine', 1.0))
    hba1c  = float(data.get('HbA1c', 5.0))
    protein= float(data.get('ProteinInUrine', 0))
    hemo   = float(data.get('HemoglobinLevels', 14))
    bmi    = float(data.get('BMI', 22))
    uti    = float(data.get('UrinaryTractInfections', 0))
    family = float(data.get('FamilyHistoryKidneyDisease', 0))
    cr_max   = norms['creatinine'][1]
    hemo_min = norms['hemoglobin'][0]

    if pred == 0:
        recs.append({ "type": "success", "icon": "✅",
            "title": "No CKD Detected",
            "desc":  "Kidney function appears normal for the current adult CKD dataset range. Continue regular health monitoring." })
        recs.append({ "type": "info", "icon": "💧",
            "title": "Stay Hydrated",
            "desc":  "Drink 8-10 glasses of water daily. Avoid excessive salt and processed foods." })
        recs.append({ "type": "info", "icon": "🏃",
            "title": "Regular Exercise",
            "desc":  "30 minutes of moderate activity 5 days a week reduces CKD risk significantly." })
        if family == 1:
            recs.append({ "type": "warning", "icon": "🧬",
                "title": "Family History — Screen Annually",
                "desc":  "Annual kidney function tests (eGFR + urine albumin) strongly advised." })
    else:
        if age_group == 'youngadult':
            recs.append({ "type": "danger", "icon": "🚨",
                "title": "Early Intervention is Critical",
                "desc":  "CKD detected at a young age. Early treatment can prevent kidney failure for decades. Act now." })
            if gfr < 60:
                recs.append({ "type": "danger", "icon": "👨‍⚕️",
                    "title": "Nephrology Consultation Urgently",
                    "desc":  f"GFR of {gfr} mL/min at your age is significantly low. See a nephrologist within 1-2 weeks." })
            if hba1c > 6.5:
                recs.append({ "type": "warning", "icon": "🍬",
                    "title": "Control Blood Sugar",
                    "desc":  f"HbA1c of {hba1c}% accelerates kidney damage. Strict glucose control slows CKD progression significantly." })
            recs.append({ "type": "info", "icon": "🚭",
                "title": "Avoid Nephrotoxins",
                "desc":  "Avoid NSAIDs, excessive alcohol, and contrast dyes. Inform all doctors about your kidney condition." })
            recs.append({ "type": "info", "icon": "💊",
                "title": "Blood Pressure Target",
                "desc":  "Target BP < 130/80 mmHg. ACE inhibitors or ARBs are preferred in CKD patients with proteinuria." })
        else:
            if gfr < 30:
                recs.append({ "type": "danger", "icon": "🚨",
                    "title": "Urgent Nephrology Referral",
                    "desc":  f"GFR of {gfr} mL/min indicates severely reduced kidney function. See a nephrologist immediately." })
            if creat > cr_max:
                recs.append({ "type": "warning", "icon": "🧪",
                    "title": "Elevated Serum Creatinine",
                    "desc":  f"Level of {creat} mg/dL is above normal. Avoid NSAIDs and nephrotoxic medications." })
            if protein > 0.3:
                recs.append({ "type": "danger", "icon": "🔬",
                    "title": "Proteinuria Detected",
                    "desc":  f"Protein of {protein} g/day in urine is a key marker of kidney damage. Immediate evaluation needed." })
            if hemo < hemo_min:
                recs.append({ "type": "info", "icon": "🩸",
                    "title": "Anemia Management",
                    "desc":  f"Hemoglobin of {hemo} g/dL is low. Ask your doctor about iron supplements or EPO therapy." })
            recs.append({ "type": "info", "icon": "💧",
                "title": "Renal Diet & Fluid Management",
                "desc":  "Limit sodium (<2g/day), potassium, and phosphorus. Follow a dietitian-designed renal diet plan." })

    return recs[:5]

# ── API Routes ────────────────────────────────────────────────────────────────
@app.route('/')
def home():
    return jsonify({'status': 'CKD API is running'})

@app.route('/model-info')
def model_info():
    return jsonify(MODEL_SUMMARY)

@app.route('/predict', methods=['POST'])
@optional_clerk_auth
def predict():
    raw_data = request.get_json(silent=True) or {}
    if not isinstance(raw_data, dict):
        return jsonify({'error': 'Request body must be a JSON object.'}), 400
    save_history = raw_data.pop('_save_history', True)
    provided_features = [feature for feature in FEATURES if raw_data.get(feature) not in (None, '')]
    if len(provided_features) < 5:
        missing_features = [feature for feature in FEATURES if raw_data.get(feature) in (None, '')]
        return jsonify({
            'error': 'At least 5 clinical values are required before prediction.',
            'missing_features': missing_features,
        }), 400

    filled_defaults = get_defaulted_fields(raw_data)
    data = {**raw_data, **normalize_user_data(raw_data)}
    age = float(data.get('Age', FEATURE_MEDIANS.get('Age', 30.0)))

    features = [float(data.get(f, FEATURE_MEDIANS.get(f, 0.0))) for f in FEATURES]
    scaled   = scaler.transform([features])
    raw_prob = float(model.predict_proba(scaled)[0][1])
    prob, pred = clinical_risk_adjustment(raw_prob, data)
    gfr      = float(data.get('GFR', FEATURE_MEDIANS.get('GFR', 90.0)))

    age_group, age_label       = get_age_group(age)
    norms                      = get_normal_ranges(age)
    stage, stage_desc          = get_ckd_stage(gfr, age)
    risk_level, risk_color     = get_risk_level(prob)
    early_warnings             = get_early_warnings(data, age_group, age, norms)
    recommendations            = get_recommendations(data, pred, age_group, age, norms)
    clinical_summary           = build_clinical_summary(data, pred)

    response_data = {
        'prediction'      : pred,
        'label'           : 'CKD Detected' if pred == 1 else 'No CKD Detected',
        'probability'     : round(prob * 100, 1),
        'risk_level'      : risk_level,
        'risk_color'      : risk_color,
        'ckd_stage'       : stage,
        'stage_desc'      : stage_desc,
        'age_group'       : age_group,
        'age_label'       : age_label,
        'early_warnings'  : early_warnings,
        'recommendations' : recommendations,
        'interpretation'  : clinical_summary['interpretation'],
        'risk_factors'    : clinical_summary['risk_factors'],
        'filled_defaults' : filled_defaults,
        'is_pediatric'    : age < 18,
        'is_young'        : age < 40,
        'model_name'      : MODEL_SUMMARY['winner'],
        'history_saved'   : False,
    }

    if g.clerk_user_id and save_history:
        history = PredictionHistory(
            clerk_user_id=g.clerk_user_id,
            inputs={key: raw_data.get(key) for key in FEATURES},
            probability=response_data['probability'],
            label=response_data['label'],
            risk_level=risk_level,
            ckd_stage=stage,
            result_details=response_data,
        )
        db_session = Session()
        db_session.add(history)
        db_session.commit()
        response_data['history_saved'] = True

    return jsonify(response_data)


@app.route('/history', methods=['GET'])
@require_clerk_auth
def prediction_history():
    records = Session().query(PredictionHistory).filter_by(
        clerk_user_id=g.clerk_user_id,
    ).order_by(desc(PredictionHistory.created_at)).limit(100).all()
    return jsonify([
        {
            'id': record.id,
            'created_at': record.created_at.isoformat(),
            'inputs': record.inputs,
            'probability': record.probability,
            'label': record.label,
            'risk_level': record.risk_level,
            'ckd_stage': record.ckd_stage,
            'result_details': record.result_details,
        }
        for record in records
    ])


@app.route('/history/<int:record_id>', methods=['DELETE'])
@require_clerk_auth
def delete_prediction_history(record_id):
    record = Session().query(PredictionHistory).filter_by(
        id=record_id,
        clerk_user_id=g.clerk_user_id,
    ).first()
    if record is None:
        return jsonify({'error': 'History record not found.'}), 404
    Session().delete(record)
    Session().commit()
    return jsonify({'deleted': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

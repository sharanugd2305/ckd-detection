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

# ── Age Group Classification ───────────────────────────────────────────────────
def get_age_group(age):
    if   age < 2:  return "infant",     "Infant (0-2 years)"
    elif age < 13: return "child",      "Child (2-12 years)"
    elif age < 18: return "teen",       "Teenager (13-17 years)"
    elif age < 40: return "youngadult", "Young Adult (18-39 years)"
    elif age < 60: return "adult",      "Adult (40-59 years)"
    else:          return "senior",     "Senior (60+ years)"

# ── Age-Adjusted Normal Ranges ─────────────────────────────────────────────────
def get_normal_ranges(age):
    if age < 2:
        return { 'creatinine': (0.1, 0.4), 'bun': (4, 19),
                 'gfr': (30, 90),  'hemoglobin': (10, 14) }
    elif age < 13:
        return { 'creatinine': (0.3, 0.7), 'bun': (7, 20),
                 'gfr': (90, 140), 'hemoglobin': (11.5, 15) }
    elif age < 18:
        return { 'creatinine': (0.5, 1.0), 'bun': (8, 22),
                 'gfr': (90, 140), 'hemoglobin': (12, 16) }
    else:
        return { 'creatinine': (0.6, 1.2), 'bun': (8, 25),
                 'gfr': (90, 120), 'hemoglobin': (12, 17) }

# ── CKD Stage from GFR ────────────────────────────────────────────────────────
def get_ckd_stage(gfr, age):
    if age < 2:
        if   gfr >= 60: return None,        "Normal for Age"
        elif gfr >= 45: return "Stage 1-2",  "Mildly Decreased"
        elif gfr >= 30: return "Stage 3",    "Moderately Decreased"
        elif gfr >= 15: return "Stage 4",    "Severely Decreased"
        else:           return "Stage 5",    "Kidney Failure"
    else:
        if   gfr >= 90: return None,         "Normal or High"
        elif gfr >= 60: return "Stage 1-2",  "Mildly Decreased"
        elif gfr >= 45: return "Stage 3a",   "Mildly to Moderately Decreased"
        elif gfr >= 30: return "Stage 3b",   "Moderately to Severely Decreased"
        elif gfr >= 15: return "Stage 4",    "Severely Decreased"
        else:           return "Stage 5",    "Kidney Failure (End Stage)"

# ── Risk Level ────────────────────────────────────────────────────────────────
def get_risk_level(prob):
    if   prob < 0.30: return "Low Risk",       "#34C78A"
    elif prob < 0.55: return "Moderate Risk",  "#F5A623"
    elif prob < 0.75: return "High Risk",      "#F05D5D"
    else:             return "Very High Risk", "#C0392B"

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

    if age_group in ['infant', 'child', 'teen']:
        warnings.append({ "level": "alert",
            "msg": f"Patient is {int(age)} years old. CKD in children often goes undetected. Pediatric nephrology evaluation is strongly recommended." })
        if creat > cr_max:
            warnings.append({ "level": "danger",
                "msg": f"Serum creatinine ({creat} mg/dL) is above the normal range for this age ({cr_min}-{cr_max} mg/dL). Key early CKD indicator in children." })
        if protein > 0.1:
            warnings.append({ "level": "danger",
                "msg": f"Protein in urine ({protein} g/day) detected. Even mild proteinuria in children indicates early kidney disease." })
        if uti >= 2:
            warnings.append({ "level": "warning",
                "msg": f"{int(uti)} UTIs recorded. Recurrent UTIs in children can cause kidney scarring leading to CKD." })
        if family == 1:
            warnings.append({ "level": "warning",
                "msg": "Family history of kidney disease detected. Children with genetic risk should be screened annually." })

    elif age_group == 'youngadult':
        warnings.append({ "level": "alert",
            "msg": "CKD in young adults (18-39) is often asymptomatic and discovered late. Early detection now can prevent kidney failure for decades." })
        if creat > cr_max:
            warnings.append({ "level": "danger",
                "msg": f"Elevated creatinine ({creat} mg/dL) in a young adult is unusual. Immediate kidney function evaluation required." })
        if hba1c > 6.5:
            warnings.append({ "level": "warning",
                "msg": f"HbA1c of {hba1c}% indicates diabetes. Diabetic nephropathy can develop silently in young adults." })
        if gfr < 90:
            warnings.append({ "level": "danger",
                "msg": f"GFR of {gfr} mL/min is below normal for your age. Reduced GFR in young adults is an early CKD warning sign." })

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
        if age_group in ['infant', 'child', 'teen']:
            recs.append({ "type": "success", "icon": "✅",
                "title": "Good News — No CKD Detected",
                "desc":  "Kidney function appears normal. Continue regular pediatric check-ups every 6-12 months." })
            recs.append({ "type": "info", "icon": "💧",
                "title": "Hydration for Kids",
                "desc":  "Ensure the child drinks adequate water daily. 1-1.5L for children, 1.5-2L for teenagers." })
            if family == 1:
                recs.append({ "type": "warning", "icon": "🧬",
                    "title": "Genetic Risk — Annual Screening",
                    "desc":  "Family history detected. Annual urine and blood tests recommended even without symptoms." })
            if uti >= 1:
                recs.append({ "type": "warning", "icon": "🦠",
                    "title": "UTI Management in Children",
                    "desc":  "Even one UTI in a child warrants imaging to rule out structural kidney abnormalities (VUR)." })
        else:
            recs.append({ "type": "success", "icon": "✅",
                "title": "No CKD Detected",
                "desc":  "Kidney function appears normal. Schedule annual kidney screening to stay safe." })
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
        if age_group in ['infant', 'child', 'teen']:
            recs.append({ "type": "danger", "icon": "🏥",
                "title": "Immediate Pediatric Nephrology Referral",
                "desc":  f"CKD in a {int(age)}-year-old requires urgent evaluation by a pediatric nephrologist. Do not delay." })
            recs.append({ "type": "warning", "icon": "🍽️",
                "title": "Pediatric Renal Diet",
                "desc":  "A pediatric dietitian should design a kidney-friendly diet appropriate for the child's age and growth needs." })
            recs.append({ "type": "info", "icon": "📏",
                "title": "Monitor Growth & Development",
                "desc":  "CKD affects growth hormone levels. Regular monitoring of height, weight, and bone health is essential." })
            recs.append({ "type": "info", "icon": "💉",
                "title": "Blood Pressure Management",
                "desc":  "Hypertension is common in pediatric CKD. Age-appropriate BP targets must be maintained to slow progression." })
            recs.append({ "type": "warning", "icon": "🎓",
                "title": "School & Quality of Life",
                "desc":  "Inform school staff. Fatigue and anemia from CKD can affect academic performance and daily activities." })
        elif age_group == 'youngadult':
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
                "desc":  "Target BP < 130/80 mmHg. ACE inhibitors or ARBs are preferred in young CKD patients with proteinuria." })
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

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    age  = float(data.get('Age', 30))

    features = [float(data[f]) for f in FEATURES]
    scaled   = scaler.transform([features])
    pred     = int(model.predict(scaled)[0])
    prob     = float(model.predict_proba(scaled)[0][1])
    gfr      = float(data.get('GFR', 90))

    age_group, age_label       = get_age_group(age)
    norms                      = get_normal_ranges(age)
    stage, stage_desc          = get_ckd_stage(gfr, age)
    risk_level, risk_color     = get_risk_level(prob)
    early_warnings             = get_early_warnings(data, age_group, age, norms)
    recommendations            = get_recommendations(data, pred, age_group, age, norms)

    return jsonify({
        'prediction'     : pred,
        'label'          : 'CKD Detected' if pred == 1 else 'No CKD Detected',
        'probability'    : round(prob * 100, 1),
        'risk_level'     : risk_level,
        'risk_color'     : risk_color,
        'ckd_stage'      : stage,
        'stage_desc'     : stage_desc,
        'age_group'      : age_group,
        'age_label'      : age_label,
        'early_warnings' : early_warnings,
        'recommendations': recommendations,
        'is_pediatric'   : age < 18,
        'is_young'       : age < 40,
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)

import json
import os

import joblib
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTENC
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from xgboost import XGBClassifier

# Load dataset
df = pd.read_csv('../data/ckd_1659.csv')

FEATURES = [
    'Age', 'BMI', 'HbA1c', 'SerumCreatinine', 'BUNLevels',
    'GFR', 'HemoglobinLevels', 'CholesterolTotal',
    'ProteinInUrine', 'UrinaryTractInfections',
    'FamilyHistoryKidneyDisease'
]
TARGET = 'Diagnosis'

X = df[FEATURES].values
y = df[TARGET].values

# Split BEFORE scaling to avoid test-set leakage
X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X, y, test_size=0.2,
    random_state=42, stratify=y)

# Scale using TRAINING-ONLY fit statistics
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train_raw)
X_test = scaler.transform(X_test_raw)

# SMOTENC only on training data to preserve the binary/categorical columns
categorical_idx = [
    FEATURES.index('UrinaryTractInfections'),
    FEATURES.index('FamilyHistoryKidneyDisease'),
]
smote = SMOTENC(
    categorical_features=categorical_idx,
    sampling_strategy=1.0,
    k_neighbors=5,
    random_state=42,
)
X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)

neg = int((y_train_sm == 0).sum())
pos = int((y_train_sm == 1).sum())
scale = neg / pos

MODEL_MAP = {
    'Logistic Regression': LogisticRegression(
        max_iter=1000,
        class_weight='balanced',
        random_state=42,
    ),
    'Random Forest': RandomForestClassifier(
        n_estimators=200,
        class_weight='balanced',
        min_samples_split=5,
        random_state=42,
    ),
    'SVM (RBF)': SVC(
        kernel='rbf',
        gamma='scale',
        class_weight='balanced',
        probability=True,
        random_state=42,
    ),
    'XGBoost': XGBClassifier(
        objective='binary:logistic',
        n_estimators=200,
        learning_rate=0.1,
        max_depth=6,
        scale_pos_weight=scale,
        random_state=42,
        eval_metric='logloss',
    ),
}


def compute_metrics(y_true, y_pred, y_prob):
    return {
        'Accuracy': round(float(accuracy_score(y_true, y_pred)), 4),
        'Precision': round(float(precision_score(y_true, y_pred, average='macro', zero_division=0)), 4),
        'Recall': round(float(recall_score(y_true, y_pred, average='macro', zero_division=0)), 4),
        'F1-Score': round(float(f1_score(y_true, y_pred, average='macro', zero_division=0)), 4),
        'AUC-ROC': round(float(roc_auc_score(y_true, y_prob)), 4),
    }

summary = {}
for name, model in MODEL_MAP.items():
    model.fit(X_train_sm, y_train_sm)
    pred = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else pred
    summary[name] = compute_metrics(y_test, pred, proba)

summary_df = pd.DataFrame(summary).T.sort_values('F1-Score', ascending=False)
summary_df = summary_df.reset_index().rename(columns={'index': 'Model'})
winner = summary_df.iloc[0]['Model']

os.makedirs('model', exist_ok=True)
joblib.dump(scaler, 'model/scaler.pkl')
joblib.dump(MODEL_MAP['XGBoost'], 'model/xgb_model.pkl')
joblib.dump(MODEL_MAP['Random Forest'], 'model/rf_model.pkl')

metadata = {
    'winner': winner,
    'ranking': [
        {
            'model': row['Model'],
            'metrics': {
                'Accuracy': row['Accuracy'],
                'Precision': row['Precision'],
                'Recall': row['Recall'],
                'F1-Score': row['F1-Score'],
                'AUC-ROC': row['AUC-ROC'],
            },
        }
        for _, row in summary_df.iterrows()
    ],
    'models': {name: metrics for name, metrics in summary.items()},
}

with open('model/model_summary.json', 'w', encoding='utf-8') as f:
    json.dump(metadata, f, indent=2)

print('=== MODEL COMPARISON SUMMARY (Macro Average) ===')
print(summary_df.to_string(index=False))
print(f'Winner by F1-Score: {winner}')
print('Saved artifact -> backend/model/xgb_model.pkl')
print('Saved artifact -> backend/model/rf_model.pkl')
print('Saved artifact -> backend/model/scaler.pkl')
print('Saved artifact -> backend/model/model_summary.json')
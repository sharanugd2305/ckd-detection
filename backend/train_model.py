import pandas as pd
import numpy as np
import joblib
import os
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from imblearn.over_sampling import SMOTE

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

# Scale
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2,
    random_state=42, stratify=y)

# SMOTE
smote = SMOTE(sampling_strategy=1.0,
              k_neighbors=5, random_state=42)
X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)

# Train
model = RandomForestClassifier(
    n_estimators=200,
    class_weight='balanced',
    min_samples_split=5,
    random_state=42
)
model.fit(X_train_sm, y_train_sm)

# Save
os.makedirs('model', exist_ok=True)
joblib.dump(model,  'model/rf_model.pkl')
joblib.dump(scaler, 'model/scaler.pkl')

print("Model saved  -> backend/model/rf_model.pkl")
print("Scaler saved -> backend/model/scaler.pkl")
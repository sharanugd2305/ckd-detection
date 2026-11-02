# NephroScan: Chronic Kidney Disease Detection

NephroScan is an educational web application for exploring chronic kidney disease (CKD) risk using clinical and demographic data. Enter health measurements to receive a machine-learning estimate with risk context, kidney-function information, and suggested follow-up topics. The application consists of a React frontend and a Flask API backed by a trained model.

> **Important:** This application is for educational and informational use only. Its predictions are not a medical diagnosis or a substitute for advice from a qualified healthcare professional.

## Project overview

The prediction service uses 13 clinical and demographic inputs. Four classifiers are evaluated during model training; the calibrated XGBoost model is used by the prediction endpoint. The app presents a predicted CKD classification and probability alongside risk factors, age-aware warnings, recommendations, and GFR-based stage context. These outputs are estimates based on the project dataset and should not be used to make healthcare decisions.

## Key features

- **CKD risk assessment:** Submit clinical measurements through a guided form. At least five model features are required; missing values are filled using training-dataset medians.
- **Flexible BMI input:** Enter BMI directly, or provide height and weight so the app can calculate it.
- **Context with results:** Review the prediction, estimated probability, risk category, contributing factors, warnings, recommendations, and GFR-related stage information.
- **Scenario comparison:** Adjust values to explore how a hypothetical profile changes the model output; scenario checks are not saved to history.
- **Downloadable report:** Download a PDF summary of an assessment.
- **Model comparison:** Review Logistic Regression, Random Forest, SVM (RBF), and XGBoost evaluation metrics.
- **Saved history (optional):** Sign in with Clerk to save, review, filter, and delete your prediction history from the dashboard. Guest assessments are not stored.
- **SQLite or PostgreSQL:** Use the included SQLite database by default, or configure a PostgreSQL connection.

## Technologies

- **Frontend:** React, React Router, Axios, Recharts, Clerk React
- **Backend:** Python, Flask, Flask-CORS, SQLAlchemy
- **Machine learning and data:** scikit-learn, XGBoost, imbalanced-learn, pandas, NumPy, joblib
- **Storage and authentication:** SQLite by default (or PostgreSQL via `DATABASE_URL`), Clerk authentication (optional)

## Project structure

- **frontend:** React application, including pages, reusable components, and static assets
- **backend:** Flask API, model training script, and saved machine-learning models
- **data:** CKD dataset used for model training and default input values
- **backend/model:** Trained models, feature scaler, and model evaluation summary
- **README.md:** Project overview and setup instructions

## Assessment inputs

The model uses these 13 features:

1. Age
2. Body mass index (BMI)
3. HbA1c
4. Serum creatinine
5. Blood urea nitrogen (BUN)
6. Glomerular filtration rate (GFR/eGFR)
7. Hemoglobin
8. Systolic blood pressure
9. Protein in urine
10. Urinary tract infection count
11. Family history of kidney disease
12. Gender
13. Smoking

If fewer than five model features are supplied, the API returns a validation error. Other missing features are filled with dataset medians, and the result identifies which fields used defaults.

## Prerequisites

- Python 3.9 or later
- Node.js and npm

## Run locally

Open two terminals from the project root.

### 1. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pip install -r requirements-db.txt
python app.py
```

The API starts at `http://localhost:5000`. It uses the included SQLite database by default and creates/updates its prediction-history table when it starts.

### 2. Start the frontend

In the second terminal:

```powershell
cd frontend
npm install
npm start
```

The application opens at `http://localhost:3000`. Keep the backend running while using the app.

## API overview

The frontend connects to the local API at `http://localhost:5000`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Check that the API is responding |
| `GET` | `/model-info` | Retrieve model comparison metrics |
| `POST` | `/predict` | Generate an assessment |
| `GET` | `/history` | Retrieve the signed-in user's saved assessments |
| `DELETE` | `/history/<record_id>` | Delete one of the signed-in user's saved assessments |

History endpoints require a valid Clerk session. Predictions can be made without signing in.

## Optional Clerk sign-in

Guest prediction does not require Clerk credentials. Clerk configuration is needed for sign-in and saved prediction history.

1. Copy `frontend/src/.env.example` to `frontend/.env` and set `REACT_APP_CLERK_PUBLISHABLE_KEY` to your Clerk publishable key.
2. Copy `backend/.env.example` to `backend/.env` and set `CLERK_SECRET_KEY` to the matching Clerk secret key.
3. Restart the frontend and backend after changing environment variables.

To use PostgreSQL instead of the default SQLite database, set `DATABASE_URL` in `backend/.env` to your PostgreSQL connection URL. Otherwise, omit it to use `backend/nephroscan.db`.

## Model training and evaluation

Pre-trained model and scaler files are included in `backend/model/`, so training is not required to run the application. The training script creates a stratified train/test split, applies SMOTENC to the training data, fits the scaler on training data, and evaluates Logistic Regression, Random Forest, SVM (RBF), and XGBoost. It saves the selected calibrated XGBoost model and evaluation summary.

To retrain the models, install the backend dependencies, change to the `backend` directory, and run:

```powershell
python train_model.py
```

Training reads `data/ckd_1659.csv` and writes model files under `backend/model/`.

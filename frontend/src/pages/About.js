import React from 'react';

const models = [
  { name: 'Logistic Regression', desc: 'Baseline linear model with class balancing' },
  { name: 'Random Forest',       desc: '200 decision trees — selected as final model' },
  { name: 'SVM (RBF kernel)',    desc: 'Non-linear support vector classifier' },
  { name: 'XGBoost',             desc: 'Gradient boosting with 200 rounds' },
];

const features = [
  'Age', 'BMI', 'HbA1c', 'Serum Creatinine', 'BUN Levels',
  'GFR (eGFR)', 'Hemoglobin', 'Total Cholesterol',
  'Protein in Urine', 'Urinary Tract Infections',
  'Family History of Kidney Disease'
];

export default function About() {
  const card = {
    background: '#1E2336', border: '1px solid #2A3050',
    borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem'
  };
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 2rem' }}>
      <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.8rem', marginBottom: '0.4rem' }}>
        About This Project
      </h2>
      <p style={{ color: '#7B85A0', marginBottom: '2rem' }}>
        Major Project — Data Engineering | CKD Risk Prediction System
      </p>

      {/* Dataset */}
      <div style={card}>
        <h3 style={{ color: '#4F8EF7', marginBottom: '0.8rem' }}>📊 Dataset</h3>
        <p style={{ color: '#7B85A0', fontSize: '0.92rem', lineHeight: 1.8 }}>
          1,659 patient records with 54 clinical features. Target: <strong style={{color:'#E8ECF4'}}>Diagnosis</strong> (CKD = 1, No CKD = 0).
          Class imbalance of 11:1 addressed using <strong style={{color:'#E8ECF4'}}>SMOTE</strong> on training data only.
          80/20 stratified train-test split.
        </p>
      </div>

      {/* Features */}
      <div style={card}>
        <h3 style={{ color: '#4F8EF7', marginBottom: '1rem' }}>🧬 Selected Features (11)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {features.map((f, i) => (
            <span key={i} style={{
              background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)',
              borderRadius: '20px', padding: '4px 14px',
              color: '#4F8EF7', fontSize: '0.82rem'
            }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Models */}
      <div style={card}>
        <h3 style={{ color: '#4F8EF7', marginBottom: '1rem' }}>🤖 ML Models Trained</h3>
        {models.map((m, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < models.length - 1 ? '1px solid #2A3050' : 'none'
          }}>
            <span style={{
              color: '#E8ECF4', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              {i === 1 && <span style={{
                background: '#34C78A', color: '#0F1117',
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700
              }}>BEST</span>}
              {m.name}
            </span>
            <span style={{ color: '#7B85A0', fontSize: '0.85rem' }}>{m.desc}</span>
          </div>
        ))}
      </div>

      {/* Tech Stack */}
      <div style={card}>
        <h3 style={{ color: '#4F8EF7', marginBottom: '1rem' }}>🛠️ Tech Stack</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
          {[
            ['Backend',  'Python, Flask, scikit-learn, XGBoost'],
            ['Frontend', 'React JS, React Router, Axios'],
            ['ML',       'Random Forest, SVM, XGBoost, Logistic Regression'],
            ['Data',     'pandas, numpy, SMOTE, StandardScaler'],
          ].map(([title, val], i) => (
            <div key={i}>
              <div style={{ color: '#7B85A0', fontSize: '0.8rem', marginBottom: '2px' }}>{title}</div>
              <div style={{ color: '#E8ECF4', fontSize: '0.9rem' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
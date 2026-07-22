import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const stats = [
    { value: '1,659', label: 'Patient Records' },
    { value: '11',    label: 'Clinical Features' },
    { value: '4',     label: 'ML Models Trained' },
    { value: '90%+',  label: 'Model Accuracy' },
  ];

  const features = [
    { icon: '🧬', title: 'Clinical Features', desc: 'Uses 11 key lab and lifestyle indicators for prediction' },
    { icon: '🤖', title: 'ML Powered',        desc: 'Random Forest trained on real patient data with SMOTE balancing' },
    { icon: '⚡', title: 'Instant Results',   desc: 'Get CKD risk prediction with confidence score in seconds' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px',
          background: 'rgba(79,142,247,0.12)', borderRadius: '20px',
          color: '#4F8EF7', fontSize: '0.85rem', marginBottom: '1.5rem',
          border: '1px solid rgba(79,142,247,0.3)'
        }}>
          Major Project — Data Engineering
        </div>
        <h1 style={{
          fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 5vw, 3.2rem)',
          fontWeight: 700, lineHeight: 1.2, marginBottom: '1.2rem',
          background: 'linear-gradient(135deg, #E8ECF4, #4F8EF7)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          Chronic Kidney Disease<br />Risk Predictor
        </h1>
        <p style={{ color: '#7B85A0', fontSize: '1.1rem', maxWidth: '550px', margin: '0 auto 2rem' }}>
          Enter patient clinical values and get an instant CKD risk assessment powered by machine learning.
        </p>
        <button onClick={() => navigate('/predict')} style={{
          background: 'linear-gradient(135deg, #4F8EF7, #34C78A)',
          color: '#fff', border: 'none', padding: '14px 36px',
          borderRadius: '8px', fontSize: '1rem', fontWeight: 600,
          cursor: 'pointer', transition: 'opacity 0.2s',
        }}
          onMouseOver={e => e.target.style.opacity = '0.85'}
          onMouseOut={e => e.target.style.opacity = '1'}
        >
          Start Prediction →
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem', marginBottom: '4rem'
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: '#1E2336', border: '1px solid #2A3050',
            borderRadius: '12px', padding: '1.5rem', textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4F8EF7' }}>{s.value}</div>
            <div style={{ color: '#7B85A0', fontSize: '0.85rem', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
        {features.map((f, i) => (
          <div key={i} style={{
            background: '#1E2336', border: '1px solid #2A3050',
            borderRadius: '12px', padding: '1.8rem'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
            <h3 style={{ color: '#E8ECF4', marginBottom: '0.5rem' }}>{f.title}</h3>
            <p style={{ color: '#7B85A0', fontSize: '0.9rem' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import axios from 'axios';

const FIELDS = [
  { key: 'Age',                       label: 'Age',                          unit: 'years', min: 0,   max: 120, step: 1    },
  { key: 'BMI',                       label: 'BMI',                          unit: 'kg/m²', min: 10,  max: 60,  step: 0.1  },
  { key: 'HbA1c',                     label: 'HbA1c',                        unit: '%',     min: 0,   max: 20,  step: 0.1  },
  { key: 'SerumCreatinine',           label: 'Serum Creatinine',             unit: 'mg/dL', min: 0,   max: 20,  step: 0.01 },
  { key: 'BUNLevels',                 label: 'BUN Levels',                   unit: 'mg/dL', min: 0,   max: 150, step: 0.1  },
  { key: 'GFR',                       label: 'GFR (eGFR)',                   unit: 'mL/min',min: 0,   max: 150, step: 0.1  },
  { key: 'HemoglobinLevels',          label: 'Hemoglobin',                   unit: 'g/dL',  min: 0,   max: 25,  step: 0.1  },
  { key: 'CholesterolTotal',          label: 'Total Cholesterol',            unit: 'mg/dL', min: 0,   max: 400, step: 1    },
  { key: 'ProteinInUrine',            label: 'Protein in Urine',             unit: 'g/day', min: 0,   max: 20,  step: 0.01 },
  { key: 'UrinaryTractInfections',    label: 'Urinary Tract Infections',     unit: 'count', min: 0,   max: 20,  step: 1    },
  { key: 'FamilyHistoryKidneyDisease',label: 'Family History Kidney Disease',unit: '0/1',   min: 0,   max: 1,   step: 1    },
];

const initialForm = Object.fromEntries(FIELDS.map(f => [f.key, '']));

export default function Predict() {
  const [form,    setForm]    = useState(initialForm);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    // Validate all fields filled
    const empty = FIELDS.filter(f => form[f.key] === '');
    if (empty.length > 0) {
      setError(`Please fill in: ${empty.map(f => f.label).join(', ')}`);
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post('http://localhost:5000/predict', form);
      setResult(res.data);
    } catch (e) {
      setError('Cannot connect to backend. Make sure Flask is running on port 5000.');
    }
    setLoading(false);
  };

  const handleReset = () => { setForm(initialForm); setResult(null); setError(''); };

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: '#0F1117', border: '1px solid #2A3050',
    borderRadius: '8px', color: '#E8ECF4', fontSize: '0.95rem',
    outline: 'none', transition: 'border 0.2s',
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 2rem' }}>
      <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.8rem', marginBottom: '0.5rem' }}>
        CKD Risk Prediction
      </h2>
      <p style={{ color: '#7B85A0', marginBottom: '2rem' }}>
        Enter the patient's clinical values below and click Predict.
      </p>

      {/* Form Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2,1fr)',
        gap: '1.2rem', marginBottom: '1.5rem'
      }}>
        {FIELDS.map(({ key, label, unit, min, max, step }) => (
          <div key={key} style={{
            background: '#1E2336', border: '1px solid #2A3050',
            borderRadius: '12px', padding: '1rem 1.2rem'
          }}>
            <label style={{ fontSize: '0.82rem', color: '#7B85A0',
              display: 'block', marginBottom: '6px', fontWeight: 500 }}>
              {label}
              <span style={{ color: '#4F8EF7', marginLeft: '6px' }}>({unit})</span>
            </label>
            <input
              type="number" min={min} max={max} step={step}
              value={form[key]}
              onChange={e => handleChange(key, e.target.value)}
              placeholder={`e.g. ${min + (max - min) / 2}`}
              style={inputStyle}
              onFocus={e => e.target.style.border = '1px solid #4F8EF7'}
              onBlur={e => e.target.style.border = '1px solid #2A3050'}
            />
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(240,93,93,0.1)', border: '1px solid #F05D5D',
          borderRadius: '8px', padding: '12px 16px',
          color: '#F05D5D', fontSize: '0.9rem', marginBottom: '1rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={handleSubmit} disabled={loading} style={{
          flex: 1, padding: '14px',
          background: loading ? '#2A3050' : 'linear-gradient(135deg,#4F8EF7,#34C78A)',
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Predicting...' : 'Predict'}
        </button>
        <button onClick={handleReset} style={{
          padding: '14px 28px', background: 'transparent',
          color: '#7B85A0', border: '1px solid #2A3050',
          borderRadius: '8px', fontSize: '1rem', cursor: 'pointer',
        }}>
          Reset
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{
          background: result.prediction === 1
            ? 'rgba(240,93,93,0.08)' : 'rgba(52,199,138,0.08)',
          border: `1px solid ${result.prediction === 1 ? '#F05D5D' : '#34C78A'}`,
          borderRadius: '16px', padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
            {result.prediction === 1 ? '🔴' : '🟢'}
          </div>
          <h3 style={{
            fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem',
            color: result.prediction === 1 ? '#F05D5D' : '#34C78A'
          }}>
            {result.label}
          </h3>
          <p style={{ color: '#7B85A0', fontSize: '0.95rem', marginBottom: '1rem' }}>
            Model confidence: <strong style={{ color: '#E8ECF4' }}>{result.confidence}%</strong>
          </p>

          {/* Confidence Bar */}
          <div style={{
            background: '#0F1117', borderRadius: '999px',
            height: '8px', overflow: 'hidden', maxWidth: '400px', margin: '0 auto'
          }}>
            <div style={{
              width: `${result.confidence}%`, height: '100%',
              background: result.prediction === 1
                ? 'linear-gradient(90deg,#F05D5D,#ff8c8c)'
                : 'linear-gradient(90deg,#34C78A,#7eedc4)',
              borderRadius: '999px', transition: 'width 1s ease'
            }} />
          </div>

          <p style={{ color: '#7B85A0', fontSize: '0.82rem', marginTop: '1.2rem' }}>
            ⚠️ This is a research tool only. Always consult a qualified doctor for medical advice.
          </p>
        </div>
      )}
    </div>
  );
}
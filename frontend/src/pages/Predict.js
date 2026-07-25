import React, { useState } from 'react';
import axios from 'axios';

const FIELDS = [
  { key: 'Age',                        label: 'Age',                           unit: 'years',  min: 0,  max: 120, step: 1    },
  { key: 'BMI',                        label: 'BMI',                           unit: 'kg/m²',  min: 5,  max: 60,  step: 0.1  },
  { key: 'HbA1c',                      label: 'HbA1c',                         unit: '%',      min: 0,  max: 20,  step: 0.1  },
  { key: 'SerumCreatinine',            label: 'Serum Creatinine',              unit: 'mg/dL',  min: 0,  max: 20,  step: 0.01 },
  { key: 'BUNLevels',                  label: 'BUN Levels',                    unit: 'mg/dL',  min: 0,  max: 150, step: 0.1  },
  { key: 'GFR',                        label: 'GFR (eGFR)',                    unit: 'mL/min', min: 0,  max: 150, step: 0.1  },
  { key: 'HemoglobinLevels',           label: 'Hemoglobin',                    unit: 'g/dL',   min: 0,  max: 25,  step: 0.1  },
  { key: 'CholesterolTotal',           label: 'Total Cholesterol',             unit: 'mg/dL',  min: 0,  max: 400, step: 1    },
  { key: 'ProteinInUrine',             label: 'Protein in Urine',              unit: 'g/day',  min: 0,  max: 20,  step: 0.01 },
  { key: 'UrinaryTractInfections',     label: 'Urinary Tract Infections',      unit: 'count',  min: 0,  max: 20,  step: 1    },
  { key: 'FamilyHistoryKidneyDisease', label: 'Family History Kidney Disease', unit: '0 or 1', min: 0,  max: 1,   step: 1    },
];

const initialForm = Object.fromEntries(FIELDS.map(f => [f.key, '']));

const recColors = {
  success: { bg: 'rgba(52,199,138,0.08)',  border: 'rgba(52,199,138,0.3)',  text: '#34C78A' },
  warning: { bg: 'rgba(245,166,35,0.08)',  border: 'rgba(245,166,35,0.3)',  text: '#F5A623' },
  danger:  { bg: 'rgba(240,93,93,0.08)',   border: 'rgba(240,93,93,0.3)',   text: '#F05D5D' },
  info:    { bg: 'rgba(79,142,247,0.08)',  border: 'rgba(79,142,247,0.3)',  text: '#4F8EF7' },
};

const warnColors = {
  alert:   { bg: 'rgba(79,142,247,0.08)',  border: '#4F8EF7',  text: '#4F8EF7'  },
  warning: { bg: 'rgba(245,166,35,0.08)',  border: '#F5A623',  text: '#F5A623'  },
  danger:  { bg: 'rgba(240,93,93,0.10)',   border: '#F05D5D',  text: '#F05D5D'  },
};

const ageGroupColors = {
  infant:     '#9C27B0',
  child:      '#2196F3',
  teen:       '#00BCD4',
  youngadult: '#34C78A',
  adult:      '#F5A623',
  senior:     '#F05D5D',
};

export default function Predict() {
  const [form,    setForm]    = useState(initialForm);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
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
    borderRadius: '8px', color: '#E8ECF4',
    fontSize: '0.95rem', outline: 'none',
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 2rem' }}>

      {/* Header */}
      <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.8rem', marginBottom: '0.4rem' }}>
        CKD Risk Prediction
      </h2>
      <p style={{ color: '#7B85A0', marginBottom: '0.5rem' }}>
        Enter the patient's clinical values. Works for all age groups — children, teens, and adults.
      </p>
      {/* Age note */}
      <div style={{
        display: 'inline-block', padding: '5px 14px', marginBottom: '1.8rem',
        background: 'rgba(79,142,247,0.1)', borderRadius: '20px',
        border: '1px solid rgba(79,142,247,0.3)',
        color: '#4F8EF7', fontSize: '0.82rem'
      }}>
        👶 Early detection supported for all ages including children & teenagers
      </div>

      {/* Input Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2,1fr)',
        gap: '1rem', marginBottom: '1.5rem'
      }}>
        {FIELDS.map(({ key, label, unit, min, max, step }) => (
          <div key={key} style={{
            background: '#1E2336', border: '1px solid #2A3050',
            borderRadius: '12px', padding: '1rem 1.2rem'
          }}>
            <label style={{
              fontSize: '0.82rem', color: '#7B85A0',
              display: 'block', marginBottom: '6px', fontWeight: 500
            }}>
              {label}
              <span style={{ color: '#4F8EF7', marginLeft: '6px' }}>({unit})</span>
            </label>
            <input
              type="number" min={min} max={max} step={step}
              value={form[key]}
              onChange={e => handleChange(key, e.target.value)}
              placeholder="Enter value"
              style={inputStyle}
              onFocus={e => e.target.style.border = '1px solid #4F8EF7'}
              onBlur={e  => e.target.style.border = '1px solid #2A3050'}
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
        }}>⚠️ {error}</div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
        <button onClick={handleSubmit} disabled={loading} style={{
          flex: 1, padding: '14px',
          background: loading ? '#2A3050' : 'linear-gradient(135deg,#4F8EF7,#34C78A)',
          color: '#fff', border: 'none', borderRadius: '8px',
          fontSize: '1rem', fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Analysing...' : 'Predict'}
        </button>
        <button onClick={handleReset} style={{
          padding: '14px 28px', background: 'transparent',
          color: '#7B85A0', border: '1px solid #2A3050',
          borderRadius: '8px', fontSize: '1rem', cursor: 'pointer',
        }}>Reset</button>
      </div>

      {/* ── RESULT ── */}
      {result && (
        <div>

          {/* ── Pediatric / Young Adult Banner ── */}
          {(result.is_pediatric || result.is_young) && (
            <div style={{
              background: result.is_pediatric
                ? 'rgba(33,150,243,0.1)' : 'rgba(52,199,138,0.08)',
              border: `1px solid ${result.is_pediatric ? '#2196F3' : '#34C78A'}`,
              borderRadius: '12px', padding: '14px 18px',
              marginBottom: '1.2rem',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <span style={{ fontSize: '1.8rem' }}>
                {result.is_pediatric ? '👶' : '🧑'}
              </span>
              <div>
                <div style={{
                  fontWeight: 700, fontSize: '0.95rem',
                  color: result.is_pediatric ? '#2196F3' : '#34C78A',
                  marginBottom: '2px'
                }}>
                  {result.is_pediatric ? 'Pediatric Patient Detected' : 'Young Adult Patient'}
                </div>
                <div style={{ color: '#7B85A0', fontSize: '0.85rem' }}>
                  {result.age_label} — Age-adjusted clinical thresholds applied.
                  {result.is_pediatric && ' Normal reference values differ from adults.'}
                </div>
              </div>
            </div>
          )}

          {/* ── Main Result Card ── */}
          <div style={{
            background: result.prediction === 1 ? 'rgba(240,93,93,0.07)' : 'rgba(52,199,138,0.07)',
            border: `1px solid ${result.prediction === 1 ? '#F05D5D' : '#34C78A'}`,
            borderRadius: '16px', padding: '2rem',
            textAlign: 'center', marginBottom: '1.2rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              {result.prediction === 1 ? '🔴' : '🟢'}
            </div>
            <h3 style={{
              fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.3rem',
              color: result.prediction === 1 ? '#F05D5D' : '#34C78A'
            }}>{result.label}</h3>
            <p style={{ color: '#7B85A0', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Risk Classification:{' '}
              <strong style={{ color: result.risk_color }}>{result.risk_level}</strong>
              {' · '}
              <span style={{ color: ageGroupColors[result.age_group] || '#7B85A0' }}>
                {result.age_label}
              </span>
            </p>

            {/* Probability Bar */}
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: '6px', fontSize: '0.85rem', color: '#7B85A0'
              }}>
                <span>CKD Probability</span>
                <strong style={{ color: '#E8ECF4' }}>{result.probability}%</strong>
              </div>
              <div style={{
                background: '#0F1117', borderRadius: '999px',
                height: '10px', overflow: 'hidden'
              }}>
                <div style={{
                  width: `${result.probability}%`, height: '100%',
                  background: result.prediction === 1
                    ? 'linear-gradient(90deg,#F5A623,#F05D5D)'
                    : 'linear-gradient(90deg,#34C78A,#4F8EF7)',
                  borderRadius: '999px', transition: 'width 1.2s ease'
                }} />
              </div>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: result.ckd_stage ? 'repeat(3,1fr)' : 'repeat(2,1fr)',
            gap: '1rem', marginBottom: '1.2rem'
          }}>
            <div style={{
              background: '#1E2336', border: '1px solid #2A3050',
              borderRadius: '12px', padding: '1.4rem', textAlign: 'center'
            }}>
              <div style={{ color: '#7B85A0', fontSize: '0.78rem', marginBottom: '6px' }}>CKD PROBABILITY</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#4F8EF7' }}>{result.probability}%</div>
              <div style={{ color: '#7B85A0', fontSize: '0.75rem', marginTop: '4px' }}>Model confidence score</div>
            </div>

            {result.ckd_stage && (
              <div style={{
                background: '#1E2336', border: '1px solid #2A3050',
                borderRadius: '12px', padding: '1.4rem', textAlign: 'center'
              }}>
                <div style={{ color: '#7B85A0', fontSize: '0.78rem', marginBottom: '6px' }}>ESTIMATED CKD STAGE</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#F05D5D' }}>{result.ckd_stage}</div>
                <div style={{ color: '#7B85A0', fontSize: '0.75rem', marginTop: '4px' }}>{result.stage_desc}</div>
              </div>
            )}

            <div style={{
              background: '#1E2336', border: '1px solid #2A3050',
              borderRadius: '12px', padding: '1.4rem', textAlign: 'center'
            }}>
              <div style={{ color: '#7B85A0', fontSize: '0.78rem', marginBottom: '6px' }}>RISK LEVEL</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: result.risk_color }}>{result.risk_level}</div>
              <div style={{ color: '#7B85A0', fontSize: '0.75rem', marginTop: '4px' }}>Based on probability score</div>
            </div>
          </div>

          {/* ── CKD Stage Visual Scale ── */}
          {result.prediction === 1 && (
            <div style={{
              background: '#1E2336', border: '1px solid #2A3050',
              borderRadius: '12px', padding: '1.5rem', marginBottom: '1.2rem'
            }}>
              <h4 style={{ color: '#E8ECF4', marginBottom: '1rem', fontSize: '0.95rem' }}>
                📊 CKD Stage Scale (based on GFR)
              </h4>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: 'Stage 1-2', range: 'GFR ≥60',  color: '#F5A623' },
                  { label: 'Stage 3a',  range: 'GFR 45-59', color: '#E67E22' },
                  { label: 'Stage 3b',  range: 'GFR 30-44', color: '#E74C3C' },
                  { label: 'Stage 4',   range: 'GFR 15-29', color: '#C0392B' },
                  { label: 'Stage 5',   range: 'GFR <15',   color: '#922B21' },
                ].map((s, i) => (
                  <div key={i} style={{
                    flex: 1,
                    background: result.ckd_stage === s.label ? s.color : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${result.ckd_stage === s.label ? s.color : '#2A3050'}`,
                    borderRadius: '8px', padding: '10px 6px', textAlign: 'center'
                  }}>
                    <div style={{
                      fontWeight: 700, fontSize: '0.82rem',
                      color: result.ckd_stage === s.label ? '#fff' : '#7B85A0'
                    }}>{s.label}</div>
                    <div style={{
                      fontSize: '0.7rem', marginTop: '3px',
                      color: result.ckd_stage === s.label ? 'rgba(255,255,255,0.8)' : '#4A5568'
                    }}>{s.range}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Early Warnings ── */}
          {result.early_warnings && result.early_warnings.length > 0 && (
            <div style={{
              background: '#1E2336', border: '1px solid #2A3050',
              borderRadius: '12px', padding: '1.5rem', marginBottom: '1.2rem'
            }}>
              <h4 style={{ color: '#E8ECF4', marginBottom: '1rem', fontSize: '0.95rem' }}>
                🚦 Early Detection Alerts
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.early_warnings.map((w, i) => {
                  const c = warnColors[w.level] || warnColors.alert;
                  return (
                    <div key={i} style={{
                      background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: '8px', padding: '10px 14px',
                      color: '#B0BAD0', fontSize: '0.87rem', lineHeight: 1.6
                    }}>
                      <span style={{ color: c.text, fontWeight: 600 }}>{w.msg}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Recommendations ── */}
          <div style={{
            background: '#1E2336', border: '1px solid #2A3050',
            borderRadius: '12px', padding: '1.5rem', marginBottom: '1.2rem'
          }}>
            <h4 style={{ color: '#E8ECF4', marginBottom: '1.2rem', fontSize: '0.95rem' }}>
              💡 Health Recommendations
              {result.is_pediatric && (
                <span style={{
                  marginLeft: '10px', fontSize: '0.75rem',
                  background: 'rgba(33,150,243,0.15)', color: '#2196F3',
                  padding: '2px 10px', borderRadius: '10px'
                }}>Pediatric</span>
              )}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {result.recommendations.map((rec, i) => {
                const c = recColors[rec.type] || recColors.info;
                return (
                  <div key={i} style={{
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: '10px', padding: '12px 16px',
                    display: 'flex', gap: '12px', alignItems: 'flex-start'
                  }}>
                    <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{rec.icon}</span>
                    <div>
                      <div style={{ color: c.text, fontWeight: 600, fontSize: '0.9rem', marginBottom: '3px' }}>
                        {rec.title}
                      </div>
                      <div style={{ color: '#7B85A0', fontSize: '0.85rem', lineHeight: 1.5 }}>
                        {rec.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            textAlign: 'center', color: '#4A5568',
            fontSize: '0.8rem', padding: '0.5rem'
          }}>
            ⚠️ This tool is for research and educational purposes only.
            Always consult a qualified nephrologist or pediatric nephrologist for medical decisions.
          </div>
        </div>
      )}
    </div>
  );
}

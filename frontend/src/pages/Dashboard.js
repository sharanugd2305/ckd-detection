import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-react';

const API_URL = 'http://localhost:5000';
const FIELD_LABELS = {
  Age: 'Age', BMI: 'BMI', HbA1c: 'HbA1c', SerumCreatinine: 'Serum creatinine',
  BUNLevels: 'BUN', GFR: 'GFR', HemoglobinLevels: 'Hemoglobin',
  CholesterolTotal: 'Total cholesterol', ProteinInUrine: 'Protein in urine',
  UrinaryTractInfections: 'UTI count', FamilyHistoryKidneyDisease: 'Family history',
};

const colors = { positive: '#00E5B4', negative: '#FF5E72', muted: '#7A92BC', line: '#172240' };

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ResultDetails({ record }) {
  const details = record.result_details || {};
  const inputs = record.inputs || {};
  const warnings = details.early_warnings || [];
  const recommendations = details.recommendations || [];
  return (
    <div style={{ borderTop: `1px solid ${colors.line}`, padding: '1.2rem 0 0', marginTop: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(135px,1fr))', gap: 10, marginBottom: '1.2rem' }}>
        {[
          ['Probability', `${record.probability}%`, record.probability >= 50 ? colors.negative : colors.positive],
          ['Risk level', record.risk_level, details.risk_color || colors.muted],
          ['CKD stage', record.ckd_stage || details.stage_desc || 'Normal range', '#9B6DFF'],
          ['Model', details.model_name || 'Stored result', colors.muted],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: '#091225', border: `1px solid ${colors.line}`, borderRadius: 10, padding: '11px' }}>
            <div style={{ color: colors.muted, fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>{label}</div>
            <strong style={{ color, fontSize: '.95rem' }}>{value}</strong>
          </div>
        ))}
      </div>
      {details.interpretation && <p style={{ color: '#DCE8FF', lineHeight: 1.65, margin: '0 0 1rem' }}>{details.interpretation}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
        <div>
          <h4 style={{ color: '#DCE8FF', margin: '0 0 .6rem' }}>Clinical inputs</h4>
          <div style={{ display: 'grid', gap: 5 }}>
            {Object.entries(inputs).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: colors.muted, fontSize: '.78rem' }}>
                <span>{FIELD_LABELS[key] || key}</span><strong style={{ color: '#DCE8FF' }}>{value ?? 'Not provided'}</strong>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 style={{ color: '#DCE8FF', margin: '0 0 .6rem' }}>Report details</h4>
          {warnings.length > 0 && <div style={{ marginBottom: '.8rem' }}><span style={{ color: '#FFAA2C', fontSize: '.75rem' }}>Alerts</span>{warnings.map((item, index) => <p key={index} style={{ color: colors.muted, fontSize: '.78rem', lineHeight: 1.5, margin: '.35rem 0' }}>{item.msg}</p>)}</div>}
          {recommendations.length > 0 && <div><span style={{ color: '#00E5B4', fontSize: '.75rem' }}>Recommendations</span>{recommendations.map((item, index) => <p key={index} style={{ color: colors.muted, fontSize: '.78rem', lineHeight: 1.5, margin: '.35rem 0' }}><strong style={{ color: '#DCE8FF' }}>{item.title}:</strong> {item.desc}</p>)}</div>}
          {!warnings.length && !recommendations.length && <p style={{ color: colors.muted, fontSize: '.78rem' }}>Detailed report data was not saved for this older record.</p>}
        </div>
      </div>
    </div>
  );
}

function downloadRecordPdf(record) {
  const details = record.result_details || {};
  const inputs = record.inputs || {};
  const warnings = details.early_warnings || [];
  const recommendations = details.recommendations || [];
  const doc = new jsPDF();
  const generatedAt = new Date(record.created_at || Date.now()).toLocaleString();

  doc.setFillColor(18, 23, 36);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('CKD Risk Assessment Report', 14, 18);

  doc.setTextColor(40, 60, 80);
  doc.setFontSize(10);
  doc.text(`Generated: ${generatedAt}`, 14, 36);
  doc.text(`Assessment: ${record.label}`, 14, 42);

  let y = 56;
  const addSection = (title, lines) => {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }

    doc.setFontSize(12);
    doc.setTextColor(45, 106, 255);
    doc.text(title, 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(40, 60, 80);
    const wrapped = doc.splitTextToSize(lines.join('\n'), 180);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 7 + 8;
  };

  addSection('Overview', [
    `Prediction: ${record.label}`,
    `Probability: ${record.probability}%`,
    `Risk Level: ${record.risk_level}`,
    `CKD Stage: ${record.ckd_stage || details.stage_desc || 'Not available'}`,
    `Model: ${details.model_name || 'Stored result'}`,
  ]);

  addSection('Clinical Interpretation', [details.interpretation || 'No interpretation available.']);

  const riskFactors = details.risk_factors && details.risk_factors.length
    ? details.risk_factors
    : ['No major risk factors were identified.'];
  addSection('Key Risk Factors', riskFactors.map(item => `• ${item}`));

  addSection('Clinical Inputs', Object.entries(inputs).map(([key, value]) => `• ${FIELD_LABELS[key] || key}: ${value ?? 'Not provided'}`));

  const warningLines = warnings.length ? warnings.map(item => `• ${item.msg}`) : ['No early warnings recorded.'];
  addSection('Early Detection Alerts', warningLines);

  const recommendationLines = recommendations.length
    ? recommendations.map(item => `• ${item.title}: ${item.desc}`)
    : ['No recommendations available.'];
  addSection('Recommendations', recommendationLines);

  doc.save(`ckd-report-${record.id || 'history'}.pdf`);
}

function DashboardContent() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const request = useCallback(async (method, path) => {
    const token = await getToken();
    return axios({ method, url: `${API_URL}${path}`, headers: { Authorization: `Bearer ${token}` } });
  }, [getToken]);

  const loadHistory = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await request('get', '/history'); setRecords(data); }
    catch (err) { setError(err.response?.data?.error || 'History could not be loaded.'); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const stats = useMemo(() => ({
    total: records.length,
    detected: records.filter(record => record.label === 'CKD Detected').length,
    average: records.length ? (records.reduce((sum, record) => sum + Number(record.probability || 0), 0) / records.length).toFixed(1) : '0.0',
  }), [records]);

  const summaryInsights = useMemo(() => {
    if (!records.length) {
      return {
        latest: null,
        highestRisk: null,
        riskBreakdown: {
          'Low Risk': 0,
          'Moderate Risk': 0,
          'High Risk': 0,
          'Very High Risk': 0,
        },
      };
    }

    const riskBreakdown = {
      'Low Risk': 0,
      'Moderate Risk': 0,
      'High Risk': 0,
      'Very High Risk': 0,
    };

    records.forEach((record) => {
      const level = record.risk_level || 'Low Risk';
      if (riskBreakdown[level] !== undefined) riskBreakdown[level] += 1;
    });

    const latest = records[0];
    const highestRisk = records.reduce((max, record) => Number(record.probability || 0) > Number(max.probability || 0) ? record : max, records[0]);

    return { latest, highestRisk, riskBreakdown };
  }, [records]);

  const remove = async (id) => {
    try { await request('delete', `/history/${id}`); setRecords(previous => previous.filter(record => record.id !== id)); if (selected === id) setSelected(null); }
    catch (err) { setError(err.response?.data?.error || 'That prediction could not be deleted.'); }
  };

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '3rem 2rem 6rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ color: '#00E5B4', fontSize: '.7rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>Private health workspace</div>
        <h1 style={{ color: '#DCE8FF', fontFamily: 'Space Grotesk,sans-serif', fontSize: '2.2rem', margin: '0 0 .5rem' }}>Your prediction history</h1>
        <p style={{ color: colors.muted, margin: 0 }}>Review previous assessments and the clinical details saved with each result{user?.firstName ? `, ${user.firstName}` : ''}.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {[['Assessments', stats.total, '#5B7FFF'], ['CKD detected', stats.detected, colors.negative], ['Average probability', `${stats.average}%`, '#9B6DFF']].map(([label, value, color]) => <div key={label} style={{ background: '#0D1526', border: `1px solid ${colors.line}`, borderRadius: 12, padding: '1.2rem' }}><div style={{ color: colors.muted, fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div><div style={{ color, fontFamily: 'Space Grotesk,sans-serif', fontSize: '1.7rem', fontWeight: 700, marginTop: 7 }}>{value}</div></div>)}
      </div>

      {records.length > 0 && (
        <div style={{ background: '#0D1526', border: `1px solid ${colors.line}`, borderRadius: 14, padding: '1.2rem 1.3rem', marginBottom: '1.5rem' }}>
          <div style={{ color: '#DCE8FF', fontSize: '.78rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Clinical overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <div style={{ background: '#091225', border: `1px solid ${colors.line}`, borderRadius: 10, padding: '0.9rem 1rem' }}>
              <div style={{ color: colors.muted, fontSize: '.68rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>Latest assessment</div>
              <div style={{ color: '#DCE8FF', fontWeight: 700, marginTop: 6 }}>{summaryInsights.latest?.label || 'No data'}</div>
              <div style={{ color: colors.muted, fontSize: '.8rem', marginTop: 4 }}>{summaryInsights.latest ? `${summaryInsights.latest.probability}% probability` : 'No results saved yet'}</div>
            </div>
            <div style={{ background: '#091225', border: `1px solid ${colors.line}`, borderRadius: 10, padding: '0.9rem 1rem' }}>
              <div style={{ color: colors.muted, fontSize: '.68rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>Highest risk</div>
              <div style={{ color: '#DCE8FF', fontWeight: 700, marginTop: 6 }}>{summaryInsights.highestRisk?.label || 'No data'}</div>
              <div style={{ color: colors.muted, fontSize: '.8rem', marginTop: 4 }}>{summaryInsights.highestRisk ? `${summaryInsights.highestRisk.probability}% at ${formatDate(summaryInsights.highestRisk.created_at)}` : 'No elevated cases yet'}</div>
            </div>
            <div style={{ background: '#091225', border: `1px solid ${colors.line}`, borderRadius: 10, padding: '0.9rem 1rem' }}>
              <div style={{ color: colors.muted, fontSize: '.68rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>Risk mix</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {Object.entries(summaryInsights.riskBreakdown).map(([level, count]) => (
                  <span key={level} style={{ background: '#101C35', border: `1px solid ${colors.line}`, borderRadius: 999, padding: '5px 8px', color: '#DCE8FF', fontSize: '.72rem' }}>{level}: {count}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ color: colors.negative, background: 'rgba(255,94,114,.08)', border: '1px solid rgba(255,94,114,.25)', borderRadius: 10, padding: '12px 14px', marginBottom: '1rem' }}>{error}</div>}
      {loading ? <div style={{ color: colors.muted, padding: '2rem 0' }}>Loading your reports...</div> : records.length === 0 ? <div style={{ background: '#0D1526', border: `1px solid ${colors.line}`, borderRadius: 14, padding: '3rem 1.5rem', textAlign: 'center' }}><div style={{ color: '#DCE8FF', fontWeight: 700, marginBottom: 8 }}>No saved predictions yet</div><p style={{ color: colors.muted, margin: 0 }}>Run an assessment while signed in and it will appear here.</p></div> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {records.map(record => {
            const isSelected = selected === record.id;
            const positive = record.label === 'CKD Detected';
            const details = record.result_details || {};
            const warningCount = (details.early_warnings || []).length;
            const recommendationCount = (details.recommendations || []).length;
            const riskFactors = details.risk_factors || [];
            const ageLabel = details.age_label || 'Not available';

            return <section key={record.id} style={{ background: '#0D1526', border: `1px solid ${isSelected ? '#2D6AFF' : colors.line}`, borderRadius: 14, padding: '1.15rem 1.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div><div style={{ color: colors.muted, fontSize: '.75rem', marginBottom: 7 }}>{formatDate(record.created_at)}</div><div style={{ color: positive ? colors.negative : colors.positive, fontWeight: 700 }}>{record.label}</div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}><div><div style={{ color: colors.muted, fontSize: '.68rem' }}>PROBABILITY</div><strong style={{ color: '#DCE8FF' }}>{record.probability}%</strong></div><div><div style={{ color: colors.muted, fontSize: '.68rem' }}>RISK</div><strong style={{ color: record.result_details?.risk_color || colors.muted }}>{record.risk_level}</strong></div><button onClick={() => setSelected(isSelected ? null : record.id)} style={{ border: '1px solid #2D6AFF', background: 'rgba(45,106,255,.1)', color: '#DCE8FF', borderRadius: 8, padding: '8px 11px', cursor: 'pointer' }}>{isSelected ? 'Hide details' : 'View details'}</button><button onClick={() => downloadRecordPdf(record)} style={{ border: '1px solid rgba(0,229,180,.35)', background: 'rgba(0,229,180,.08)', color: '#00E5B4', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}>PDF</button><button aria-label="Delete prediction" onClick={() => remove(record.id)} style={{ border: '1px solid rgba(255,94,114,.35)', background: 'transparent', color: colors.negative, borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}>Delete</button></div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '0.9rem', color: colors.muted, fontSize: '.72rem' }}>
                <span style={{ border: `1px solid ${colors.line}`, borderRadius: 999, padding: '5px 8px', background: '#111d36' }}>Stage: {record.ckd_stage || details.stage_desc || 'Not available'}</span>
                <span style={{ border: `1px solid ${colors.line}`, borderRadius: 999, padding: '5px 8px', background: '#111d36' }}>Age group: {ageLabel}</span>
                <span style={{ border: `1px solid ${colors.line}`, borderRadius: 999, padding: '5px 8px', background: '#111d36' }}>Alerts: {warningCount}</span>
                <span style={{ border: `1px solid ${colors.line}`, borderRadius: 999, padding: '5px 8px', background: '#111d36' }}>Guidance: {recommendationCount}</span>
                {riskFactors.length > 0 && <span style={{ border: `1px solid ${colors.line}`, borderRadius: 999, padding: '5px 8px', background: '#111d36' }}>Risk factors: {riskFactors.slice(0, 2).join(', ')}</span>}
              </div>

              {isSelected && <ResultDetails record={record} />}
            </section>;
          })}
        </div>
      )}
    </main>
  );
}

export default function Dashboard() {
  if (!process.env.REACT_APP_CLERK_PUBLISHABLE_KEY) return <Navigate to="/predict" replace />;
  return <><SignedIn><DashboardContent /></SignedIn><SignedOut><Navigate to="/predict" replace /></SignedOut></>;
}
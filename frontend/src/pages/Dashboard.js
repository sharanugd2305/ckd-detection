import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { Link, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-react';

const API_URL = 'http://localhost:5000';
const FIELD_LABELS = {
  Age: 'Age', BMI: 'BMI', HbA1c: 'HbA1c', SerumCreatinine: 'Serum creatinine',
  BUNLevels: 'BUN', GFR: 'GFR', HemoglobinLevels: 'Hemoglobin',
  CholesterolTotal: 'Total cholesterol', ProteinInUrine: 'Protein in urine',
  UrinaryTractInfections: 'UTI count', FamilyHistoryKidneyDisease: 'Family history',
};
const FIELD_UNITS = {
  Age: 'years', BMI: 'kg/m²', HbA1c: '%', SerumCreatinine: 'mg/dL',
  BUNLevels: 'mg/dL', GFR: 'mL/min', HemoglobinLevels: 'g/dL',
  CholesterolTotal: 'mg/dL', ProteinInUrine: 'g/day',
  UrinaryTractInfections: 'count',
};

const colors = {
  positive: 'var(--status-no-ckd)',
  negative: 'var(--status-detected)',
  muted: 'var(--text-muted)',
  line: 'var(--border)',
};
const RISK_TONES = {
  'Low Risk': 'var(--risk-low)',
  'Moderate Risk': 'var(--risk-moderate)',
  'High Risk': 'var(--risk-high)',
  'Very High Risk': 'var(--risk-very-high)',
};

function Icon({ name, size = 18, ...props }) {
  const paths = {
    assessment: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h4" /><path d="m15 17 2 2 4-4" /></>,
    alert: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v4m0 4h.01" /></>,
    probability: <><path d="M3 17 8 12l4 3 8-9" /><path d="M14 6h6v6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6" /><path d="M10 11v6m4-6v6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {paths[name]}
    </svg>
  );
}

function getRiskTone(level) {
  return RISK_TONES[level] || colors.muted;
}

function clampProbability(value) {
  const probability = Number(value);
  return Number.isFinite(probability) ? Math.max(0, Math.min(100, probability)) : 0;
}

function MiniTrend({ points }) {
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 3 : 3 + (index / (points.length - 1)) * 94;
    const y = 25 - point.probability * 0.2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="dashboard-mini-trend" viewBox="0 0 100 30" role="img" aria-label="Average prediction probability trend">
      <polyline points={coords || '3,25 97,25'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function getThemeRgb(variable) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  const match = value.match(/^#([0-9a-f]{6})$/i);
  if (!match) throw new Error(`Theme variable ${variable} must contain a six-digit hex color.`);
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16));
}

function ResultDetails({ record }) {
  const details = record.result_details || {};
  const inputs = record.inputs || {};
  const warnings = details.early_warnings || [];
  const recommendations = details.recommendations || [];
  return (
    <div className="dashboard-record-details">
      <div className="dashboard-detail-metrics">
        {[
          ['Probability', `${record.probability}%`, record.probability >= 50 ? colors.negative : colors.positive],
          ['Risk level', record.risk_level, getRiskTone(record.risk_level)],
          ['CKD stage', record.ckd_stage || details.stage_desc || 'Normal range', 'var(--risk-moderate)'],
          ['Model', details.model_name || 'Stored result', colors.muted],
        ].map(([label, value, color]) => (
          <div className="dashboard-detail-metric" key={label}>
            <div className="dashboard-detail-label">{label}</div>
            <strong style={{ color, fontSize: '.95rem' }}>{value}</strong>
          </div>
        ))}
      </div>
      {details.interpretation && <p className="dashboard-interpretation">{details.interpretation}</p>}
      <div className="dashboard-detail-columns">
        <div>
          <h4 className="dashboard-detail-heading">Clinical inputs</h4>
          <div className="dashboard-input-list">
            {Object.entries(inputs).map(([key, value]) => (
              <div className="dashboard-input-row" key={key}>
                <span>{FIELD_LABELS[key] || key}</span>
                <strong>{value ?? 'Not provided'}{value != null && FIELD_UNITS[key] ? ` ${FIELD_UNITS[key]}` : ''}</strong>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="dashboard-detail-heading">Report details</h4>
          {warnings.length > 0 && (
            <div className="dashboard-report-group">
              <span className="dashboard-alert-label">Alerts</span>
              {warnings.map((item, index) => <p className="dashboard-callout" key={index}><Icon name="alert" size={16} />{item.msg}</p>)}
            </div>
          )}
          {recommendations.length > 0 && (
            <div className="dashboard-report-group">
              <span className="dashboard-recommendation-label">Recommendations</span>
              {recommendations.map((item, index) => (
                <p className="dashboard-recommendation" key={index}>
                  <Icon name="check" size={16} />
                  <span><strong>{item.title}:</strong> {item.desc}</span>
                </p>
              ))}
            </div>
          )}
          {!warnings.length && !recommendations.length && <p className="dashboard-muted-copy">Detailed report data was not saved for this older record.</p>}
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

  doc.setFillColor(...getThemeRgb('--bg'));
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(...getThemeRgb('--text'));
  doc.setFontSize(18);
  doc.text('CKD Risk Assessment Report', 14, 18);

  doc.setTextColor(...getThemeRgb('--surface-text'));
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
    doc.setTextColor(...getThemeRgb('--paper-accent'));
    doc.text(title, 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(...getThemeRgb('--surface-text'));
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
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

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

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records
      .filter((record) => riskFilter === 'all' || record.risk_level === riskFilter)
      .filter((record) => {
        if (!query) return true;
        const details = record.result_details || {};
        return [
          record.label,
          record.risk_level,
          record.ckd_stage,
          details.stage_desc,
          details.age_label,
          ...(details.risk_factors || []),
        ].some((value) => String(value || '').toLowerCase().includes(query));
      })
      .sort((first, second) => {
        if (sortOrder === 'highest') return clampProbability(second.probability) - clampProbability(first.probability);
        if (sortOrder === 'lowest') return clampProbability(first.probability) - clampProbability(second.probability);
        const dateDelta = new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
        return sortOrder === 'oldest' ? dateDelta : -dateDelta;
      });
  }, [records, riskFilter, search, sortOrder]);

  const probabilityTrend = useMemo(() => {
    const ordered = [...records].sort((first, second) =>
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime());
    const points = ordered.slice(-12).map((record, index, recent) => ({
      id: record.id,
      probability: clampProbability(record.probability),
      x: recent.length === 1 ? 50 : 8 + (index / (recent.length - 1)) * 84,
    }));
    return points.map((point) => ({ ...point, y: 88 - point.probability * 0.68 }));
  }, [records]);

  const remove = async (id) => {
    try {
      await request('delete', `/history/${id}`);
      setRecords(previous => previous.filter(record => record.id !== id));
      if (selected === id) setSelected(null);
    }
    catch (err) { setError(err.response?.data?.error || 'That prediction could not be deleted.'); }
  };

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Private health workspace</p>
          <h1>Good to see you{user?.firstName ? `, ${user.firstName}` : ''}.</h1>
          <p>Review your CKD risk assessments, clinical summaries, and saved reports.</p>
        </div>
        <Link className="dashboard-new-assessment" to="/predict">
          <Icon name="plus" size={18} />
          New assessment
        </Link>
      </header>

      <section className="dashboard-stat-grid" aria-label="Assessment summary">
        {[
          { label: 'Assessments', value: stats.total, tone: 'neutral', icon: 'assessment' },
          { label: 'CKD detected', value: stats.detected, tone: 'alert', icon: 'alert' },
          { label: 'Average probability', value: `${stats.average}%`, tone: 'accent', icon: 'probability' },
        ].map(({ label, value, tone, icon }) => (
          <article className={`dashboard-stat-card dashboard-stat-${tone}`} key={label}>
            <div className="dashboard-stat-topline">
              <p>{label}</p>
              <span className="dashboard-stat-icon"><Icon name={icon} size={19} /></span>
            </div>
            <div className="dashboard-stat-value-row">
              <strong>{value}</strong>
              {tone === 'accent' && records.length > 0 && <MiniTrend points={probabilityTrend} />}
            </div>
          </article>
        ))}
      </section>

      {records.length > 0 && (
        <section className="dashboard-overview" aria-labelledby="dashboard-overview-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-eyebrow">At a glance</p>
              <h2 id="dashboard-overview-title">Clinical overview</h2>
            </div>
            <p>Based on {records.length} saved {records.length === 1 ? 'assessment' : 'assessments'}</p>
          </div>
          <div className="dashboard-overview-grid">
            <article className="dashboard-insight">
              <p className="dashboard-field-label">Latest assessment</p>
              <strong>{summaryInsights.latest?.label || 'No data'}</strong>
              <span>{summaryInsights.latest ? `${summaryInsights.latest.probability}% probability · ${formatDate(summaryInsights.latest.created_at)}` : 'No results saved yet'}</span>
            </article>
            <article className="dashboard-insight">
              <p className="dashboard-field-label">Highest risk</p>
              <strong>{summaryInsights.highestRisk?.label || 'No data'}</strong>
              <span>{summaryInsights.highestRisk ? `${summaryInsights.highestRisk.probability}% at ${formatDate(summaryInsights.highestRisk.created_at)}` : 'No elevated cases yet'}</span>
            </article>
            <article className="dashboard-insight dashboard-risk-insight">
              <p className="dashboard-field-label">Risk mix</p>
              <div className="dashboard-risk-bar" role="img" aria-label={Object.entries(summaryInsights.riskBreakdown).map(([level, count]) => `${level}: ${count}`).join(', ')}>
                {Object.entries(summaryInsights.riskBreakdown).filter(([, count]) => count > 0).map(([level, count]) => (
                  <span key={level} style={{ width: `${(count / records.length) * 100}%`, backgroundColor: getRiskTone(level) }} />
                ))}
              </div>
              <div className="dashboard-risk-list">
                {Object.entries(summaryInsights.riskBreakdown).map(([level, count]) => (
                  <span key={level}><i style={{ backgroundColor: getRiskTone(level) }} />{level}<strong>{count}</strong></span>
                ))}
              </div>
            </article>
          </div>
        </section>
      )}

      {records.length > 1 && (
        <section className="dashboard-trend" aria-labelledby="dashboard-trend-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-eyebrow">Assessment history</p>
              <h2 id="dashboard-trend-title">Probability over time</h2>
            </div>
            <p>Most recent {probabilityTrend.length} records</p>
          </div>
          <div className="dashboard-chart-wrap">
            <svg className="dashboard-trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img"
              aria-label={`Prediction probability trend: ${probabilityTrend.map(point => `${point.probability}%`).join(', ')}`}>
              {[20, 40, 60, 80].map((value) => {
                const y = 88 - value * 0.68;
                return <line key={value} x1="8" x2="92" y1={y} y2={y} className="dashboard-chart-gridline" />;
              })}
              <polyline points={probabilityTrend.map(point => `${point.x},${point.y}`).join(' ')} className="dashboard-chart-line" />
              {probabilityTrend.map((point) => <circle key={point.id} cx={point.x} cy={point.y} r="1.6" className="dashboard-chart-point" />)}
            </svg>
            <div className="dashboard-chart-axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
            <p className="dashboard-chart-caption">Probability estimates are model outputs, not a diagnosis or a measure of kidney function.</p>
          </div>
        </section>
      )}

      {error && (
        <div className="dashboard-error" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setError('')}><Icon name="close" size={18} /></button>
        </div>
      )}
      {loading ? (
        <section className="dashboard-skeleton-list" role="status" aria-label="Loading prediction history">
          <span className="dashboard-sr-only">Loading prediction history</span>
          {[0, 1, 2].map((item) => (
            <div className="dashboard-skeleton-card" key={item} aria-hidden="true">
              <div className="dashboard-skeleton-line dashboard-skeleton-date" />
              <div className="dashboard-skeleton-line dashboard-skeleton-title" />
              <div className="dashboard-skeleton-line dashboard-skeleton-meta" />
            </div>
          ))}
        </section>
      ) : records.length === 0 ? (
        <section className="dashboard-empty">
          <span className="dashboard-empty-icon"><Icon name="calendar" size={25} /></span>
          <p className="dashboard-eyebrow">Assessment history</p>
          <h2>No saved predictions yet</h2>
          <p>Complete an assessment while signed in to save its result and review it here later.</p>
          <Link className="dashboard-new-assessment" to="/predict"><Icon name="plus" size={18} />Start an assessment</Link>
        </section>
      ) : (
        <>
          <section className="dashboard-toolbar" aria-label="Filter and sort predictions">
            <div className="dashboard-search">
              <Icon name="search" size={18} />
              <input
                type="search"
                aria-label="Search prediction history"
                placeholder="Search stage, result, or risk factor"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <label className="dashboard-select-wrap">
              <span>Risk level</span>
              <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                <option value="all">All risk levels</option>
                {Object.keys(RISK_TONES).map((level) => <option value={level} key={level}>{level}</option>)}
              </select>
            </label>
            <label className="dashboard-select-wrap">
              <span>Sort by</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest probability</option>
                <option value="lowest">Lowest probability</option>
              </select>
            </label>
          </section>
          {filteredRecords.length ? (
            <section className="dashboard-history" aria-label="Saved predictions">
              {filteredRecords.map(record => {
            const isSelected = selected === record.id;
            const positive = record.label === 'CKD Detected';
            const details = record.result_details || {};
            const warningCount = (details.early_warnings || []).length;
            const recommendationCount = (details.recommendations || []).length;
            const riskFactors = details.risk_factors || [];
            const ageLabel = details.age_label || 'Not available';

            return (
              <article
                className={`dashboard-record${isSelected ? ' is-selected' : ''}`}
                key={record.id}
                style={{ '--record-risk-color': getRiskTone(record.risk_level) }}
              >
                <div className="dashboard-record-header">
                  <div className="dashboard-record-result">
                    <time>{formatDate(record.created_at)}</time>
                    <strong className={positive ? 'is-positive' : 'is-negative'}>{record.label}</strong>
                    <span className="dashboard-risk-badge">{record.risk_level || 'Risk not classified'}</span>
                  </div>
                  <div className="dashboard-record-actions">
                    <div className="dashboard-record-value">
                      <span>Probability</span>
                      <strong>{record.probability}%</strong>
                    </div>
                    <div className="dashboard-probability-meter" role="img" aria-label={`Prediction probability ${clampProbability(record.probability)} percent`}>
                      <span style={{ width: `${clampProbability(record.probability)}%` }} />
                    </div>
                    <button
                      className="dashboard-button dashboard-button-secondary"
                      aria-expanded={isSelected}
                      aria-controls={`dashboard-details-${record.id}`}
                      onClick={() => setSelected(isSelected ? null : record.id)}
                    >
                      <Icon name={isSelected ? 'chevron' : 'eye'} size={16} />
                      {isSelected ? 'Hide details' : 'View details'}
                    </button>
                    <button className="dashboard-button dashboard-button-accent" onClick={() => downloadRecordPdf(record)}>
                      <Icon name="file" size={16} />PDF
                    </button>
                    <button
                      className="dashboard-button dashboard-button-danger"
                      aria-label={`Delete prediction from ${formatDate(record.created_at)}`}
                      onClick={() => {
                        if (window.confirm('Delete this saved assessment? This action cannot be undone.')) remove(record.id);
                      }}
                    >
                      <Icon name="trash" size={16} /><span>Delete</span>
                    </button>
                  </div>
                </div>

                <div className="dashboard-record-metadata">
                  <span><Icon name="calendar" size={14} /><strong>{record.ckd_stage || details.stage_desc || 'Stage not available'}</strong></span>
                  <span><strong>{ageLabel}</strong></span>
                  <span>{warningCount} {warningCount === 1 ? 'alert' : 'alerts'}</span>
                  <span>{recommendationCount} recommendations</span>
                  {riskFactors.length > 0 && <span className="dashboard-risk-factor-chip">{riskFactors.slice(0, 2).join(', ')}</span>}
                </div>

                <div
                  className={`dashboard-expand${isSelected ? ' is-open' : ''}`}
                  id={`dashboard-details-${record.id}`}
                  aria-hidden={!isSelected}
                  inert={!isSelected}
                >
                  <div className="dashboard-expand-inner"><ResultDetails record={record} /></div>
                </div>
              </article>
            );
              })}
            </section>
          ) : (
            <div className="dashboard-no-results">
              <p>No assessments match those filters.</p>
              <button type="button" className="dashboard-text-button" onClick={() => { setSearch(''); setRiskFilter('all'); }}>
                Clear search and risk filter
              </button>
            </div>
          )}
        </>
      )}
      <footer className="dashboard-disclaimer">
        <Icon name="alert" size={16} />
        <p><strong>Health information:</strong> NephroScan is a research and educational decision-support tool. It does not provide a medical diagnosis. Discuss health concerns with a qualified healthcare professional.</p>
      </footer>
    </main>
  );
}

export default function Dashboard() {
  if (!process.env.REACT_APP_CLERK_PUBLISHABLE_KEY) return <Navigate to="/predict" replace />;
  return <><SignedIn><DashboardContent /></SignedIn><SignedOut><Navigate to="/predict" replace /></SignedOut></>;
}
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MODEL_DETAILS = {
  'XGBoost': {
    short: 'XGB',
    description: 'Gradient-boosted decision trees. The prediction endpoint uses the calibrated XGBoost model.',
  },
  'Random Forest': {
    short: 'RF',
    description: 'An ensemble of decision trees trained on the project’s CKD clinical features.',
  },
  'SVM (RBF)': {
    short: 'SVM',
    description: 'A support-vector classifier with a radial-basis-function kernel.',
  },
  'Logistic Regression': {
    short: 'LR',
    description: 'A linear classification baseline for comparison with the tree-based and kernel models.',
  },
};

const METRICS = [
  { key: 'Accuracy', label: 'Accuracy' },
  { key: 'Precision', label: 'Precision (macro)' },
  { key: 'Recall', label: 'Recall (macro)' },
  { key: 'F1-Score', label: 'F1-score (macro)' },
  { key: 'AUC-ROC', label: 'AUC-ROC' },
];

function toPercentage(value) {
  if (!Number.isFinite(value)) return null;
  return value <= 1 ? value * 100 : value;
}

export default function Models() {
  const [models, setModels] = useState([]);
  const [winner, setWinner] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    axios.get('http://localhost:5000/model-info')
      .then(({ data }) => {
        if (!active) return;
        const ranking = Array.isArray(data?.ranking) ? data.ranking : [];
        const loadedModels = ranking
          .filter((entry) => entry && MODEL_DETAILS[entry.model] && entry.metrics)
          .map((entry) => ({
            name: entry.model,
            ...MODEL_DETAILS[entry.model],
            metrics: Object.fromEntries(METRICS.map(({ key }) => [
              key,
              toPercentage(entry.metrics[key]),
            ])),
          }))
          .filter((entry) => METRICS.every(({ key }) => Number.isFinite(entry.metrics[key])));

        if (loadedModels.length === 0) {
          setError('The model service did not return valid evaluation results.');
          return;
        }

        const selectedWinner = loadedModels.some((entry) => entry.name === data.winner)
          ? data.winner
          : loadedModels[0].name;
        setModels(loadedModels);
        setWinner(selectedWinner);
        setSelectedModel(selectedWinner);
      })
      .catch(() => {
        if (active) setError('Could not load model evaluation results. Check that the prediction service is running.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [retryKey]);

  const selected = models.find((model) => model.name === selectedModel);

  return (
    <main className="models-page">
      <header className="models-header">
        <p className="models-eyebrow">Model evaluation</p>
        <h1>Compare the classifiers</h1>
        <p>
          Evaluation scores returned by the project model service. Metrics are calculated on
          the held-out test set; precision, recall, and F1-score use macro averaging.
        </p>
      </header>

      {loading && <div className="models-message" role="status">Loading evaluation results…</div>}

      {!loading && error && (
        <section className="models-message models-error" role="alert">
          <p>{error}</p>
          <button type="button" className="models-button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry
          </button>
        </section>
      )}

      {!loading && !error && (
        <>
          <section className="models-winner" aria-label="Prediction model">
            <div>
              <p className="models-eyebrow">Used for predictions</p>
              <h2>{winner}</h2>
              <p>
                The prediction endpoint uses this model. It is identified by the project’s
                model configuration, not by the selected row below.
              </p>
            </div>
            <div className="models-winner-score">
              <span>Macro F1-score</span>
              <strong>{models.find((model) => model.name === winner)?.metrics['F1-Score'].toFixed(2)}%</strong>
            </div>
          </section>

          <section className="models-comparison" aria-labelledby="comparison-title">
            <div className="models-section-heading">
              <div>
                <p className="models-eyebrow">Held-out evaluation</p>
                <h2 id="comparison-title">Performance by model</h2>
              </div>
              <p>Select a model to view its full metric profile.</p>
            </div>

            <div className="models-table-wrap">
              <table className="models-table">
                <thead>
                  <tr>
                    <th scope="col">Model</th>
                    {METRICS.map(({ key, label }) => <th scope="col" key={key}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr
                      key={model.name}
                      className={selectedModel === model.name ? 'is-selected' : ''}
                    >
                      <th scope="row">
                        <button
                          type="button"
                          className="models-row-button"
                          aria-pressed={selectedModel === model.name}
                          onClick={() => setSelectedModel(model.name)}
                        >
                          <span>{model.name}</span>
                          {model.name === winner && <span className="models-tag">Prediction model</span>}
                        </button>
                      </th>
                      {METRICS.map(({ key }) => (
                        <td key={key}>{model.metrics[key].toFixed(2)}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selected && (
            <section className="models-detail" aria-live="polite">
              <div className="models-detail-heading">
                <span className="models-model-code">{selected.short}</span>
                <div>
                  <p className="models-eyebrow">Selected classifier</p>
                  <h2>{selected.name}</h2>
                  <p>{selected.description}</p>
                </div>
              </div>
              <div className="models-metric-list">
                {METRICS.map(({ key, label }) => {
                  const value = selected.metrics[key];
                  return (
                    <div className="models-metric" key={key}>
                      <div className="models-metric-label">
                        <span>{label}</span>
                        <strong>{value.toFixed(2)}%</strong>
                      </div>
                      <div className="models-meter" aria-hidden="true">
                        <span style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <p className="models-footnote">
            Scores summarize performance on the evaluation dataset. They do not guarantee
            accuracy for an individual patient and are not a substitute for clinical assessment.
          </p>
        </>
      )}
    </main>
  );
}

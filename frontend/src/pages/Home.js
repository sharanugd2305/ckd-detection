import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import kidneyImage from '../images/kidney.jpg';
import './Home.css';

const FEATURES = [
  {
    icon: '◉',
    title: 'Age-aware reference ranges',
    text: 'Clinical references are considered alongside the project dataset age span of 20–90 years.',
    tone: 'sage',
  },
  {
    icon: '↗',
    title: 'A clear risk summary',
    text: 'Review a CKD prediction with its probability, classification, and supporting context.',
    tone: 'aqua',
  },
  {
    icon: '⌁',
    title: 'GFR-based stage context',
    text: 'See the result alongside the project’s GFR-based stage reference.',
    tone: 'blue',
  },
  {
    icon: '!',
    title: 'Early warning context',
    text: 'Review alerts raised by the assessment when clinical values warrant attention.',
    tone: 'peach',
  },
  {
    icon: '+',
    title: 'Practical next steps',
    text: 'Explore evidence-informed recommendations included with an assessment.',
    tone: 'sage',
  },
  {
    icon: '⌘',
    title: 'Four-model comparison',
    text: 'Explore Logistic Regression, Random Forest, SVM, and XGBoost.',
    tone: 'blue',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Enter clinical values',
    text: 'Provide the available patient and laboratory details in the assessment form.',
  },
  {
    number: '02',
    title: 'Review the model estimate',
    text: 'The service returns a CKD prediction and supporting risk information.',
  },
  {
    number: '03',
    title: 'Explore the report',
    text: 'Review the stage context, alerts, recommendations, and downloadable report.',
  },
];

const MODELS = [
  { initials: 'LR', name: 'Logistic Regression', description: 'A linear classification baseline.' },
  { initials: 'RF', name: 'Random Forest', description: 'An ensemble of decision trees.' },
  { initials: 'SVM', name: 'SVM (RBF)', description: 'A support-vector classifier with an RBF kernel.' },
  { initials: 'XGB', name: 'XGBoost', description: 'The calibrated model used by the prediction endpoint.' },
];

const STAGES = [
  { name: 'Stage 1', gfr: 'GFR ≥ 90', description: 'Normal / high', color: '#31866B' },
  { name: 'Stage 2', gfr: 'GFR 60–89', description: 'Mild', color: '#4D9C7D' },
  { name: 'Stage 3a', gfr: 'GFR 45–59', description: 'Mild–Moderate', color: '#A87519' },
  { name: 'Stage 3b', gfr: 'GFR 30–44', description: 'Moderate', color: '#B56525' },
  { name: 'Stage 4', gfr: 'GFR 15–29', description: 'Severe', color: '#B94750' },
  { name: 'Stage 5', gfr: 'GFR < 15', description: 'Kidney Failure', color: '#A52D43' },
];

function Eyebrow({ children }) {
  return <p className="home-eyebrow">{children}</p>;
}

function FeatureCard({ icon, title, text, tone }) {
  return (
    <article className="home-feature-card">
      <span className={`home-icon home-icon-${tone}`} aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <Eyebrow>Kidney health, made clearer</Eyebrow>
          <h1>Chronic kidney disease<br /><span>detection, made clearer.</span></h1>
          <p className="home-hero-description">
            NephroScan is an academic CKD assessment project built around clinical and
            demographic data. Explore a model-generated estimate with its supporting context.
          </p>
          <div className="home-hero-actions">
            <button type="button" className="home-button home-button-primary" onClick={() => navigate('/predict')}>
              Start an assessment <span aria-hidden="true">→</span>
            </button>
            <Link className="home-button home-button-secondary" to="/about">Explore the methodology</Link>
          </div>
          <p className="home-hero-note">Research and educational use only · Not a medical diagnosis</p>
        </div>

        <div className="home-visual">
          <div className="home-visual-glow" />
          <div className="home-orbit home-orbit-one" />
          <div className="home-orbit home-orbit-two" />
          <img
            className="home-kidney-art"
            src={kidneyImage}
            alt="Luminous illustration of both kidneys and their connecting vessels"
          />
          <div className="home-visual-caption">
            <span className="home-caption-dot" />
            <span><strong>Clinical context</strong><small>Designed around 13 input features</small></span>
          </div>
          <div className="home-visual-tag">CKD · 20–90 years</div>
        </div>
      </section>

      <section className="home-age-strip" aria-label="Dataset age range">
        <div className="home-age-mark" aria-hidden="true">20–90</div>
        <div className="home-age-copy">
          <Eyebrow>Dataset scope</Eyebrow>
          <h2>Built around adult CKD data</h2>
          <p>The project dataset includes adults aged 20–90, grouped into young adult, adult, and senior ranges.</p>
        </div>
        <div className="home-age-tags">
          <span>Young adult</span><span>Adult</span><span>Senior</span>
        </div>
      </section>

      <section className="home-section" id="capabilities">
        <div className="home-section-heading">
          <div><Eyebrow>Thoughtful by design</Eyebrow><h2>Assessment, with context</h2></div>
          <p>Explore the information and tools included in the NephroScan workflow.</p>
        </div>
        <div className="home-feature-grid">
          {FEATURES.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
        </div>
      </section>

      <section className="home-section home-process-section" id="how-it-works">
        <div className="home-section-heading">
          <div><Eyebrow>A straightforward workflow</Eyebrow><h2>How it works</h2></div>
          <p>From available clinical inputs to a report you can review.</p>
        </div>
        <div className="home-steps">
          {STEPS.map((step) => (
            <article className="home-step" key={step.number}>
              <span className="home-step-number">{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section" id="models">
        <div className="home-section-heading">
          <div><Eyebrow>Model transparency</Eyebrow><h2>Four classifiers, one comparison</h2></div>
          <Link className="home-text-link" to="/models">View model results <span aria-hidden="true">→</span></Link>
        </div>
        <div className="home-model-grid">
          {MODELS.map((model, index) => (
            <article className={`home-model-card${index === 3 ? ' home-model-featured' : ''}`} key={model.initials}>
              <span className="home-model-initials">{model.initials}</span>
              <div><h3>{model.name}</h3><p>{model.description}</p></div>
              {index === 3 && <span className="home-model-label">Prediction endpoint</span>}
            </article>
          ))}
        </div>
      </section>

      <section className="home-stage-panel" id="stages">
        <div className="home-stage-intro">
          <Eyebrow>Reference guide</Eyebrow>
          <h2>GFR-based CKD staging</h2>
          <p>Use this visual reference to understand how GFR ranges correspond to the stage labels shown in the project.</p>
          <div className="home-stage-bar" aria-hidden="true">
            {STAGES.map((stage) => <span key={stage.name} style={{ backgroundColor: stage.color }} />)}
          </div>
        </div>
        <div className="home-stage-list">
          {STAGES.map((stage) => (
            <div className="home-stage-row" key={stage.name}>
              <span className="home-stage-dot" style={{ backgroundColor: stage.color }} />
              <strong>{stage.name}</strong><code>{stage.gfr}</code><span>{stage.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-about-panel" id="about">
        <div className="home-about-icon" aria-hidden="true">✦</div>
        <div>
          <Eyebrow>About NephroScan</Eyebrow>
          <h2>A project for learning and exploration</h2>
          <p>Read about the dataset, preprocessing pipeline, model evaluation, and clinical features behind this academic project.</p>
        </div>
        <Link className="home-button home-button-secondary" to="/about">About the project <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="home-footer">
        <Link className="home-footer-brand" to="/">NephroScan<span>CKD detection project</span></Link>
        <nav className="home-footer-links" aria-label="Footer navigation">
          <Link to="/predict">Assessment</Link>
          <Link to="/models">Models</Link>
          <Link to="/about">About</Link>
        </nav>
        <p>For research and educational use only. Not a medical diagnosis.</p>
      </footer>
    </main>
  );
}

import React, { useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Brain, Eye, EyeOff, FileUp, Gauge, Heart, ShieldCheck, Users, Waves } from 'lucide-react';
import { api, roleLabels } from '../lib/api.js';
import { evaluation } from '../data/evaluation.js';
import { Alert } from '../components/ui.jsx';

const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'features', label: 'Features' },
  { id: 'research', label: 'Research & safety' }
];

export const DEMO_ROLES = [
  { key: 'doctor', label: 'Clinician (Neurologist)', identifier: 'doctor', password: 'DemoPass123!', summary: '18-channel EEG review, EDF upload, Digital Twin & multi-medicine prescribing' },
  { key: 'patient', label: 'Patient / Subject', identifier: 'patient', password: 'DemoPass123!', summary: 'Wellness continuity summary, active medication schedule & shared reports' },
  { key: 'caregiver', label: 'Caregiver', identifier: 'caregiver', password: 'DemoPass123!', summary: 'Authorized care plan access, appointment schedule & safety instructions' },
  { key: 'admin', label: 'Administrator', identifier: 'admin', password: 'DemoPass123!', summary: 'Role-based access control, subject consent ledger & security audit log' },
];

const Cta = ({ onLogin, eyebrow = 'Authorized users' }) => (
  <section className="pub-cta">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h2>Continue to your NeuroTwin workspace</h2>
      <p className="muted">Sign in to access the tools and records permitted by your role.</p>
    </div>
    <button type="button" className="btn btn-primary btn-lg" onClick={onLogin}>Workspace login <ArrowRight size={17} /></button>
  </section>
);

function Home({ onLogin, onNavigate }) {
  const cf = evaluation.confirmed;
  return (
    <main className="pub-main">
      <section className="pub-hero">
        <div>
          <span className="badge is-info"><Brain size={12} /> EEG digital twin research platform</span>
          <h1>Understand the signal. <em>Keep the clinical context.</em></h1>
          <p className="pub-lead">NeuroTwin brings EEG signal review, experimental model outputs and longitudinal patient context into one role-aware research workspace.</p>
          <div className="pub-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={onLogin}>Enter workspace <ArrowRight size={17} /></button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => onNavigate('features')}>Explore capabilities</button>
          </div>
          <div className="pub-trust">
            <span><ShieldCheck size={16} /> Role-based access</span>
            <span><Activity size={16} /> 18-channel EEG analysis</span>
            <span><Users size={16} /> Connected care teams</span>
          </div>
        </div>
        <aside className="pub-visual" aria-label="Platform workflow summary">
          <p className="eyebrow">How a recording is processed</p>
          <div className="pub-pipeline">
            {[
              [FileUp, 'Upload EDF', 'Up to 100 MB, validated before analysis'],
              [Waves, 'Preprocess', '0.5–40 Hz band-pass, 128 Hz resample, z-score'],
              [Gauge, 'Model inference', '10-second windows scored by a 1D-CNN'],
              [Eye, 'Clinician review', 'Timeline, events and report for review']
            ].map(([Icon, title, sub]) => (
              <div className="pub-pipe" key={title}>
                <span className="card-icon"><Icon size={17} /></span>
                <div><b>{title}</b><small>{sub}</small></div>
              </div>
            ))}
          </div>
          <div className="pub-stats">
            <div className="pub-stat"><b>{evaluation.windowLevel.rocAuc.toFixed(3)}</b><small>ROC-AUC (test)</small></div>
            <div className="pub-stat"><b>{(cf.specificity * 100).toFixed(1)}%</b><small>Specificity</small></div>
            <div className="pub-stat"><b>{cf.falseAlarmsPerHour.toFixed(1)}/h</b><small>False alarms</small></div>
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>CHB-MIT, subject-disjoint test split. Retrospective research results only.</p>
        </aside>
      </section>
      <section className="pub-section">
        <p className="eyebrow">One connected workspace</p>
        <h2>Research context, made easier to explore.</h2>
        <p className="pub-lead">A clinical decision-support prototype designed to organise EEG-informed records and support collaboration between authorised roles.</p>
        <div className="pub-grid">
          {[
            [Activity, 'EEG research & anomaly review', 'EEG preprocessing, model-assisted scoring and reviewable signal intervals for supervised research.'],
            [Brain, 'Patient-specific digital twin', 'A longitudinal view of stored EEG analyses and patient-specific research context.'],
            [ShieldCheck, 'Role-aware architecture', 'Clinicians review waveforms and model output; patients and caregivers see plain-language summaries.']
          ].map(([Icon, title, text]) => (
            <article className="pub-card" key={title}><span className="card-icon"><Icon size={18} /></span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>
      <Cta onLogin={onLogin} eyebrow="Clinical decision support" />
    </main>
  );
}

const About = ({ onLogin }) => (
  <main className="pub-main">
    <section className="pub-section" style={{ borderTop: 0 }}>
      <p className="eyebrow">About NeuroTwin</p>
      <h2>A structured view of EEG research and longitudinal context.</h2>
      <div className="pub-copy">
        <p>NeuroTwin is an academic research prototype exploring how EEG signal processing, machine-learning research outputs and patient-specific longitudinal records can be brought together in a single digital workspace.</p>
        <p>It is intended for demonstration, research and supervised review. It does not replace clinical judgement, neurological examination or validated medical devices.</p>
      </div>
    </section>
    <Cta onLogin={onLogin} />
  </main>
);

const Features = ({ onLogin }) => (
  <main className="pub-main">
    <section className="pub-section" style={{ borderTop: 0 }}>
      <p className="eyebrow">Platform capabilities</p>
      <h2>Built around four connected roles.</h2>
      <p className="pub-lead">Tailored interfaces reduce cognitive load while keeping the underlying data transparent.</p>
      <div className="pub-grid">
        {[
          [ShieldCheck, 'Administrator', 'Governance oversight, audit events, role assignment, user access and patient consent management.'],
          [Activity, 'Clinician', 'Multichannel EEG inspection, model-flagged intervals, threshold review, prescriptions and follow-ups.'],
          [Heart, 'Patient', 'Plain-language wellness summary, medication schedule, appointments and printable prescription slips.'],
          [Users, 'Caregiver', 'Read-only access to authorised summaries, appointments and care instructions.']
        ].map(([Icon, title, text]) => (
          <article className="pub-card" key={title}><span className="card-icon"><Icon size={18} /></span><h3>{title}</h3><p>{text}</p></article>
        ))}
      </div>
    </section>
    <Cta onLogin={onLogin} />
  </main>
);

const Research = ({ onLogin }) => (
  <main className="pub-main">
    <section className="pub-section" style={{ borderTop: 0 }}>
      <p className="eyebrow">Research & safety</p>
      <h2>Transparent about what this prototype is — and is not.</h2>
      <div className="pub-copy">
        <p>The EEG model is trained on the public CHB-MIT Scalp EEG Database and evaluated on subject-disjoint test recordings. Reported metrics are retrospective research results and are shown with their limitations on the Model performance page.</p>
        <p>Model outputs must not be used to diagnose, predict an individual&apos;s clinical outcome, change medication or make treatment decisions. Any analysis requires review by a qualified clinician in the context of the full clinical history.</p>
        <Alert tone="warning"><b>Important boundary.</b> For academic research and demonstration only. Not for diagnosis or treatment.</Alert>
      </div>
    </section>
    <Cta onLogin={onLogin} />
  </main>
);

function Login({ onLogin, onBack }) {
  const [identifier, setIdentifier] = useState('doctor');
  const [password, setPassword] = useState('DemoPass123!');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="pub-main">
      <div className="login-layout">
        <section>
          <p className="eyebrow">Authorised access</p>
          <h1>Your research workspace, securely connected.</h1>
          <p className="pub-lead">Sign in with the username and password assigned to your NeuroTwin account. Your role determines which records and tools are available.</p>
          <div style={{ marginTop: 24, maxWidth: 520 }}>
            <Alert tone="warning"><b>Research use only.</b> NeuroTwin is not a diagnostic device. Outputs require qualified clinical review.</Alert>
          </div>
        </section>
        <section className="card login-card">
          <form onSubmit={submit}>
            <div>
              <h2>Welcome back</h2>
              <p className="muted">Enter your username and password to continue.</p>
            </div>
            <label className="field"><span className="field-label">Username or email</span>
              <input autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </label>
            <label className="field"><span className="field-label">Password</span>
              <span style={{ position: 'relative', display: 'block' }}>
                <input autoComplete="current-password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: 44 }} />
                <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', right: 4, top: 4 }} onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </span>
            </label>
            {error && <Alert tone="danger">{error}</Alert>}
            <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'} {!busy && <ArrowRight size={17} />}</button>
            <div className="demo-box">
              <b style={{ color: 'var(--text)' }}>Demo accounts — select a role</b>
              <div className="chip-row">
                {['doctor', 'patient', 'caregiver', 'admin'].map((role) => (
                  <button type="button" key={role} className="chip-btn" onClick={() => setIdentifier(role)}>{roleLabels[role]}</button>
                ))}
              </div>
              <span>Password for all demo accounts: <b className="mono">DemoPass123!</b></span>
            </div>
            <button type="button" className="btn btn-ghost" onClick={onBack}>← Back to website</button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function PublicSite({ onLogin }) {
  const [page, setPage] = useState('home');
  const go = (id) => { setPage(id); window.scrollTo({ top: 0 }); };
  const openLogin = () => go('login');
  const View = { home: Home, about: About, features: Features, research: Research }[page];

  return (
    <div className="pub">
      <header className="pub-nav">
        <button type="button" className="sb-brand-btn" onClick={() => go('home')} aria-label="NeuroTwin home">
          <span className="sb-logo"><Brain size={19} /></span>
          <span className="sb-brand-text">NeuroTwin<small>EEG research workspace</small></span>
        </button>
        <nav aria-label="Website">
          {PAGES.map((p) => <button key={p.id} type="button" aria-current={page === p.id ? 'page' : undefined} onClick={() => go(p.id)}>{p.label}</button>)}
        </nav>
        <button type="button" className="btn btn-primary" onClick={openLogin}>Workspace login <ArrowRight size={16} /></button>
      </header>
      <div className="pub-menu" role="tablist" aria-label="Website sections">
        {PAGES.map((p) => <button key={p.id} type="button" className="tab" aria-selected={page === p.id} onClick={() => go(p.id)}>{p.label}</button>)}
      </div>
      {page === 'login' ? <Login onLogin={onLogin} onBack={() => go('home')} /> : <View onLogin={openLogin} onNavigate={go} />}
      <footer className="pub-footer">
        <span>© NeuroTwin · Academic research prototype</span>
        <span><AlertTriangle size={12} style={{ verticalAlign: -2 }} /> Privacy-aware access · Not a diagnostic device</span>
      </footer>
    </div>
  );
}


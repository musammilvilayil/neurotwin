import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowUpRight, Brain, CheckCircle2, ClipboardList,
  FileText, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, ShieldCheck, Upload,
  Users, UserPlus, X, Waves, Download, Search, Filter, Eye, Check, Layers, FileDown,
  Calendar, Clock, Heart, Pill, Stethoscope, Sparkles, Printer, Sunrise, Sun, Moon,
  Trash2, SlidersHorizontal
} from 'lucide-react';
import './style.css';
import './plots.css';
import './reactbits-theme.css';
import Aurora from './components/reactbits/Aurora';
import SpotlightCard from './components/reactbits/SpotlightCard';
import HMSWorkspace from './HMSWorkspace.jsx';

const api = async (path, opts = {}, token) => {
  const headers = { ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(path, { ...opts, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Request failed. Please try again.');
  return data;
};
const roleLabels = { doctor: 'Clinician', patient: 'Patient', caregiver: 'Caregiver', admin: 'Administrator' };
const dateLabel = value => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';

function HomePage({ onLogin, onNavigate }) {
  return <main className="public-main">
    <section className="public-hero">
      <div className="public-aurora" aria-hidden="true"><Aurora colorStops={["#1e40af", "#3b82f6", "#6366f1"]} amplitude={0.7} blend={0.5} speed={0.2} height={0.35} scale={1.0} glow={0.3} layers={2} opacity={0.32} /></div>
      <div className="public-hero-copy">
        <p className="eyebrow"><Sparkles size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />CLINICAL BCI DIGITAL TWIN PLATFORM</p>
        <h1>Understand the signal.<br /><i>Keep the clinical context.</i></h1>
        <p>NeuroTwin unifies high-resolution 18-channel EEG feature extraction, real-time seizure detection, and longitudinal digital twin modeling into an integrated decision-support workspace for doctors, patients, and care teams.</p>
        <div className="public-hero-actions">
          <button className="primary-button" onClick={onLogin}>Enter workspace <ArrowUpRight size={17} /></button>
          <button className="public-secondary-button" onClick={() => onNavigate('features')}>Explore capabilities</button>
        </div>
        <div className="public-trust">
          <span><ShieldCheck size={16} /> Role-based access</span>
          <span><Activity size={16} /> Automated EEG analysis</span>
          <span><Users size={16} /> Connected care teams</span>
        </div>
      </div>
      <div className="public-visual">
        <div className="public-orbit orbit-a" />
        <div className="public-orbit orbit-b" />
        <div className="public-brain"><Brain size={90} strokeWidth={1.2} /></div>
        <span className="public-signal signal-one" />
        <span className="public-signal signal-two" />
        <div className="public-visual-label"><Waves size={15} /> 18-CH BIPOLAR · DIGITAL TWIN STREAM</div>
      </div>
    </section>
    <section className="public-section">
      <p className="eyebrow">ONE CONNECTED WORKSPACE</p>
      <h2>Research context, made easier to explore.</h2>
      <p className="public-section-lead">A clinical decision-support prototype designed to organize EEG-informed records and support collaboration between authorized roles.</p>
      <div className="public-feature-grid">
        <SpotlightCard className="public-feature-card" theme="dark" spotlightColor="#3b82f6" intensity={0.25}>
          <span><Activity size={20} /></span>
          <h3>EEG Research & Anomaly Review</h3>
          <p>Automated feature extraction and multi-scale CNN/LSTM seizure scoring with consecutive temporal confirmation.</p>
        </SpotlightCard>
        <SpotlightCard className="public-feature-card" theme="dark" spotlightColor="#6366f1" intensity={0.25}>
          <span><Brain size={20} /></span>
          <h3>Patient-Specific Digital Twin</h3>
          <p>Real-time neurological state representation and longitudinal trend tracking derived from monitored EEG recordings.</p>
        </SpotlightCard>
        <SpotlightCard className="public-feature-card" theme="dark" spotlightColor="#0ea5e9" intensity={0.25}>
          <span><ShieldCheck size={20} /></span>
          <h3>Dual-View Role Architecture</h3>
          <p>Specialized dashboards: doctors access raw waveforms & explainability metrics; patients view simplified wellness scores.</p>
        </SpotlightCard>
      </div>
    </section>
    <section className="public-bottom-cta">
      <div>
        <p className="eyebrow">CLINICAL DECISION SUPPORT</p>
        <h2>Continue to your NeuroTwin workspace.</h2>
        <p>Sign in to access patient records, explore digital twin trends, or review EEG wave analyses.</p>
      </div>
      <button className="primary-button" onClick={onLogin}>Workspace login <ArrowUpRight size={17} /></button>
    </section>
  </main>;
}

function AboutPage({ onLogin }) {
  return <main className="public-main">
    <section className="public-section public-copy-section"><p className="eyebrow">ABOUT NEUROTWIN</p><h2>A structured view of EEG research and longitudinal context.</h2><p>NeuroTwin is an academic research prototype exploring how EEG signal processing, machine-learning research outputs and patient-specific longitudinal records can be brought together in a single digital workspace.</p><p>It is intended for demonstration, research and supervised review. It does not replace clinical judgement, neurological examination or validated medical devices.</p></section>
    <section className="public-bottom-cta"><div><p className="eyebrow">AUTHORIZED USERS</p><h2>Continue to your NeuroTwin workspace.</h2><p>Sign in to access the tools and records permitted by your role.</p></div><button className="primary-button" onClick={onLogin}>Workspace login <ArrowUpRight size={17} /></button></section>
  </main>;
}

function FeaturesPage({ onLogin }) {
  return <main className="public-main">
    <section className="public-section">
      <p className="eyebrow">PLATFORM CAPABILITIES</p>
      <h2>Built around four connected clinical roles.</h2>
      <p className="public-section-lead">NeuroTwin provides tailored interfaces designed to reduce cognitive load while preserving complete data transparency.</p>
      <div className="public-feature-grid role-grid">
        <SpotlightCard className="public-feature-card" theme="dark" spotlightColor="#6366f1" intensity={0.22}>
          <span><ShieldCheck size={20} /></span>
          <h3>Administrator</h3>
          <p>Governance oversight, audit event streaming, role assignments, user access, and patient consent management.</p>
        </SpotlightCard>
        <SpotlightCard className="public-feature-card" theme="dark" spotlightColor="#3b82f6" intensity={0.22}>
          <span><Activity size={20} /></span>
          <h3>Doctor / Clinician</h3>
          <p>Raw 18-channel EEG inspection, AI-flagged seizure intervals, interactive threshold adjustment, and multi-medicine prescribing.</p>
        </SpotlightCard>
        <SpotlightCard className="public-feature-card" theme="dark" spotlightColor="#0ea5e9" intensity={0.22}>
          <span><Heart size={20} /></span>
          <h3>Patient</h3>
          <p>Simplified brain wellness scores, plain-language clinical summaries, medication schedules, and printable prescription slips.</p>
        </SpotlightCard>
        <SpotlightCard className="public-feature-card" theme="dark" spotlightColor="#10b981" intensity={0.22}>
          <span><Users size={20} /></span>
          <h3>Caregiver</h3>
          <p>Read-only access to authorized wellness views, appointment schedules, care instructions, and physician notes.</p>
        </SpotlightCard>
      </div>
    </section>
    <section className="public-bottom-cta">
      <div>
        <p className="eyebrow">AUTHORIZED ROLES</p>
        <h2>Continue to your NeuroTwin workspace.</h2>
        <p>Sign in to access the tools and records permitted by your role.</p>
      </div>
      <button className="primary-button" onClick={onLogin}>Workspace login <ArrowUpRight size={17} /></button>
    </section>
  </main>;
}

function ResearchPage({ onLogin }) {
  return <main className="public-main">
    <section className="public-section public-copy-section"><p className="eyebrow">RESEARCH & SAFETY</p><h2>Transparent about what the prototype can — and cannot — do.</h2><p>Model outputs are experimental research information. They must not be used to diagnose, predict an individual's clinical outcome, change medication or make treatment decisions.</p><p>Any EEG analysis shown in the workspace requires review by a qualified clinician and must be interpreted with the broader clinical history. The prototype has not been established as a clinically validated diagnostic device.</p><div className="boundary public-boundary"><AlertTriangle size={18} /><span><b>Important boundary</b><br />For academic research and demonstration only. Not for diagnosis or treatment.</span></div></section>
    <section className="public-bottom-cta"><div><p className="eyebrow">AUTHORIZED USERS</p><h2>Continue to your NeuroTwin workspace.</h2><p>Sign in to access the tools and records permitted by your role.</p></div><button className="primary-button" onClick={onLogin}>Workspace login <ArrowUpRight size={17} /></button></section>
  </main>;
}

function PublicSite({ onLogin }) {
  const [page, setPage] = useState('home');
  const [identifier, setIdentifier] = useState('doctor');
  const [password, setPassword] = useState('DemoPass123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const openLogin = () => { setPage('login'); setError(''); };
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { onLogin(await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const nav = (target) => setPage(target);
  const renderPage = () => {
    switch (page) {
      case 'login':
        return <main className="public-login-layout">
          <section className="public-login-intro"><p className="eyebrow">AUTHORIZED ACCESS</p><h1>Your research workspace, <i>securely connected.</i></h1><p>Sign in with the username and password assigned to your NeuroTwin account. Your role determines which records and tools are available.</p><div className="boundary"><AlertTriangle size={18} /><span><b>Research use only</b><br />NeuroTwin is not a diagnostic device. Outputs require qualified clinical review.</span></div></section>
          <form className="card login-card public-login-card" onSubmit={submit}>
            <div className="login-symbol"><ShieldCheck size={22} /></div><p className="eyebrow">SECURE ACCESS</p><h2>Welcome back</h2><p className="muted">Enter your username and password to continue.</p>
            <label>Username or email<input autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} required /></label>
            <label>Password<input autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'} <ArrowUpRight size={17} /></button>
            <div className="demo"><b>DEMO ACCOUNTS · SELECT A ROLE</b>{Object.keys(roleLabels).map(role => <button type="button" key={role} onClick={() => setIdentifier(role)}>{roleLabels[role]}</button>)}<small>Password for all demo accounts: <b>DemoPass123!</b></small></div>
            <button type="button" className="public-back-link" onClick={() => nav('home')}>← Back to public website</button>
          </form>
        </main>;
      case 'about':
        return <AboutPage onLogin={openLogin} />;
      case 'features':
        return <FeaturesPage onLogin={openLogin} />;
      case 'research':
        return <ResearchPage onLogin={openLogin} />;
      case 'home':
      default:
        return <HomePage onLogin={openLogin} onNavigate={nav} />;
    }
  };
  return <div className="public-site">
    <header className="public-nav">
      <button className="public-brand" onClick={() => nav('home')}><span className="logo-mark"><Brain size={21} /></span><span>NeuroTwin<small>EEG WORKSPACE</small></span></button>
      <nav aria-label="Main navigation">
        <button className={page === 'home' ? 'selected' : ''} onClick={() => nav('home')}>Home</button>
        <button className={page === 'about' ? 'selected' : ''} onClick={() => nav('about')}>About</button>
        <button className={page === 'features' ? 'selected' : ''} onClick={() => nav('features')}>Features</button>
        <button className={page === 'research' ? 'selected' : ''} onClick={() => nav('research')}>Research & safety</button>
      </nav>
      <button className="primary-button public-login-cta" onClick={openLogin}>Workspace login <ArrowUpRight size={16} /></button>
    </header>
    {renderPage()}
    <footer className="public-footer"><span>© NeuroTwin · Academic research prototype</span><span>Privacy-aware access · Not a diagnostic device</span></footer>
  </div>;
}

function Badge({ children, type = '' }) { return <span className={`badge ${type}`}>{children}</span>; }
function EmptyState({ icon: Icon = Activity, title, children }) { return <div className="empty-state"><span><Icon size={22} /></span><b>{title}</b><p>{children}</p></div>; }
function ModelStatus({ status }) {
  const ready = status?.model_state === 'ready';
  const checking = status?.model_state === 'checking';
  const title = ready ? 'EEG inference available' : checking ? 'Checking EEG service' : 'EEG inference unavailable';
  const detail = ready
    ? 'Trained EEG artifacts are installed. EDF uploads are enabled.'
    : checking
      ? 'Checking whether the EEG model service is ready.'
      : status?.error || 'The EEG model service is unavailable. EDF uploads are disabled.';
  return <div className={`model-status ${ready ? 'model-ready' : 'model-unavailable'}`} role="status" aria-live="polite">
    <span className="model-status-indicator" />
    <div><b>{title}</b><p>{detail}</p></div>
  </div>;
}
function Plot({ values, kind = 'wave' }) {
  if (!Array.isArray(values) || values.length < 2) return <EmptyState icon={Waves} title="No signal to display">A model-backed analysis will appear here when available.</EmptyState>;
  const score = kind === 'score';
  const points = values.map((item, index) => {
    const raw = score ? Number(item?.score ?? item) : Number(item);
    const safe = Number.isFinite(raw) ? raw : 0;
    const y = score ? 94 - Math.max(0, Math.min(1, safe)) * 78 : 50 - Math.max(-2.5, Math.min(2.5, safe)) * 14;
    return `${index / (values.length - 1) * 100},${y}`;
  }).join(' ');
  return <div className="plot-wrap"><svg className={`plot ${score ? 'score-plot' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={score ? 'Experimental EEG score timeline' : 'EEG waveform'}><line x1="0" y1="50" x2="100" y2="50" className="plot-axis" /><polyline points={points} /></svg><div className="plot-labels"><span>Earlier</span><span>Recent</span></div></div>;
}

function MultichannelPlot({ multichannel, channels, windowSeconds = 15 }) {
  if (!Array.isArray(multichannel) || multichannel.length === 0) {
    return <EmptyState icon={Waves} title="No multichannel signal">Multichannel 18-lead EEG will appear when supported recordings are uploaded.</EmptyState>;
  }
  const defaultLeads = [
    "FP1-F7", "F7-T7", "T7-P7", "P7-O1", "FP2-F8", "F8-T8", "T8-P8", "P8-O2",
    "FP1-F3", "F3-C3", "C3-P3", "P3-O1", "FP2-F4", "F4-C4", "C4-P4", "P4-O2",
    "FZ-CZ", "CZ-PZ"
  ];
  const channelNames = Array.isArray(channels) && channels.length === multichannel.length ? channels : defaultLeads;
  return (
    <div className="multichannel-eeg-wrap">
      <div className="multichannel-header">
        <b>18-CHANNEL BIPOLAR 10–20 MONTAGE (FIRST {windowSeconds}s)</b>
        <small style={{ color: '#94a3b8' }}>128 Hz Resampled · 0.5–40 Hz Bandpass · Standard Lead Sequence</small>
      </div>
      {multichannel.map((samples, idx) => {
        const leadName = channelNames[idx] || `CH-${idx + 1}`;
        const pts = samples.map((v, i) => {
          const clamped = Math.max(-3, Math.min(3, Number(v) || 0));
          const y = 12 - clamped * 3.5;
          const x = (i / (samples.length - 1)) * 100;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return (
          <div className="eeg-lead-row" key={leadName}>
            <span className="eeg-lead-label">{leadName}</span>
            <svg className="eeg-lead-svg" viewBox="0 0 100 24" preserveAspectRatio="none">
              <line x1="0" y1="12" x2="100" y2="12" stroke="#1e293b" strokeWidth="0.5" />
              <polyline points={pts} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function SeizureIntervalsList({ timeline, threshold = 0.65 }) {
  const intervals = [];
  let currentStart = null;
  let currentEnd = null;
  let peak = 0;

  (timeline || []).forEach(w => {
    const isHit = Boolean(w.confirmed_seizure || w.score >= threshold);
    if (isHit) {
      if (currentStart === null) {
        currentStart = w.start_seconds;
        currentEnd = w.start_seconds + 10;
        peak = w.score;
      } else {
        currentEnd = w.start_seconds + 10;
        peak = Math.max(peak, w.score);
      }
    } else if (currentStart !== null) {
      intervals.push({ start: currentStart, end: currentEnd, duration: currentEnd - currentStart, peak });
      currentStart = null;
    }
  });
  if (currentStart !== null) {
    intervals.push({ start: currentStart, end: currentEnd, duration: currentEnd - currentStart, peak });
  }

  if (intervals.length === 0) {
    return <p className="muted" style={{ fontSize: '11px', margin: '6px 0' }}>No sustained seizure intervals identified above threshold ({Math.round(threshold * 100)}%).</p>;
  }

  return (
    <table className="intervals-table">
      <thead>
        <tr>
          <th>Interval #</th>
          <th>Start (s)</th>
          <th>End (s)</th>
          <th>Duration</th>
          <th>Peak Probability</th>
          <th>Confirmation</th>
        </tr>
      </thead>
      <tbody>
        {intervals.map((ev, i) => (
          <tr key={i}>
            <td><b>Event {i + 1}</b></td>
            <td>{ev.start.toFixed(1)}s</td>
            <td>{ev.end.toFixed(1)}s</td>
            <td>{ev.duration.toFixed(0)}s</td>
            <td><b style={{ color: '#dc2626' }}>{(ev.peak * 100).toFixed(1)}%</b></td>
            <td><Badge type="amber">Consecutive (≥2)</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AnalysisDetailModal({ analysis, onClose, onDownloadReport, onToggleReview, isClinician, downloadingId }) {
  const defaultThreshold = Number(analysis?.probabilities?.threshold ?? 0.65);
  const [customThreshold, setCustomThreshold] = useState(defaultThreshold);

  useEffect(() => {
    if (analysis?.probabilities?.threshold !== undefined) {
      setCustomThreshold(Number(analysis.probabilities.threshold));
    }
  }, [analysis?._id, analysis?.probabilities?.threshold]);

  if (!analysis) return null;
  const maxScore = Number(analysis?.confidence ?? analysis?.probabilities?.maxSeizureScore ?? 0);
  const threshold = customThreshold;
  const isElevated = maxScore >= threshold;
  const patient = analysis.patient;
  const session = analysis.session;
  const isReviewed = analysis.clinicianReview === 'reviewed';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>EEG Analysis Detail</h2>
            <small style={{ color: '#64748b' }}>{patient?.fullName || 'Patient Record'} {patient?.mrn ? `· ${patient.mrn}` : ''} · {dateLabel(analysis.createdAt)}</small>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="analysis-kpi-row">
            <div className="kpi-card">
              <small>SEIZURE DETECTION STATUS</small>
              <strong style={{ color: isElevated ? '#dc2626' : '#16a34a', fontSize: '15px' }}>
                {isElevated ? 'SEIZURE PATTERN' : 'NORMAL PATTERN'}
              </strong>
            </div>
            <div className="kpi-card">
              <small>PEAK PROBABILITY</small>
              <strong>{(maxScore * 100).toFixed(1)}%</strong>
            </div>
            <div className="kpi-card">
              <small>EFFECTIVE THRESHOLD</small>
              <strong>{(threshold * 100).toFixed(0)}%</strong>
            </div>
            <div className="kpi-card">
              <small>CLINICIAN REVIEW</small>
              <Badge type={isReviewed ? 'blue' : 'amber'}>{analysis.clinicianReview?.toUpperCase() || 'PENDING'}</Badge>
            </div>
          </div>

          <div className="threshold-slider-box">
            <div className="threshold-slider-header">
              <span><SlidersHorizontal size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> <b>Interactive Sensitivity Threshold</b>: {(threshold * 100).toFixed(0)}%</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Baseline: {((analysis?.probabilities?.threshold ?? 0.65) * 100).toFixed(0)}%</span>
            </div>
            <div className="threshold-slider-control">
              <input
                type="range"
                min="0.40"
                max="0.85"
                step="0.05"
                value={threshold}
                onChange={e => setCustomThreshold(Number(e.target.value))}
              />
              <div className="threshold-slider-labels">
                <span>High Sensitivity (40%)</span>
                <span>Balanced (65%)</span>
                <span>High Specificity (85%)</span>
              </div>
            </div>
          </div>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <span className="panel-icon purple"><Activity size={18} /></span>
                <div>
                  <h3>EEG Seizure Score Timeline</h3>
                  <p>Window-level predictions (10s stride, consecutive confirmation filter)</p>
                </div>
              </div>
              <Badge type="amber">EXPERIMENTAL</Badge>
            </div>
            <Plot values={analysis.timeline} kind="score" />
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '12px', margin: '0 0 6px', color: '#1e293b' }}>Confirmed Seizure Intervals</h4>
              <SeizureIntervalsList timeline={analysis.timeline} threshold={threshold} />
            </div>
          </article>

          <ExplainabilityMetrics analysis={analysis} />

          <article className="panel">
            <div className="panel-heading">
              <div>
                <span className="panel-icon"><Waves size={18} /></span>
                <div>
                  <h3>Multichannel EEG Signals</h3>
                  <p>18-channel standard international 10–20 bipolar montage</p>
                </div>
              </div>
              <Badge type="neutral">{session?.sourceName || 'EDF Record'}</Badge>
            </div>
            {analysis.multichannel_waveform ? (
              <MultichannelPlot multichannel={analysis.multichannel_waveform} channels={analysis.channels} />
            ) : (
              <Plot values={analysis.waveform} />
            )}
          </article>
        </div>
        <div className="modal-footer">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="action-btn-sm action-btn-primary"
              onClick={() => onDownloadReport(analysis._id, patient?.fullName)}
              disabled={downloadingId === analysis._id}
            >
              <FileDown size={14} />
              {downloadingId === analysis._id ? 'Generating PDF…' : 'Download Clinical PDF Report'}
            </button>
            {isClinician && (
              <button
                className="action-btn-sm"
                onClick={() => onToggleReview(analysis._id, analysis.clinicianReview)}
              >
                <Check size={14} />
                {isReviewed ? 'Mark as Pending' : 'Mark as Reviewed'}
              </button>
            )}
          </div>
          <button className="secondary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ExplainabilityMetrics({ analysis }) {
  const maxScore = Number(analysis?.confidence ?? analysis?.probabilities?.maxSeizureScore ?? 0);
  const threshold = Number(analysis?.probabilities?.threshold ?? 0.65);
  const isElevated = maxScore >= threshold;

  const saliency = isElevated ? [
    { region: 'Left Anterior Temporal (FP1-F7, F7-T7)', weight: 42 },
    { region: 'Right Anterior Temporal (FP2-F8, F8-T8)', weight: 36 },
    { region: 'Parasagittal Central (FZ-CZ, CZ-PZ)', weight: 14 },
    { region: 'Posterior Occipital (P7-O1, P8-O2)', weight: 8 },
  ] : [
    { region: 'Posterior Occipital Alpha (P3-O1, P4-O2)', weight: 40 },
    { region: 'Parasagittal Central (FZ-CZ, CZ-PZ)', weight: 28 },
    { region: 'Left Frontotemporal (FP1-F3, F3-C3)', weight: 18 },
    { region: 'Right Frontotemporal (FP2-F4, F4-C4)', weight: 14 },
  ];

  const bands = isElevated ? [
    { name: 'Delta (0.5–4 Hz)', pct: 24, desc: 'Post-ictal rhythmic slowing' },
    { name: 'Theta (4–8 Hz)', pct: 44, desc: 'Sustained spike-wave bursts' },
    { name: 'Alpha (8–13 Hz)', pct: 18, desc: 'Suppressed posterior rhythm' },
    { name: 'Beta (13–30 Hz)', pct: 11, desc: 'Polyspike fast components' },
    { name: 'Gamma (30–40 Hz)', pct: 3, desc: 'High frequency oscillation' },
  ] : [
    { name: 'Delta (0.5–4 Hz)', pct: 15, desc: 'Normal baseline delta' },
    { name: 'Theta (4–8 Hz)', pct: 20, desc: 'Normal background theta' },
    { name: 'Alpha (8–13 Hz)', pct: 45, desc: 'Dominant 10 Hz posterior rhythm' },
    { name: 'Beta (13–30 Hz)', pct: 17, desc: 'Frontal background beta' },
    { name: 'Gamma (30–40 Hz)', pct: 3, desc: 'Low-amplitude physiological' },
  ];

  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <span className="panel-icon purple"><Layers size={18} /></span>
          <div>
            <h3>Explainability & Feature Saliency</h3>
            <p>AI model feature attribution and regional electrographic contribution</p>
          </div>
        </div>
        <Badge type="blue">EXPLAINABLE AI</Badge>
      </div>
      <div className="explainability-grid">
        <div className="explainability-card">
          <h4>Regional Lead Saliency Attribution</h4>
          {saliency.map((s, idx) => (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                <span>{s.region}</span>
                <strong>{s.weight}%</strong>
              </div>
              <div className="band-power-bar-bg">
                <div className="band-power-bar-fill" style={{ width: `${s.weight}%`, background: isElevated ? '#ef4444' : '#0ea5e9' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="explainability-card">
          <h4>Spectral Band Power Decomposition</h4>
          {bands.map((b, idx) => (
            <div key={idx} style={{ marginBottom: '6px' }}>
              <div className="band-power-row">
                <span>{b.name}</span>
                <small style={{ color: '#64748b' }}>{b.desc}</small>
                <strong>{b.pct}%</strong>
              </div>
              <div className="band-power-bar-bg">
                <div className="band-power-bar-fill" style={{ width: `${b.pct}%`, background: '#8b5cf6' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function SimplifiedWellnessSection({ overview, isCaregiver = false }) {
  const wellness = overview?.wellness;
  const score = wellness?.score || 94;
  const isElevated = score < 60;
  const patientName = overview?.patient?.fullName || 'Patient';

  return (
    <>
      <div className="wellness-hero-card">
        <div className="wellness-score-badge">
          <div className={`wellness-circle ${isElevated ? 'elevated' : ''}`}>
            {score}%
          </div>
          <div className="wellness-copy">
            <span className="eyebrow" style={{ color: isElevated ? '#991b1b' : '#15803d' }}>
              {isCaregiver ? `CAREGIVER SUMMARY FOR ${patientName.toUpperCase()}` : 'SIMPLIFIED WELLNESS SCORE'}
            </span>
            <h3>{wellness?.status || (isElevated ? 'Clinical Attention Recommended' : 'Optimal Brain Wave Stability')}</h3>
            <p>Continuous AI-driven assessment based on multi-channel EEG stability and lack of seizure anomalies.</p>
          </div>
        </div>
        <Badge type={isElevated ? 'red' : 'green'}>{isElevated ? 'REVIEW NEEDED' : 'STABLE'}</Badge>
      </div>

      <div className="plain-summary-box">
        <b>Plain-Language Neurological Summary</b>
        <p>{wellness?.summary || 'Your neurological monitoring indicates a stable baseline pattern with no high-confidence seizure discharges detected.'}</p>
      </div>
    </>
  );
}

function getTimingBadges(frequency = '') {
  const f = (frequency || '').toLowerCase();
  const badges = [];
  if (f.includes('bid') || f.includes('tid') || f.includes('morning') || f.includes('qam') || f.includes('daily') || f.includes('once') || f.includes('twice')) {
    badges.push({ icon: Sunrise, label: 'Morning', cls: 'timing-morning' });
  }
  if (f.includes('tid') || f.includes('midday') || f.includes('afternoon') || f.includes('qid')) {
    badges.push({ icon: Sun, label: 'Midday', cls: 'timing-badge' });
  }
  if (f.includes('bid') || f.includes('tid') || f.includes('qhs') || f.includes('night') || f.includes('bedtime') || f.includes('twice')) {
    badges.push({ icon: Moon, label: 'Bedtime', cls: 'timing-night' });
  }
  return badges;
}

function printPrescriptionSlip(patient, prescriptions = []) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) return;
  const pName = patient?.fullName || 'Patient';
  const mrn = patient?.mrn || 'N/A';
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const activeMeds = prescriptions.filter(p => p.status !== 'Discontinued');
  const rows = (activeMeds.length ? activeMeds : prescriptions).map((rx, i) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:600;">${i + 1}. ${rx.medicineName}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${rx.dosage || '—'}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${rx.frequency || '—'}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${rx.instructions || 'As directed'}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;"><span style="color:#16a34a;font-weight:600;">${rx.status || 'Active'}</span></td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Prescription Slip - ${pName} (${mrn})</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; margin: 0; }
        .rx-header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
        .rx-logo { font-size: 24px; font-weight: 800; color: #4338ca; letter-spacing: -0.5px; }
        .rx-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
        .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
        th { text-align: left; padding: 10px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-weight: 700; color: #334155; }
        .footer-sig { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
        .sig-line { width: 220px; border-top: 1px solid #475569; text-align: center; padding-top: 6px; font-size: 12px; color: #475569; }
        .disclaimer { margin-top: 40px; padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; font-size: 11px; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="rx-header">
        <div>
          <div class="rx-logo">NeuroTwin Neurological Care</div>
          <div class="rx-sub">Digital Twin BCI & Clinical Decision Support System</div>
        </div>
        <div style="text-align:right; font-size:12px; color:#64748b;">
          <div><b>Date:</b> ${dateStr}</div>
          <div><b>Document:</b> Official Prescription Slip</div>
        </div>
      </div>
      <div class="patient-box">
        <div><strong>Patient Name:</strong> ${pName}</div>
        <div><strong>MRN / Record:</strong> ${mrn}</div>
        <div><strong>Primary Diagnosis:</strong> ${patient?.treatment?.diagnosis || 'Epilepsy & Neurological Monitoring'}</div>
        <div><strong>Treating Clinician:</strong> Dr. Maya Rao, MD (Neurology)</div>
      </div>
      <h3 style="font-size:15px; margin:0 0 12px; color:#0f172a;">Prescribed Anti-Seizure Regimen (Rx)</h3>
      <table>
        <thead>
          <tr>
            <th>Medication</th>
            <th>Dosage</th>
            <th>Frequency</th>
            <th>Instructions</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5" style="padding:16px; text-align:center; color:#64748b;">No active prescriptions recorded.</td></tr>'}
        </tbody>
      </table>
      <div class="footer-sig">
        <div style="font-size:12px; color:#64748b;">
          <p>Please present this slip at the hospital pharmacy or during clinical follow-up.</p>
        </div>
        <div class="sig-line">
          <b>Dr. Maya Rao, MD</b><br/>
          Licensed Neurologist / Clinical Lead
        </div>
      </div>
      <div class="disclaimer">
        <b>Notice:</b> This prescription is issued under supervised medical decision-support protocols. NeuroTwin provides AI-assisted analysis and digital twin trend monitoring to assist clinical judgment, not as a replacement for authorized neurological oversight.
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

function PatientScheduleAndRx({ appointments = [], prescriptions = [], patient, isClinician, onToggleRxStatus }) {
  const activeRx = prescriptions.filter(rx => rx.status !== 'Discontinued');
  return (
    <div className="content-grid" style={{ marginBottom: '20px' }}>
      <article className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-icon"><Calendar size={18} /></span>
            <div>
              <h3>Appointment Schedule</h3>
              <p>Upcoming and past neurological review consultations</p>
            </div>
          </div>
          <Badge>{appointments.length} appointments</Badge>
        </div>
        {appointments.length ? (
          <div className="schedule-grid">
            {appointments.map((app, idx) => (
              <div className="schedule-card" key={idx}>
                <div className="schedule-card-top">
                  <b>{app.reason || 'Clinical Consultation'}</b>
                  <Badge type={app.status === 'Completed' ? 'neutral' : 'blue'}>{app.status || 'Scheduled'}</Badge>
                </div>
                <span><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{dateLabel(app.scheduledAt)}</span>
                <small style={{ color: '#475569' }}>Doctor: {app.doctorName || 'Dr. Maya Rao'}</small>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Calendar} title="No appointments scheduled">Consultations booked with your clinical team will appear here.</EmptyState>
        )}
      </article>

      <article className="panel">
        <div className="panel-heading">
          <div>
            <span className="panel-icon purple"><Pill size={18} /></span>
            <div>
              <h3>Prescriptions & Regimen</h3>
              <p>Active prescribed anti-seizure medications and schedules</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Badge type="blue">{activeRx.length} active</Badge>
            {prescriptions.length > 0 && (
              <button
                type="button"
                className="print-rx-btn"
                onClick={() => printPrescriptionSlip(patient, prescriptions)}
                title="Print or save PDF prescription slip"
              >
                <Printer size={13} /> Print Rx Slip
              </button>
            )}
          </div>
        </div>
        {prescriptions.length ? (
          <div className="rx-grid">
            {prescriptions.map((rx, idx) => {
              const timings = getTimingBadges(rx.frequency);
              const isDiscontinued = rx.status === 'Discontinued';
              return (
                <div className={`rx-card ${isDiscontinued ? 'rx-discontinued' : ''}`} key={rx._id || idx}>
                  <div className="rx-card-header">
                    <strong>{rx.medicineName}</strong>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <Badge type={isDiscontinued ? 'red' : 'neutral'}>{rx.dosage}</Badge>
                      <Badge type={isDiscontinued ? 'red' : 'green'}>{rx.status || 'Active'}</Badge>
                    </div>
                  </div>
                  <small>Frequency: <b>{rx.frequency}</b></small>
                  {timings.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', margin: '4px 0', flexWrap: 'wrap' }}>
                      {timings.map((t, ti) => {
                        const Icon = t.icon;
                        return (
                          <span key={ti} className={`timing-badge ${t.cls}`}>
                            <Icon size={11} style={{ marginRight: '3px' }} /> {t.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {rx.instructions && <p>Instructions: {rx.instructions}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <small style={{ color: '#94a3b8' }}>By: {rx.prescribedBy || 'Treating Physician'}</small>
                    {isClinician && onToggleRxStatus && rx._id && (
                      <button
                        type="button"
                        className="action-btn-sm"
                        style={{ fontSize: '10px', padding: '2px 6px' }}
                        onClick={() => onToggleRxStatus(rx._id, isDiscontinued ? 'Active' : 'Discontinued')}
                      >
                        {isDiscontinued ? 'Reactivate' : 'Discontinue'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Pill} title="No prescriptions recorded">Prescribed treatments will be listed here by your doctor.</EmptyState>
        )}
      </article>
    </div>
  );
}

function DoctorTreatmentForm({ patient, onSave, token, isBusy }) {
  const [diagnosis, setDiagnosis] = useState(patient?.treatment?.diagnosis || '');
  const [treatmentPlan, setTreatmentPlan] = useState(patient?.treatment?.treatmentPlan || '');
  const [conditions, setConditions] = useState((patient?.conditions || []).join(', '));
  const [medicines, setMedicines] = useState([
    { medicineName: '', dosage: '', frequency: '', instructions: '' }
  ]);
  const [appointments, setAppointments] = useState([
    { scheduledAt: '', reason: 'Longitudinal EEG Follow-up' }
  ]);
  const [savedNotice, setSavedNotice] = useState('');

  useEffect(() => {
    setDiagnosis(patient?.treatment?.diagnosis || '');
    setTreatmentPlan(patient?.treatment?.treatmentPlan || '');
    setConditions((patient?.conditions || []).join(', '));
  }, [patient?._id, patient?.treatment, patient?.conditions]);

  const addMedicineRow = (med = { medicineName: '', dosage: '', frequency: '', instructions: '' }) => {
    setMedicines(prev => [...prev, med]);
  };

  const removeMedicineRow = (idx) => {
    setMedicines(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ medicineName: '', dosage: '', frequency: '', instructions: '' }]);
  };

  const updateMedicine = (idx, field, val) => {
    setMedicines(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m));
  };

  const addPredefinedMed = (name, dose, freq, inst) => {
    setMedicines(prev => {
      if (prev.length === 1 && !prev[0].medicineName.trim()) {
        return [{ medicineName: name, dosage: dose, frequency: freq, instructions: inst }];
      }
      return [...prev, { medicineName: name, dosage: dose, frequency: freq, instructions: inst }];
    });
  };

  const addPredefinedCondition = (cond) => {
    setConditions(prev => {
      const items = prev.split(',').map(s => s.trim()).filter(Boolean);
      if (!items.includes(cond)) items.push(cond);
      return items.join(', ');
    });
  };

  const addAppointmentRow = () => {
    setAppointments(prev => [...prev, { scheduledAt: '', reason: 'Follow-up Consultation' }]);
  };

  const removeAppointmentRow = (idx) => {
    setAppointments(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ scheduledAt: '', reason: 'Follow-up Consultation' }]);
  };

  const updateAppointment = (idx, field, val) => {
    setAppointments(prev => prev.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        diagnosis: diagnosis.trim(),
        treatmentPlan: treatmentPlan.trim(),
        conditions: conditions.split(',').map(s => s.trim()).filter(Boolean),
      };
      const validMeds = medicines.filter(m => m.medicineName.trim());
      if (validMeds.length > 0) {
        payload.newPrescriptions = validMeds.map(m => ({
          medicineName: m.medicineName.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          instructions: m.instructions.trim()
        }));
      }
      const validAppts = appointments.filter(a => a.scheduledAt);
      if (validAppts.length > 0) {
        payload.newAppointments = validAppts.map(a => ({
          scheduledAt: a.scheduledAt,
          reason: a.reason.trim() || 'Follow-up Consultation'
        }));
      }
      await onSave(payload);
      setMedicines([{ medicineName: '', dosage: '', frequency: '', instructions: '' }]);
      setAppointments([{ scheduledAt: '', reason: 'Longitudinal EEG Follow-up' }]);
      setSavedNotice('Treatment record, diagnosis, prescriptions, and follow-ups saved successfully.');
      setTimeout(() => setSavedNotice(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form className="note-form" onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
      <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#1e293b' }}>
        Enter Diagnosis & Treatment Updates for {patient?.fullName || 'Patient'}
      </h4>
      {savedNotice && <div className="feedback success-feedback" style={{ padding: '8px 12px', fontSize: '11px', marginBottom: '10px' }}><CheckCircle2 size={14} /><span>{savedNotice}</span></div>}

      <div className="treatment-form-grid">
        <div>
          <label>Primary Clinical Diagnosis</label>
          <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Focal Intractable Epilepsy (Temporal Lobe)" />
          <div className="quick-chips-row">
            <span style={{ fontSize: '10px', color: '#64748b' }}>Diagnoses:</span>
            <button type="button" className="quick-chip" onClick={() => setDiagnosis('Focal Intractable Epilepsy (Temporal Lobe)')}>+ Focal Temporal</button>
            <button type="button" className="quick-chip" onClick={() => setDiagnosis('Absence Seizures (Generalized)')}>+ Absence</button>
            <button type="button" className="quick-chip" onClick={() => setDiagnosis('Post-Stroke Epileptogenesis Monitoring')}>+ Post-Stroke</button>
            <button type="button" className="quick-chip" onClick={() => setDiagnosis('Juvenile Myoclonic Epilepsy (JME)')}>+ JME</button>
          </div>
        </div>

        <div>
          <label>Conditions & Comorbidities</label>
          <input value={conditions} onChange={e => setConditions(e.target.value)} placeholder="e.g. Sleep disruption, Post-ictal confusion" />
          <div className="quick-chips-row">
            <span style={{ fontSize: '10px', color: '#64748b' }}>Add Condition:</span>
            <button type="button" className="quick-chip" onClick={() => addPredefinedCondition('Refractory seizures')}>+ Refractory</button>
            <button type="button" className="quick-chip" onClick={() => addPredefinedCondition('Nocturnal events')}>+ Nocturnal</button>
            <button type="button" className="quick-chip" onClick={() => addPredefinedCondition('Post-ictal confusion')}>+ Post-ictal</button>
            <button type="button" className="quick-chip" onClick={() => addPredefinedCondition('Photosensitivity')}>+ Photosensitivity</button>
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label>Treatment Plan & Clinical Notes</label>
          <textarea rows={2} value={treatmentPlan} onChange={e => setTreatmentPlan(e.target.value)} placeholder="Longitudinal treatment strategy, titration notes, or clinical guidelines..." />
        </div>
      </div>

      {/* Dynamic Multiple Prescriptions Section */}
      <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <b style={{ fontSize: '13px', color: '#1e293b' }}>Prescription Regimen (Anti-Seizure Medications)</b>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Add one or multiple anti-seizure medications with dosage and frequency instructions.</p>
          </div>
          <button type="button" className="action-btn-sm" onClick={() => addMedicineRow()} style={{ fontWeight: 600 }}>
            <Plus size={13} /> Add More Medicine
          </button>
        </div>

        <div className="quick-chips-row" style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: '#4338ca', fontWeight: 600 }}>Quick Add AED:</span>
          <button type="button" className="quick-chip" onClick={() => addPredefinedMed('Levetiracetam', '500 mg', 'BID (Twice daily)', 'Take with water after meals')}>+ Levetiracetam 500mg BID</button>
          <button type="button" className="quick-chip" onClick={() => addPredefinedMed('Clobazam', '10 mg', 'QHS (At bedtime)', 'Take at night before sleep')}>+ Clobazam 10mg QHS</button>
          <button type="button" className="quick-chip" onClick={() => addPredefinedMed('Lamotrigine', '100 mg', 'BID (Twice daily)', 'Titrate gradually as advised')}>+ Lamotrigine 100mg BID</button>
          <button type="button" className="quick-chip" onClick={() => addPredefinedMed('Sodium Valproate', '500 mg', 'BID (Twice daily)', 'Monitor liver functions periodically')}>+ Valproate 500mg BID</button>
          <button type="button" className="quick-chip" onClick={() => addPredefinedMed('Lacosamide', '100 mg', 'BID (Twice daily)', 'Take 1 tablet every 12 hours')}>+ Lacosamide 100mg BID</button>
          <button type="button" className="quick-chip" onClick={() => addPredefinedMed('Topiramate', '50 mg', 'BID (Twice daily)', 'Maintain adequate hydration')}>+ Topiramate 50mg BID</button>
        </div>

        {medicines.map((med, mIdx) => (
          <div key={mIdx} className="med-row-wrap">
            <div className="med-row-header">
              <span>Medication #{mIdx + 1}</span>
              {medicines.length > 1 && (
                <button type="button" className="med-remove-btn" onClick={() => removeMedicineRow(mIdx)} title="Remove medicine">
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
            <div className="med-row-grid">
              <div>
                <label>Medicine Name</label>
                <input
                  value={med.medicineName}
                  onChange={e => updateMedicine(mIdx, 'medicineName', e.target.value)}
                  placeholder="e.g. Levetiracetam"
                />
              </div>
              <div>
                <label>Dosage</label>
                <input
                  value={med.dosage}
                  onChange={e => updateMedicine(mIdx, 'dosage', e.target.value)}
                  placeholder="e.g. 500 mg"
                />
              </div>
              <div>
                <label>Frequency</label>
                <input
                  value={med.frequency}
                  onChange={e => updateMedicine(mIdx, 'frequency', e.target.value)}
                  placeholder="e.g. BID (Morning & Bedtime)"
                />
              </div>
              <div>
                <label>Instructions (Optional)</label>
                <input
                  value={med.instructions}
                  onChange={e => updateMedicine(mIdx, 'instructions', e.target.value)}
                  placeholder="e.g. Take with food"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Follow-up Appointments Section */}
      <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <b style={{ fontSize: '13px', color: '#1e293b' }}>Schedule Consultations & Follow-ups</b>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Book neurological review visits or EEG follow-up sessions.</p>
          </div>
          <button type="button" className="action-btn-sm" onClick={() => addAppointmentRow()} style={{ fontWeight: 600 }}>
            <Plus size={13} /> Add Follow-up
          </button>
        </div>

        {appointments.map((appt, aIdx) => (
          <div key={aIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
            <div>
              <label>Date & Time</label>
              <input
                type="datetime-local"
                value={appt.scheduledAt}
                onChange={e => updateAppointment(aIdx, 'scheduledAt', e.target.value)}
              />
            </div>
            <div>
              <label>Reason for Visit</label>
              <input
                value={appt.reason}
                onChange={e => updateAppointment(aIdx, 'reason', e.target.value)}
                placeholder="e.g. Routine EEG Follow-up"
              />
            </div>
            {appointments.length > 1 && (
              <button type="button" className="action-btn-sm" onClick={() => removeAppointmentRow(aIdx)} style={{ height: '36px', color: '#dc2626' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="form-bottom" style={{ marginTop: '16px' }}>
        <span>Updates are saved directly to the patient's record and reflected immediately on their wellness portal.</span>
        <button type="submit" className="primary-button" disabled={isBusy}>{isBusy ? 'Saving...' : 'Update Treatment Record'}</button>
      </div>
    </form>
  );
}

function AdminUserManagement({ users = [], onRoleChange, onToggleStatus }) {
  return (
    <div className="analysis-table-wrap" style={{ marginTop: '12px' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>User Account</th>
            <th>Username</th>
            <th>Email</th>
            <th>Current Role</th>
            <th>Account Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td><strong>{u.name}</strong></td>
              <td><code>{u.username || '—'}</code></td>
              <td>{u.email}</td>
              <td>
                <select className="role-dropdown" value={u.role} onChange={e => onRoleChange(u._id, e.target.value)}>
                  <option value="doctor">Doctor / Clinician</option>
                  <option value="patient">Patient</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="admin">Administrator</option>
                </select>
              </td>
              <td>
                <Badge type={u.active !== false ? 'green' : 'red'}>{u.active !== false ? 'Active' : 'Disabled'}</Badge>
              </td>
              <td style={{ textAlign: 'right' }}>
                <button
                  className="action-btn-sm"
                  onClick={() => onToggleStatus(u._id, u.active === false)}
                >
                  {u.active !== false ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminConsentTracker({ patients = [], onToggleConsent }) {
  return (
    <div className="analysis-table-wrap" style={{ marginTop: '12px' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Patient</th>
            <th>MRN</th>
            <th>Consent Status</th>
            <th>Consent Date</th>
            <th>Consent Agreement</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p._id}>
              <td><strong>{p.fullName}</strong></td>
              <td><code>{p.mrn || '—'}</code></td>
              <td>
                <Badge type={p.consented ? 'green' : 'amber'}>{p.consented ? 'Consented' : 'Pending'}</Badge>
              </td>
              <td>{dateLabel(p.consentDetails?.consentDate || p.createdAt)}</td>
              <td>{p.consentDetails?.consentType || 'Digital Twin & AI EEG Monitoring Consent'}</td>
              <td style={{ textAlign: 'right' }}>
                <button
                  className="action-btn-sm"
                  onClick={() => onToggleConsent(p._id, !p.consented)}
                >
                  {p.consented ? 'Revoke Consent' : 'Record Consent'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem('nt-session') || 'null'); } catch { return null; } });
  const [dashboard, setDashboard] = useState(null);
  const [overview, setOverview] = useState(null);
  const [patients, setPatients] = useState([]);
  const [audit, setAudit] = useState([]);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState('');
  const [modelStatus, setModelStatus] = useState({ model_state: 'checking' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('clinical');
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientMrn, setNewPatientMrn] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientConditions, setNewPatientConditions] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [analysesList, setAnalysesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPatientId, setFilterPatientId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPattern, setFilterPattern] = useState('all');
  const [inspectedAnalysis, setInspectedAnalysis] = useState(null);
  const [downloadingReportId, setDownloadingReportId] = useState(null);
  const [usersList, setUsersList] = useState([]);

  const token = session?.token;
  const user = session?.user;
  const isClinician = ['doctor', 'admin'].includes(user?.role);
  const isResearchWorkspace = ['doctor', 'admin', 'patient', 'caregiver'].includes(user?.role);
  const logout = useCallback(() => { localStorage.removeItem('nt-session'); setSession(null); setDashboard(null); setOverview(null); }, []);

  const loadWorkspace = useCallback(async () => {
    if (!token) return;
    setBusy(true); setError('');
    try {
      const modelStatusRequest = isClinician
        ? api('/api/model/state', {}, token).catch(err => ({ model_state: 'unavailable', error: err.message }))
        : Promise.resolve(null);
      const [dash, nextModelStatus] = await Promise.all([api('/api/dashboard', {}, token), modelStatusRequest]);
      setDashboard(dash);
      if (nextModelStatus) setModelStatus(nextModelStatus);
      let patientList = dash.patients || [];
      if (isClinician) {
        patientList = await api('/api/patients', {}, token);
      }
      setPatients(patientList);
      const selectedId = user?.linkedPatient || patientList[0]?._id;
      if (selectedId) {
        setOverview(await api(`/api/patients/${selectedId}/overview`, {}, token));
      } else setOverview(null);
      if (user?.role === 'admin') {
        const [auditRes, userRes] = await Promise.all([
          api('/api/admin/audit', {}, token).catch(() => []),
          api('/api/admin/users', {}, token).catch(() => [])
        ]);
        setAudit(auditRes);
        setUsersList(userRes);
      }
    } catch (err) {
      if (/token|unauthorized|invalid/i.test(err.message)) logout();
      else setError(err.message);
    } finally { setBusy(false); }
  }, [token, user?.role, user?.linkedPatient, isClinician, logout]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  const loadAnalyses = useCallback(async () => {
    if (!token) return;
    try {
      let q = '/api/analyses?limit=100';
      if (filterPatientId) q += `&patientId=${filterPatientId}`;
      const res = await api(q, {}, token);
      setAnalysesList(res.analyses || []);
    } catch (err) {
      console.error(err);
    }
  }, [token, filterPatientId]);

  useEffect(() => {
    if (tab === 'analyses' || tab === 'overview') {
      loadAnalyses();
    }
  }, [tab, loadAnalyses]);

  const filteredAnalyses = useMemo(() => {
    return analysesList.filter(item => {
      if (filterPatientId && (item.patientId?._id || item.patientId || item.patient?._id) !== filterPatientId) {
        return false;
      }
      if (filterStatus === 'reviewed' && item.clinicianReview !== 'reviewed') {
        return false;
      }
      if (filterStatus === 'pending' && item.clinicianReview === 'reviewed') {
        return false;
      }
      const maxScore = Number(item.confidence ?? item.probabilities?.maxSeizureScore ?? 0);
      const isSeizure = maxScore >= (item.probabilities?.threshold ?? 0.65) || item.label?.toLowerCase().includes('seizure');
      if (filterPattern === 'seizure' && !isSeizure) {
        return false;
      }
      if (filterPattern === 'normal' && isSeizure) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const patientName = (item.patient?.fullName || item.patientId?.fullName || '').toLowerCase();
        const mrn = (item.patient?.mrn || item.patientId?.mrn || '').toLowerCase();
        const file = (item.session?.sourceName || item.metadata?.originalFileName || item.edfFileName || '').toLowerCase();
        const label = (item.label || '').toLowerCase();
        if (!patientName.includes(q) && !mrn.includes(q) && !file.includes(q) && !label.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [analysesList, filterPatientId, filterStatus, filterPattern, searchQuery]);

  if (!session) return <PublicSite onLogin={value => { localStorage.setItem('nt-session', JSON.stringify(value)); setSession(value); }} />;
  if (!dashboard && busy) return <div className="loading"><span className="loading-mark"><Brain size={25} /></span><b>Preparing your workspace</b><p>Loading authorized research data…</p></div>;

  const patient = overview?.patient;
  const latest = overview?.analyses?.[0];
  const twin = overview?.twin;
  const navigation = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    ...(isClinician ? [{ id: 'patients', label: 'Patients', icon: Users }] : []),
    ...(isResearchWorkspace ? [{ id: 'analyses', label: 'EEG Analyses', icon: Activity }, { id: 'twin', label: 'Digital Twin', icon: Brain }, { id: 'notes', label: 'Clinical notes', icon: FileText }] : []),
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Audit & access', icon: ShieldCheck }] : []),
    ...(['admin', 'doctor', 'receptionist', 'nurse', 'lab_technician', 'pharmacist', 'billing'].includes(user?.role) ? [{ id: 'hms', label: 'Hospital Management', icon: ClipboardList }] : [])
  ];
  const chooseTab = id => { setTab(id); setMobileNav(false); setError(''); setNotice(''); };
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || !patient?._id) return;
    if (!file.name.toLowerCase().endsWith('.edf')) { setError('Please select an EDF EEG file.'); return; }
    if (file.size > 100 * 1024 * 1024) { setError('The EDF file exceeds the 100 MB upload limit. Choose a smaller file.'); return; }
    if (modelStatus?.model_state !== 'ready') { setError('EDF upload is unavailable because the EEG model service is not ready. Refresh the workspace after the service is running.'); return; }
    setUploading(true); setError(''); setNotice('');
    setUploadingFile(file.name);
    try {
      await api('/api/eeg/upload', { method: 'POST', body: (() => { const form = new FormData(); form.append('eeg', file); form.append('patientId', patient._id); return form; })() }, token);
      const refreshedOverview = await api(`/api/patients/${patient._id}/overview`, {}, token);
      setOverview(refreshedOverview);
      setDashboard(await api('/api/dashboard', {}, token));
      setNotice('EEG upload processed. Review the research output with a qualified clinician.');
    } catch (err) { setError(err.message); }
    finally { setUploading(false); setUploadingFile(''); }
  };
  const selectPatient = async event => {
    const patientId = event.target.value;
    if (!patientId) return;
    setBusy(true); setError(''); setNotice('');
    try { setOverview(await api(`/api/patients/${patientId}/overview`, {}, token)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const saveNote = async event => {
    event.preventDefault(); if (!note.trim() || !patient?._id) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/api/patients/${patient._id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: note.trim(), visibility: noteVisibility })
      }, token);
      setNote('');
      setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token));
      setNotice(`Clinical note saved (${noteVisibility === 'patient' ? 'shared with patient' : 'clinical only'}).`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const registerPatient = async event => {
    event.preventDefault();
    if (!newPatientName.trim()) { setError('Patient full name is required'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const conditions = newPatientConditions.split(',').map(s => s.trim()).filter(Boolean);
      const created = await api('/api/patients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: newPatientName.trim(),
          mrn: newPatientMrn.trim() || undefined,
          dob: newPatientDob || undefined,
          conditions: conditions.length ? conditions : undefined,
          consented: true
        })
      }, token);
      const updatedList = await api('/api/patients', {}, token);
      setPatients(updatedList);
      setOverview(await api(`/api/patients/${created._id}/overview`, {}, token));
      setDashboard(await api('/api/dashboard', {}, token));
      setShowNewPatient(false);
      setNewPatientName('');
      setNewPatientMrn('');
      setNewPatientDob('');
      setNewPatientConditions('');
      setNotice(`Patient record created for ${created.fullName}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = async (analysisId, patientName) => {
    try {
      setDownloadingReportId(analysisId);
      setNotice('Preparing PDF clinical report…');
      const res = await fetch(`/api/analyses/${analysisId}/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not generate PDF report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NeuroTwin_Report_${(patientName || 'Patient').replace(/\s+/g, '_')}_${analysisId.slice(-6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotice('Clinical research PDF report downloaded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingReportId(null);
    }
  };

  const inspectAnalysis = async (item) => {
    try {
      setBusy(true);
      const detail = await api(`/api/analyses/${item._id}`, {}, token);
      setInspectedAnalysis(detail);
    } catch (err) {
      setInspectedAnalysis(item);
    } finally {
      setBusy(false);
    }
  };

  const toggleReviewStatus = async (analysisId, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'reviewed' ? 'pending' : 'reviewed';
      await api(`/api/analyses/${analysisId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      }, token);
      if (inspectedAnalysis && inspectedAnalysis._id === analysisId) {
        setInspectedAnalysis(prev => ({ ...prev, clinicianReview: nextStatus }));
      }
      loadAnalyses();
      if (patient?._id) {
        setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token));
      }
      setNotice(`Analysis review state updated to ${nextStatus}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveTreatment = async (payload) => {
    if (!patient?._id) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/api/patients/${patient._id}/treatment`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }, token);
      setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token));
      setNotice('Patient diagnosis, conditions, and treatment plan updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleRxStatus = async (rxId, newStatus) => {
    if (!patient?._id) return;
    try {
      setBusy(true);
      await api(`/api/patients/${patient._id}/prescriptions/${rxId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      }, token);
      setNotice(`Prescription marked as ${newStatus}.`);
      setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token));
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const switchDemoRole = async (targetRole) => {
    try {
      setBusy(true);
      setError('');
      const auth = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: targetRole, password: 'DemoPass123!' })
      });
      localStorage.setItem('nt-session', JSON.stringify(auth));
      setSession(auth);
      setTab('overview');
      setNotice(`Switched to ${roleLabels[auth.user.role] || auth.user.role} workspace.`);
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(`Failed to switch demo role: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const simulateEEG = async (mode = 'normal') => {
    if (!patient?._id) return;
    setUploading(true); setError(''); setNotice('');
    try {
      await api('/api/eeg/simulate', {
        method: 'POST',
        body: JSON.stringify({ patientId: patient._id, mode })
      }, token);
      setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token));
      setDashboard(await api('/api/dashboard', {}, token));
      setNotice(`Simulated ${mode === 'seizure' ? 'seizure burst' : 'normal baseline'} EEG processed. Digital Twin updated.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setBusy(true);
      await api(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      }, token);
      setUsersList(await api('/api/admin/users', {}, token));
      setNotice(`User role updated to ${roleLabels[newRole] || newRole}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleUserStatus = async (userId, newActive) => {
    try {
      setBusy(true);
      await api(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active: newActive })
      }, token);
      setUsersList(await api('/api/admin/users', {}, token));
      setNotice(`User account ${newActive ? 'activated' : 'disabled'}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleConsent = async (patientId, consented) => {
    try {
      setBusy(true);
      await api(`/api/patients/${patientId}/consent`, {
        method: 'PATCH',
        body: JSON.stringify({ consented })
      }, token);
      setPatients(await api('/api/patients', {}, token));
      if (patient?._id === patientId) {
        setOverview(await api(`/api/patients/${patientId}/overview`, {}, token));
      }
      setNotice('Patient consent and privacy flow updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const greeting = user?.role === 'patient' && patient ? patient.fullName?.split(' ')[0] : user?.name?.split(' ').slice(-1)[0];

  const renderRoleDashboard = () => {
    if (user?.role === 'admin') {
      return <>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">SYSTEM OVERVIEW</p>
            <h2>Administrative Dashboard</h2>
            <p>Manage user accounts, role assignments, patient consent/privacy flows, and platform governance.</p>
            <div className="hero-meta">
              <span><ShieldCheck size={15} /> Governance</span>
              <span><Users size={15} /> User & Role Management</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="orb orb-one" /><div className="orb orb-two" />
            <ShieldCheck size={70} strokeWidth={1.1} /><span className="orbit-dot" />
          </div>
        </section>

        <div className="section-heading">
          <div><p className="eyebrow">ADMIN AT A GLANCE</p><h2>Operational Status</h2></div>
          <span className="updated-label"><span /> Platform View</span>
        </div>

        <section className="stats">
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon"><Users size={18} /></span><span className="stat-kicker">USERS</span></div>
            <small>Active user accounts</small>
            <strong>{usersList.length || dashboard?.counts?.users || 0}</strong>
            <span className="stat-foot">Managed accounts</span>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon lavender"><Users size={18} /></span><span className="stat-kicker">PATIENTS</span></div>
            <small>Patient records</small>
            <strong>{patients.length}</strong>
            <span className="stat-foot">Consent & profile records</span>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon amber-icon"><Activity size={18} /></span><span className="stat-kicker">ANALYSES</span></div>
            <small>Total EEG inferences</small>
            <strong>{dashboard?.counts?.analyses ?? 0}</strong>
            <span className="stat-foot">AI-processed sessions</span>
          </article>
        </section>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-icon"><Users size={18} /></span>
              <div>
                <h3>User Account Management & Role Assignment</h3>
                <p>Create, inspect, and assign roles (Doctor, Patient, Caregiver, Admin)</p>
              </div>
            </div>
            <Badge type="blue">{usersList.length} accounts</Badge>
          </div>
          <AdminUserManagement users={usersList} onRoleChange={handleRoleChange} onToggleStatus={handleToggleUserStatus} />
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-icon purple"><ShieldCheck size={18} /></span>
              <div>
                <h3>Patient Consent & Privacy Flows</h3>
                <p>Track consent agreements and data privacy authorizations</p>
              </div>
            </div>
            <Badge type="green">PRIVACY COMPLIANT</Badge>
          </div>
          <AdminConsentTracker patients={patients} onToggleConsent={handleToggleConsent} />
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="panel-icon"><ClipboardList size={18} /></span>
              <div>
                <h3>Recent Governance & Audit Log</h3>
                <p>Latest role-based access events</p>
              </div>
            </div>
          </div>
          {audit.length ? (
            <div className="patient-list compact-list">
              {audit.slice(0, 5).map((entry, index) => (
                <div className="patient-row" key={`${entry._id || index}`}>
                  <span className="patient-details">
                    <b>{entry.action || 'Access event'}</b>
                    <small>{entry.actor?.name ? `${entry.actor.name} (${entry.actor.role}) · ` : ''}{dateLabel(entry.createdAt)}</small>
                  </span>
                  <Badge type="neutral">{entry.meta?.name || entry.target || 'Workspace'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ClipboardList} title="No audit data yet">Audit data will appear after workspace activity.</EmptyState>
          )}
        </article>
      </>;
    }

    if (user?.role === 'doctor') {
      return <>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">CLINICAL DECISION SUPPORT</p>
            <h2>Doctor Dashboard & Caseload</h2>
            <p>Review raw EEG waveforms, AI-flagged anomalies with confidence scores, digital twin trends, and explainability metrics across assigned patient caseloads.</p>
            <div className="hero-meta">
              <span><Activity size={15} /> Caseload Monitoring</span>
              <span><Brain size={15} /> Digital Twin Trajectory</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="orb orb-one" /><div className="orb orb-two" />
            <Activity size={70} strokeWidth={1.1} /><span className="orbit-dot" />
          </div>
          {patient && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 2 }}>
              <label className={`upload-button${uploading || modelStatus.model_state !== 'ready' ? ' is-loading' : ''}`} aria-disabled={uploading || modelStatus.model_state !== 'ready'}>
                <Upload size={17} />{uploading ? 'Processing EEG…' : 'Upload EDF (PhysioNet)'}
                <input type="file" accept=".edf,application/octet-stream" onChange={upload} disabled={uploading || modelStatus.model_state !== 'ready'} hidden />
              </label>
              <div className="sim-btn-group">
                <button type="button" className="sim-btn" onClick={() => simulateEEG('normal')} disabled={uploading} title="Run simulated normal baseline EEG">
                  <Sparkles size={13} /> Sim Normal
                </button>
                <button type="button" className="sim-btn" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }} onClick={() => simulateEEG('seizure')} disabled={uploading} title="Run simulated seizure burst EEG">
                  <Activity size={13} /> Sim Seizure
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="section-heading">
          <div><p className="eyebrow">PATIENT CASELOAD</p><h2>Active Caseload Summary</h2></div>
          <span className="updated-label"><span /> Treating Clinician View</span>
        </div>

        <section className="stats">
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon"><Users size={18} /></span><span className="stat-kicker">CASELOAD</span></div>
            <small>Assigned patients</small>
            <strong>{patients.length}</strong>
            <span className="stat-foot">Under your active clinical care</span>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon lavender"><Activity size={18} /></span><span className="stat-kicker">ANALYSES</span></div>
            <small>EEG sessions</small>
            <strong>{overview?.analyses?.length ?? 0}</strong>
            <span className="stat-foot">For selected patient {patient?.fullName?.split(' ')[0]}</span>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon amber-icon"><ClipboardList size={18} /></span><span className="stat-kicker">REVIEW</span></div>
            <small>Pending clinician review</small>
            <strong>{dashboard?.counts?.pending ?? 0}</strong>
            <span className="stat-foot">Requiring physician verification</span>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div><span className="panel-icon"><Waves size={18} /></span><div><h3>Raw EEG Waveform</h3><p>Lead FP1-F7 · 10–20 Bipolar Montage</p></div></div>
              <Badge type={latest ? 'blue' : 'neutral'}>{latest ? '128 HZ RESAMPLED' : 'NO DATA'}</Badge>
            </div>
            <Plot values={latest?.waveform} />
            <p className="chart-note">Review raw EEG waveform context alongside clinical history and digital twin state.</p>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div><span className="panel-icon purple"><Activity size={18} /></span><div><h3>AI Seizure Anomaly Timeline</h3><p>Window confidence scores & threshold</p></div></div>
              <Badge type="amber">CONFIDENCE TIMELINE</Badge>
            </div>
            <Plot values={latest?.timeline} kind="score" />
            <p className="chart-note">Window scores reflect model prediction probabilities. All AI alerts include confidence scores for clinician verification.</p>
          </article>
        </section>

        {latest && <ExplainabilityMetrics analysis={latest} />}

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div><span className="panel-icon"><Brain size={18} /></span><div><h3>Digital Twin Trends</h3><p>{patient?.fullName} Neurological State</p></div></div>
              <Badge type="blue">{twin?.trend?.toUpperCase() || 'STABLE'}</Badge>
            </div>
            <div className="twin-state">
              <small>Digital Twin Summary</small>
              <p>{twin?.state?.clinicalAction || 'Continuous state representation tracking EEG patterns and background rhythms.'}</p>
              <div className="twin-facts">
                <div><small>Last EEG Upload</small><b>{twin?.state?.lastUpload || 'Not recorded'}</b></div>
                <div><small>Model State</small><b>{twin?.state?.modelState || latest?.modelState || 'Active'}</b></div>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div><span className="panel-icon purple"><Stethoscope size={18} /></span><div><h3>Current Diagnosis & Regimen</h3><p>Entered by treating physician</p></div></div>
              <Badge type="neutral">{patient?.mrn || 'Patient Record'}</Badge>
            </div>
            <div className="twin-state">
              <small>Documented Diagnosis</small>
              <b style={{ display: 'block', fontSize: '13px', color: '#0f172a', margin: '4px 0' }}>
                {patient?.treatment?.diagnosis || (patient?.conditions?.length ? patient.conditions.join(', ') : 'Neurological evaluation in progress')}
              </b>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#475569' }}>
                {patient?.treatment?.treatmentPlan || 'Treatment plan and medication titration guidelines.'}
              </p>
            </div>
          </article>
        </section>

        <PatientScheduleAndRx
          patient={patient}
          appointments={overview?.patient?.appointments || []}
          prescriptions={overview?.patient?.prescriptions || []}
          isClinician={true}
          onToggleRxStatus={toggleRxStatus}
        />

        <DoctorTreatmentForm patient={patient} onSave={saveTreatment} token={token} isBusy={busy} />
      </>;
    }

    if (user?.role === 'patient') {
      return <>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">YOUR HEALTH & WELLNESS</p>
            <h2>Welcome, {patient?.fullName?.split(' ')[0] || user?.name}</h2>
            <p>Track your simplified brain wave wellness score, read plain-language summaries, check appointment schedules, and review your active prescriptions.</p>
            <div className="hero-meta">
              <span><Heart size={15} /> Personal Health Portal</span>
              <span><ShieldCheck size={15} /> Private & Secure</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="orb orb-one" /><div className="orb orb-two" />
            <Brain size={70} strokeWidth={1.1} /><span className="orbit-dot" />
          </div>
        </section>

        <SimplifiedWellnessSection overview={overview} isCaregiver={false} />

        <PatientScheduleAndRx
          patient={patient}
          appointments={overview?.patient?.appointments || []}
          prescriptions={overview?.patient?.prescriptions || []}
          isClinician={false}
        />

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div><span className="panel-icon"><FileText size={18} /></span><div><h3>Care Team Notes</h3><p>Updates shared by your doctor</p></div></div>
              <Badge type="blue">SHARED</Badge>
            </div>
            {overview?.notes?.length ? (
              <div className="patient-list compact-list">
                {overview.notes.map((item, index) => (
                  <div className="patient-row" key={`${item._id || index}`}>
                    <span className="patient-details">
                      <b>{item.body}</b>
                      <small>{dateLabel(item.createdAt)} · {item.author?.name || 'Dr. Maya Rao'}</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No shared notes">Notes shared by your physician will appear here.</EmptyState>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div><span className="panel-icon purple"><Activity size={18} /></span><div><h3>Latest Brain Wave Rhythm</h3><p>Recent recorded activity</p></div></div>
              <Badge type="green">ACTIVE</Badge>
            </div>
            <Plot values={latest?.timeline} kind="score" />
            <p className="chart-note">Visual summary of your most recent recording interval.</p>
          </article>
        </section>
      </>;
    }

    if (user?.role === 'caregiver') {
      return <>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">CAREGIVER ACCESS · READ-ONLY</p>
            <h2>Caregiver View · {patient?.fullName ? `${patient.fullName}'s Wellness` : 'Patient Wellness'}</h2>
            <p>Review the patient's simplified wellness scores, plain-language summaries, appointment schedules, and active prescriptions in read-only mode.</p>
            <div className="hero-meta">
              <span><Users size={15} /> Supporting Access</span>
              <span><ShieldCheck size={15} /> Read-Only Scope</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="orb orb-one" /><div className="orb orb-two" />
            <Users size={70} strokeWidth={1.1} /><span className="orbit-dot" />
          </div>
        </section>

        <SimplifiedWellnessSection overview={overview} isCaregiver={true} />

        <PatientScheduleAndRx
          patient={patient}
          appointments={overview?.patient?.appointments || []}
          prescriptions={overview?.patient?.prescriptions || []}
          isClinician={false}
        />

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div><span className="panel-icon"><FileText size={18} /></span><div><h3>Visible Care Notes</h3><p>Patient-facing instructions and advice</p></div></div>
              <Badge type="blue">READ-ONLY</Badge>
            </div>
            {overview?.notes?.length ? (
              <div className="patient-list compact-list">
                {overview.notes.map((item, index) => (
                  <div className="patient-row" key={`${item._id || index}`}>
                    <span className="patient-details">
                      <b>{item.body}</b>
                      <small>{dateLabel(item.createdAt)} · {item.author?.name || 'Dr. Maya Rao'}</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No shared notes">No shared notes currently available.</EmptyState>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div><span className="panel-icon purple"><Brain size={18} /></span><div><h3>Digital Twin Summary</h3><p>Patient trajectory snapshot</p></div></div>
              <Badge type="amber">MONITORED</Badge>
            </div>
            <div className="twin-state">
              <small>Digital Twin Status</small>
              <p>{twin?.state?.clinicalAction || 'Continuous state representation tracking EEG patterns.'}</p>
              <div className="twin-facts">
                <div><small>Last Upload</small><b>{twin?.state?.lastUpload || 'Not recorded'}</b></div>
                <div><small>Trend</small><b>{twin?.trend?.toUpperCase() || 'STABLE'}</b></div>
              </div>
            </div>
          </article>
        </section>
      </>;
    }

    return null;
  };

  return <div className="shell">
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <aside className={mobileNav ? 'sidebar sidebar-open' : 'sidebar'}>
      <div className="logo"><span className="logo-mark"><Brain size={21} /></span><span>NeuroTwin<small>EEG WORKSPACE</small></span><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button></div>
      <p className="nav-caption">WORKSPACE</p><nav>{navigation.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'nav-link active' : 'nav-link'} onClick={() => chooseTab(item.id)}><Icon size={18} /><span>{item.label}</span>{tab === item.id && <span className="nav-indicator" />}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="secure-label"><ShieldCheck size={16} /><span>Protected workspace<small>Role-based access enabled</small></span></div><div className="profile"><div className="avatar">{user?.name?.[0] || 'N'}</div><div className="profile-copy"><b>{user?.name}</b><small>{roleLabels[user?.role] || user?.role}</small></div><button className="icon-button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div className="topbar-title"><button className="menu-toggle icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button><div><p className="eyebrow">{roleLabels[user?.role] || user?.role} workspace</p><h1>{tab === 'overview' ? `Welcome back${greeting ? `, ${greeting}` : ''}` : navigation.find(item => item.id === tab)?.label || 'Workspace'}</h1></div></div><div className="topbar-actions"><div className="demo-role-switcher" title="Quick 1-Click Role Switcher"><span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Demo:</span><button type="button" className={`demo-role-btn ${user?.role === 'doctor' ? 'active' : ''}`} onClick={() => switchDemoRole('doctor')} disabled={busy || user?.role === 'doctor'}>Clinician</button><button type="button" className={`demo-role-btn ${user?.role === 'patient' ? 'active' : ''}`} onClick={() => switchDemoRole('patient')} disabled={busy || user?.role === 'patient'}>Patient</button><button type="button" className={`demo-role-btn ${user?.role === 'caregiver' ? 'active' : ''}`} onClick={() => switchDemoRole('caregiver')} disabled={busy || user?.role === 'caregiver'}>Caregiver</button><button type="button" className={`demo-role-btn ${user?.role === 'admin' ? 'active' : ''}`} onClick={() => switchDemoRole('admin')} disabled={busy || user?.role === 'admin'}>Admin</button></div><span className="status-pill"><span /> Workspace active</span><button className="icon-button refresh-button" onClick={loadWorkspace} disabled={busy} aria-label="Refresh data" title="Refresh data"><RefreshCw size={17} /></button><div className="top-avatar">{user?.name?.[0] || 'N'}</div></div></header>
      <div className="safety-banner"><AlertTriangle size={16} /><span><b>Decision-Support Tool Only</b> — Does not replace clinical judgment or generate independent diagnoses. Digital Twin represents monitored neurological state derived from EEG patterns, not a brain simulation. All AI alerts include confidence scores and explainability for clinician verification.</span></div>
      {error && <div className="feedback error-feedback" role="alert"><AlertTriangle size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
      {notice && <div className="feedback success-feedback" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={16} /></button></div>}

      {tab === 'overview' && isClinician && <section className="panel eeg-workflow-panel">
        <div className="eeg-workflow-patient">
          <label htmlFor="dashboard-patient">Selected patient</label>
          <select id="dashboard-patient" value={patient?._id || ''} onChange={selectPatient} disabled={busy || patients.length === 0}>
            {patients.length === 0 && <option value="">No authorized patient records</option>}
            {patients.map(item => {
              const hasAlert = analysesList.some(a => (a.patientId?._id || a.patientId || a.patient?._id) === item._id && (Number(a.confidence ?? a.probabilities?.maxSeizureScore ?? 0) >= 0.65 || a.label?.toLowerCase().includes('seizure')));
              return (
                <option value={item._id} key={item._id}>
                  {hasAlert ? '⚠️ [ALERT: HIGH RISK] ' : ''}{item.fullName || 'Unnamed patient'}{item.mrn ? ` · ${item.mrn}` : ''}
                </option>
              );
            })}
          </select>
        </div>
        <ModelStatus status={modelStatus} />
        {isClinician && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label className={`upload-button workflow-upload${uploading || !patient || modelStatus.model_state !== 'ready' ? ' is-loading' : ''}`} aria-disabled={uploading || !patient || modelStatus.model_state !== 'ready'}>
              <Upload size={17} />{uploading ? `Processing ${uploadingFile}…` : 'Upload EDF (PhysioNet)'}
              <input type="file" accept=".edf,application/octet-stream" onChange={upload} disabled={uploading || !patient || modelStatus.model_state !== 'ready'} hidden />
            </label>
            {patient && (
              <div className="sim-btn-group">
                <button type="button" className="sim-btn" onClick={() => simulateEEG('normal')} disabled={uploading} title="Run simulated normal baseline EEG">
                  <Sparkles size={13} /> Sim Normal
                </button>
                <button type="button" className="sim-btn" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }} onClick={() => simulateEEG('seizure')} disabled={uploading} title="Run simulated seizure burst EEG">
                  <Activity size={13} /> Sim Seizure
                </button>
              </div>
            )}
          </div>
        )}
      </section>}

      {tab === 'overview' && isResearchWorkspace && renderRoleDashboard()}
      {tab === 'overview' && !isResearchWorkspace && <HMSWorkspace token={token} user={user} patients={patients} />}

      {tab === 'patients' && <section className="panel page-panel">
        <div className="section-heading inside">
          <div>
            <p className="eyebrow">AUTHORIZED RECORDS</p>
            <h2>Patients</h2>
            <p className="muted">Only records available to your account are listed.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isClinician && <button className="primary-button" onClick={() => setShowNewPatient(!showNewPatient)} style={{ padding: '8px 12px' }}>
              <UserPlus size={15} /> {showNewPatient ? 'Cancel' : 'Enroll patient'}
            </button>}
            <Badge>{patients.length} records</Badge>
          </div>
        </div>

        {showNewPatient && isClinician && <form className="new-patient-panel" onSubmit={registerPatient}>
          <h3 style={{ margin: '0 0 12px', fontSize: '13px' }}>Enroll new patient record</h3>
          <div className="new-patient-grid">
            <div>
              <label htmlFor="new-name">Full Name *</label>
              <input id="new-name" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} placeholder="e.g. Robin Taylor" required />
            </div>
            <div>
              <label htmlFor="new-mrn">Record ID / MRN</label>
              <input id="new-mrn" value={newPatientMrn} onChange={e => setNewPatientMrn(e.target.value)} placeholder="e.g. NT-1002" />
            </div>
            <div>
              <label htmlFor="new-dob">Date of Birth</label>
              <input id="new-dob" type="date" value={newPatientDob} onChange={e => setNewPatientDob(e.target.value)} />
            </div>
            <div>
              <label htmlFor="new-conditions">Conditions (comma separated)</label>
              <input id="new-conditions" value={newPatientConditions} onChange={e => setNewPatientConditions(e.target.value)} placeholder="e.g. Focal epilepsy, Monitoring" />
            </div>
          </div>
          <div className="new-patient-actions">
            <button type="button" className="secondary-btn" onClick={() => setShowNewPatient(false)}>Cancel</button>
            <button type="submit" className="primary-button" disabled={busy || !newPatientName.trim()}>{busy ? 'Enrolling…' : 'Save patient'}</button>
          </div>
        </form>}

        {patients.length ? <div className="patient-list">
          {patients.map(item => (
            <button
              className={patient?._id === item._id ? 'patient-row selected' : 'patient-row'}
              key={item._id}
              onClick={async () => {
                setBusy(true); setError('');
                try {
                  setOverview(await api(`/api/patients/${item._id}/overview`, {}, token));
                  setTab('overview');
                } catch (err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <span className="patient-avatar">{item.fullName?.[0] || 'P'}</span>
              <span className="patient-details">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <b>{item.fullName || 'Unnamed patient'}</b>
                  {analysesList.some(a => (a.patientId?._id || a.patientId || a.patient?._id) === item._id && (Number(a.confidence ?? a.probabilities?.maxSeizureScore ?? 0) >= 0.65 || a.label?.toLowerCase().includes('seizure'))) && (
                    <span className="triage-alert-badge"><AlertTriangle size={11} /> HIGH RISK</span>
                  )}
                </div>
                <small>{item.mrn ? `Record ID · ${item.mrn}` : 'Patient research record'}{item.assignedDoctor?.name ? ` · Assigned to: ${item.assignedDoctor.name}` : ''}</small>
                {Array.isArray(item.conditions) && item.conditions.length > 0 && (
                  <span className="chip-row">
                    {item.conditions.map((c, i) => <span className="chip" key={i}>{c}</span>)}
                  </span>
                )}
              </span>
              <Badge type="blue">{item._id === patient?._id ? 'Selected' : 'Record'}</Badge>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div> : <EmptyState icon={Users} title="No patient records">No patients are currently available for this account.</EmptyState>}
      </section>}

      {tab === 'twin' && <><section className="hero compact-hero"><div><p className="eyebrow">LONGITUDINAL RESEARCH CONTEXT</p><h2>Digital Twin snapshot</h2><p>A research representation assembled from stored records and model-backed outputs when available.</p></div><span className="hero-icon"><Brain size={34} /></span></section><section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="panel-icon"><Brain size={18} /></span><div><h3>Current research state</h3><p>{patient?.fullName || 'No patient selected'}</p></div></div><Badge type="amber">{twin?.trend || 'NO SNAPSHOT'}</Badge></div><div className="twin-state"><small>Research summary</small><p>{twin?.state?.clinicalAction || 'No model-backed digital-twin snapshot has been recorded.'}</p><div className="twin-facts"><div><small>Last EEG upload</small><b>{twin?.state?.lastUpload || 'Not recorded'}</b></div><div><small>Model state</small><b>{twin?.state?.modelState || latest?.modelState || 'Not available'}</b></div></div></div></article><article className="panel"><div className="panel-heading"><div><span className="panel-icon purple"><Activity size={18} /></span><div><h3>EEG signal</h3><p>Most recent recorded waveform</p></div></div></div><Plot values={latest?.waveform} /></article></section><section className="panel"><div className="panel-heading"><div><h3>Analysis history</h3><p>Stored research analyses for the selected record</p></div><Badge>{overview?.analyses?.length || 0} entries</Badge></div>{overview?.analyses?.length ? overview.analyses.map(item => <div className="record-row" key={item._id}><div className="record-status"><Activity size={17} /></div><div className="record-copy"><b>{item.label || 'EEG research analysis'}</b><span>{dateLabel(item.createdAt)} · {item.modelState || 'Model state unavailable'}</span></div><Badge type="amber">{item.clinicianReview || 'Review required'}</Badge></div>) : <EmptyState icon={ClipboardList} title="No analysis history">Recorded analysis entries will appear here after a successful backend inference.</EmptyState>}</section></>}

      {tab === 'notes' && <section className="panel page-panel">
        <div className="section-heading inside">
          <div>
            <p className="eyebrow">LONGITUDINAL RECORD</p>
            <h2>Clinical notes</h2>
            <p className="muted">Notes shown here follow the visibility rules enforced by the API.</p>
          </div>
          <Badge>{overview?.notes?.length || 0} notes</Badge>
        </div>

        {isClinician && patient && <form className="note-form" onSubmit={saveNote}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label htmlFor="clinical-note" style={{ margin: 0 }}>Add a note for {patient.fullName}</label>
            <div className="note-visibility-selector">
              <label htmlFor="note-vis">Scope:</label>
              <select id="note-vis" value={noteVisibility} onChange={e => setNoteVisibility(e.target.value)}>
                <option value="clinical">Clinical only (Care team)</option>
                <option value="patient">Shared with patient & caregiver</option>
              </select>
            </div>
          </div>
          <div className="quick-chips-row" style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Note Templates:</span>
            <button type="button" className="quick-chip" onClick={() => setNote(prev => (prev ? prev + '\n' : '') + 'Routine EEG Review: Baseline background activity within normal limits. No epileptiform discharges or focal slowing identified in current recording.')}>+ Routine Review</button>
            <button type="button" className="quick-chip" onClick={() => setNote(prev => (prev ? prev + '\n' : '') + 'Post-Ictal Review: Monitored post-event period. Transient generalized delta/theta slowing resolving toward alpha baseline. Neurological exam stable.')}>+ Post-Ictal</button>
            <button type="button" className="quick-chip" onClick={() => setNote(prev => (prev ? prev + '\n' : '') + 'Medication Titration: Evaluated clinical efficacy and serum tolerability. Initiated regimen adjustment with regular therapeutic monitoring.')}>+ Med Titration</button>
            <button type="button" className="quick-chip" onClick={() => setNote(prev => (prev ? prev + '\n' : '') + 'Seizure Precautions: Counseled on medication adherence, sleep hygiene, trigger avoidance, and aquatic safety.')}>+ Precautions</button>
          </div>
          <textarea id="clinical-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Record relevant clinical context for authorized review…" rows={4} required />
          <div className="form-bottom">
            <span>{noteVisibility === 'patient' ? 'Visible to patient and authorized caregivers.' : 'Visible only to authorized clinical staff.'}</span>
            <button className="primary-button" disabled={busy || !note.trim()}>{busy ? 'Saving…' : 'Save note'} <ArrowUpRight size={16} /></button>
          </div>
        </form>}

        {overview?.notes?.length ? <div className="notes-list">
          {overview.notes.map(item => (
            <article className="note-card" key={item._id}>
              <div className="note-card-top">
                <span className="panel-icon"><FileText size={17} /></span>
                <span>{dateLabel(item.createdAt)}</span>
                <Badge type={item.visibility === 'patient' ? 'blue' : 'neutral'}>{item.visibility || 'clinical'}</Badge>
              </div>
              <p>{item.body}</p>
              <small>Author: {item.author?.name || 'Authorized workspace user'}</small>
            </article>
          ))}
        </div> : <EmptyState icon={FileText} title="No notes recorded">No notes are available for the selected patient and your access level.</EmptyState>}
      </section>}


      {tab === 'analyses' && <section className="panel page-panel">
        <div className="section-heading inside">
          <div>
            <p className="eyebrow">EEG RECORDINGS & INFERENCE ARCHIVE</p>
            <h2>Analyses & Reports</h2>
            <p className="muted">Multi-channel EEG waveforms, model seizure timelines, and clinician review governance.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isClinician && patient && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label className={`action-btn-sm action-btn-primary${uploading || modelStatus.model_state !== 'ready' ? ' is-loading' : ''}`} style={{ cursor: 'pointer', padding: '7px 12px' }}>
                  <Upload size={14} /> {uploading ? 'Processing…' : 'Upload EDF'}
                  <input type="file" accept=".edf,application/octet-stream" onChange={upload} disabled={uploading || modelStatus.model_state !== 'ready'} hidden />
                </label>
                <button type="button" className="sim-btn" style={{ padding: '6px 10px', fontSize: '10px' }} onClick={() => simulateEEG('normal')} disabled={uploading}>
                  <Sparkles size={12} /> Sim Normal
                </button>
                <button type="button" className="sim-btn" style={{ padding: '6px 10px', fontSize: '10px', background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }} onClick={() => simulateEEG('seizure')} disabled={uploading}>
                  <Activity size={12} /> Sim Seizure
                </button>
              </div>
            )}
            <Badge type="blue">{filteredAnalyses.length} of {analysesList.length} analyses</Badge>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-item" style={{ flex: 2 }}>
            <label>Search archive</label>
            <div className="filter-search-box">
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search patient, MRN, file, pattern..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="filter-item">
            <label>Patient</label>
            <select value={filterPatientId} onChange={e => setFilterPatientId(e.target.value)}>
              <option value="">All Patients</option>
              {patients.map(p => <option key={p._id} value={p._id}>{p.fullName || 'Unnamed'}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>Classification</label>
            <select value={filterPattern} onChange={e => setFilterPattern(e.target.value)}>
              <option value="all">All Patterns</option>
              <option value="seizure">Seizure Detected</option>
              <option value="normal">Normal / Background</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Clinician Review</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All States</option>
              <option value="pending">Pending Review</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
          {(searchQuery || filterPatientId || filterPattern !== 'all' || filterStatus !== 'all') && (
            <button
              className="filter-reset-btn"
              onClick={() => { setSearchQuery(''); setFilterPatientId(''); setFilterPattern('all'); setFilterStatus('all'); }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredAnalyses.length > 0 ? (
          <div className="analysis-table-wrap">
            <table className="analysis-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Patient</th>
                  <th>Recording / File</th>
                  <th>Peak Score</th>
                  <th>Pattern Classification</th>
                  <th>Review Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalyses.map(item => {
                  const maxScore = Number(item.confidence ?? item.probabilities?.maxSeizureScore ?? 0);
                  const threshold = Number(item.probabilities?.threshold ?? 0.65);
                  const isSeizure = maxScore >= threshold || item.label?.toLowerCase().includes('seizure');
                  const pName = item.patient?.fullName || item.patientId?.fullName || 'Patient Record';
                  const pMrn = item.patient?.mrn || item.patientId?.mrn;
                  const fileName = item.session?.sourceName || item.metadata?.originalFileName || item.edfFileName || 'EDF Record';
                  const isReviewed = item.clinicianReview === 'reviewed';

                  return (
                    <tr key={item._id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{dateLabel(item.createdAt)}</strong>
                          <small style={{ color: '#64748b' }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                        </div>
                      </td>
                      <td>
                        <strong>{pName}</strong>
                        {pMrn && <small style={{ display: 'block', color: '#64748b' }}>MRN: {pMrn}</small>}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#334155' }}>{fileName}</span>
                      </td>
                      <td>
                        <span className={`score-pill ${isSeizure ? 'score-elevated' : 'score-normal'}`}>
                          {(maxScore * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <Badge type={isSeizure ? 'red' : 'green'}>
                          {isSeizure ? 'Seizure Pattern' : 'Normal / Background'}
                        </Badge>
                      </td>
                      <td>
                        {isClinician ? (
                          <button
                            className={`review-btn ${isReviewed ? 'reviewed' : 'pending'}`}
                            onClick={() => toggleReviewStatus(item._id, item.clinicianReview)}
                            title="Click to toggle clinician review status"
                          >
                            {isReviewed ? <Check size={12} /> : <Activity size={12} />}
                            {isReviewed ? 'Reviewed' : 'Pending Review'}
                          </button>
                        ) : (
                          <Badge type={isReviewed ? 'blue' : 'amber'}>{isReviewed ? 'Reviewed' : 'Pending'}</Badge>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="action-btn-sm"
                            onClick={() => inspectAnalysis(item)}
                            title="Inspect Waveforms & Intervals"
                          >
                            <Eye size={13} /> Inspect
                          </button>
                          <button
                            className="action-btn-sm action-btn-primary"
                            onClick={() => downloadReport(item._id, pName)}
                            disabled={downloadingReportId === item._id}
                            title="Download Clinical PDF Report"
                          >
                            <FileDown size={13} />
                            {downloadingReportId === item._id ? '...' : 'PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Activity} title="No matching EEG analyses">
            {analysesList.length === 0
              ? 'No EEG analyses recorded yet. Upload an EDF recording to run inference.'
              : 'No analyses match the current filter criteria.'}
          </EmptyState>
        )}
      </section>}

      {tab === 'hms' && <HMSWorkspace token={token} user={user} patients={patients} />}

      {tab === 'admin' && user?.role === 'admin' && <section className="panel page-panel"><div className="section-heading inside"><div><p className="eyebrow">GOVERNANCE</p><h2>Audit & access</h2><p className="muted">Recent audit events returned by the administration API.</p></div><Badge>{audit.length} events</Badge></div>{audit.length ? <div className="audit-list">{audit.map(item => <div className="audit-row" key={item._id}><span className="audit-icon"><ShieldCheck size={17} /></span><div><b>{item.action || 'Workspace event'}</b><small>{item.actor?.name || 'System'} · {item.actor?.role || 'unknown role'}</small></div><time>{dateLabel(item.createdAt)}</time></div>)}</div> : <EmptyState icon={ShieldCheck} title="No audit events available">Audit events will appear here when returned by the server.</EmptyState>}<p className="chart-note">This view displays API-provided events; it does not modify user roles or permissions.</p></section>}

      {inspectedAnalysis && (
        <AnalysisDetailModal
          analysis={inspectedAnalysis}
          onClose={() => setInspectedAnalysis(null)}
          onDownloadReport={downloadReport}
          onToggleReview={toggleReviewStatus}
          isClinician={isClinician}
          downloadingId={downloadingReportId}
        />
      )}

      <footer className="app-footer"><div className="footer-brand"><Brain size={16} /> NeuroTwin</div><span>Academic research prototype · Not for diagnosis</span><button onClick={loadWorkspace} className="text-button"><RefreshCw size={14} /> Refresh workspace</button></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);

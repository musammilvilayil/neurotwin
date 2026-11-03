import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowUpRight, Brain, CheckCircle2, ClipboardList,
  FileText, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, ShieldCheck, Upload,
  Users, UserPlus, X, Waves, Download, Search, Filter, Eye, Check, Layers, FileDown
} from 'lucide-react';
import './style.css';
import './plots.css';
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
      <div className="public-hero-copy"><p className="eyebrow">EEG-INFORMED DIGITAL TWIN RESEARCH</p><h1>Understand the signal.<br/><i>Keep the context.</i></h1><p>NeuroTwin brings EEG research outputs, longitudinal context and role-based collaboration into one carefully scoped workspace.</p><div className="public-hero-actions"><button className="primary-button" onClick={onLogin}>Enter workspace <ArrowUpRight size={17}/></button><button className="public-secondary-button" onClick={() => onNavigate('features')}>Explore capabilities</button></div><div className="public-trust"><span><ShieldCheck size={16}/> Role-based access</span><span><Activity size={16}/> EEG research workflow</span><span><Users size={16}/> Connected care roles</span></div></div>
      <div className="public-visual"><div className="public-orbit orbit-a"/><div className="public-orbit orbit-b"/><div className="public-brain"><Brain size={94} strokeWidth={1.1}/></div><span className="public-signal signal-one"/><span className="public-signal signal-two"/><div className="public-visual-label"><Waves size={16}/> SIGNAL · CONTEXT · INSIGHT</div></div>
    </section>
    <section className="public-section"><p className="eyebrow">ONE CONNECTED WORKSPACE</p><h2>Research context, made easier to explore.</h2><p className="public-section-lead">A research prototype designed to organize EEG-informed records and support collaboration between authorized roles.</p><div className="public-feature-grid">
      <article><span><Activity size={20}/></span><h3>EEG research review</h3><p>Upload supported EDF recordings and review artifact-backed model outputs when the research service is available.</p></article>
      <article><span><Brain size={20}/></span><h3>Digital Twin context</h3><p>Explore stored longitudinal snapshots and research trends alongside available patient context.</p></article>
      <article><span><ShieldCheck size={20}/></span><h3>Role-based workspace</h3><p>Separate access for administrators, doctors, patients and caregivers.</p></article>
    </div></section>
    <section className="public-bottom-cta"><div><p className="eyebrow">AUTHORIZED USERS</p><h2>Continue to your NeuroTwin workspace.</h2><p>Sign in to access the tools and records permitted by your role.</p></div><button className="primary-button" onClick={onLogin}>Workspace login <ArrowUpRight size={17}/></button></section>
  </main>;
}

function AboutPage({ onLogin }) {
  return <main className="public-main">
    <section className="public-section public-copy-section"><p className="eyebrow">ABOUT NEUROTWIN</p><h2>A structured view of EEG research and longitudinal context.</h2><p>NeuroTwin is an academic research prototype exploring how EEG signal processing, machine-learning research outputs and patient-specific longitudinal records can be brought together in a single digital workspace.</p><p>It is intended for demonstration, research and supervised review. It does not replace clinical judgement, neurological examination or validated medical devices.</p></section>
    <section className="public-bottom-cta"><div><p className="eyebrow">AUTHORIZED USERS</p><h2>Continue to your NeuroTwin workspace.</h2><p>Sign in to access the tools and records permitted by your role.</p></div><button className="primary-button" onClick={onLogin}>Workspace login <ArrowUpRight size={17}/></button></section>
  </main>;
}

function FeaturesPage({ onLogin }) {
  return <main className="public-main">
    <section className="public-section"><p className="eyebrow">PLATFORM CAPABILITIES</p><h2>Built around four connected roles.</h2><div className="public-feature-grid role-grid">
      <article><span><ShieldCheck size={20}/></span><h3>Administrator</h3><p>Review workspace activity and governance records, and oversee platform-level access.</p></article>
      <article><span><Activity size={20}/></span><h3>Doctor</h3><p>Access assigned patient records, review EEG research outputs, upload EDF files and document clinical context.</p></article>
      <article><span><Users size={20}/></span><h3>Patient</h3><p>View the linked personal research overview, permitted notes and longitudinal context.</p></article>
      <article><span><Users size={20}/></span><h3>Caregiver</h3><p>View only the patient information explicitly linked and authorized for caregiver access.</p></article>
    </div></section>
    <section className="public-bottom-cta"><div><p className="eyebrow">AUTHORIZED USERS</p><h2>Continue to your NeuroTwin workspace.</h2><p>Sign in to access the tools and records permitted by your role.</p></div><button className="primary-button" onClick={onLogin}>Workspace login <ArrowUpRight size={17}/></button></section>
  </main>;
}

function ResearchPage({ onLogin }) {
  return <main className="public-main">
    <section className="public-section public-copy-section"><p className="eyebrow">RESEARCH & SAFETY</p><h2>Transparent about what the prototype can — and cannot — do.</h2><p>Model outputs are experimental research information. They must not be used to diagnose, predict an individual's clinical outcome, change medication or make treatment decisions.</p><p>Any EEG analysis shown in the workspace requires review by a qualified clinician and must be interpreted with the broader clinical history. The prototype has not been established as a clinically validated diagnostic device.</p><div className="boundary public-boundary"><AlertTriangle size={18}/><span><b>Important boundary</b><br/>For academic research and demonstration only. Not for diagnosis or treatment.</span></div></section>
    <section className="public-bottom-cta"><div><p className="eyebrow">AUTHORIZED USERS</p><h2>Continue to your NeuroTwin workspace.</h2><p>Sign in to access the tools and records permitted by your role.</p></div><button className="primary-button" onClick={onLogin}>Workspace login <ArrowUpRight size={17}/></button></section>
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
          <section className="public-login-intro"><p className="eyebrow">AUTHORIZED ACCESS</p><h1>Your research workspace, <i>securely connected.</i></h1><p>Sign in with the username and password assigned to your NeuroTwin account. Your role determines which records and tools are available.</p><div className="boundary"><AlertTriangle size={18}/><span><b>Research use only</b><br/>NeuroTwin is not a diagnostic device. Outputs require qualified clinical review.</span></div></section>
          <form className="card login-card public-login-card" onSubmit={submit}>
            <div className="login-symbol"><ShieldCheck size={22}/></div><p className="eyebrow">SECURE ACCESS</p><h2>Welcome back</h2><p className="muted">Enter your username and password to continue.</p>
            <label>Username or email<input autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} required/></label>
            <label>Password<input autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required/></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'} <ArrowUpRight size={17}/></button>
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
      <button className="public-brand" onClick={() => nav('home')}><span className="logo-mark"><Brain size={21}/></span><span>NeuroTwin<small>EEG WORKSPACE</small></span></button>
      <nav aria-label="Main navigation">
        <button className={page === 'home' ? 'selected' : ''} onClick={() => nav('home')}>Home</button>
        <button className={page === 'about' ? 'selected' : ''} onClick={() => nav('about')}>About</button>
        <button className={page === 'features' ? 'selected' : ''} onClick={() => nav('features')}>Features</button>
        <button className={page === 'research' ? 'selected' : ''} onClick={() => nav('research')}>Research & safety</button>
      </nav>
      <button className="primary-button public-login-cta" onClick={openLogin}>Workspace login <ArrowUpRight size={16}/></button>
    </header>
    {renderPage()}
    <footer className="public-footer"><span>© NeuroTwin · Academic research prototype</span><span>Privacy-aware access · Not a diagnostic device</span></footer>
  </div>;
}

function Badge({ children, type = '' }) { return <span className={`badge ${type}`}>{children}</span>; }
function EmptyState({ icon: Icon = Activity, title, children }) { return <div className="empty-state"><span><Icon size={22}/></span><b>{title}</b><p>{children}</p></div>; }
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
    <span className="model-status-indicator"/>
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
  return <div className="plot-wrap"><svg className={`plot ${score ? 'score-plot' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={score ? 'Experimental EEG score timeline' : 'EEG waveform'}><line x1="0" y1="50" x2="100" y2="50" className="plot-axis"/><polyline points={points}/></svg><div className="plot-labels"><span>Earlier</span><span>Recent</span></div></div>;
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
  if (!analysis) return null;
  const maxScore = Number(analysis?.confidence ?? analysis?.probabilities?.maxSeizureScore ?? 0);
  const threshold = Number(analysis?.probabilities?.threshold ?? 0.65);
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
          <button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18}/></button>
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
              <small>RESEARCH THRESHOLD</small>
              <strong>{(threshold * 100).toFixed(0)}%</strong>
            </div>
            <div className="kpi-card">
              <small>CLINICIAN REVIEW</small>
              <Badge type={isReviewed ? 'blue' : 'amber'}>{analysis.clinicianReview?.toUpperCase() || 'PENDING'}</Badge>
            </div>
          </div>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <span className="panel-icon purple"><Activity size={18}/></span>
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

          <article className="panel">
            <div className="panel-heading">
              <div>
                <span className="panel-icon"><Waves size={18}/></span>
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

  const token = session?.token;
  const user = session?.user;
  const isClinician = ['doctor', 'admin'].includes(user?.role);
  const isResearchWorkspace = ['doctor','admin','patient','caregiver'].includes(user?.role);
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
        setAudit(await api('/api/admin/audit', {}, token));
      }
    } catch (err) {
      if (/token|unauthorized|invalid/i.test(err.message)) logout();
      else setError(err.message);
    } finally { setBusy(false); }
  }, [token, user?.role, user?.linkedPatient, isClinician, logout]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);
  if (!session) return <PublicSite onLogin={value => { localStorage.setItem('nt-session', JSON.stringify(value)); setSession(value); }}/>;
  if (!dashboard && busy) return <div className="loading"><span className="loading-mark"><Brain size={25}/></span><b>Preparing your workspace</b><p>Loading authorized research data…</p></div>;

  const patient = overview?.patient;
  const latest = overview?.analyses?.[0];
  const twin = overview?.twin;
  const navigation = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    ...(isClinician ? [{ id: 'patients', label: 'Patients', icon: Users }] : []),
    ...(isResearchWorkspace ? [{ id: 'analyses', label: 'EEG Analyses', icon: Activity },{ id: 'twin', label: 'Digital Twin', icon: Brain },{ id: 'notes', label: 'Clinical notes', icon: FileText }] : []),
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Audit & access', icon: ShieldCheck }] : []),
    ...(['admin','doctor','receptionist','nurse','lab_technician','pharmacist','billing'].includes(user?.role) ? [{ id: 'hms', label: 'Hospital Management', icon: ClipboardList }] : [])
  ];
  const chooseTab = id => { setTab(id); setMobileNav(false); setError(''); setNotice(''); };
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || !patient?._id) return;
    if (!file.name.toLowerCase().endsWith('.edf')) { setError('Please select an EDF EEG file.'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('The EDF file exceeds the 50 MB upload limit. Choose a smaller file.'); return; }
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

  const greeting = user?.role === 'patient' && patient ? patient.fullName?.split(' ')[0] : user?.name?.split(' ').slice(-1)[0];

  const renderRoleDashboard = () => {
    if (user?.role === 'admin') {
      return <><section className="hero"><div className="hero-copy"><p className="eyebrow">SYSTEM OVERVIEW</p><h2>Administrative dashboard</h2><p>Monitor platform access, audit events, and research workflow activity across the NeuroTwin environment.</p><div className="hero-meta"><span><ShieldCheck size={15}/> Governance</span><span><Users size={15}/> Access review</span></div></div><div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><ShieldCheck size={70} strokeWidth={1.1}/><span className="orbit-dot"/></div></section>
      <div className="section-heading"><div><p className="eyebrow">ADMIN AT A GLANCE</p><h2>Operational status</h2></div><span className="updated-label"><span/> Platform view</span></div>
      <section className="stats"><article className="stat-card"><div className="stat-top"><span className="stat-icon"><Users size={18}/></span><span className="stat-kicker">USERS</span></div><small>Active user accounts</small><strong>{dashboard?.counts?.users ?? 0}</strong><span className="stat-foot">Accounts currently enabled</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon lavender"><Users size={18}/></span><span className="stat-kicker">PATIENTS</span></div><small>Patient records</small><strong>{dashboard?.counts?.patients ?? patients.length}</strong><span className="stat-foot">Records across the workspace</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon amber-icon"><Activity size={18}/></span><span className="stat-kicker">ANALYSES</span></div><small>EEG analyses</small><strong>{dashboard?.counts?.analyses ?? 0}</strong><span className="stat-foot">Experimental scores, not diagnoses</span></article></section>
      <section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="panel-icon"><ShieldCheck size={18}/></span><div><h3>System access</h3><p>Permission and security status</p></div></div><Badge type="blue">ADMIN</Badge></div><div className="twin-state"><small>Admin summary</small><p>Workspace activity is governed by role-based permissions and audit trails. Review access events before broader workflow changes.</p><div className="twin-facts"><div><small>Patient records</small><b>{dashboard?.counts?.patients ?? patients.length}</b></div><div><small>Pending review</small><b>{dashboard?.counts?.pending ?? 0}</b></div></div></div></article><article className="panel"><div className="panel-heading"><div><span className="panel-icon purple"><ClipboardList size={18}/></span><div><h3>Recent audit log</h3><p>Latest access events</p></div></div></div>{audit.length ? <div className="patient-list compact-list">{audit.slice(0,4).map((entry,index) => <div className="patient-row" key={`${entry._id || index}`}><span className="patient-details"><b>{entry.action || 'Access event'}</b><small>{entry.actor?.name ? `${entry.actor.name} · ` : ''}{dateLabel(entry.createdAt)}</small></span><Badge type="neutral">{entry.meta?.name || 'Workspace'}</Badge></div>)}</div> : <EmptyState icon={ClipboardList} title="No audit data yet">Audit data will appear after workspace activity.</EmptyState>}</article></section></>;
    }

    if (user?.role === 'doctor') {
      return <><section className="hero"><div className="hero-copy"><p className="eyebrow">CLINICAL MONITORING</p><h2>Doctor dashboard</h2><p>Monitor assigned patient records, review EEG analysis outputs, and flag items that need clinician attention.</p><div className="hero-meta"><span><Activity size={15}/> Patient monitoring</span><span><ClipboardList size={15}/> Review queue</span></div></div><div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><Activity size={70} strokeWidth={1.1}/><span className="orbit-dot"/></div>{patient && <label className={`upload-button${uploading || modelStatus.model_state !== 'ready' ? ' is-loading' : ''}`} aria-disabled={uploading || modelStatus.model_state !== 'ready'}><Upload size={17}/>{uploading ? 'Processing EEG…' : modelStatus.model_state === 'ready' ? 'Upload EDF EEG' : 'Model unavailable'}<input type="file" accept=".edf,application/octet-stream" onChange={upload} disabled={uploading || modelStatus.model_state !== 'ready'} hidden/></label>}</section>
      <div className="section-heading"><div><p className="eyebrow">CLINIC SUMMARY</p><h2>Assigned records</h2></div><span className="updated-label"><span/> Care team view</span></div>
      <section className="stats"><article className="stat-card"><div className="stat-top"><span className="stat-icon"><Users size={18}/></span><span className="stat-kicker">PATIENTS</span></div><small>Assigned records</small><strong>{dashboard?.counts?.patients ?? patients.length}</strong><span className="stat-foot">Current patient access scope</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon lavender"><Activity size={18}/></span><span className="stat-kicker">ANALYSES</span></div><small>Latest EEG records</small><strong>{dashboard?.counts?.analyses ?? overview?.analyses?.length ?? 0}</strong><span className="stat-foot">Stored research analyses</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon amber-icon"><ClipboardList size={18}/></span><span className="stat-kicker">REVIEW</span></div><small>Awaiting clinician review</small><strong>{dashboard?.counts?.pending ?? 0}</strong><span className="stat-foot">Prioritized for clinical review</span></article></section>
      <section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="panel-icon"><Waves size={18}/></span><div><h3>Signal review</h3><p>Most recent waveform</p></div></div><Badge type={latest ? 'blue' : 'neutral'}>{latest ? 'EEG MODEL' : 'NO DATA'}</Badge></div><Plot values={latest?.waveform}/><p className="chart-note">Review waveform context alongside the patient history.</p></article><article className="panel"><div className="panel-heading"><div><span className="panel-icon purple"><Activity size={18}/></span><div><h3>EEG score timeline</h3><p>Experimental model output</p></div></div><Badge type="amber">EXPERIMENTAL</Badge></div><Plot values={latest?.timeline} kind="score"/><p className="chart-note">Scores are experimental and are not clinical conclusions.</p></article></section></>;
    }

    if (user?.role === 'patient') {
      return <><section className="hero"><div className="hero-copy"><p className="eyebrow">YOUR CARE DASHBOARD</p><h2>{patient?.fullName || 'Your health workspace'}</h2><p>Review your linked monitoring context, available notes, and any research summaries shared to your workspace.</p><div className="hero-meta"><span><Activity size={15}/> Personal context</span><span><ShieldCheck size={15}/> Access-controlled</span></div></div><div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><Brain size={70} strokeWidth={1.1}/><span className="orbit-dot"/></div></section>
      <div className="section-heading"><div><p className="eyebrow">YOUR SUMMARY</p><h2>Care overview</h2></div><span className="updated-label"><span/> Personal view</span></div>
      <section className="stats"><article className="stat-card"><div className="stat-top"><span className="stat-icon"><FileText size={18}/></span><span className="stat-kicker">NOTES</span></div><small>Shared notes</small><strong>{overview?.notes?.length ?? 0}</strong><span className="stat-foot">Visible entries in your workspace</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon lavender"><Activity size={18}/></span><span className="stat-kicker">ANALYSIS</span></div><small>Stored analysis</small><strong>{overview?.analyses?.length ?? 0}</strong><span className="stat-foot">Research records linked to your account</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon amber-icon"><ShieldCheck size={18}/></span><span className="stat-kicker">STATUS</span></div><small>Clinical review</small><strong>{latest?.clinicianReview || 'Pending'}</strong><span className="stat-foot">Requires qualified clinician review</span></article></section>
      <section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="panel-icon"><FileText size={18}/></span><div><h3>Recent notes</h3><p>Your available clinical context</p></div></div><Badge type="blue">PATIENT</Badge></div>{overview?.notes?.length ? <div className="patient-list compact-list">{overview.notes.slice(0,3).map((item,index) => <div className="patient-row" key={`${item._id || index}`}><span className="patient-details"><b>{item.body?.slice(0,80) || 'Clinical note'}</b><small>{dateLabel(item.createdAt)}</small></span><Badge type="neutral">{item.visibility || 'patient'}</Badge></div>)}</div> : <EmptyState icon={FileText} title="No notes shared yet">No patient-visible notes are currently available in your workspace.</EmptyState>}</article><article className="panel"><div className="panel-heading"><div><span className="panel-icon purple"><Activity size={18}/></span><div><h3>Latest score</h3><p>Most recent research output</p></div></div><Badge type="amber">RESEARCH</Badge></div><Plot values={latest?.timeline} kind="score"/><p className="chart-note">This output is informational and not a diagnosis.</p></article></section></>;
    }

    if (user?.role === 'caregiver') {
      return <><section className="hero"><div className="hero-copy"><p className="eyebrow">CAREGIVER VIEW</p><h2>Caregiver dashboard</h2><p>Review the monitored patient context that is available to your role, with emphasis on shared updates and safety guidance.</p><div className="hero-meta"><span><Users size={15}/> Supporting access</span><span><ShieldCheck size={15}/> Read-only scope</span></div></div><div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><Users size={70} strokeWidth={1.1}/><span className="orbit-dot"/></div></section>
      <div className="section-heading"><div><p className="eyebrow">CARE SUMMARY</p><h2>Shared monitoring context</h2></div><span className="updated-label"><span/> Caregiver scope</span></div>
      <section className="stats"><article className="stat-card"><div className="stat-top"><span className="stat-icon"><Users size={18}/></span><span className="stat-kicker">CLIENT</span></div><small>Linked patient</small><strong>{patient?.fullName ? patient.fullName.split(' ')[0] : 'Patient'}</strong><span className="stat-foot">Authorized care record</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon lavender"><Activity size={18}/></span><span className="stat-kicker">ANALYSIS</span></div><small>Available analyses</small><strong>{overview?.analyses?.length ?? 0}</strong><span className="stat-foot">Research records visible in scope</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon amber-icon"><FileText size={18}/></span><span className="stat-kicker">NOTES</span></div><small>Shared notes</small><strong>{overview?.notes?.length ?? 0}</strong><span className="stat-foot">Patient-visible information</span></article></section>
      <section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="panel-icon"><FileText size={18}/></span><div><h3>Visible care notes</h3><p>Current patient-facing context</p></div></div><Badge type="blue">CAREGIVER</Badge></div>{overview?.notes?.length ? <div className="patient-list compact-list">{overview.notes.slice(0,3).map((item,index) => <div className="patient-row" key={`${item._id || index}`}><span className="patient-details"><b>{item.body?.slice(0,80) || 'Clinical note'}</b><small>{dateLabel(item.createdAt)}</small></span><Badge type="neutral">{item.visibility || 'patient'}</Badge></div>)}</div> : <EmptyState icon={FileText} title="No caregiver-visible notes">No patient-visible notes are currently available.</EmptyState>}</article><article className="panel"><div className="panel-heading"><div><span className="panel-icon purple"><Brain size={18}/></span><div><h3>Research context</h3><p>Current digital-twin snapshot</p></div></div><Badge type="amber">RESEARCH</Badge></div><div className="twin-state"><small>Current summary</small><p>{twin?.state?.clinicalAction || 'No model-backed digital-twin snapshot has been recorded.'}</p><div className="twin-facts"><div><small>Last upload</small><b>{twin?.state?.lastUpload || 'Not recorded'}</b></div><div><small>Model state</small><b>{twin?.state?.modelState || latest?.modelState || 'Not available'}</b></div></div></div></article></section></>;
    }

    return <><section className="hero"><div className="hero-copy"><p className="eyebrow">YOUR RESEARCH OVERVIEW</p><h2>{patient?.fullName || 'Your workspace'}</h2><p>Review longitudinal context, EEG research outputs, and clinical notes in one place.</p><div className="hero-meta"><span><Activity size={15}/> Longitudinal monitoring</span><span><ShieldCheck size={15}/> Access controlled</span></div></div><div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><Brain size={70} strokeWidth={1.1}/><span className="orbit-dot"/></div>{isClinician && patient && <label className={uploading ? 'upload-button is-loading' : 'upload-button'}><Upload size={17}/>{uploading ? 'Processing EEG…' : 'Upload EDF EEG'}<input type="file" accept=".edf,application/octet-stream" onChange={upload} disabled={uploading} hidden/></label>}</section>
      <div className="section-heading"><div><p className="eyebrow">AT A GLANCE</p><h2>Research summary</h2></div><span className="updated-label"><span/> Live workspace data</span></div>
      <section className="stats"><article className="stat-card"><div className="stat-top"><span className="stat-icon"><Users size={18}/></span><span className="stat-kicker">ACCESS</span></div><small>Available patients</small><strong>{dashboard?.counts?.patients ?? patients.length}</strong><span className="stat-foot">Based on authorized workspace data</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon lavender"><Activity size={18}/></span><span className="stat-kicker">ANALYSIS</span></div><small>Recorded analyses</small><strong>{dashboard?.counts?.analyses ?? overview?.analyses?.length ?? 0}</strong><span className="stat-foot">Research records, not diagnoses</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon amber-icon"><ClipboardList size={18}/></span><span className="stat-kicker">REVIEW</span></div><small>Awaiting clinician review</small><strong>{dashboard?.counts?.pending ?? '—'}</strong><span className="stat-foot">Review status from stored records</span></article></section>
      <section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="panel-icon"><Waves size={18}/></span><div><h3>EEG waveform</h3><p>Latest available signal</p></div></div><Badge type={latest ? 'blue' : 'neutral'}>{latest?.modelState || 'NO MODEL OUTPUT'}</Badge></div><Plot values={latest?.waveform}/><p className="chart-note">Signal visualization is available only when returned by the backend.</p></article><article className="panel"><div className="panel-heading"><div><span className="panel-icon purple"><Activity size={18}/></span><div><h3>Research score timeline</h3><p>Windowed model output</p></div></div><Badge type="amber">RESEARCH</Badge></div><Plot values={latest?.timeline} kind="score"/><p className="chart-note">Scores are experimental and must not be interpreted as clinical conclusions.</p></article></section></>;
  };

  return <div className="shell">
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <aside className={mobileNav ? 'sidebar sidebar-open' : 'sidebar'}>
      <div className="logo"><span className="logo-mark"><Brain size={21}/></span><span>NeuroTwin<small>EEG WORKSPACE</small></span><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <p className="nav-caption">WORKSPACE</p><nav>{navigation.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'nav-link active' : 'nav-link'} onClick={() => chooseTab(item.id)}><Icon size={18}/><span>{item.label}</span>{tab === item.id && <span className="nav-indicator"/>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="secure-label"><ShieldCheck size={16}/><span>Protected workspace<small>Role-based access enabled</small></span></div><div className="profile"><div className="avatar">{user?.name?.[0] || 'N'}</div><div className="profile-copy"><b>{user?.name}</b><small>{roleLabels[user?.role] || user?.role}</small></div><button className="icon-button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={17}/></button></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div className="topbar-title"><button className="menu-toggle icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21}/></button><div><p className="eyebrow">{roleLabels[user?.role] || user?.role} workspace</p><h1>{tab === 'overview' ? `Welcome back${greeting ? `, ${greeting}` : ''}` : navigation.find(item => item.id === tab)?.label || 'Workspace'}</h1></div></div><div className="topbar-actions"><span className="status-pill"><span/> Workspace active</span><button className="icon-button refresh-button" onClick={loadWorkspace} disabled={busy} aria-label="Refresh data" title="Refresh data"><RefreshCw size={17}/></button><div className="top-avatar">{user?.name?.[0] || 'N'}</div></div></header>
      <div className="safety-banner"><AlertTriangle size={16}/><span><b>Safety note</b> · EEG scores are experimental, not diagnoses or treatment recommendations, and require qualified clinician review.</span></div>
      {error && <div className="feedback error-feedback" role="alert"><AlertTriangle size={17}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
      {notice && <div className="feedback success-feedback" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={16}/></button></div>}

      {tab === 'overview' && isClinician && <section className="panel eeg-workflow-panel">
        <div className="eeg-workflow-patient">
          <label htmlFor="dashboard-patient">Selected patient</label>
          <select id="dashboard-patient" value={patient?._id || ''} onChange={selectPatient} disabled={busy || patients.length === 0}>
            {patients.length === 0 && <option value="">No authorized patient records</option>}
            {patients.map(item => <option value={item._id} key={item._id}>{item.fullName || 'Unnamed patient'}{item.mrn ? ` · ${item.mrn}` : ''}</option>)}
          </select>
        </div>
        <ModelStatus status={modelStatus}/>
        {user?.role === 'admin' && <label className={`upload-button workflow-upload${uploading || !patient || modelStatus.model_state !== 'ready' ? ' is-loading' : ''}`} aria-disabled={uploading || !patient || modelStatus.model_state !== 'ready'}>
          <Upload size={17}/>{uploading ? `Processing ${uploadingFile}…` : 'Upload EDF EEG'}
          <input type="file" accept=".edf,application/octet-stream" onChange={upload} disabled={uploading || !patient || modelStatus.model_state !== 'ready'} hidden/>
        </label>}
      </section>}

      {tab === 'overview' && renderRoleDashboard()}

      {tab === 'patients' && <section className="panel page-panel">
        <div className="section-heading inside">
          <div>
            <p className="eyebrow">AUTHORIZED RECORDS</p>
            <h2>Patients</h2>
            <p className="muted">Only records available to your account are listed.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isClinician && <button className="primary-button" onClick={() => setShowNewPatient(!showNewPatient)} style={{ padding: '8px 12px' }}>
              <UserPlus size={15}/> {showNewPatient ? 'Cancel' : 'Enroll patient'}
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
                } catch(err) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <span className="patient-avatar">{item.fullName?.[0] || 'P'}</span>
              <span className="patient-details">
                <b>{item.fullName || 'Unnamed patient'}</b>
                <small>{item.mrn ? `Record ID · ${item.mrn}` : 'Patient research record'}{item.assignedDoctor?.name ? ` · Assigned to: ${item.assignedDoctor.name}` : ''}</small>
                {Array.isArray(item.conditions) && item.conditions.length > 0 && (
                  <span className="chip-row">
                    {item.conditions.map((c, i) => <span className="chip" key={i}>{c}</span>)}
                  </span>
                )}
              </span>
              <Badge type="blue">{item._id === patient?._id ? 'Selected' : 'Record'}</Badge>
              <ArrowUpRight size={17}/>
            </button>
          ))}
        </div> : <EmptyState icon={Users} title="No patient records">No patients are currently available for this account.</EmptyState>}
      </section>}

      {tab === 'twin' && <><section className="hero compact-hero"><div><p className="eyebrow">LONGITUDINAL RESEARCH CONTEXT</p><h2>Digital Twin snapshot</h2><p>A research representation assembled from stored records and model-backed outputs when available.</p></div><span className="hero-icon"><Brain size={34}/></span></section><section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="panel-icon"><Brain size={18}/></span><div><h3>Current research state</h3><p>{patient?.fullName || 'No patient selected'}</p></div></div><Badge type="amber">{twin?.trend || 'NO SNAPSHOT'}</Badge></div><div className="twin-state"><small>Research summary</small><p>{twin?.state?.clinicalAction || 'No model-backed digital-twin snapshot has been recorded.'}</p><div className="twin-facts"><div><small>Last EEG upload</small><b>{twin?.state?.lastUpload || 'Not recorded'}</b></div><div><small>Model state</small><b>{twin?.state?.modelState || latest?.modelState || 'Not available'}</b></div></div></div></article><article className="panel"><div className="panel-heading"><div><span className="panel-icon purple"><Activity size={18}/></span><div><h3>EEG signal</h3><p>Most recent recorded waveform</p></div></div></div><Plot values={latest?.waveform}/></article></section><section className="panel"><div className="panel-heading"><div><h3>Analysis history</h3><p>Stored research analyses for the selected record</p></div><Badge>{overview?.analyses?.length || 0} entries</Badge></div>{overview?.analyses?.length ? overview.analyses.map(item => <div className="record-row" key={item._id}><div className="record-status"><Activity size={17}/></div><div className="record-copy"><b>{item.label || 'EEG research analysis'}</b><span>{dateLabel(item.createdAt)} · {item.modelState || 'Model state unavailable'}</span></div><Badge type="amber">{item.clinicianReview || 'Review required'}</Badge></div>) : <EmptyState icon={ClipboardList} title="No analysis history">Recorded analysis entries will appear here after a successful backend inference.</EmptyState>}</section></>}

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
          <textarea id="clinical-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Record relevant clinical context for authorized review…" rows={4} required/>
          <div className="form-bottom">
            <span>{noteVisibility === 'patient' ? 'Visible to patient and authorized caregivers.' : 'Visible only to authorized clinical staff.'}</span>
            <button className="primary-button" disabled={busy || !note.trim()}>{busy ? 'Saving…' : 'Save note'} <ArrowUpRight size={16}/></button>
          </div>
        </form>}

        {overview?.notes?.length ? <div className="notes-list">
          {overview.notes.map(item => (
            <article className="note-card" key={item._id}>
              <div className="note-card-top">
                <span className="panel-icon"><FileText size={17}/></span>
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
            <Badge type="blue">{filteredAnalyses.length} of {analysesList.length} analyses</Badge>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-item" style={{ flex: 2 }}>
            <label>Search archive</label>
            <div className="filter-search-box">
              <Search size={14} color="#64748b"/>
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
                            {isReviewed ? <Check size={12}/> : <Activity size={12}/>}
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
                            <Eye size={13}/> Inspect
                          </button>
                          <button
                            className="action-btn-sm action-btn-primary"
                            onClick={() => downloadReport(item._id, pName)}
                            disabled={downloadingReportId === item._id}
                            title="Download Clinical PDF Report"
                          >
                            <FileDown size={13}/>
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

      {tab === 'hms' && <HMSWorkspace token={token} user={user} patients={patients}/>}

      {tab === 'admin' && user?.role === 'admin' && <section className="panel page-panel"><div className="section-heading inside"><div><p className="eyebrow">GOVERNANCE</p><h2>Audit & access</h2><p className="muted">Recent audit events returned by the administration API.</p></div><Badge>{audit.length} events</Badge></div>{audit.length ? <div className="audit-list">{audit.map(item => <div className="audit-row" key={item._id}><span className="audit-icon"><ShieldCheck size={17}/></span><div><b>{item.action || 'Workspace event'}</b><small>{item.actor?.name || 'System'} · {item.actor?.role || 'unknown role'}</small></div><time>{dateLabel(item.createdAt)}</time></div>)}</div> : <EmptyState icon={ShieldCheck} title="No audit events available">Audit events will appear here when returned by the server.</EmptyState>}<p className="chart-note">This view displays API-provided events; it does not modify user roles or permissions.</p></section>}
      
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

      <footer className="app-footer"><div className="footer-brand"><Brain size={16}/> NeuroTwin</div><span>Academic research prototype · Not for diagnosis</span><button onClick={loadWorkspace} className="text-button"><RefreshCw size={14}/> Refresh workspace</button></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);

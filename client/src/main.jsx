import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowUpRight, Brain, CheckCircle2, ClipboardList,
  FileText, LayoutDashboard, LogOut, Menu, RefreshCw, ShieldCheck, Upload,
  Users, X, Waves
} from 'lucide-react';
import './style.css';
import './plots.css';

const api = async (path, opts = {}, token) => {
  const headers = { ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(path, { ...opts, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Request failed. Please try again.');
  return data;
};
const roleLabels = { doctor: 'Clinician', patient: 'Patient', caregiver: 'Caregiver', admin: 'Administrator' };
const dateLabel = value => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';

function Login({ onLogin }) {
  const [email, setEmail] = useState('doctor@neurotwin.demo');
  const [password, setPassword] = useState('DemoPass123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { onLogin(await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <main className="login">
    <section className="brand">
      <div className="logo"><span className="logo-mark"><Brain size={22}/></span> NeuroTwin <span className="brand-tag">RESEARCH PLATFORM</span></div>
      <div className="brand-copy"><p className="eyebrow">EEG-informed research workspace</p><h1>Understand the signal.<br/><i>Keep the context.</i></h1><p>A longitudinal research workspace for EEG review and patient-specific digital-twin exploration.</p></div>
      <div className="boundary"><AlertTriangle size={18}/><span><b>Research use only</b><br/>Not a diagnostic device. Outputs require qualified clinical review.</span></div>
      <div className="brand-footer"><span>NEUROLOGICAL RESEARCH</span><span>01 / PRIVATE WORKSPACE</span></div>
    </section>
    <form className="card login-card" onSubmit={submit}>
      <div className="login-symbol"><ShieldCheck size={22}/></div><p className="eyebrow">SECURE ACCESS</p><h2>Welcome back</h2><p className="muted">Sign in to continue to your workspace.</p>
      <label>Email address<input autoComplete="username" type="email" value={email} onChange={e => setEmail(e.target.value)} required/></label>
      <label>Password<input autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required/></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'} <ArrowUpRight size={17}/></button>
      <div className="demo"><b>DEMO ROLE QUICK SELECT</b>{Object.keys(roleLabels).map(role => <button type="button" key={role} onClick={() => setEmail(`${role}@neurotwin.demo`)}>{roleLabels[role]}</button>)}</div>
      <p className="login-foot"><ShieldCheck size={14}/> Role-based access · Research environment</p>
    </form>
  </main>;
}

function Badge({ children, type = '' }) { return <span className={`badge ${type}`}>{children}</span>; }
function EmptyState({ icon: Icon = Activity, title, children }) { return <div className="empty-state"><span><Icon size={22}/></span><b>{title}</b><p>{children}</p></div>; }
function Plot({ values, kind = 'wave' }) {
  if (!Array.isArray(values) || values.length < 2) return <EmptyState icon={Waves} title="No signal to display">A model-backed analysis will appear here when available.</EmptyState>;
  const score = kind === 'score';
  const points = values.map((item, index) => {
    const raw = score ? Number(item?.score ?? item) : Number(item);
    const safe = Number.isFinite(raw) ? raw : 0;
    const y = score ? 94 - Math.max(0, Math.min(1, safe)) * 78 : 50 - Math.max(-2.5, Math.min(2.5, safe)) * 14;
    return `${index / (values.length - 1) * 100},${y}`;
  }).join(' ');
  return <div className="plot-wrap"><svg className={`plot ${score ? 'score-plot' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={score ? 'Research score timeline' : 'EEG waveform'}><line x1="0" y1="50" x2="100" y2="50" className="plot-axis"/><polyline points={points}/></svg><div className="plot-labels"><span>Earlier</span><span>Recent</span></div></div>;
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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const token = session?.token;
  const user = session?.user;
  const isClinician = ['doctor', 'admin'].includes(user?.role);
  const logout = useCallback(() => { localStorage.removeItem('nt-session'); setSession(null); setDashboard(null); setOverview(null); }, []);

  const loadWorkspace = useCallback(async () => {
    if (!token) return;
    setBusy(true); setError('');
    try {
      const dash = await api('/api/dashboard', {}, token); setDashboard(dash);
      let patientList = dash.patients || [];
      if (isClinician) {
        try { patientList = await api('/api/patients', {}, token); } catch { /* keep dashboard-scoped list */ }
      }
      setPatients(patientList);
      const selectedId = user?.linkedPatient || patientList[0]?._id;
      if (selectedId) {
        try { setOverview(await api(`/api/patients/${selectedId}/overview`, {}, token)); }
        catch (err) { setOverview(null); if (!['patient', 'caregiver'].includes(user?.role)) setError(err.message); }
      } else setOverview(null);
      if (user?.role === 'admin') {
        try { setAudit(await api('/api/admin/audit', {}, token)); } catch { setAudit([]); }
      }
    } catch (err) {
      if (/token|unauthorized|invalid/i.test(err.message)) logout();
      else setError(err.message);
    } finally { setBusy(false); }
  }, [token, user?.role, user?.linkedPatient, isClinician, logout]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);
  if (!session) return <Login onLogin={value => { localStorage.setItem('nt-session', JSON.stringify(value)); setSession(value); }}/>;
  if (!dashboard && busy) return <div className="loading"><span className="loading-mark"><Brain size={25}/></span><b>Preparing your workspace</b><p>Loading authorized research data…</p></div>;

  const patient = overview?.patient;
  const latest = overview?.analyses?.[0];
  const twin = overview?.twin;
  const navigation = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    ...(isClinician ? [{ id: 'patients', label: 'Patients', icon: Users }] : []),
    { id: 'twin', label: 'Digital Twin', icon: Brain },
    { id: 'notes', label: 'Clinical notes', icon: FileText },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Audit & access', icon: ShieldCheck }] : [])
  ];
  const chooseTab = id => { setTab(id); setMobileNav(false); setError(''); setNotice(''); };
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || !patient?._id) return;
    if (!file.name.toLowerCase().endsWith('.edf')) { setError('Please select an EDF EEG file.'); return; }
    setUploading(true); setError(''); setNotice('');
    try {
      await api('/api/eeg/upload', { method: 'POST', body: (() => { const form = new FormData(); form.append('eeg', file); form.append('patientId', patient._id); return form; })() }, token);
      setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token));
      setNotice('EEG upload processed. Review the research output with a qualified clinician.');
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };
  const saveNote = async event => {
    event.preventDefault(); if (!note.trim() || !patient?._id) return;
    setBusy(true); setError(''); setNotice('');
    try { await api(`/api/patients/${patient._id}/notes`, { method: 'POST', body: JSON.stringify({ body: note.trim(), visibility: 'clinical' }) }, token); setNote(''); setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token)); setNotice('Clinical note saved.'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const greeting = user?.role === 'patient' && patient ? patient.fullName?.split(' ')[0] : user?.name?.split(' ').slice(-1)[0];
  return <div className="shell">
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <aside className={mobileNav ? 'sidebar sidebar-open' : 'sidebar'}>
      <div className="logo"><span className="logo-mark"><Brain size={21}/></span><span>NeuroTwin<small>RESEARCH PLATFORM</small></span><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <p className="nav-caption">WORKSPACE</p><nav>{navigation.map(item => { const Icon = item.icon; return <button key={item.id} className={tab === item.id ? 'nav-link active' : 'nav-link'} onClick={() => chooseTab(item.id)}><Icon size={18}/><span>{item.label}</span>{tab === item.id && <span className="nav-indicator"/>}</button> )}</nav>
      <div className="sidebar-bottom"><div className="secure-label"><ShieldCheck size={16}/><span>Protected workspace<small>Role-based access enabled</small></span></div><div className="profile"><div className="avatar">{user?.name?.[0] || 'N'}</div><div className="profile-copy"><b>{user?.name}</b><small>{roleLabels[user?.role] || user?.role}</small></div><button className="icon-button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={17}/></button></div></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div className="topbar-title"><button className="menu-toggle icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21}/></button><div><p className="eyebrow">{roleLabels[user?.role] || user?.role} workspace</p><h1>{tab === 'overview' ? `Welcome back${greeting ? `, ${greeting}` : ''}` : navigation.find(item => item.id === tab)?.label || 'Workspace'}</h1></div></div><div className="topbar-actions"><span className="status-pill"><span/> Workspace active</span><button className="icon-button refresh-button" onClick={loadWorkspace} disabled={busy} aria-label="Refresh data" title="Refresh data"><RefreshCw size={17}/></button><div className="top-avatar">{user?.name?.[0] || 'N'}</div></div></header>
      <div className="safety-banner"><AlertTriangle size={16}/><span><b>Research environment</b> · Model output is not a diagnosis and must be reviewed by a qualified clinician.</span></div>
      {error && <div className="feedback error-feedback" role="alert"><AlertTriangle size={17}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
      {notice && <div className="feedback success-feedback" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={16}/></button></div>}

      {tab === 'overview' && <><section className="hero"><div className="hero-copy"><p className="eyebrow">YOUR RESEARCH OVERVIEW</p><h2>{patient?.fullName || (isClinician ? 'Patient research overview' : 'Your health workspace')}</h2><p>{patient ? 'Review longitudinal context, EEG research outputs, and clinical notes in one place.' : 'Authorized workspace data and research activity will appear here.'}</p><div className="hero-meta"><span><Activity size={15}/> Longitudinal monitoring</span><span><ShieldCheck size={15}/> Access controlled</span></div></div><div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><Brain size={70} strokeWidth={1.1}/><span className="orbit-dot"/></div>{isClinician && patient && <label className={uploading ? 'upload-button is-loading' : 'upload-button'}><Upload size={17}/>{uploading ? 'Processing EEG…' : 'Upload EDF EEG'}<input type="file" accept=".edf,application/octet-stream" onChange={upload} disabled={uploading} hidden/></label>}</section>
      <div className="section-heading"><div><p className="eyebrow">AT A GLANCE</p><h2>Research summary</h2></div><span className="updated-label"><span/> Live workspace data</span></div>
      <section className="stats"><article className="stat-card"><div className="stat-top"><span className="stat-icon"><Users size={18}/></span><span className="stat-kicker">ACCESS</span></div><small>Available patients</small><strong>{dashboard?.counts?.patients ?? patients.length}</strong><span className="stat-foot">Based on authorized workspace data</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon lavender"><Activity size={18}/></span><span className="stat-kicker">ANALYSIS</span></div><small>Recorded analyses</small><strong>{dashboard?.counts?.analyses ?? overview?.analyses?.length ?? 0}</strong><span className="stat-foot">Research records, not diagnoses</span></article><article className="stat-card"><div className="stat-top"><span className="stat-icon amber-icon"><ClipboardList size={18}/></span><span className="stat-kicker">REVIEW</span></div><small>Awaiting clinician review</small><strong>{dashboard?.counts?.pending ?? '—'}</strong><span className="stat-foot">Review status from stored records</span></article></section>
      <section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="panel-icon"><Waves size={18}/></span><div><h3>EEG waveform</h3><p>Latest available signal</p></div></div><Badge type={latest ? 'blue' : 'neutral'}>{latest?.modelState || 'NO MODEL OUTPUT'}</Badge></div><Plot values={latest?.waveform}/><p className="chart-note">Signal visualization is available only when returned by the backend.</p></article><article className="panel"><div className="panel-heading"><div><span className="panel-icon purple"><Activity size={18}/></span><div><h3>Research score timeline</h3><p>Windowed model output</p></div></div><Badge type="amber">RESEARCH</Badge></div><Plot values={latest?.timeline} kind="score"/><p className="chart-note">Scores are experimental and must not be interpreted as clinical conclusions.</p></article></section>
      <section className="panel recent-panel"><div className="panel-heading"><div><span className="panel-icon"><ClipboardList size={18}/></span><div><h3>Latest research record</h3><p>Most recent available analysis</p></div></div><button className="text-button" onClick={() => chooseTab('twin')}>View details <ArrowUpRight size={15}/></button></div>{latest ? <div className="record-row"><div className="record-status"><CheckCircle2 size={18}/></div><div className="record-copy"><b>{latest.label || 'EEG research analysis'}</b><span>{dateLabel(latest.createdAt)}</span></div><Badge type="amber">{latest.clinicianReview || 'Review required'}</Badge></div> : <EmptyState icon={Activity} title="No analysis available yet">Upload an EDF file when the trained research model is configured, or check back when analysis data is available.</EmptyState>}</section></>}

      {tab === 'patients' && <section className="panel page-panel"><div className="section-heading inside"><div><p className="eyebrow">AUTHORIZED RECORDS</p><h2>Patients</h2><p className="muted">Only records available to your account are listed.</p></div><Badge>{patients.length} records</Badge></div>{patients.length ? <div className="patient-list">{patients.map((item,index) => <button className={patient?._id === item._id ? 'patient-row selected' : 'patient-row'} key={item._id} onClick={async () => { setBusy(true); setError(''); try { setOverview(await api(`/api/patients/${item._id}/overview`, {}, token)); setTab('overview'); } catch(err) { setError(err.message); } finally { setBusy(false); } }}><span className="patient-avatar">{item.fullName?.[0] || 'P'}</span><span className="patient-details"><b>{item.fullName || 'Unnamed patient'}</b><small>{item.mrn ? `Record ID · ${item.mrn}` : 'Patient research record'}</small></span><Badge type="blue">{item._id === patient?._id ? 'Selected' : 'Record'}</Badge><ArrowUpRight size={17}/></button> )}</div> : <EmptyState icon={Users} title="No patient records">No patients are currently available for this account.</EmptyState>}</section>}

      {tab === 'twin' && <><section className="hero compact-hero"><div><p className="eyebrow">LONGITUDINAL RESEARCH CONTEXT</p><h2>Digital Twin snapshot</h2><p>A research representation assembled from stored records and model-backed outputs when available.</p></div><span className="hero-icon"><Brain size={34}/></span></section><section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="panel-icon"><Brain size={18}/></span><div><h3>Current research state</h3><p>{patient?.fullName || 'No patient selected'}</p></div></div><Badge type="amber">{twin?.trend || 'NO SNAPSHOT'}</Badge></div><div className="twin-state"><small>Research summary</small><p>{twin?.state?.clinicalAction || 'No model-backed digital-twin snapshot has been recorded.'}</p><div className="twin-facts"><div><small>Last EEG upload</small><b>{twin?.state?.lastUpload || 'Not recorded'}</b></div><div><small>Model state</small><b>{twin?.state?.modelState || latest?.modelState || 'Not available'}</b></div></div></div></article><article className="panel"><div className="panel-heading"><div><span className="panel-icon purple"><Activity size={18}/></span><div><h3>EEG signal</h3><p>Most recent recorded waveform</p></div></div></div><Plot values={latest?.waveform}/></article></section><section className="panel"><div className="panel-heading"><div><h3>Analysis history</h3><p>Stored research analyses for the selected record</p></div><Badge>{overview?.analyses?.length || 0} entries</Badge></div>{overview?.analyses?.length ? overview.analyses.map(item => <div className="record-row" key={item._id}><div className="record-status"><Activity size={17}/></div><div className="record-copy"><b>{item.label || 'EEG research analysis'}</b><span>{dateLabel(item.createdAt)} · {item.modelState || 'Model state unavailable'}</span></div><Badge type="amber">{item.clinicianReview || 'Review required'}</Badge></div>) : <EmptyState icon={ClipboardList} title="No analysis history">Recorded analysis entries will appear here after a successful backend inference.</EmptyState>}</section></>}

      {tab === 'notes' && <section className="panel page-panel"><div className="section-heading inside"><div><p className="eyebrow">LONGITUDINAL RECORD</p><h2>Clinical notes</h2><p className="muted">Notes shown here follow the visibility rules enforced by the API.</p></div><Badge>{overview?.notes?.length || 0} notes</Badge></div>{isClinician && patient && <form className="note-form" onSubmit={saveNote}><label htmlFor="clinical-note">Add a clinical note</label><textarea id="clinical-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Record relevant clinical context for authorized review…" rows={4} required/><div className="form-bottom"><span>Saved to the selected patient record.</span><button className="primary-button" disabled={busy || !note.trim()}>{busy ? 'Saving…' : 'Save note'} <ArrowUpRight size={16}/></button></div></form>}{overview?.notes?.length ? <div className="notes-list">{overview.notes.map(item => <article className="note-card" key={item._id}><div className="note-card-top"><span className="panel-icon"><FileText size={17}/></span><span>{dateLabel(item.createdAt)}</span><Badge>{item.visibility || 'clinical'}</Badge></div><p>{item.body}</p><small>Author: {item.author?.name || 'Authorized workspace user'}</small></article>)}</div> : <EmptyState icon={FileText} title="No notes recorded">No notes are available for the selected patient and your access level.</EmptyState>}</section>}

      {tab === 'admin' && user?.role === 'admin' && <section className="panel page-panel"><div className="section-heading inside"><div><p className="eyebrow">GOVERNANCE</p><h2>Audit & access</h2><p className="muted">Recent audit events returned by the administration API.</p></div><Badge>{audit.length} events</Badge></div>{audit.length ? <div className="audit-list">{audit.map(item => <div className="audit-row" key={item._id}><span className="audit-icon"><ShieldCheck size={17}/></span><div><b>{item.action || 'Workspace event'}</b><small>{item.actor?.name || 'System'} · {item.actor?.role || 'unknown role'}</small></div><time>{dateLabel(item.createdAt)}</time></div>)}</div> : <EmptyState icon={ShieldCheck} title="No audit events available">Audit events will appear here when returned by the server.</EmptyState>}<p className="chart-note">This view displays API-provided events; it does not modify user roles or permissions.</p></section>}
      <footer className="app-footer"><div className="footer-brand"><Brain size={16}/> NeuroTwin</div><span>Academic research prototype · Not for diagnosis</span><button onClick={loadWorkspace} className="text-button"><RefreshCw size={14}/> Refresh workspace</button></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);

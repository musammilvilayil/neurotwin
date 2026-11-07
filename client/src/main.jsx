import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowUpRight, Brain, CheckCircle2, ClipboardList,
  FileText, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, ShieldCheck, Upload,
  Users, UserPlus, X, Waves, Download, Search, Filter, Eye, Check, Layers, FileDown,
  Calendar, Clock, Heart, Pill, Stethoscope, Sparkles, Printer, Sunrise, Sun, Moon,
  Trash2, SlidersHorizontal, Award, BarChart3
} from 'lucide-react';

import './design-system.css';
import './style.css';
import './plots.css';
import './clinical-refinement.css';
import './reactbits-experience.css';
import './reactbits-theme.css';

import HMSWorkspace from './HMSWorkspace.jsx';
import ReactBitsLayer from './components/reactbits/ReactBitsLayer.jsx';

import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import PublicLanding from './components/PublicLanding.jsx';
import DashboardOverview from './components/DashboardOverview.jsx';
import PatientsView from './components/PatientsView.jsx';
import AnalysesView from './components/AnalysesView.jsx';
import DigitalTwinView from './components/DigitalTwinView.jsx';
import ClinicalNotesView from './components/ClinicalNotesView.jsx';
import PatientWellnessPortal from './components/PatientWellnessPortal.jsx';
import ReportsView from './components/ReportsView.jsx';
import ModelPerformanceView from './components/ModelPerformanceView.jsx';
import AdminGovernanceView from './components/AdminGovernanceView.jsx';
import MultichannelEEGViewer from './components/MultichannelEEGViewer.jsx';

const api = async (path, opts = {}, token) => {
  const headers = {
    ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const response = await fetch(path, { ...opts, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Request failed. Please try again.');
  return data;
};

const roleLabels = {
  doctor: 'Clinician',
  patient: 'Patient',
  caregiver: 'Caregiver',
  admin: 'Administrator'
};

function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nt-session') || 'null');
    } catch {
      return null;
    }
  });

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [analysesList, setAnalysesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedAnalysis, setInspectedAnalysis] = useState(null);
  const [downloadingReportId, setDownloadingReportId] = useState(null);
  const [usersList, setUsersList] = useState([]);

  const fileUploadRef = useRef(null);

  const token = session?.token;
  const user = session?.user;
  const isClinician = ['doctor', 'admin'].includes(user?.role);
  const isResearchWorkspace = ['doctor', 'admin', 'patient', 'caregiver'].includes(user?.role);

  const logout = useCallback(() => {
    localStorage.removeItem('nt-session');
    setSession(null);
    setDashboard(null);
    setOverview(null);
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const modelStatusRequest = isClinician
        ? api('/api/model/state', {}, token).catch(err => ({ model_state: 'unavailable', error: err.message }))
        : Promise.resolve(null);

      const [dash, nextModelStatus] = await Promise.all([
        api('/api/dashboard', {}, token),
        modelStatusRequest
      ]);

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
      } else {
        setOverview(null);
      }

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
    } finally {
      setBusy(false);
    }
  }, [token, user?.role, user?.linkedPatient, isClinician, logout]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const loadAnalyses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api('/api/analyses?limit=100', {}, token);
      setAnalysesList(res.analyses || []);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadAnalyses();
    }
  }, [token, loadAnalyses, tab]);

  const chooseTab = (id) => {
    setTab(id);
    setMobileNav(false);
    setError('');
    setNotice('');
  };

  const selectPatientById = async (patientId) => {
    if (!patientId) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setOverview(await api(`/api/patients/${patientId}/overview`, {}, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadDirectFile = async (file) => {
    const patient = overview?.patient;
    if (!file || !patient?._id) return;
    if (!file.name.toLowerCase().endsWith('.edf')) {
      setError('Please select an EDF EEG file.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('The EDF file exceeds the 100 MB upload limit.');
      return;
    }
    if (modelStatus?.model_state !== 'ready') {
      setError('EDF upload is unavailable because the EEG model service is not ready.');
      return;
    }

    setUploading(true);
    setError('');
    setNotice('');
    setUploadingFile(file.name);

    try {
      const form = new FormData();
      form.append('eeg', file);
      form.append('patientId', patient._id);

      await api('/api/eeg/upload', { method: 'POST', body: form }, token);
      const refreshedOverview = await api(`/api/patients/${patient._id}/overview`, {}, token);
      setOverview(refreshedOverview);
      setDashboard(await api('/api/dashboard', {}, token));
      loadAnalyses();
      setNotice(`EEG upload processed for ${patient.fullName}. Model temporal verification complete.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadingFile('');
    }
  };

  const handleHiddenFileInput = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      await uploadDirectFile(file);
    }
  };

  const simulateEEG = async (mode = 'normal') => {
    const patient = overview?.patient;
    if (!patient?._id) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      await api('/api/eeg/simulate', {
        method: 'POST',
        body: JSON.stringify({ patientId: patient._id, mode })
      }, token);
      setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token));
      setDashboard(await api('/api/dashboard', {}, token));
      loadAnalyses();
      setNotice(`Simulated ${mode === 'seizure' ? 'seizure burst' : 'normal baseline'} EEG processed. Digital Twin updated.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const inspectAnalysis = async (item) => {
    try {
      setBusy(true);
      const detail = await api(`/api/analyses/${item._id}`, {}, token);
      setInspectedAnalysis(detail);
    } catch {
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
      if (overview?.patient?._id) {
        setOverview(await api(`/api/patients/${overview.patient._id}/overview`, {}, token));
      }
      setNotice(`Analysis review state updated to ${nextStatus}.`);
    } catch (err) {
      setError(err.message);
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

  const saveTreatment = async (payload) => {
    const patient = overview?.patient;
    if (!patient?._id) return;
    setBusy(true);
    setError('');
    setNotice('');
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
    const patient = overview?.patient;
    if (!patient?._id) return;
    try {
      setBusy(true);
      await api(`/api/patients/${patient._id}/prescriptions/${rxId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      }, token);
      setNotice(`Prescription marked as ${newStatus}.`);
      setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async ({ body, visibility }) => {
    const patient = overview?.patient;
    if (!body.trim() || !patient?._id) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/api/patients/${patient._id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim(), visibility })
      }, token);
      setOverview(await api(`/api/patients/${patient._id}/overview`, {}, token));
      setNotice(`Clinical note saved (${visibility === 'patient' ? 'shared with patient' : 'clinical only'}).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const registerPatientFromData = async (data) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const created = await api('/api/patients', {
        method: 'POST',
        body: JSON.stringify({
          fullName: data.fullName,
          mrn: data.mrn || undefined,
          dob: data.dob || undefined,
          conditions: data.conditions?.length ? data.conditions : undefined,
          consented: true
        })
      }, token);
      const updatedList = await api('/api/patients', {}, token);
      setPatients(updatedList);
      setOverview(await api(`/api/patients/${created._id}/overview`, {}, token));
      setDashboard(await api('/api/dashboard', {}, token));
      setNotice(`Patient record created for ${created.fullName}.`);
      return created;
    } catch (err) {
      setError(err.message);
      throw err;
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
      if (overview?.patient?._id === patientId) {
        setOverview(await api(`/api/patients/${patientId}/overview`, {}, token));
      }
      setNotice('Patient consent and privacy flow updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // 1. Unauthenticated Visitor -> Public Cyber-Clinical Landing Page
  if (!session) {
    return (
      <PublicLanding
        onLogin={(auth) => {
          localStorage.setItem('nt-session', JSON.stringify(auth));
          setSession(auth);
        }}
        api={api}
      />
    );
  }

  // 2. Loading Workspace Screen
  if (!dashboard && busy) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--nt-bg-base)',
        color: 'var(--nt-text-primary)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(54, 184, 245, 0.15)',
          color: 'var(--nt-cyan)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: '16px'
        }}>
          <Brain size={30} style={{ animation: 'spin 3s linear infinite' }} />
        </div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>
          Preparing Research Workspace
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--nt-text-muted)' }}>
          Loading authorized telemetry and clinical models…
        </p>
      </div>
    );
  }

  const patient = overview?.patient;
  const isPatientOrCaregiver = user?.role === 'patient' || user?.role === 'caregiver';

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--nt-bg-base)' }}>
      {/* Hidden file input for EDF upload */}
      <input
        type="file"
        ref={fileUploadRef}
        accept=".edf,application/octet-stream"
        onChange={handleHiddenFileInput}
        style={{ display: 'none' }}
      />

      {/* Modern Collapsible Sidebar */}
      <Sidebar
        activeTab={tab}
        onSelectTab={chooseTab}
        user={user}
        onLogout={logout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
      />

      {/* Main Content Area */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflowX: 'hidden'
      }}>
        {/* Sticky Translucent Topbar */}
        <Topbar
          activeTab={tab}
          user={user}
          onOpenMobileNav={() => setMobileNav(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSwitchDemoRole={switchDemoRole}
          onRefresh={loadWorkspace}
          isBusy={busy}
          modelStatus={modelStatus}
        />

        {/* Global Notices & Alerts */}
        <div style={{ padding: '0 clamp(16px, 4vw, 36px)', marginTop: '16px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderRadius: '8px',
              background: 'rgba(241, 107, 120, 0.15)',
              border: '1px solid rgba(241, 107, 120, 0.3)',
              color: '#F16B78',
              fontSize: '13px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={16} /> {error}
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#F16B78', cursor: 'pointer' }}
                onClick={() => setError('')}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {notice && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderRadius: '8px',
              background: 'rgba(53, 201, 139, 0.15)',
              border: '1px solid rgba(53, 201, 139, 0.3)',
              color: '#35C98B',
              fontSize: '13px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} /> {notice}
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#35C98B', cursor: 'pointer' }}
                onClick={() => setNotice('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Active Route Content */}
        <main style={{
          flex: '1',
          padding: '16px clamp(16px, 4vw, 36px) 48px clamp(16px, 4vw, 36px)',
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}>
          {tab === 'overview' && (
            isPatientOrCaregiver ? (
              <PatientWellnessPortal
                patient={patient}
                overview={overview}
                user={user}
              />
            ) : (
              <DashboardOverview
                user={user}
                patient={patient}
                dashboard={dashboard}
                overview={overview}
                modelStatus={modelStatus}
                onOpenUpload={() => fileUploadRef.current?.click()}
                onSimulate={simulateEEG}
                onOpenNewPatient={() => setTab('patients')}
                onInspectAnalysis={inspectAnalysis}
                onDownloadReport={downloadReport}
                onSelectTab={chooseTab}
                uploading={uploading}
              />
            )
          )}

          {tab === 'patients' && (
            <PatientsView
              patients={patients}
              activePatient={patient}
              onSelectPatient={selectPatientById}
              onToggleConsent={handleToggleConsent}
              onRegisterPatient={registerPatientFromData}
              busy={busy}
              user={user}
            />
          )}

          {tab === 'analyses' && (
            <AnalysesView
              analyses={analysesList}
              activePatient={patient}
              onUploadFile={uploadDirectFile}
              onSimulateEEG={simulateEEG}
              onInspectAnalysis={inspectAnalysis}
              onDownloadReport={downloadReport}
              onToggleReviewStatus={toggleReviewStatus}
              inspectedAnalysis={inspectedAnalysis}
              onCloseInspection={() => setInspectedAnalysis(null)}
              uploading={uploading}
              uploadingFile={uploadingFile}
              downloadingReportId={downloadingReportId}
              modelStatus={modelStatus}
              user={user}
            />
          )}

          {tab === 'twin' && (
            <DigitalTwinView
              patient={patient}
              overview={overview}
              latestAnalysis={overview?.analyses?.[0]}
              patients={patients}
              onSelectPatient={selectPatientById}
              isBusy={busy}
            />
          )}

          {tab === 'notes' && (
            <ClinicalNotesView
              activePatient={patient}
              overview={overview}
              onSaveTreatment={saveTreatment}
              onSaveNote={saveNote}
              onToggleRxStatus={toggleRxStatus}
              busy={busy}
              user={user}
            />
          )}

          {tab === 'reports' && (
            <ReportsView
              analyses={analysesList}
              patients={patients}
              onDownloadReport={downloadReport}
              downloadingId={downloadingReportId}
            />
          )}

          {tab === 'model' && (
            <ModelPerformanceView
              modelStatus={modelStatus}
            />
          )}

          {tab === 'admin' && (
            <AdminGovernanceView
              usersList={usersList}
              patients={patients}
              audit={audit}
              onRoleChange={handleRoleChange}
              onToggleUserStatus={handleToggleUserStatus}
              onToggleConsent={handleToggleConsent}
              busy={busy}
              user={user}
            />
          )}

          {tab === 'hms' && (
            <HMSWorkspace
              token={token}
              user={user}
              patients={patients}
            />
          )}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <>
    <ReactBitsLayer />
    <App />
  </>
);

import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/premium-story.css';

import { api } from './lib/api.js';
import { ToastProvider, useToast } from './components/ui.jsx';
import { Sidebar, Topbar, navFor } from './components/Shell.jsx';
import { AnalysisModal } from './components/AnalysisModal.jsx';
import SpotlightLayer from './components/SpotlightLayer.jsx';

import PublicSite from './views/Public.jsx';
import { Overview } from './views/Overview.jsx';
import { Analyses } from './views/Analyses.jsx';
import { Patients } from './views/Patients.jsx';
import { DigitalTwin } from './views/DigitalTwin.jsx';
import { CarePlan } from './views/CarePlan.jsx';
import { Reports } from './views/Reports.jsx';
import { ModelPerformance } from './views/ModelPerformance.jsx';
import { Admin } from './views/Admin.jsx';
import { SettingsView } from './views/Settings.jsx';
import HMSWorkspace from './HMSWorkspace.jsx';

function NeuroTwinApp() {
  const toast = useToast();

  // Auth & navigation state
  const [token, setToken] = useState(() => localStorage.getItem('neurotwin_token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('neurotwin_user') || 'null');
    } catch {
      return null;
    }
  });
  const [tab, setTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth login state
  const [switchingRole, setSwitchingRole] = useState('');

  // Workspace data state
  const [health, setHealth] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [overview, setOverview] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [audit, setAudit] = useState([]);
  const [users, setUsers] = useState([]);

  // UI interaction state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState('');
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [enrollOpen, setEnrollOpen] = useState(false);

  // Fetch public health & ML model status
  const loadSystemTelemetry = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([
        api('/api/health').catch(() => null),
        api('/api/model/state').catch(() => null),
      ]);
      if (h) setHealth(h);
      if (m) setModelStatus(m);
    } catch {
      // ignore background telemetry errors
    }
  }, []);

  useEffect(() => {
    loadSystemTelemetry();
  }, [loadSystemTelemetry]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('neurotwin_token');
    localStorage.removeItem('neurotwin_user');
    setToken('');
    setUser(null);
    setDashboard(null);
    setPatients([]);
    setOverview(null);
    setAnalyses([]);
    setAudit([]);
    setUsers([]);
  }, []);

  // Load workspace data when authenticated
  const loadWorkspace = useCallback(
    async (preferredPatientId) => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const isClinician = ['admin', 'doctor'].includes(user?.role);
        const [dash, ptsRes, analysesRes] = await Promise.all([
          api('/api/dashboard', { token }),
          isClinician ? api('/api/patients', { token }).catch(() => null) : Promise.resolve(null),
          api('/api/analyses?limit=100', { token }).catch(() => null),
        ]);

        const pts = Array.isArray(ptsRes)
          ? ptsRes
          : Array.isArray(dash?.patients)
            ? dash.patients
            : [];

        const allAnalyses = Array.isArray(analysesRes)
          ? analysesRes
          : Array.isArray(analysesRes?.analyses)
            ? analysesRes.analyses
            : Array.isArray(dash?.recent)
              ? dash.recent
              : [];

        setDashboard(dash);
        setPatients(pts);
        setAnalyses(allAnalyses);

        const targetPatientId =
          preferredPatientId ||
          (pts.some((p) => p._id === selectedPatientId) ? selectedPatientId : pts[0]?._id || '');

        setSelectedPatientId(targetPatientId);

        if (targetPatientId) {
          const ov = await api(`/api/patients/${targetPatientId}/overview`, { token }).catch(() => null);
          setOverview(ov);
        } else {
          setOverview(null);
        }

        if (user?.role === 'admin') {
          const [auditData, usersData] = await Promise.all([
            api('/api/admin/audit', { token }).catch(() => []),
            api('/api/admin/users', { token }).catch(() => []),
          ]);
          setAudit(Array.isArray(auditData) ? auditData : []);
          setUsers(Array.isArray(usersData) ? usersData : []);
        }
      } catch (err) {
        if (err.status === 401) {
          handleLogout();
          return;
        }
        setError(err.message || 'Unable to load workspace data.');
      } finally {
        setLoading(false);
      }
    },
    [token, selectedPatientId, user?.role, handleLogout],
  );

  useEffect(() => {
    if (token && user) {
      loadWorkspace();
    }
  }, [token, user?.id]);

  // Reload overview when selectedPatientId changes
  useEffect(() => {
    if (!token || !selectedPatientId) return;
    api(`/api/patients/${selectedPatientId}/overview`, { token })
      .then((ov) => setOverview(ov))
      .catch(() => {});
  }, [token, selectedPatientId]);

  // Ensure active tab is permitted for current role
  useEffect(() => {
    if (!user) return;
    const allowed = navFor(user.role);
    if (!allowed.some((item) => item.id === tab)) {
      setTab(allowed[0]?.id || 'overview');
    }
  }, [user, tab]);

  // Login callback from PublicSite
  const handleAuthenticated = (data) => {
    localStorage.setItem('neurotwin_token', data.token);
    localStorage.setItem('neurotwin_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setTab('overview');
    toast.success(`Signed in as ${data.user.name} (${data.user.role})`);
  };

  // Quick demo role switch
  const handleSwitchRole = async (roleOption) => {
    setSwitchingRole(roleOption.key);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { identifier: roleOption.identifier, password: roleOption.password },
      });
      localStorage.setItem('neurotwin_token', data.token);
      localStorage.setItem('neurotwin_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      toast.info(`Switched workspace persona to ${data.user.name} (${data.user.role})`);
    } catch (err) {
      toast.error(err.message || 'Unable to switch role.');
    } finally {
      setSwitchingRole('');
    }
  };

  // Trigger normal or seizure EEG simulation
  const handleSimulate = async (mode) => {
    if (!selectedPatientId) {
      toast.error('Please select or enroll a subject first.');
      return;
    }
    setSimulating(mode);
    try {
      const created = await api('/api/eeg/simulate', {
        method: 'POST',
        token,
        body: { patientId: selectedPatientId, mode },
      });
      const doc = created?.analysis
        ? { ...created.analysis, session: created.session || created.analysis.session }
        : created;
      toast.success(
        mode === 'seizure'
          ? 'Simulated 18-lead seizure-pattern EEG and completed model inference.'
          : 'Simulated 18-lead normal baseline EEG and completed model inference.',
      );
      await loadWorkspace(selectedPatientId);
      setActiveAnalysis(doc);
    } catch (err) {
      toast.error(err.message || 'Simulation failed.');
    } finally {
      setSimulating('');
    }
  };

  // Download PDF report for an analysis
  const handleDownloadReport = async (analysisId) => {
    try {
      const blob = await api(`/api/analyses/${analysisId}/report`, { token, responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neurotwin-report-${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded clinical PDF report.');
    } catch (err) {
      toast.error(err.message || 'Failed to download PDF report.');
    }
  };

  // Toggle clinician review status on an analysis
  const handleToggleReview = async (analysisId, status) => {
    try {
      const updated = await api(`/api/analyses/${analysisId}/review`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      setAnalyses((prev) => prev.map((a) => (a._id === analysisId ? { ...a, ...updated } : a)));
      if (activeAnalysis?._id === analysisId) {
        setActiveAnalysis((prev) => (prev ? { ...prev, ...updated } : prev));
      }
      toast.success(`Analysis marked as ${status}.`);
      loadWorkspace(selectedPatientId);
    } catch (err) {
      toast.error(err.message || 'Failed to update review status.');
    }
  };

  // Create new subject
  const handleCreatePatient = async (payload) => {
    try {
      const created = await api('/api/patients', {
        method: 'POST',
        token,
        body: payload,
      });
      toast.success(`Enrolled subject ${created.fullName} (${created.mrn}).`);
      await loadWorkspace(created._id);
    } catch (err) {
      toast.error(err.message || 'Failed to enroll subject.');
      throw err;
    }
  };

  // Toggle subject consent
  const handleToggleConsent = async (patientId, consented) => {
    try {
      await api(`/api/patients/${patientId}/consent`, {
        method: 'PATCH',
        token,
        body: { consented },
      });
      toast.success(`Updated subject research consent (${consented ? 'Consented' : 'Withdrawn'}).`);
      await loadWorkspace(selectedPatientId);
    } catch (err) {
      toast.error(err.message || 'Failed to update consent.');
    }
  };

  // Save treatment plan, multi-medicine prescriptions, and appointments
  const handleSaveTreatment = async (patientId, payload) => {
    try {
      await api(`/api/patients/${patientId}/treatment`, {
        method: 'POST',
        token,
        body: payload,
      });
      const rxCount = payload.newPrescriptions?.length || 0;
      toast.success(
        rxCount
          ? `Saved care plan and prescribed ${rxCount} medication(s).`
          : 'Updated longitudinal care plan.',
      );
      await loadWorkspace(patientId);
    } catch (err) {
      toast.error(err.message || 'Failed to save treatment plan.');
      throw err;
    }
  };

  // Update prescription status
  const handleUpdateRxStatus = async (patientId, rxId, status) => {
    try {
      await api(`/api/patients/${patientId}/prescriptions/${rxId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      toast.info(`Medication marked ${status}.`);
      await loadWorkspace(patientId);
    } catch (err) {
      toast.error(err.message || 'Failed to update prescription.');
    }
  };

  // Update appointment status
  const handleUpdateApptStatus = async (patientId, appId, status) => {
    try {
      await api(`/api/patients/${patientId}/appointments/${appId}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      toast.info(`Appointment marked ${status}.`);
      await loadWorkspace(patientId);
    } catch (err) {
      toast.error(err.message || 'Failed to update appointment.');
    }
  };

  // Create clinical note
  const handleCreateNote = async (patientId, payload) => {
    try {
      await api(`/api/patients/${patientId}/notes`, {
        method: 'POST',
        token,
        body: payload,
      });
      toast.success('Clinical note posted.');
      await loadWorkspace(patientId);
    } catch (err) {
      toast.error(err.message || 'Failed to post note.');
      throw err;
    }
  };

  // Admin: update user role
  const handleUpdateUserRole = async (userId, role) => {
    try {
      await api(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        token,
        body: { role },
      });
      toast.success(`Updated user role to ${role}.`);
      await loadWorkspace(selectedPatientId);
    } catch (err) {
      toast.error(err.message || 'Failed to update role.');
    }
  };

  // Admin: update user active status
  const handleUpdateUserStatus = async (userId, active) => {
    try {
      await api(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        token,
        body: { active },
      });
      toast.success(`Account ${active ? 'activated' : 'suspended'}.`);
      await loadWorkspace(selectedPatientId);
    } catch (err) {
      toast.error(err.message || 'Failed to update account status.');
    }
  };

  // Unauthenticated public website & login view
  if (!token || !user) {
    return <PublicSite onLogin={handleAuthenticated} />;
  }

  return (
    <div className={`app ${collapsed ? 'is-collapsed' : ''}`}>
      <Sidebar
        role={user.role}
        user={user}
        tab={tab}
        onSelect={setTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      <div className="main-wrap">
        <Topbar
          tab={tab}
          user={user}
          modelStatus={modelStatus}
          patients={patients}
          analyses={analyses}
          onNavigate={setTab}
          onSelectPatient={setSelectedPatientId}
          onSelectAnalysis={(a) => setActiveAnalysis(a)}
          onRefresh={() => {
            loadSystemTelemetry();
            loadWorkspace(selectedPatientId);
            toast.info('Workspace data refreshed.');
          }}
          onOpenMobile={() => setMobileOpen(true)}
          onSwitchRole={handleSwitchRole}
          switchingRole={switchingRole}
          onLogout={handleLogout}
        />

        <main className="content">
          {tab === 'overview' && (
            <Overview
              user={user}
              dashboard={dashboard}
              analyses={analyses}
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              overview={overview}
              modelStatus={modelStatus}
              loading={loading}
              error={error}
              onRetry={() => loadWorkspace(selectedPatientId)}
              onNavigate={setTab}
              onSimulate={handleSimulate}
              simulating={simulating}
              onViewAnalysis={(a) => setActiveAnalysis(a)}
              onDownloadReport={handleDownloadReport}
              onOpenEnroll={() => {
                setTab('patients');
                setEnrollOpen(true);
              }}
            />
          )}

          {tab === 'patients' && (
            <Patients
              user={user}
              patients={patients}
              analyses={analyses}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              onCreatePatient={handleCreatePatient}
              onToggleConsent={handleToggleConsent}
              onNavigate={setTab}
              enrollOpen={enrollOpen}
              setEnrollOpen={setEnrollOpen}
            />
          )}

          {(tab === 'analyses' || tab === 'detection') && (
            <Analyses
              mode={tab}
              user={user}
              analyses={analyses}
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              onUploaded={async (created) => {
                const doc = created?.analysis
                  ? { ...created.analysis, session: created.session || created.analysis.session }
                  : created;
                toast.success('EDF recording uploaded and evaluated by the 1D-CNN model.');
                await loadWorkspace(selectedPatientId);
                setActiveAnalysis(doc);
              }}
              onSimulate={handleSimulate}
              simulating={simulating}
              onViewAnalysis={(a) => setActiveAnalysis(a)}
              onDownloadReport={handleDownloadReport}
              onToggleReview={handleToggleReview}
            />
          )}

          {tab === 'twin' && (
            <DigitalTwin
              user={user}
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              overview={overview}
              analyses={analyses}
              onNavigate={setTab}
              onSimulate={handleSimulate}
              simulating={simulating}
              onViewAnalysis={(a) => setActiveAnalysis(a)}
              onDownloadReport={handleDownloadReport}
            />
          )}

          {tab === 'notes' && (
            <CarePlan
              user={user}
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              overview={overview}
              onSaveTreatment={handleSaveTreatment}
              onUpdateRxStatus={handleUpdateRxStatus}
              onUpdateApptStatus={handleUpdateApptStatus}
              onCreateNote={handleCreateNote}
            />
          )}

          {tab === 'reports' && (
            <Reports
              analyses={analyses}
              patients={patients}
              onViewAnalysis={(a) => setActiveAnalysis(a)}
              onDownloadReport={handleDownloadReport}
            />
          )}

          {tab === 'performance' && <ModelPerformance modelStatus={modelStatus} />}

          {tab === 'hms' && <HMSWorkspace token={token} user={user} />}

          {tab === 'admin' && (
            <Admin
              users={users}
              audit={audit}
              patients={patients}
              onUpdateUserRole={handleUpdateUserRole}
              onUpdateUserStatus={handleUpdateUserStatus}
              onToggleConsent={handleToggleConsent}
            />
          )}

          {tab === 'settings' && (
            <SettingsView
              user={user}
              modelStatus={modelStatus}
              health={health}
              onSwitchRole={handleSwitchRole}
              switchingRole={switchingRole}
              onRefresh={() => {
                loadSystemTelemetry();
                loadWorkspace(selectedPatientId);
                toast.info('Refreshed telemetry.');
              }}
              onLogout={handleLogout}
            />
          )}
        </main>

        <footer className="app-footer">
          <span>
            <strong>NeuroTwin Research Platform</strong> · CHB-MIT 1D-CNN (v{modelStatus?.model_metadata?.model_version || '1.0.0'})
          </span>
          <span>
            Research & educational decision-support prototype · Not a cleared medical diagnostic device
          </span>
        </footer>
      </div>

      <AnalysisModal
        analysis={activeAnalysis}
        patients={patients}
        role={user.role}
        onClose={() => setActiveAnalysis(null)}
        onDownload={handleDownloadReport}
        onToggleReview={handleToggleReview}
      />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <SpotlightLayer />
      <NeuroTwinApp />
    </ToastProvider>
  </React.StrictMode>,
);

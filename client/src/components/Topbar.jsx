import React from 'react';
import { Menu, Search, RefreshCw, CheckCircle2, Shield, Activity, User } from 'lucide-react';

const roleLabels = {
  doctor: 'Clinician',
  patient: 'Patient',
  caregiver: 'Caregiver',
  admin: 'Administrator'
};

const tabTitles = {
  overview: 'Overview Dashboard',
  patients: 'Subject & Caseload Management',
  analyses: 'EEG Analyses & Seizure Detection',
  twin: 'Patient-Specific Digital Twin',
  reports: 'Clinical Reports & Cohort Analytics',
  model: 'Model Performance & Architecture',
  notes: 'Treatment Plan & Prescriptions',
  admin: 'Platform Governance & Audit',
  hms: 'Hospital Operations'
};

export default function Topbar({
  activeTab,
  user,
  onOpenMobileNav,
  searchQuery,
  onSearchChange,
  onSwitchDemoRole,
  onRefresh,
  isBusy,
  modelStatus
}) {
  const role = user?.role || 'doctor';
  const roleTitle = roleLabels[role] || role;
  const currentTitle = tabTitles[activeTab] || 'Workspace';
  const isModelReady = modelStatus?.model_state === 'ready';

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobileNav}
          aria-label="Open mobile navigation"
        >
          <Menu size={18} />
        </button>

        <div className="breadcrumbs">
          <span className="breadcrumb-root">NeuroTwin</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-root">{roleTitle}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentTitle}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Global Search Box */}
        <div className="topbar-search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search subject, MRN, EDF…"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        {/* 1-Click Role Switcher */}
        <div className="role-switcher-capsule" title="1-Click Role Switcher for Testing">
          <span style={{ fontSize: '10px', color: 'var(--nt-text-muted)', paddingLeft: '6px', fontWeight: 600 }}>Demo:</span>
          {Object.entries(roleLabels).map(([rKey, rLabel]) => (
            <button
              key={rKey}
              type="button"
              className={`role-switch-btn ${role === rKey ? 'active' : ''}`}
              onClick={() => onSwitchDemoRole(rKey)}
              disabled={isBusy || role === rKey}
            >
              {rLabel}
            </button>
          ))}
        </div>

        {/* Connection Status Indicator */}
        <div className="connection-status-pill" title={isModelReady ? "EEG Inference Model Ready" : "EEG Service Checking"}>
          <div className="status-dot-pulse" style={{ background: isModelReady ? 'var(--nt-success)' : 'var(--nt-warning)' }} />
          <span>{isModelReady ? 'Model Ready' : 'Service Active'}</span>
        </div>

        {/* Refresh Action */}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onRefresh}
          disabled={isBusy}
          title="Refresh workspace data"
          aria-label="Refresh workspace data"
        >
          <RefreshCw size={13} className={isBusy ? 'spin-icon' : ''} />
        </button>

        {/* User Badge */}
        <div className="profile-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
          {user?.name?.[0] || 'U'}
        </div>
      </div>
    </header>
  );
}


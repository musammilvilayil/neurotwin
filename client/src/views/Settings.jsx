import React from 'react';
import {
  CheckCircle2, Cpu, Database, LogOut, RefreshCw, ShieldCheck, User,
} from 'lucide-react';
import {
  Badge, Card, CardHead, PageHeader, ResearchNotice,
} from '../components/ui.jsx';
import { DEMO_ROLES } from './Public.jsx';
import { initials, percent } from '../lib/api.js';

const ROLE_CAPABILITIES = {
  doctor: [
    'Upload 18-lead European Data Format (.edf) EEG recordings up to 100 MB',
    'Trigger normal and seizure-pattern multi-channel simulations',
    'Inspect 18-channel bipolar waveforms and tune sensitivity thresholds',
    'Enroll research subjects and manage informed consent status',
    'Prescribe multi-medicine anticonvulsant regimens and schedule follow-up visits',
    'Sign off on pending EEG analyses and export formal PDF reports',
  ],
  patient: [
    'Review personal Wellness & Continuity summary and active care plan',
    'Inspect personal EEG recordings, probability timelines, and downloadable PDF reports',
    'Track active anti-epileptic medication schedules and upcoming neurology appointments',
    'Read shared clinical notes from the attending neurology team',
  ],
  caregiver: [
    'Monitor linked subject wellness status, medication schedules, and instructions',
    'Review shared EEG session reports and follow-up appointment dates',
    'Access shared clinical guidance and nocturnal seizure precautions',
  ],
  admin: [
    'Full access to EEG analysis, Digital Twin, and subject cohort workflows',
    'Manage user directory roles (doctor, patient, caregiver, admin) and account status',
    'Audit subject research consent ledger and immutable security event logs',
  ],
};

export function SettingsView({
  user,
  modelStatus,
  health,
  onSwitchRole,
  switchingRole,
  onRefresh,
  onLogout,
}) {
  const modelReady = modelStatus?.model_state === 'ready';
  const meta = modelStatus?.model_metadata || {};
  const capabilities = ROLE_CAPABILITIES[user?.role] || ROLE_CAPABILITIES.doctor;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Workspace & Environment Configuration"
        title="Settings & Service Diagnostics"
        subtitle="Inspect current session identity, role-scoped permissions, backend API health, and FastAPI PyTorch inference status."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={onRefresh}>
              <RefreshCw size={15} /> Refresh telemetry
            </button>
            <button type="button" className="btn btn-danger" onClick={onLogout}>
              <LogOut size={15} /> Sign out
            </button>
          </>
        }
      />

      <ResearchNotice compact />

      <div className="grid grid-2">
        <Card>
          <CardHead
            title="Authenticated Session Profile"
            subtitle="Active workspace credentials and role-based access scope"
            right={<Badge tone="info" dot>{user?.role || 'user'}</Badge>}
          />
          <div className="row" style={{ gap: 14, marginBottom: 18 }}>
            <div className="avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
              {initials(user?.name)}
            </div>
            <div>
              <strong style={{ fontSize: 16, display: 'block' }}>{user?.name}</strong>
              <span className="muted mono" style={{ fontSize: 13 }}>{user?.email}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
              Authorized Capabilities for Role ({user?.role})
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
              {capabilities.map((cap) => (
                <li key={cap}>{cap}</li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <CardHead
            title="Quick Demo Role Switcher"
            subtitle="Instantly switch between seeded research personas to evaluate role-scoped views"
          />
          <div className="stack" style={{ gap: 10 }}>
            {DEMO_ROLES.map((r) => {
              const active = user?.role === r.key;
              return (
                <div
                  key={r.key}
                  className="card card-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: active ? 'var(--primary-50)' : 'var(--surface)',
                    borderColor: active ? 'var(--primary-100)' : 'var(--border)',
                  }}
                >
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <strong style={{ fontSize: 13.5 }}>{r.label}</strong>
                      {active && <Badge tone="info">Current session</Badge>}
                    </div>
                    <span className="muted" style={{ fontSize: 12.5 }}>{r.summary}</span>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${active ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={active || Boolean(switchingRole)}
                    onClick={() => onSwitchRole && onSwitchRole(r)}
                  >
                    {switchingRole === r.key ? 'Switching…' : active ? 'Active' : `Switch to ${r.label}`}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <CardHead
          title="Platform Service & ML Engine Diagnostics"
          subtitle="Live connectivity across Express REST API, MongoDB persistence, and FastAPI PyTorch inference service"
        />
        <div className="grid grid-3">
          <div className="card card-sm card-subtle">
            <div className="between" style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 13.5 }}>Express API & MongoDB</strong>
              <Badge tone={health?.status === 'ok' ? 'success' : 'warning'} dot>
                {health?.status === 'ok' ? 'Connected' : 'Checking'}
              </Badge>
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              REST API serving role-scoped endpoints, EDF multipart ingestion, and PDF report generation.
            </p>
          </div>

          <div className="card card-sm card-subtle">
            <div className="between" style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 13.5 }}>FastAPI ML Service</strong>
              <Badge tone={modelReady ? 'success' : 'warning'} dot>
                {modelReady ? 'Ready' : 'Offline'}
              </Badge>
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              {meta.architecture || 'SeizureConvNet (1D-CNN)'} · Checkpoint v{meta.model_version || '1.0.0'} · Threshold {percent(meta.threshold ?? 0.6, 0)}
            </p>
          </div>

          <div className="card card-sm card-subtle">
            <div className="between" style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 13.5 }}>Clinical Boundary Policy</strong>
              <Badge tone="info" dot>Enforced</Badge>
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              {health?.clinicalBoundary || 'Research decision-support only. Not cleared for autonomous clinical diagnosis.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}


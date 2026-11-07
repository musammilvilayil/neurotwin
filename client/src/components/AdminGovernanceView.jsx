import React, { useState } from 'react';
import {
  ShieldCheck, Users, ClipboardList, CheckCircle2, XCircle,
  AlertTriangle, Key, Search, Lock, UserCheck, UserX, Clock
} from 'lucide-react';

const roleLabels = {
  doctor: 'Clinician / Doctor',
  patient: 'Patient',
  caregiver: 'Caregiver',
  admin: 'Administrator'
};

export default function AdminGovernanceView({
  usersList = [],
  patients = [],
  audit = [],
  onRoleChange,
  onToggleUserStatus,
  onToggleConsent,
  busy,
  user
}) {
  const [userSearch, setUserSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  const filteredUsers = usersList.filter(u => {
    const term = userSearch.toLowerCase();
    return u.name?.toLowerCase().includes(term) ||
           u.username?.toLowerCase().includes(term) ||
           u.email?.toLowerCase().includes(term) ||
           u.role?.toLowerCase().includes(term);
  });

  const filteredPatients = patients.filter(p => {
    const term = patientSearch.toLowerCase();
    return p.fullName?.toLowerCase().includes(term) ||
           p.mrn?.toLowerCase().includes(term);
  });

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(iso);
    }
  };

  return (
    <div className="governance-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header */}
      <section className="nt-card nt-card-elevated" style={{
        padding: '24px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="nt-badge nt-badge-purple">
              <ShieldCheck size={12} /> System Governance & Security
            </span>
            <span style={{ fontSize: '13px', color: 'var(--nt-text-muted)' }}>
              HIPAA & Privacy Assured Protocol
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--nt-text-primary)' }}>
            User Access Control & Consent Governance
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--nt-text-secondary)' }}>
            Manage role permissions, monitor research subject consent status, and audit access security logs.
          </p>
        </div>
      </section>

      {/* 2. User Accounts Management */}
      <section className="nt-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
              User Accounts & Role Permissions ({usersList.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
              Assign granular system roles (Doctor, Patient, Caregiver, Admin)
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--nt-surface)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--nt-border)'
          }}>
            <Search size={14} style={{ color: 'var(--nt-text-muted)' }} />
            <input
              type="text"
              className="nt-input"
              style={{ border: 'none', background: 'transparent', padding: '2px 0', fontSize: '12px', width: '220px' }}
              placeholder="Search user accounts..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="nt-table">
            <thead>
              <tr>
                <th>User Identity</th>
                <th>Username</th>
                <th>Role Assignment</th>
                <th>Account Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const isActive = u.active !== false;
                const isSelf = u._id === user?.id || u._id === user?._id;

                return (
                  <tr key={u._id}>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--nt-text-primary)', display: 'block' }}>{u.name || u.username}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>{u.email || '—'}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--nt-cyan)' }}>
                      @{u.username}
                    </td>
                    <td>
                      <select
                        className="nt-input"
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        value={u.role}
                        disabled={isSelf || busy}
                        onChange={(e) => onRoleChange(u._id, e.target.value)}
                      >
                        <option value="doctor">Clinician / Doctor</option>
                        <option value="patient">Patient</option>
                        <option value="caregiver">Caregiver</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td>
                      <span className={`nt-badge ${isActive ? 'nt-badge-green' : 'nt-badge-red'}`}>
                        {isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="nt-btn nt-btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        disabled={isSelf || busy}
                        onClick={() => onToggleUserStatus(u._id, !isActive)}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Patient Consent Tracker */}
      <section className="nt-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
              Subject Privacy & Consent Enforcement ({patients.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
              Verify consent authorizations required before processing EEG uploads
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--nt-surface)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--nt-border)'
          }}>
            <Search size={14} style={{ color: 'var(--nt-text-muted)' }} />
            <input
              type="text"
              className="nt-input"
              style={{ border: 'none', background: 'transparent', padding: '2px 0', fontSize: '12px', width: '220px' }}
              placeholder="Search patients..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="nt-table">
            <thead>
              <tr>
                <th>Patient Full Name</th>
                <th>MRN</th>
                <th>Conditions</th>
                <th>Consent Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(p => (
                <tr key={p._id}>
                  <td>
                    <strong style={{ color: 'var(--nt-text-primary)' }}>{p.fullName}</strong>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--nt-text-secondary)' }}>
                    {p.mrn || 'N/A'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(p.conditions || []).map((c, i) => (
                        <span key={i} className="nt-badge nt-badge-gray" style={{ fontSize: '10px' }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {p.consented ? (
                      <span className="nt-badge nt-badge-green">
                        <CheckCircle2 size={11} /> Authorized
                      </span>
                    ) : (
                      <span className="nt-badge nt-badge-red">
                        <XCircle size={11} /> Pending Consent
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="nt-btn nt-btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      disabled={busy}
                      onClick={() => onToggleConsent(p._id, !p.consented)}
                    >
                      {p.consented ? 'Revoke Consent' : 'Grant Consent'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Live Security & Audit Trail */}
      <section className="nt-card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
            Real-Time Audit Trail & Security Logs
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
            Immutable activity log recording user authentication, data access, and clinical mutations
          </span>
        </div>

        {audit.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', border: '1px dashed var(--nt-border)', borderRadius: '8px' }}>
            <ClipboardList size={32} style={{ color: 'var(--nt-text-muted)', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--nt-text-secondary)' }}>
              No audit logs captured yet. System actions will be logged here in real time.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="nt-table">
              <thead>
                <tr>
                  <th>Event Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target / Resource</th>
                </tr>
              </thead>
              <tbody>
                {audit.slice(0, 15).map((log, index) => (
                  <tr key={log._id || index}>
                    <td style={{ fontSize: '12px', color: 'var(--nt-text-secondary)' }}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td>
                      <span className="nt-badge nt-badge-cyan" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--nt-text-primary)', fontWeight: '600' }}>
                        {log.actor?.name || log.actor?.username || 'System'}
                      </span>
                      {log.actor?.role && (
                        <span style={{ fontSize: '11px', color: 'var(--nt-text-muted)', marginLeft: '6px' }}>
                          ({roleLabels[log.actor.role] || log.actor.role})
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--nt-text-muted)' }}>
                      {log.meta?.name || log.target || 'Workspace'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


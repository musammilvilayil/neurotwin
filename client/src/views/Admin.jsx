import React, { useState, useMemo } from 'react';
import {
  Activity, CheckCircle2, Lock, Search, ShieldCheck, Users,
} from 'lucide-react';
import {
  Badge, Card, CardHead, EmptyState, MetricCard, PageHeader,
} from '../components/ui.jsx';
import { dateLabel, initials } from '../lib/api.js';

const ROLES = ['doctor', 'patient', 'caregiver', 'admin'];

export function Admin({
  users = [],
  audit = [],
  patients = [],
  onUpdateUserRole,
  onUpdateUserStatus,
  onToggleConsent,
}) {
  const [auditQuery, setAuditQuery] = useState('');

  const filteredAudit = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    if (!q) return audit;
    return audit.filter((ev) =>
      `${ev.action || ''} ${ev.targetType || ''} ${ev.actor?.email || ''} ${ev.actor?.role || ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [audit, auditQuery]);

  const activeUsers = users.filter((u) => u.active !== false).length;
  const consentedPatients = patients.filter((p) => p.consented).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Governance, RBAC & Compliance"
        title="Platform Governance & Audit Log"
        subtitle="Manage role-based access control, subject research consent status, and immutable platform activity logs."
      />

      <div className="grid grid-4">
        <MetricCard
          label="Workspace Accounts"
          value={users.length}
          sub={`${activeUsers} active accounts`}
          icon={Users}
          tone="primary"
        />
        <MetricCard
          label="Subject Consents"
          value={`${consentedPatients} / ${patients.length}`}
          sub="Active research authorization"
          icon={ShieldCheck}
          tone="success"
        />
        <MetricCard
          label="Audit Events"
          value={audit.length}
          sub="Immutable activity trail"
          icon={Activity}
          tone="cyan"
        />
        <MetricCard
          label="Access Policy"
          value="RBAC Enforced"
          sub="JWT + role-scoped endpoints"
          icon={Lock}
          tone="purple"
        />
      </div>

      <div className="grid grid-12">
        <div className="col-7">
          <Card>
            <CardHead
              title="User Directory & Role Assignment"
              subtitle="Update workspace roles or suspend account access"
            />
            {users.length ? (
              <div className="table-wrap">
                <table className="tbl is-stacked">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="num">Access control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td data-label="User">
                          <div className="row" style={{ gap: 10 }}>
                            <div className="avatar">{initials(u.name)}</div>
                            <div>
                              <strong style={{ display: 'block', fontSize: 13.5 }}>{u.name}</strong>
                              <span className="muted mono" style={{ fontSize: 12 }}>
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Role">
                          <select
                            className="select"
                            style={{ width: 'auto', height: 32, padding: '0 28px 0 10px', fontSize: 12.5 }}
                            value={u.role}
                            onChange={(e) => onUpdateUserRole && onUpdateUserRole(u._id, e.target.value)}
                            aria-label={`Role for ${u.name}`}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Status">
                          <Badge tone={u.active !== false ? 'success' : 'danger'} dot>
                            {u.active !== false ? 'Active' : 'Suspended'}
                          </Badge>
                        </td>
                        <td data-label="Access control" className="num">
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => onUpdateUserStatus && onUpdateUserStatus(u._id, u.active === false)}
                          >
                            {u.active !== false ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Users} title="No users loaded" body="Account records will appear here." />
            )}
          </Card>
        </div>

        <div className="col-5">
          <Card>
            <CardHead
              title="Subject Research Consent Ledger"
              subtitle="Verify or toggle informed consent authorization"
            />
            {patients.length ? (
              <div className="list">
                {patients.map((p) => (
                  <div key={p._id} className="list-row">
                    <div>
                      <strong style={{ display: 'block', fontSize: 13.5 }}>{p.fullName}</strong>
                      <span className="muted mono" style={{ fontSize: 12 }}>{p.mrn}</span>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <Badge tone={p.consented ? 'success' : 'warning'} dot>
                        {p.consented ? 'Consented' : 'Withdrawn'}
                      </Badge>
                      {onToggleConsent && (
                        <button
                          type="button"
                          className="btn btn-xs btn-secondary"
                          onClick={() => onToggleConsent(p._id, !p.consented)}
                        >
                          {p.consented ? 'Revoke' : 'Grant'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={ShieldCheck} title="No subjects enrolled" />
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHead
          title="Immutable Security & Clinical Audit Log"
          subtitle={`Showing ${filteredAudit.length} of ${audit.length} recorded workspace events`}
          right={
            <div className="search" style={{ minWidth: 240 }}>
              <Search size={15} />
              <input
                type="search"
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
                placeholder="Filter by action or actor…"
                aria-label="Filter audit events"
              />
            </div>
          }
        />

        {filteredAudit.length ? (
          <div className="table-wrap">
            <table className="tbl is-stacked">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Target Resource</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudit.slice(0, 60).map((ev) => (
                  <tr key={ev._id}>
                    <td data-label="Timestamp" className="mono">{dateLabel(ev.createdAt)}</td>
                    <td data-label="Action">
                      <Badge tone="info">{ev.action}</Badge>
                    </td>
                    <td data-label="Actor">{ev.actor?.email || 'system'}</td>
                    <td data-label="Role" style={{ textTransform: 'capitalize' }}>
                      {ev.actor?.role || '—'}
                    </td>
                    <td data-label="Target" className="mono muted">
                      {ev.targetType || 'workspace'} {ev.targetId ? `(${String(ev.targetId).slice(-6)})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Activity} title="No matching audit events" />
        )}
      </Card>
    </div>
  );
}


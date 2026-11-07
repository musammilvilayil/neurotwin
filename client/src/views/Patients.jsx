import React, { useState, useMemo } from 'react';
import {
  Activity, Brain, CheckCircle2, FileText, Pill, Plus, Search, ShieldCheck, UserPlus, Users,
} from 'lucide-react';
import {
  Badge, Card, CardHead, EmptyState, Field, MetricCard, Modal, PageHeader,
} from '../components/ui.jsx';
import { dateLabel, dayLabel, initials, percent } from '../lib/api.js';
import { outcomeKeyOf, patientIdOf, scoreOf } from '../lib/eeg.js';

const CONDITION_PRESETS = [
  'Focal Epilepsy',
  'Temporal Lobe Epilepsy',
  'Nocturnal Seizures',
  'Generalized Tonic-Clonic',
  'Absence Seizures',
  'Refractory Epilepsy',
];

export function Patients({
  user,
  patients = [],
  analyses = [],
  selectedPatientId,
  onSelectPatient,
  onCreatePatient,
  onToggleConsent,
  onNavigate,
  enrollOpen,
  setEnrollOpen,
}) {
  const isClinician = ['doctor', 'admin'].includes(user?.role);
  const safePatients = Array.isArray(patients) ? patients : [];
  const safeAnalyses = Array.isArray(analyses) ? analyses : (Array.isArray(analyses?.analyses) ? analyses.analyses : []);
  const [query, setQuery] = useState('');
  const [consentFilter, setConsentFilter] = useState('all');

  // Enroll form state
  const [fullName, setFullName] = useState('');
  const [mrn, setMrn] = useState('');
  const [dob, setDob] = useState('2008-05-14');
  const [conditionsInput, setConditionsInput] = useState('Focal Epilepsy, Temporal Lobe');
  const [consented, setConsented] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const statsByPatient = useMemo(() => {
    const map = {};
    for (const a of safeAnalyses) {
      const pid = patientIdOf(a);
      if (!pid) continue;
      if (!map[pid]) map[pid] = { count: 0, confirmed: 0, lastAt: null, peak: 0 };
      map[pid].count += 1;
      if (outcomeKeyOf(a) === 'confirmed') map[pid].confirmed += 1;
      const s = scoreOf(a);
      if (s > map[pid].peak) map[pid].peak = s;
      if (!map[pid].lastAt || new Date(a.createdAt) > new Date(map[pid].lastAt)) {
        map[pid].lastAt = a.createdAt;
      }
    }
    return map;
  }, [safeAnalyses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return safePatients.filter((p) => {
      if (consentFilter === 'consented' && !p.consented) return false;
      if (consentFilter === 'pending' && p.consented) return false;
      if (!q) return true;
      const hay = `${p.fullName} ${p.mrn} ${(p.conditions || []).join(' ')} ${p.primaryDiagnosis || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [safePatients, query, consentFilter]);

  const addConditionPreset = (preset) => {
    const existing = conditionsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!existing.includes(preset)) {
      setConditionsInput([...existing, preset].join(', '));
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !mrn.trim() || !dob) return;
    setSubmitting(true);
    try {
      const conditions = conditionsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      await onCreatePatient({
        fullName: fullName.trim(),
        mrn: mrn.trim(),
        dob,
        conditions,
        consented,
      });
      setFullName('');
      setMrn('');
      setEnrollOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const consentedCount = safePatients.filter((p) => p.consented).length;
  const activeRxCount = safePatients.reduce(
    (sum, p) => sum + (p.prescriptions || []).filter((r) => r.status !== 'Discontinued').length,
    0,
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow="Cohort Registry"
        title="Subjects & Patient Profiles"
        subtitle="Manage enrolled research subjects, research consent status, EEG recording history, and linked Digital Twin profiles."
        actions={
          isClinician && (
            <button type="button" className="btn btn-primary" onClick={() => setEnrollOpen(true)}>
              <UserPlus size={15} /> Enroll new subject
            </button>
          )
        }
      />

      <div className="grid grid-4">
        <MetricCard
          label="Enrolled Subjects"
          value={safePatients.length}
          sub="Active cohort registry"
          icon={Users}
          tone="primary"
        />
        <MetricCard
          label="Research Consent"
          value={`${consentedCount} / ${safePatients.length}`}
          sub="Documented informed consent"
          icon={ShieldCheck}
          tone="success"
        />
        <MetricCard
          label="Total EEG Sessions"
          value={safeAnalyses.length}
          sub="Linked across all subjects"
          icon={Activity}
          tone="cyan"
        />
        <MetricCard
          label="Active Prescriptions"
          value={activeRxCount}
          sub="Anti-epileptic regimens"
          icon={Pill}
          tone="purple"
        />
      </div>

      <Card>
        <CardHead
          title="Subject Directory"
          subtitle={`Showing ${filtered.length} of ${safePatients.length} subjects`}
        />

        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="toolbar-left">
            <div className="search" style={{ minWidth: 280 }}>
              <Search size={15} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by subject name, MRN, or condition…"
                aria-label="Search subjects"
              />
            </div>

            <select
              className="select"
              style={{ width: 'auto' }}
              value={consentFilter}
              onChange={(e) => setConsentFilter(e.target.value)}
              aria-label="Filter by consent"
            >
              <option value="all">All consent states</option>
              <option value="consented">Consented only</option>
              <option value="pending">Pending consent</option>
            </select>
          </div>
        </div>

        {filtered.length ? (
          <div className="table-wrap">
            <table className="tbl is-stacked">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>MRN</th>
                  <th>Date of birth</th>
                  <th>Conditions / Diagnosis</th>
                  <th>EEG Sessions</th>
                  <th>Research consent</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = statsByPatient[p._id] || { count: 0, confirmed: 0, peak: 0, lastAt: null };
                  const isSelected = p._id === selectedPatientId;
                  return (
                    <tr key={p._id}>
                      <td data-label="Subject">
                        <div className="row" style={{ gap: 10 }}>
                          <div className="avatar">{initials(p.fullName)}</div>
                          <div>
                            <div className="row" style={{ gap: 6 }}>
                              <strong style={{ fontWeight: 600 }}>{p.fullName}</strong>
                              {isSelected && <Badge tone="info">Active</Badge>}
                            </div>
                            <span className="muted" style={{ fontSize: 12 }}>
                              {st.lastAt ? `Last EEG ${dateLabel(st.lastAt)}` : 'No EEG sessions yet'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="MRN" className="mono">{p.mrn}</td>
                      <td data-label="Date of birth" className="mono">{dayLabel(p.dob)}</td>
                      <td data-label="Conditions">
                        <div className="chip-row">
                          {(p.conditions || []).length ? (
                            p.conditions.map((c) => (
                              <span key={c} className="chip">{c}</span>
                            ))
                          ) : (
                            <span className="muted">Unlisted</span>
                          )}
                        </div>
                      </td>
                      <td data-label="EEG Sessions">
                        <div className="row" style={{ gap: 6 }}>
                          <span className="mono" style={{ fontWeight: 600 }}>{st.count}</span>
                          {st.confirmed > 0 && (
                            <Badge tone="danger" dot>{st.confirmed} flagged</Badge>
                          )}
                        </div>
                      </td>
                      <td data-label="Consent">
                        <div className="row" style={{ gap: 8 }}>
                          <Badge tone={p.consented ? 'success' : 'warning'} dot>
                            {p.consented ? 'Consented' : 'Withdrawn'}
                          </Badge>
                          {isClinician && onToggleConsent && (
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost"
                              onClick={() => onToggleConsent(p._id, !p.consented)}
                            >
                              {p.consented ? 'Revoke' : 'Grant'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td data-label="Actions" className="num">
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            className={`btn btn-xs ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => {
                              onSelectPatient(p._id);
                              onNavigate('twin');
                            }}
                          >
                            <Brain size={13} /> Twin
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => {
                              onSelectPatient(p._id);
                              onNavigate('notes');
                            }}
                          >
                            <Pill size={13} /> Care & Rx
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
          <EmptyState
            icon={Users}
            title="No matching subjects"
            body="Try clearing your search filter or enroll a new research subject."
            action={
              isClinician && (
                <button type="button" className="btn btn-primary" onClick={() => setEnrollOpen(true)}>
                  <Plus size={15} /> Enroll subject
                </button>
              )
            }
          />
        )}
      </Card>

      {/* Enroll Subject Modal */}
      <Modal
        open={Boolean(enrollOpen)}
        onClose={() => setEnrollOpen(false)}
        title="Enroll Research Subject"
        subtitle="Create a subject record and initialize their longitudinal EEG Digital Twin profile."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setEnrollOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="enroll-subject-form"
              className="btn btn-primary"
              disabled={submitting || !fullName.trim() || !mrn.trim()}
            >
              <UserPlus size={15} />
              {submitting ? 'Enrolling…' : 'Enroll subject'}
            </button>
          </>
        }
      >
        <form id="enroll-subject-form" onSubmit={handleEnroll} className="stack">
          <div className="grid grid-2">
            <Field label="Subject Full Name">
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Arjun Nair"
                required
              />
            </Field>
            <Field label="Medical Record / Study ID (MRN)">
              <input
                className="input mono"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                placeholder="e.g., MRN-2084"
                required
              />
            </Field>
          </div>

          <Field label="Date of Birth">
            <input
              type="date"
              className="input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </Field>

          <Field label="Documented Neurological Conditions (comma-separated)">
            <input
              className="input"
              value={conditionsInput}
              onChange={(e) => setConditionsInput(e.target.value)}
              placeholder="Focal Epilepsy, Temporal Lobe Epilepsy"
            />
            <div className="chip-row" style={{ marginTop: 6 }}>
              {CONDITION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="chip-btn"
                  onClick={() => addConditionPreset(preset)}
                >
                  + {preset}
                </button>
              ))}
            </div>
          </Field>

          <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
            />
            <span style={{ fontSize: 13.5 }}>
              Subject (or legal guardian) has provided documented research consent for EEG processing and Digital Twin modeling.
            </span>
          </label>
        </form>
      </Modal>
    </div>
  );
}

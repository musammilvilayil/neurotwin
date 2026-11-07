import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle2, Clock, FileText, Pill, Plus, Printer, Send, Sparkles, Stethoscope, Trash2,
} from 'lucide-react';
import {
  Badge, Card, CardHead, EmptyState, Field, PageHeader,
} from '../components/ui.jsx';
import { dateLabel, dayLabel } from '../lib/api.js';

const DIAGNOSIS_PRESETS = [
  'Focal Epilepsy (Temporal Lobe)',
  'Nocturnal Frontal Lobe Epilepsy',
  'Generalized Tonic-Clonic Epilepsy',
  'Childhood Absence Epilepsy',
  'Drug-Resistant Focal Epilepsy',
];

const CONDITION_PRESETS = [
  'Focal Epilepsy',
  'Temporal Lobe',
  'Nocturnal Seizures',
  'Photosensitivity',
  'Sleep Deprivation Trigger',
];

const AED_PRESETS = [
  { medicineName: 'Levetiracetam (Keppra)', dosage: '500 mg', frequency: 'Twice daily (BID)', instructions: 'Take morning and evening with or without food.' },
  { medicineName: 'Lamotrigine (Lamictal)', dosage: '100 mg', frequency: 'Twice daily (BID)', instructions: 'Maintain consistent 12-hour dosing interval.' },
  { medicineName: 'Clobazam (Onfi)', dosage: '10 mg', frequency: 'Nightly at bedtime (QHS)', instructions: 'Take 30 minutes before sleep for nocturnal prophylaxis.' },
  { medicineName: 'Sodium Valproate', dosage: '500 mg', frequency: 'Twice daily (BID)', instructions: 'Take after meals to minimize GI discomfort.' },
  { medicineName: 'Lacosamide (Vimpat)', dosage: '100 mg', frequency: 'Twice daily (BID)', instructions: 'Swallow whole with water; monitor dizziness.' },
  { medicineName: 'Topiramate (Topamax)', dosage: '50 mg', frequency: 'Twice daily (BID)', instructions: 'Ensure adequate daily hydration.' },
];

const NOTE_TEMPLATES = [
  'Reviewed latest 18-lead EEG session and probability timeline. No sustained ictal evolution observed; continue current AED regimen.',
  'Elevated window-level seizure probability noted across temporal channels. Counselled subject and caregiver on strict medication adherence and sleep hygiene.',
  'Follow-up EEG scheduled in 4 weeks to assess response to Levetiracetam titration.',
];

const emptyRx = () => ({
  medicineName: '',
  dosage: '',
  frequency: 'Twice daily (BID)',
  instructions: '',
});

const emptyAppt = () => ({
  scheduledAt: '',
  reason: 'Follow-up EEG & Anticonvulsant Titration Review',
});

function timingBadge(frequency = '') {
  const f = frequency.toLowerCase();
  if (f.includes('night') || f.includes('bed') || f.includes('qhs')) return 'Bedtime';
  if (f.includes('three') || f.includes('tid')) return 'Morning · Midday · Evening';
  if (f.includes('twice') || f.includes('bid')) return 'Morning · Evening';
  return 'Daily scheduled';
}

export function CarePlan({
  user,
  patients = [],
  selectedPatientId,
  onSelectPatient,
  overview,
  onSaveTreatment,
  onUpdateRxStatus,
  onUpdateApptStatus,
  onCreateNote,
}) {
  const isClinician = ['doctor', 'admin'].includes(user?.role);
  const patient = overview?.patient || patients.find((p) => p._id === selectedPatientId) || patients[0];
  const notes = overview?.notes || [];

  const [diagnosis, setDiagnosis] = useState('');
  const [conditionsInput, setConditionsInput] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [rxRows, setRxRows] = useState([emptyRx()]);
  const [apptRows, setApptRows] = useState([]);
  const [savingTreatment, setSavingTreatment] = useState(false);

  // Clinical note state
  const [noteBody, setNoteBody] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('patient');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (patient) {
      setDiagnosis(patient.treatment?.diagnosis || patient.primaryDiagnosis || (patient.conditions || [])[0] || '');
      setConditionsInput((patient.conditions || []).join(', '));
      setTreatmentPlan(patient.treatment?.treatmentPlan || patient.treatmentPlan || '');
    }
  }, [patient?._id]);

  const addRxRow = (preset = null) => {
    if (preset) {
      setRxRows((prev) => {
        // Replace first blank row if empty, otherwise append
        if (prev.length === 1 && !prev[0].medicineName.trim()) {
          return [{ ...preset }];
        }
        return [...prev, { ...preset }];
      });
    } else {
      setRxRows((prev) => [...prev, emptyRx()]);
    }
  };

  const updateRxRow = (idx, field, val) => {
    setRxRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));
  };

  const removeRxRow = (idx) => {
    setRxRows((prev) => (prev.length <= 1 ? [emptyRx()] : prev.filter((_, i) => i !== idx)));
  };

  const addApptRow = () => {
    setApptRows((prev) => [...prev, emptyAppt()]);
  };

  const updateApptRow = (idx, field, val) => {
    setApptRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));
  };

  const removeApptRow = (idx) => {
    setApptRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTreatment = async (e) => {
    e.preventDefault();
    if (!patient) return;
    setSavingTreatment(true);
    try {
      const validRx = rxRows.filter((r) => r.medicineName.trim() && r.dosage.trim() && r.frequency.trim());
      const validAppts = apptRows.filter((a) => a.scheduledAt && a.reason.trim());
      const conditions = conditionsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      await onSaveTreatment(patient._id, {
        diagnosis: diagnosis.trim(),
        treatmentPlan: treatmentPlan.trim(),
        conditions,
        newPrescriptions: validRx,
        newAppointments: validAppts,
      });
      setRxRows([emptyRx()]);
      setApptRows([]);
    } finally {
      setSavingTreatment(false);
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!patient || !noteBody.trim()) return;
    setSavingNote(true);
    try {
      await onCreateNote(patient._id, {
        body: noteBody.trim(),
        visibility: noteVisibility,
      });
      setNoteBody('');
    } finally {
      setSavingNote(false);
    }
  };

  const printPrescriptionSlip = () => {
    if (!patient) return;
    const activeRx = (patient.prescriptions || []).filter((r) => r.status !== 'Discontinued');
    const win = window.open('', '_blank', 'width=840,height=720');
    if (!win) return;
    const rowsHtml = activeRx
      .map(
        (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${r.medicineName}</strong></td>
          <td>${r.dosage}</td>
          <td>${r.frequency}</td>
          <td>${r.instructions || 'As directed'}</td>
        </tr>`,
      )
      .join('');
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>NeuroTwin Prescription Summary — ${patient.fullName}</title>
          <style>
            body { font-family: Inter, -apple-system, sans-serif; color: #172033; padding: 36px; line-height: 1.5; }
            .head { display: flex; justify-content: space-between; border-bottom: 2px solid #2563EB; padding-bottom: 16px; margin-bottom: 24px; }
            h1 { margin: 0; font-size: 20px; color: #172033; }
            .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #F7F9FC; border: 1px solid #E5EAF1; padding: 14px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            th, td { border: 1px solid #E5EAF1; padding: 10px 12px; text-align: left; }
            th { background: #F1F5FA; font-size: 11.5px; text-transform: uppercase; color: #64748B; }
            .foot { margin-top: 32px; padding-top: 14px; border-top: 1px solid #E5EAF1; font-size: 12px; color: #64748B; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="head">
            <div>
              <h1>NeuroTwin Clinical Care & Medication Summary</h1>
              <div style="font-size:12.5px;color:#64748B;">EEG Digital Twin & Longitudinal Epilepsy Care Workspace</div>
            </div>
            <div style="text-align:right;font-size:12.5px;">
              <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
              <div><strong>Clinician:</strong> ${user?.name || 'Attending Neurologist'}</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>Subject:</strong> ${patient.fullName}</div>
            <div><strong>MRN:</strong> ${patient.mrn}</div>
            <div><strong>DOB:</strong> ${dayLabel(patient.dob)}</div>
            <div style="grid-column: span 3;"><strong>Primary Diagnosis:</strong> ${patient.treatment?.diagnosis || patient.primaryDiagnosis || (patient.conditions || []).join(', ') || 'Under evaluation'}</div>
          </div>
          <h3 style="font-size:14px;margin-bottom:6px;">Active Anti-Epileptic Medication Regimen (${activeRx.length})</h3>
          <table>
            <thead>
              <tr><th>#</th><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Instructions</th></tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td colspan="5">No active prescriptions documented.</td></tr>'}</tbody>
          </table>
          ${(patient.treatment?.treatmentPlan || patient.treatmentPlan) ? `<div style="margin-top:20px;"><strong>Care Plan Notes:</strong><p style="margin:6px 0;font-size:13px;">${patient.treatment?.treatmentPlan || patient.treatmentPlan}</p></div>` : ''}
          <div class="foot">
            <span>Generated by NeuroTwin Workspace · Research & Care Coordination Record</span>
            <span>Attending Signature: ___________________________</span>
          </div>
        </body>
      </html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const prescriptions = patient?.prescriptions || [];
  const appointments = patient?.appointments || [];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Longitudinal Care & Medication Management"
        title={`Care Plan, Prescriptions & Notes — ${patient?.fullName || 'Subject'}`}
        subtitle="Coordinate multi-medicine anticonvulsant regimens, follow-up EEG appointments, and role-scoped clinical notes."
        actions={
          <>
            {isClinician && patients.length > 0 && (
              <select
                className="select"
                style={{ width: 'auto', minWidth: 220 }}
                value={selectedPatientId || ''}
                onChange={(e) => onSelectPatient(e.target.value)}
                aria-label="Select subject"
              >
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.fullName} ({p.mrn})
                  </option>
                ))}
              </select>
            )}
            {patient && (
              <button type="button" className="btn btn-secondary" onClick={printPrescriptionSlip}>
                <Printer size={15} /> Print prescription summary
              </button>
            )}
          </>
        }
      />

      {!patient ? (
        <EmptyState
          icon={Stethoscope}
          title="No subject selected"
          body="Select a research subject to manage their care plan, prescriptions, and clinical notes."
        />
      ) : (
        <>
          {/* Clinician Treatment & Multi-Medicine Prescription Builder */}
          {isClinician && (
            <Card>
              <CardHead
                title="Update Diagnosis, Care Plan & Multi-Medicine Regimen"
                subtitle="Prescribe one or multiple anti-epileptic medications in a single clinical update, or click any quick-add AED chip."
                right={<Badge tone="info"><Stethoscope size={13} /> Clinician Order Entry</Badge>}
              />

              <form onSubmit={handleSaveTreatment} className="stack">
                <div className="grid grid-2">
                  <Field label="Primary Neurological Diagnosis">
                    <input
                      className="input"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g., Focal Epilepsy (Temporal Lobe)"
                    />
                    <div className="chip-row" style={{ marginTop: 6 }}>
                      {DIAGNOSIS_PRESETS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className="chip-btn"
                          onClick={() => setDiagnosis(d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Documented Conditions & Triggers (comma-separated)">
                    <input
                      className="input"
                      value={conditionsInput}
                      onChange={(e) => setConditionsInput(e.target.value)}
                      placeholder="Focal Epilepsy, Nocturnal Seizures"
                    />
                    <div className="chip-row" style={{ marginTop: 6 }}>
                      {CONDITION_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="chip-btn"
                          onClick={() => {
                            const list = conditionsInput.split(',').map((s) => s.trim()).filter(Boolean);
                            if (!list.includes(c)) setConditionsInput([...list, c].join(', '));
                          }}
                        >
                          + {c}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="Longitudinal Treatment & Care Plan Summary">
                  <textarea
                    className="textarea"
                    rows={3}
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    placeholder="Document titration targets, seizure rescue protocol, sleep hygiene guidance, and next EEG review window…"
                  />
                </Field>

                {/* Multi-Medicine Prescription Builder */}
                <div className="card card-sm card-subtle stack" style={{ gap: 14 }}>
                  <div className="between">
                    <div>
                      <strong style={{ fontSize: 14 }}>
                        Prescribe Medications ({rxRows.length} medicine row{rxRows.length === 1 ? '' : 's'})
                      </strong>
                      <p className="muted" style={{ fontSize: 12.5 }}>
                        Add multiple medications to the regimen at once using <strong>+ Add More Medicine</strong> or the quick-add AED formulary below.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => addRxRow(null)}
                    >
                      <Plus size={15} /> Add More Medicine
                    </button>
                  </div>

                  <div>
                    <span className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      Quick-add standard anti-epileptic formulary (AEDs):
                    </span>
                    <div className="chip-row">
                      {AED_PRESETS.map((preset) => (
                        <button
                          key={preset.medicineName}
                          type="button"
                          className="chip-btn"
                          onClick={() => addRxRow(preset)}
                        >
                          <Pill size={12} /> + {preset.medicineName} ({preset.dosage})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="stack" style={{ gap: 10 }}>
                    {rxRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="card card-sm"
                        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr 2fr auto', gap: 10, alignItems: 'end' }}
                      >
                        <Field label={`Medicine #${idx + 1} Name`}>
                          <input
                            className="input"
                            value={row.medicineName}
                            onChange={(e) => updateRxRow(idx, 'medicineName', e.target.value)}
                            placeholder="e.g., Levetiracetam"
                          />
                        </Field>
                        <Field label="Dosage">
                          <input
                            className="input"
                            value={row.dosage}
                            onChange={(e) => updateRxRow(idx, 'dosage', e.target.value)}
                            placeholder="e.g., 500 mg"
                          />
                        </Field>
                        <Field label="Frequency">
                          <select
                            className="select"
                            value={row.frequency}
                            onChange={(e) => updateRxRow(idx, 'frequency', e.target.value)}
                          >
                            <option value="Twice daily (BID)">Twice daily (BID)</option>
                            <option value="Once daily (QD)">Once daily (QD)</option>
                            <option value="Nightly at bedtime (QHS)">Nightly at bedtime (QHS)</option>
                            <option value="Three times daily (TID)">Three times daily (TID)</option>
                            <option value="As needed (PRN rescue)">As needed (PRN rescue)</option>
                          </select>
                        </Field>
                        <Field label="Clinical Instructions">
                          <input
                            className="input"
                            value={row.instructions}
                            onChange={(e) => updateRxRow(idx, 'instructions', e.target.value)}
                            placeholder="Take after meals; do not skip doses"
                          />
                        </Field>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          onClick={() => removeRxRow(idx)}
                          aria-label={`Remove medicine row ${idx + 1}`}
                          title="Remove medicine row"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="between">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => addRxRow(null)}
                    >
                      <Plus size={14} /> Add More Medicine
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={addApptRow}
                    >
                      <Calendar size={14} /> Schedule Follow-up Appointment
                    </button>
                  </div>

                  {apptRows.length > 0 && (
                    <div className="stack" style={{ gap: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <strong style={{ fontSize: 13 }}>New Follow-up Appointments ({apptRows.length})</strong>
                      {apptRows.map((ap, idx) => (
                        <div
                          key={idx}
                          style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, alignItems: 'end' }}
                        >
                          <Field label="Date & Time">
                            <input
                              type="datetime-local"
                              className="input"
                              value={ap.scheduledAt}
                              onChange={(e) => updateApptRow(idx, 'scheduledAt', e.target.value)}
                            />
                          </Field>
                          <Field label="Visit Reason">
                            <input
                              className="input"
                              value={ap.reason}
                              onChange={(e) => updateApptRow(idx, 'reason', e.target.value)}
                              placeholder="Follow-up EEG & Anticonvulsant Titration Review"
                            />
                          </Field>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            onClick={() => removeApptRow(idx)}
                            aria-label="Remove appointment row"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="between">
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    Updates are immediately visible to the subject and authorized caregivers.
                  </span>
                  <button type="submit" className="btn btn-primary" disabled={savingTreatment}>
                    <CheckCircle2 size={15} />
                    {savingTreatment ? 'Saving care plan…' : 'Save Care Plan & Prescriptions'}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Active Prescriptions & Scheduled Follow-ups */}
          <div className="grid grid-2">
            <Card>
              <CardHead
                title="Active & Historical Medication Regimen"
                subtitle={`${prescriptions.filter((r) => r.status !== 'Discontinued').length} active of ${prescriptions.length} total prescriptions`}
                right={
                  <button type="button" className="btn btn-ghost btn-xs" onClick={printPrescriptionSlip}>
                    <Printer size={13} /> Print Rx
                  </button>
                }
              />

              {prescriptions.length ? (
                <div className="list">
                  {prescriptions.map((rx) => {
                    const active = rx.status !== 'Discontinued';
                    return (
                      <div key={rx._id} className="list-row" style={{ alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div className="row" style={{ gap: 8 }}>
                            <strong style={{ fontSize: 14 }}>{rx.medicineName}</strong>
                            <Badge tone="info">{rx.dosage}</Badge>
                            <Badge tone={active ? 'success' : 'neutral'} dot>
                              {rx.status || 'Active'}
                            </Badge>
                          </div>
                          <div className="row" style={{ gap: 8, marginTop: 4, fontSize: 12.5, color: 'var(--text-2)' }}>
                            <span>{rx.frequency}</span>
                            <span>·</span>
                            <span className="chip" style={{ padding: '1px 8px', fontSize: 11.5 }}>
                              {timingBadge(rx.frequency)}
                            </span>
                          </div>
                          {rx.instructions && (
                            <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                              {rx.instructions}
                            </p>
                          )}
                        </div>
                        {isClinician && onUpdateRxStatus && (
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() =>
                              onUpdateRxStatus(patient._id, rx._id, active ? 'Discontinued' : 'Active')
                            }
                          >
                            {active ? 'Discontinue' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Pill}
                  title="No prescriptions recorded"
                  body="Prescribed anti-epileptic medications and dosing schedules will appear here."
                />
              )}
            </Card>

            <Card>
              <CardHead
                title="Scheduled EEG & Neurology Appointments"
                subtitle="Longitudinal follow-up schedule"
              />
              {appointments.length ? (
                <div className="list">
                  {appointments.map((app) => (
                    <div key={app._id} className="list-row">
                      <div>
                        <div className="row" style={{ gap: 8 }}>
                          <strong>{app.reason}</strong>
                          <Badge
                            tone={
                              app.status === 'Completed'
                                ? 'success'
                                : app.status === 'Cancelled'
                                  ? 'neutral'
                                  : 'info'
                            }
                            dot
                          >
                            {app.status || 'Scheduled'}
                          </Badge>
                        </div>
                        <span className="muted mono" style={{ fontSize: 12.5 }}>
                          {dateLabel(app.scheduledAt)} · Dr. {app.doctorName || 'Attending'}
                        </span>
                      </div>
                      {isClinician && onUpdateApptStatus && app.status === 'Scheduled' && (
                        <div className="row" style={{ gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            onClick={() => onUpdateApptStatus(patient._id, app._id, 'Completed')}
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost"
                            onClick={() => onUpdateApptStatus(patient._id, app._id, 'Cancelled')}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No follow-up appointments"
                  body="Scheduled EEG monitoring sessions and neurology reviews will be listed here."
                />
              )}
            </Card>
          </div>

          {/* Clinical Notes Section */}
          <Card>
            <CardHead
              title="Longitudinal Clinical & Care Notes"
              subtitle="Role-scoped documentation shared across neurology staff, subjects, and caregivers"
            />

            {isClinician && (
              <form onSubmit={handleCreateNote} className="stack" style={{ marginBottom: 20 }}>
                <Field label="New Clinical Note">
                  <textarea
                    className="textarea"
                    rows={3}
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Enter clinical observation, EEG interpretation note, or caregiver guidance…"
                  />
                </Field>
                <div className="chip-row">
                  {NOTE_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      className="chip-btn"
                      onClick={() => setNoteBody(tpl)}
                    >
                      <Sparkles size={12} /> Template #{i + 1}
                    </button>
                  ))}
                </div>
                <div className="between">
                  <label className="row" style={{ gap: 8 }}>
                    <span className="muted" style={{ fontSize: 12.5 }}>Visibility scope:</span>
                    <select
                      className="select"
                      style={{ width: 'auto', height: 34 }}
                      value={noteVisibility}
                      onChange={(e) => setNoteVisibility(e.target.value)}
                    >
                      <option value="patient">Shared with subject & caregiver</option>
                      <option value="clinical">Clinician-only internal note</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={savingNote || !noteBody.trim()}
                  >
                    <Send size={14} />
                    {savingNote ? 'Posting…' : 'Post clinical note'}
                  </button>
                </div>
              </form>
            )}

            {notes.length ? (
              <div className="list">
                {notes.map((n) => (
                  <div key={n._id} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                        <strong style={{ fontSize: 13.5 }}>{n.author?.name || 'Clinician'}</strong>
                        <Badge tone={n.visibility === 'clinical' ? 'warning' : 'info'}>
                          {n.visibility === 'clinical' ? 'Clinician only' : 'Shared with patient'}
                        </Badge>
                        <span className="muted mono" style={{ fontSize: 12 }}>
                          {dateLabel(n.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13.5, color: 'var(--text)' }}>{n.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No clinical notes recorded yet"
                body="Observations and care instructions posted for this subject will appear in chronological order."
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}


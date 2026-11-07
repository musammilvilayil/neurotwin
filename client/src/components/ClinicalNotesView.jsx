import React, { useState, useEffect } from 'react';
import {
  FileText, Pill, Plus, Trash2, CheckCircle2, AlertTriangle,
  Clock, ShieldCheck, Stethoscope, Sparkles, Send, Calendar,
  Sun, Moon, Sunrise, Coffee, Check, X
} from 'lucide-react';

const COMMON_AEDS = [
  { name: 'Levetiracetam (Keppra)', defaultDose: '500 mg', defaultFreq: 'Twice daily' },
  { name: 'Lamotrigine (Lamictal)', defaultDose: '100 mg', defaultFreq: 'Twice daily' },
  { name: 'Sodium Valproate (Depakote)', defaultDose: '500 mg', defaultFreq: 'Twice daily' },
  { name: 'Carbamazepine (Tegretol)', defaultDose: '200 mg', defaultFreq: 'Twice daily' },
  { name: 'Clobazam (Frisium)', defaultDose: '10 mg', defaultFreq: 'Once daily at bedtime' },
  { name: 'Lacosamide (Vimpat)', defaultDose: '100 mg', defaultFreq: 'Twice daily' },
  { name: 'Topiramate (Topamax)', defaultDose: '50 mg', defaultFreq: 'Twice daily' }
];

export default function ClinicalNotesView({
  activePatient,
  overview,
  onSaveTreatment,
  onSaveNote,
  onToggleRxStatus,
  busy,
  user
}) {
  const isDoctorOrAdmin = user?.role === 'doctor' || user?.role === 'admin';

  // Diagnosis & Treatment State
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [conditionsInput, setConditionsInput] = useState('');

  // Multi-Medicine Regimen List
  const [medicines, setMedicines] = useState([
    { id: 1, medicineName: '', dosage: '', frequency: 'Twice daily', instructions: '', morning: true, afternoon: false, night: true }
  ]);

  // Clinical Note State
  const [noteBody, setNoteBody] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('clinical'); // clinical or patient

  useEffect(() => {
    if (activePatient) {
      setDiagnosis(activePatient.treatment?.diagnosis || '');
      setTreatmentPlan(activePatient.treatment?.treatmentPlan || '');
      setConditionsInput((activePatient.conditions || []).join(', '));
    }
  }, [activePatient]);

  // Multi-Medicine Actions
  const handleAddMedicine = () => {
    setMedicines(prev => [
      ...prev,
      {
        id: Date.now(),
        medicineName: '',
        dosage: '',
        frequency: 'Twice daily',
        instructions: '',
        morning: true,
        afternoon: false,
        night: true
      }
    ]);
  };

  const handleRemoveMedicine = (id) => {
    if (medicines.length === 1) {
      setMedicines([{ id: 1, medicineName: '', dosage: '', frequency: 'Twice daily', instructions: '', morning: true, afternoon: false, night: true }]);
    } else {
      setMedicines(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleMedicineChange = (id, field, value) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleAddAedChip = (aed) => {
    // If the first row is empty, fill it; otherwise append a new row
    if (medicines.length === 1 && !medicines[0].medicineName.trim()) {
      setMedicines([{
        id: 1,
        medicineName: aed.name,
        dosage: aed.defaultDose,
        frequency: aed.defaultFreq,
        instructions: 'Take with food or water',
        morning: true,
        afternoon: false,
        night: true
      }]);
    } else {
      setMedicines(prev => [
        ...prev,
        {
          id: Date.now(),
          medicineName: aed.name,
          dosage: aed.defaultDose,
          frequency: aed.defaultFreq,
          instructions: 'Take with food or water',
          morning: true,
          afternoon: false,
          night: true
        }
      ]);
    }
  };

  const handleSaveTreatmentSubmit = async (e) => {
    e.preventDefault();
    if (!activePatient?._id) return;

    const validNewPrescriptions = medicines
      .filter(m => m.medicineName && m.medicineName.trim())
      .map(m => ({
        medicineName: m.medicineName.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        instructions: m.instructions.trim(),
        morning: m.morning,
        afternoon: m.afternoon,
        night: m.night
      }));

    const parsedConditions = conditionsInput.split(',').map(s => s.trim()).filter(Boolean);

    await onSaveTreatment({
      diagnosis: diagnosis.trim(),
      treatmentPlan: treatmentPlan.trim(),
      conditions: parsedConditions,
      newPrescriptions: validNewPrescriptions
    });

    // Reset medicine form to 1 blank row
    setMedicines([
      { id: Date.now(), medicineName: '', dosage: '', frequency: 'Twice daily', instructions: '', morning: true, afternoon: false, night: true }
    ]);
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteBody.trim() || !activePatient?._id) return;
    await onSaveNote({ body: noteBody.trim(), visibility: noteVisibility });
    setNoteBody('');
  };

  const prescriptions = activePatient?.prescriptions || [];
  const notes = overview?.notes || [];

  return (
    <div className="clinical-notes-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="nt-badge nt-badge-cyan">Clinical Regimen & Notes</span>
            <span style={{ fontSize: '13px', color: 'var(--nt-text-muted)' }}>
              Subject: <strong>{activePatient?.fullName || 'Active Patient'}</strong> (MRN: {activePatient?.mrn || 'N/A'})
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--nt-text-primary)' }}>
            Diagnosis, Multi-Medicine Regimen & Progress Notes
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--nt-text-secondary)' }}>
            Configure therapeutic AED regimens, manage active prescriptions with scheduling, and write clinical encounter notes.
          </p>
        </div>
      </section>

      {/* 2. Diagnosis & Multi-Medicine Prescription Section */}
      {isDoctorOrAdmin ? (
        <form onSubmit={handleSaveTreatmentSubmit} className="nt-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--nt-border)', paddingBottom: '14px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(54, 184, 245, 0.12)',
              color: 'var(--nt-cyan)',
              display: 'grid',
              placeItems: 'center'
            }}>
              <Stethoscope size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
                Physician Diagnosis & Clinical Assessment
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
                Updated diagnoses synchronize with the patient's digital twin model
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-secondary)', marginBottom: '6px' }}>
                Primary Neurological Diagnosis
              </label>
              <input
                type="text"
                className="nt-input"
                style={{ width: '100%' }}
                placeholder="e.g. Focal Intractable Epilepsy with Temporal Lobe Sclerosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-secondary)', marginBottom: '6px' }}>
                Clinical Condition Tags (comma-separated)
              </label>
              <input
                type="text"
                className="nt-input"
                style={{ width: '100%' }}
                placeholder="e.g. Nocturnal Bursts, Drug-Resistant, Photosensitive"
                value={conditionsInput}
                onChange={(e) => setConditionsInput(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-secondary)', marginBottom: '6px' }}>
              Longitudinal Treatment Plan & Clinical Guidance
            </label>
            <textarea
              className="nt-input"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="Outline therapeutic targets, titration goals, triggers to avoid, and emergency rescue protocol..."
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
            />
          </div>

          {/* Quick AED Chips Section */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--nt-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Sparkles size={14} style={{ color: 'var(--nt-cyan)' }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-primary)' }}>
                1-Click Prescribe Common Anti-Epileptic Drugs (AEDs):
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {COMMON_AEDS.map((aed, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="nt-btn nt-btn-secondary"
                  style={{ fontSize: '12px', padding: '5px 11px', borderRadius: '20px' }}
                  onClick={() => handleAddAedChip(aed)}
                >
                  <Plus size={12} /> {aed.name.split(' ')[0]} ({aed.defaultDose})
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Medicine Prescriptions Form */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pill size={16} style={{ color: 'var(--nt-indigo)' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
                  Prescribed Medication Regimen
                </h4>
              </div>

              {/* Explicit ADD MORE MEDICINE Button requested by user */}
              <button
                type="button"
                className="nt-btn nt-btn-secondary"
                style={{ fontSize: '12px', padding: '6px 14px', borderColor: 'var(--nt-cyan)', color: 'var(--nt-cyan)' }}
                onClick={handleAddMedicine}
              >
                <Plus size={14} /> Add More Medicine
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {medicines.map((med, index) => (
                <div
                  key={med.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px, 2fr) minmax(110px, 1fr) minmax(140px, 1.2fr) minmax(160px, 1.5fr) auto auto',
                    gap: '10px',
                    alignItems: 'center',
                    background: 'var(--nt-surface)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--nt-border)'
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--nt-text-muted)', marginBottom: '4px' }}>
                      Medication #{index + 1} Name
                    </label>
                    <input
                      type="text"
                      className="nt-input"
                      style={{ width: '100%', fontSize: '13px' }}
                      placeholder="e.g. Levetiracetam"
                      value={med.medicineName}
                      onChange={(e) => handleMedicineChange(med.id, 'medicineName', e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--nt-text-muted)', marginBottom: '4px' }}>
                      Dosage
                    </label>
                    <input
                      type="text"
                      className="nt-input"
                      style={{ width: '100%', fontSize: '13px' }}
                      placeholder="e.g. 500 mg"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(med.id, 'dosage', e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--nt-text-muted)', marginBottom: '4px' }}>
                      Frequency
                    </label>
                    <select
                      className="nt-input"
                      style={{ width: '100%', fontSize: '13px' }}
                      value={med.frequency}
                      onChange={(e) => handleMedicineChange(med.id, 'frequency', e.target.value)}
                    >
                      <option value="Once daily">Once daily</option>
                      <option value="Twice daily">Twice daily</option>
                      <option value="Three times daily">Three times daily</option>
                      <option value="Four times daily">Four times daily</option>
                      <option value="As needed (PRN)">As needed (PRN)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--nt-text-muted)', marginBottom: '4px' }}>
                      Timing Schedule
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={`nt-btn ${med.morning ? 'nt-btn-primary' : 'nt-btn-secondary'}`}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Morning dose"
                        onClick={() => handleMedicineChange(med.id, 'morning', !med.morning)}
                      >
                        <Sunrise size={12} /> AM
                      </button>
                      <button
                        type="button"
                        className={`nt-btn ${med.afternoon ? 'nt-btn-primary' : 'nt-btn-secondary'}`}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Afternoon dose"
                        onClick={() => handleMedicineChange(med.id, 'afternoon', !med.afternoon)}
                      >
                        <Sun size={12} /> Noon
                      </button>
                      <button
                        type="button"
                        className={`nt-btn ${med.night ? 'nt-btn-primary' : 'nt-btn-secondary'}`}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Night dose"
                        onClick={() => handleMedicineChange(med.id, 'night', !med.night)}
                      >
                        <Moon size={12} /> PM
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--nt-text-muted)', marginBottom: '4px' }}>
                      Instructions
                    </label>
                    <input
                      type="text"
                      className="nt-input"
                      style={{ width: '100%', fontSize: '13px' }}
                      placeholder="Take with meals"
                      value={med.instructions}
                      onChange={(e) => handleMedicineChange(med.id, 'instructions', e.target.value)}
                    />
                  </div>

                  <div style={{ paddingTop: '18px' }}>
                    <button
                      type="button"
                      className="nt-btn nt-btn-secondary"
                      style={{ padding: '6px 8px', color: '#F16B78', borderColor: 'rgba(241, 107, 120, 0.3)' }}
                      title="Remove this medicine"
                      onClick={() => handleRemoveMedicine(med.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--nt-border)', paddingTop: '16px' }}>
            <button
              type="submit"
              className="nt-btn nt-btn-primary"
              disabled={busy}
              style={{ padding: '10px 24px', fontSize: '14px', fontWeight: '700' }}
            >
              Save Diagnosis & Prescription Regimen
            </button>
          </div>
        </form>
      ) : (
        /* Patient View: Display Active Prescription Regimen */
        <section className="nt-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
            Current Diagnosis & Prescribed Regimen
          </h3>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)', display: 'block' }}>Primary Diagnosis</span>
            <strong style={{ fontSize: '16px', color: 'var(--nt-text-primary)' }}>
              {activePatient?.treatment?.diagnosis || 'Epilepsy Monitoring Caseload'}
            </strong>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--nt-text-secondary)' }}>
              {activePatient?.treatment?.treatmentPlan || 'Follow prescribed dosing schedule and notify care team of breakthrough symptoms.'}
            </p>
          </div>
        </section>
      )}

      {/* 3. Existing Prescriptions Table */}
      <section className="nt-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
              Active Prescription History ({prescriptions.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
              Tracked medications, daily schedule, and status
            </span>
          </div>
        </div>

        {prescriptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', border: '1px dashed var(--nt-border)', borderRadius: '8px' }}>
            <Pill size={32} style={{ color: 'var(--nt-text-muted)', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--nt-text-secondary)' }}>
              No active prescriptions on file. Use the form above to prescribe AED therapy.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="nt-table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Schedule</th>
                  <th>Prescribed By</th>
                  <th>Status</th>
                  {isDoctorOrAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => {
                  const isActive = rx.status !== 'Discontinued';
                  return (
                    <tr key={rx._id}>
                      <td>
                        <strong style={{ color: 'var(--nt-text-primary)' }}>{rx.medicineName}</strong>
                        {rx.instructions && (
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--nt-text-muted)' }}>
                            {rx.instructions}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--nt-cyan)', fontWeight: '600' }}>{rx.dosage || '—'}</td>
                      <td style={{ color: 'var(--nt-text-secondary)', fontSize: '13px' }}>{rx.frequency || 'Daily'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {rx.morning && <span className="nt-badge nt-badge-cyan" style={{ fontSize: '10px' }}>Morning</span>}
                          {rx.afternoon && <span className="nt-badge nt-badge-indigo" style={{ fontSize: '10px' }}>Noon</span>}
                          {rx.night && <span className="nt-badge nt-badge-purple" style={{ fontSize: '10px' }}>Night</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--nt-text-muted)', fontSize: '12px' }}>{rx.prescribedBy || 'Treating Clinician'}</td>
                      <td>
                        <span className={`nt-badge ${isActive ? 'nt-badge-green' : 'nt-badge-gray'}`}>
                          {isActive ? 'Active' : 'Discontinued'}
                        </span>
                      </td>
                      {isDoctorOrAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="nt-btn nt-btn-secondary"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                            onClick={() => onToggleRxStatus(rx._id, isActive ? 'Discontinued' : 'Active')}
                            disabled={busy}
                          >
                            {isActive ? 'Discontinue' : 'Reactivate'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. Clinical Notes Timeline */}
      <section className="nt-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
              Clinical Encounter & Progress Notes ({notes.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
              Longitudinal physician observations, event logs, and patient disclosures
            </span>
          </div>
        </div>

        {isDoctorOrAdmin && (
          <form onSubmit={handleNoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <textarea
              className="nt-input"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="Record clinical observations, EEG interpretation summary, or seizure diary notes..."
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--nt-text-secondary)' }}>Visibility:</span>
                <button
                  type="button"
                  className={`nt-btn ${noteVisibility === 'clinical' ? 'nt-btn-primary' : 'nt-btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => setNoteVisibility('clinical')}
                >
                  Clinician Only
                </button>
                <button
                  type="button"
                  className={`nt-btn ${noteVisibility === 'patient' ? 'nt-btn-primary' : 'nt-btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => setNoteVisibility('patient')}
                >
                  Shared with Patient
                </button>
              </div>

              <button
                type="submit"
                className="nt-btn nt-btn-primary"
                disabled={busy || !noteBody.trim()}
                style={{ fontSize: '12px', padding: '6px 16px' }}
              >
                <Send size={13} /> Save Note
              </button>
            </div>
          </form>
        )}

        {notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', border: '1px dashed var(--nt-border)', borderRadius: '8px' }}>
            <FileText size={32} style={{ color: 'var(--nt-text-muted)', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--nt-text-secondary)' }}>
              No clinical progress notes on record for this subject.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notes.map((n, idx) => (
              <div
                key={n._id || idx}
                style={{
                  background: 'var(--nt-surface)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--nt-border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: 'var(--nt-text-primary)', fontSize: '13px' }}>
                      {n.author?.name || 'Treating Clinician'}
                    </strong>
                    <span className={`nt-badge ${n.visibility === 'patient' ? 'nt-badge-green' : 'nt-badge-gray'}`} style={{ fontSize: '10px' }}>
                      {n.visibility === 'patient' ? 'Shared with Patient' : 'Clinical Only'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--nt-text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {n.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


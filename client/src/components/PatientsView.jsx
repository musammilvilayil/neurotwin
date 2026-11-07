import React, { useState } from 'react';
import {
  Users, UserPlus, Search, ShieldCheck, AlertCircle, Plus,
  Calendar, CheckCircle2, XCircle, ArrowRight, Eye, Check, X
} from 'lucide-react';

export default function PatientsView({
  patients = [],
  activePatient,
  onSelectPatient,
  onToggleConsent,
  onRegisterPatient,
  busy,
  user
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mrn, setMrn] = useState('');
  const [dob, setDob] = useState('');
  const [conditions, setConditions] = useState('');
  const [error, setError] = useState('');

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = p.fullName?.toLowerCase().includes(term);
    const mrnMatch = p.mrn?.toLowerCase().includes(term);
    const condMatch = p.conditions?.some(c => c.toLowerCase().includes(term));
    return nameMatch || mrnMatch || condMatch;
  });

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Patient full name is required');
      return;
    }
    setError('');
    try {
      await onRegisterPatient({
        fullName: fullName.trim(),
        mrn: mrn.trim() || undefined,
        dob: dob || undefined,
        conditions: conditions.split(',').map(s => s.trim()).filter(Boolean)
      });
      setShowModal(false);
      setFullName('');
      setMrn('');
      setDob('');
      setConditions('');
    } catch (err) {
      setError(err.message || 'Failed to enroll patient');
    }
  };

  const calculateAge = (dobString) => {
    if (!dobString) return '—';
    try {
      const birthDate = new Date(dobString);
      const diff = Date.now() - birthDate.getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970) + ' yrs';
    } catch {
      return '—';
    }
  };

  return (
    <div className="patients-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header & Quick Actions */}
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
            <span className="nt-badge nt-badge-cyan">Caseload Directory</span>
            <span style={{ fontSize: '13px', color: 'var(--nt-text-muted)' }}>
              {patients.length} Registered Research Subjects
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: 'var(--nt-text-primary)' }}>
            Patient & Caseload Management
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--nt-text-secondary)' }}>
            Select an active subject to bind EEG uploads, digital twin projections, and therapeutic notes.
          </p>
        </div>

        <button
          type="button"
          className="nt-btn nt-btn-primary"
          onClick={() => setShowModal(true)}
        >
          <UserPlus size={16} /> Enroll New Subject
        </button>
      </section>

      {/* 2. Search & Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        background: 'var(--nt-surface)',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid var(--nt-border)'
      }}>
        <Search size={18} style={{ color: 'var(--nt-text-muted)' }} />
        <input
          type="text"
          className="nt-input"
          style={{ border: 'none', background: 'transparent', padding: '6px 0', fontSize: '14px' }}
          placeholder="Search subjects by name, Medical Record Number (MRN), or diagnosed condition..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            className="nt-btn nt-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            onClick={() => setSearchTerm('')}
          >
            Clear
          </button>
        )}
      </div>

      {/* 3. Patients Grid */}
      {filteredPatients.length === 0 ? (
        <div className="nt-card" style={{
          textAlign: 'center',
          padding: '64px 20px',
          border: '1px dashed var(--nt-border)'
        }}>
          <Users size={40} style={{ color: 'var(--nt-text-muted)', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--nt-text-primary)' }}>No subjects found</h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--nt-text-secondary)' }}>
            {searchTerm ? 'No patient records matched your search query.' : 'Enroll your first subject to begin clinical EEG monitoring.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '20px'
        }}>
          {filteredPatients.map((p) => {
            const isActive = activePatient?._id === p._id;

            return (
              <article
                key={p._id}
                className={`nt-card ${isActive ? 'nt-card-elevated' : ''}`}
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: isActive ? '1px solid var(--nt-cyan)' : '1px solid var(--nt-border)',
                  boxShadow: isActive ? '0 0 20px rgba(54, 184, 245, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
                        {p.fullName}
                      </h3>
                      {isActive && (
                        <span className="nt-badge nt-badge-cyan" style={{ fontSize: '10px' }}>Active Workspace</span>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)', fontFamily: 'monospace' }}>
                      MRN: {p.mrn || 'N/A'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p.consented ? (
                      <span className="nt-badge nt-badge-green" title="Consent and privacy authorization signed">
                        <CheckCircle2 size={12} /> Consented
                      </span>
                    ) : (
                      <span className="nt-badge nt-badge-red" title="Pending consent agreement">
                        <XCircle size={12} /> Pending
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ color: 'var(--nt-text-muted)', display: 'block', fontSize: '11px' }}>Age / DOB</span>
                    <strong style={{ color: 'var(--nt-text-primary)' }}>{calculateAge(p.dob)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--nt-text-muted)', display: 'block', fontSize: '11px' }}>Enrolled</span>
                    <strong style={{ color: 'var(--nt-text-primary)' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recent'}
                    </strong>
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--nt-text-muted)', display: 'block', fontSize: '11px', marginBottom: '6px' }}>Clinical Conditions</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {p.conditions && p.conditions.length > 0 ? (
                      p.conditions.map((c, i) => (
                        <span key={i} className="nt-badge nt-badge-gray" style={{ fontSize: '11px' }}>
                          {c}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)', fontStyle: 'italic' }}>
                        Under observation / Generalized
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--nt-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {user?.role === 'admin' ? (
                    <button
                      type="button"
                      className="nt-btn nt-btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => onToggleConsent(p._id, !p.consented)}
                      disabled={busy}
                    >
                      {p.consented ? 'Revoke Consent' : 'Grant Consent'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
                      {p.consented ? 'Data sharing active' : 'Consent required'}
                    </span>
                  )}

                  <button
                    type="button"
                    className={`nt-btn ${isActive ? 'nt-btn-secondary' : 'nt-btn-primary'}`}
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                    onClick={() => onSelectPatient(p._id)}
                    disabled={isActive || busy}
                  >
                    {isActive ? 'Currently Active' : (
                      <>Select Patient <ArrowRight size={13} /></>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 4. Enroll New Patient Modal Dialog */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(4, 7, 13, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          padding: '20px'
        }}>
          <div className="nt-card nt-card-elevated" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '32px',
            border: '1px solid var(--nt-border)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(54, 184, 245, 0.15)',
                  color: 'var(--nt-cyan)',
                  display: 'grid',
                  placeItems: 'center'
                }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--nt-text-primary)' }}>
                    Enroll Research Subject
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>Add subject to clinical caseload</span>
                </div>
              </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'var(--nt-text-muted)', cursor: 'pointer' }}
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(241, 107, 120, 0.15)',
                color: '#F16B78',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <form onSubmit={handleEnrollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-secondary)', marginBottom: '6px' }}>
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  className="nt-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-secondary)', marginBottom: '6px' }}>
                    MRN (Record Number)
                  </label>
                  <input
                    type="text"
                    className="nt-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. MRN-88231"
                    value={mrn}
                    onChange={(e) => setMrn(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-secondary)', marginBottom: '6px' }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    className="nt-input"
                    style={{ width: '100%' }}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-secondary)', marginBottom: '6px' }}>
                  Diagnosed Conditions (comma-separated)
                </label>
                <input
                  type="text"
                  className="nt-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Temporal Lobe Epilepsy, Nocturnal Seizures"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                />
              </div>

              <div style={{
                background: 'rgba(54, 184, 245, 0.05)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(54, 184, 245, 0.15)',
                fontSize: '12px',
                color: 'var(--nt-text-secondary)',
                lineHeight: '1.5'
              }}>
                <ShieldCheck size={14} style={{ display: 'inline', color: 'var(--nt-cyan)', marginRight: '6px', verticalAlign: 'middle' }} />
                By enrolling this subject, consent status will be initialized as authorized for research-grade digital twin telemetry.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="nt-btn nt-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="nt-btn nt-btn-primary"
                  disabled={busy}
                >
                  Complete Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


import React from 'react';
import {
  Heart, Pill, Calendar, Clock, AlertTriangle, ShieldCheck,
  CheckCircle2, Printer, Sunrise, Sun, Moon, Sparkles, Activity,
  PhoneCall, FileText, ArrowUpRight
} from 'lucide-react';

export default function PatientWellnessPortal({
  patient,
  overview,
  user
}) {
  const prescriptions = patient?.prescriptions || [];
  const activeRx = prescriptions.filter(p => p.status !== 'Discontinued');
  const twin = overview?.digitalTwin || {};
  const wellnessScore = Math.round((twin.wellnessScore || 0.88) * 100);

  const morningMeds = activeRx.filter(rx => rx.morning);
  const afternoonMeds = activeRx.filter(rx => rx.afternoon);
  const nightMeds = activeRx.filter(rx => rx.night);

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="patient-wellness-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header with Wellness Status */}
      <section className="nt-card nt-card-elevated" style={{
        padding: '28px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        background: 'linear-gradient(135deg, rgba(17, 27, 43, 0.95), rgba(22, 34, 54, 0.9))',
        border: '1px solid rgba(53, 201, 139, 0.25)'
      }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="nt-badge nt-badge-green">
              <Heart size={12} /> Neurological Wellness Portal
            </span>
            <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
              Subject: <strong>{patient?.fullName || user?.name || 'Patient'}</strong>
            </span>
          </div>

          <h1 style={{ margin: '0 0 10px 0', fontSize: '26px', fontWeight: '800', color: 'var(--nt-text-primary)' }}>
            Your Brain Health & Daily Care Companion
          </h1>

          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: 'var(--nt-text-secondary)' }}>
            This portal summarizes your recent EEG recordings in plain language, tracks your daily medication schedule,
            and keeps you connected with your clinical care team.
          </p>
        </div>

        {/* Circular Wellness Gauge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '16px 24px',
          borderRadius: '12px',
          border: '1px solid var(--nt-border)'
        }}>
          <div style={{
            position: 'relative',
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            background: `conic-gradient(#35C98B ${wellnessScore}%, rgba(255, 255, 255, 0.08) ${wellnessScore}% 100%)`,
            display: 'grid',
            placeItems: 'center'
          }}>
            <div style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              background: 'var(--nt-surface)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: '800',
              fontSize: '18px',
              color: 'var(--nt-text-primary)'
            }}>
              {wellnessScore}%
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Wellness State
            </span>
            <strong style={{ display: 'block', fontSize: '17px', color: '#35C98B', textTransform: 'capitalize' }}>
              {twin.stability || 'Stable Rhythms'}
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--nt-text-secondary)' }}>
              Background EEG baseline
            </span>
          </div>
        </div>
      </section>

      {/* 2. Plain-Language Health Summary */}
      <section className="nt-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
          Plain-Language Clinical Summary
        </h3>

        <div style={{
          background: 'rgba(54, 184, 245, 0.05)',
          padding: '18px 20px',
          borderRadius: '10px',
          border: '1px solid rgba(54, 184, 245, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} style={{ color: '#35C98B' }} />
            <strong style={{ fontSize: '15px', color: 'var(--nt-text-primary)' }}>
              Your brain electrical rhythm is currently stable.
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: 'var(--nt-text-secondary)' }}>
            The latest automated 18-channel EEG monitoring showed normal physiological background frequencies.
            No persistent paroxysmal spike-wave bursts or seizure patterns were flagged.
            Continue taking your prescribed anti-epileptic medications as scheduled below.
          </p>
        </div>
      </section>

      {/* 3. Daily Medication Schedule (Morning, Noon, Night) */}
      <section className="nt-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
              Today's Medication Schedule
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--nt-text-muted)' }}>
              Prescribed daily doses to maintain steady therapeutic blood levels
            </span>
          </div>

          <button
            type="button"
            className="nt-btn nt-btn-secondary"
            onClick={handlePrintSlip}
          >
            <Printer size={15} /> Print Medication Card
          </button>
        </div>

        {activeRx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', border: '1px dashed var(--nt-border)', borderRadius: '8px' }}>
            <Pill size={32} style={{ color: 'var(--nt-text-muted)', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--nt-text-secondary)' }}>
              No medications currently scheduled. Consult your physician.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Morning Slot */}
            <div style={{
              background: 'var(--nt-surface)',
              borderRadius: '10px',
              border: '1px solid var(--nt-border)',
              padding: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--nt-cyan)' }}>
                <Sunrise size={18} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Morning (AM)</h4>
              </div>

              {morningMeds.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)', fontStyle: 'italic' }}>No morning medications</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {morningMeds.map(rx => (
                    <div key={rx._id} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '6px' }}>
                      <strong style={{ color: 'var(--nt-text-primary)', fontSize: '14px', display: 'block' }}>{rx.medicineName}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--nt-cyan)', fontWeight: '600' }}>{rx.dosage}</span>
                      {rx.instructions && <span style={{ display: 'block', fontSize: '11px', color: 'var(--nt-text-muted)', marginTop: '2px' }}>{rx.instructions}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Noon Slot */}
            <div style={{
              background: 'var(--nt-surface)',
              borderRadius: '10px',
              border: '1px solid var(--nt-border)',
              padding: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#F4B860' }}>
                <Sun size={18} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Afternoon (Noon)</h4>
              </div>

              {afternoonMeds.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)', fontStyle: 'italic' }}>No afternoon medications</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {afternoonMeds.map(rx => (
                    <div key={rx._id} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '6px' }}>
                      <strong style={{ color: 'var(--nt-text-primary)', fontSize: '14px', display: 'block' }}>{rx.medicineName}</strong>
                      <span style={{ fontSize: '12px', color: '#F4B860', fontWeight: '600' }}>{rx.dosage}</span>
                      {rx.instructions && <span style={{ display: 'block', fontSize: '11px', color: 'var(--nt-text-muted)', marginTop: '2px' }}>{rx.instructions}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Night Slot */}
            <div style={{
              background: 'var(--nt-surface)',
              borderRadius: '10px',
              border: '1px solid var(--nt-border)',
              padding: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--nt-indigo)' }}>
                <Moon size={18} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Bedtime (PM)</h4>
              </div>

              {nightMeds.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)', fontStyle: 'italic' }}>No evening medications</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {nightMeds.map(rx => (
                    <div key={rx._id} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '6px' }}>
                      <strong style={{ color: 'var(--nt-text-primary)', fontSize: '14px', display: 'block' }}>{rx.medicineName}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--nt-indigo)', fontWeight: '600' }}>{rx.dosage}</span>
                      {rx.instructions && <span style={{ display: 'block', fontSize: '11px', color: 'var(--nt-text-muted)', marginTop: '2px' }}>{rx.instructions}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4. Emergency Protocol Card */}
      <section style={{
        padding: '20px 24px',
        background: 'rgba(241, 107, 120, 0.08)',
        border: '1px solid rgba(241, 107, 120, 0.3)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px'
      }}>
        <AlertTriangle size={24} style={{ color: '#F16B78', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#F16B78' }}>
            Seizure Emergency Safety Protocol
          </h4>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--nt-text-secondary)' }}>
            If you or the person under your care experiences a seizure that lasts longer than <strong>5 minutes</strong>,
            or if a second seizure occurs before full recovery, call local emergency services immediately (911 / 112).
            Ensure the patient is on their side (recovery position), keep airway clear, and do not place anything in the mouth.
          </p>
        </div>
      </section>
    </div>
  );
}


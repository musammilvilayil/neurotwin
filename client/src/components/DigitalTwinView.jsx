import React from 'react';
import {
  Brain, Activity, ShieldCheck, Clock, TrendingUp, AlertTriangle,
  Sparkles, CheckCircle2, Waves, HelpCircle, Layers, Calendar
} from 'lucide-react';
import MultichannelEEGViewer from './MultichannelEEGViewer.jsx';

export default function DigitalTwinView({
  patient,
  overview,
  latestAnalysis,
  patients = [],
  onSelectPatient,
  isBusy
}) {
  const twin = overview?.twin;
  const analyses = overview?.analyses || [];
  const trend = twin?.trend?.toLowerCase() || 'stable';
  const isElevated = trend === 'elevated';
  const isMonitoring = trend === 'monitoring';

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">PATIENT-SPECIFIC DIGITAL TWIN</p>
          <h1>Longitudinal Neurological State Representation</h1>
          <p>
            The NeuroTwin Digital Twin aggregates observed 18-channel EEG recordings over time, creating a real-time
            state representation that tracks longitudinal stability, anomaly recurrence, and therapeutic response.
          </p>
        </div>

        {/* Patient Caseload Selector */}
        <div className="page-header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--nt-text-muted)', fontWeight: 600 }}>Active Subject:</span>
            <select
              className="nt-select"
              style={{ width: 'auto', minWidth: '200px' }}
              value={patient?._id || ''}
              onChange={onSelectPatient}
              disabled={isBusy || patients.length === 0}
            >
              {patients.length === 0 && <option value="">No patients available</option>}
              {patients.map(p => (
                <option value={p._id} key={p._id}>
                  {p.fullName || 'Unnamed patient'} {p.mrn ? `(${p.mrn})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Educational Explainer Banner */}
      <div className="nt-card" style={{ marginBottom: '24px', background: 'radial-gradient(circle at 10% 20%, rgba(54, 184, 245, 0.12) 0%, var(--nt-surface) 100%)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div className="brand-symbol" style={{ width: '42px', height: '42px', flexShrink: 0 }}>
            <Brain size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', margin: '0 0 4px', color: 'var(--nt-text-primary)' }}>
              How the NeuroTwin Digital Twin Works
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--nt-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              The digital twin represents a computational state derived continuously from processed scalp EEG signals.
              It tracks changes against the patient's individual baseline, categorizing trajectories into <b>Stable</b>,
              <b>Monitored</b>, or <b>Elevated Alert</b> states. It does <b>not</b> simulate biological brain tissue,
              but rather provides clinicians with an objective longitudinal summary of electrophysiological patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Top Twin State Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* State Trajectory Card */}
        <div className="nt-card">
          <div className="nt-card-header">
            <div className="nt-card-title">
              <TrendingUp size={18} style={{ color: isElevated ? 'var(--nt-danger)' : 'var(--nt-accent-cyan)' }} />
              <div>
                <h3>Monitored State & Trajectory</h3>
                <p>Derived from recent EEG inferences</p>
              </div>
            </div>
            <span className={`nt-badge ${isElevated ? 'nt-badge-danger' : isMonitoring ? 'nt-badge-warning' : 'nt-badge-success'}`}>
              {trend.toUpperCase()} STATE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '18px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: isElevated ? 'var(--nt-danger-subtle)' : 'var(--nt-cyan-subtle)',
              border: `2px solid ${isElevated ? 'var(--nt-danger)' : 'var(--nt-accent-cyan)'}`,
              color: isElevated ? 'var(--nt-danger)' : 'var(--nt-accent-cyan)',
              flexShrink: 0
            }}>
              <Brain size={36} />
            </div>
            <div>
              <span className="eyebrow">CLINICAL ACTION GUIDANCE</span>
              <h4 style={{ fontSize: '15px', color: 'var(--nt-text-primary)', margin: '4px 0 6px' }}>
                {twin?.state?.clinicalAction || 'Continuous state representation tracking EEG patterns.'}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--nt-text-muted)', margin: 0 }}>
                Subject: <b>{patient?.fullName || 'Patient Record'}</b> {patient?.mrn ? `· MRN: ${patient.mrn}` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'var(--nt-bg-secondary)', padding: '12px 14px', borderRadius: 'var(--nt-radius-md)', border: '1px solid var(--nt-border)' }}>
            <div>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '10.5px', display: 'block' }}>Total Inferences</small>
              <strong style={{ fontSize: '14px', color: 'var(--nt-text-primary)' }}>{analyses.length} sessions</strong>
            </div>
            <div>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '10.5px', display: 'block' }}>Last Recording</small>
              <strong style={{ fontSize: '14px', color: 'var(--nt-text-primary)' }}>
                {twin?.state?.lastUpload ? new Date(twin.state.lastUpload).toLocaleDateString() : (analyses[0] ? new Date(analyses[0].createdAt).toLocaleDateString() : 'None')}
              </strong>
            </div>
            <div>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '10.5px', display: 'block' }}>Baseline State</small>
              <strong style={{ fontSize: '14px', color: isElevated ? 'var(--nt-danger)' : 'var(--nt-success)' }}>
                {isElevated ? 'Elevated Discharges' : 'Stable Background'}
              </strong>
            </div>
          </div>
        </div>

        {/* Clinical History & Context Card */}
        <div className="nt-card">
          <div className="nt-card-header">
            <div className="nt-card-title">
              <ShieldCheck size={18} style={{ color: 'var(--nt-accent-purple)' }} />
              <div>
                <h3>Subject Clinical Profile</h3>
                <p>Documented medical background and conditions</p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <span className="eyebrow">PRIMARY DIAGNOSIS</span>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--nt-text-primary)', marginTop: '2px' }}>
              {patient?.treatment?.diagnosis || (patient?.conditions?.length ? patient.conditions.join(', ') : 'Neurological evaluation in progress')}
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <span className="eyebrow">KNOWN COMORBIDITIES</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {(patient?.conditions && patient.conditions.length > 0) ? (
                patient.conditions.map((c, i) => (
                  <span className="nt-badge nt-badge-neutral" key={i}>{c}</span>
                ))
              ) : (
                <small style={{ color: 'var(--nt-text-muted)' }}>No comorbid conditions documented</small>
              )}
            </div>
          </div>

          <div>
            <span className="eyebrow">TREATMENT PLAN</span>
            <p style={{ fontSize: '12.5px', color: 'var(--nt-text-secondary)', marginTop: '3px', lineHeight: 1.5 }}>
              {patient?.treatment?.treatmentPlan || 'Longitudinal treatment and medication titration regimen entered by clinical care team.'}
            </p>
          </div>
        </div>
      </div>

      {/* Observed vs Model Prediction Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="nt-card">
          <div className="nt-card-header">
            <div className="nt-card-title">
              <Waves size={18} style={{ color: 'var(--nt-accent-cyan)' }} />
              <div>
                <h3>Observed Electrophysiology (Raw Signal)</h3>
                <p>Objective physical EEG data acquired from subject</p>
              </div>
            </div>
          </div>
          <ul style={{ paddingLeft: '18px', color: 'var(--nt-text-secondary)', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><b>18 Bipolar Leads:</b> Standard international 10–20 longitudinal bipolar arrangement.</li>
            <li><b>128 Hz Sampling:</b> Filtered between 0.5 Hz high-pass and 40 Hz low-pass antialiasing.</li>
            <li><b>Artifact Free:</b> Standard impedance checked before recording acquisition.</li>
          </ul>
        </div>

        <div className="nt-card">
          <div className="nt-card-header">
            <div className="nt-card-title">
              <Sparkles size={18} style={{ color: 'var(--nt-accent-purple)' }} />
              <div>
                <h3>Model-Derived Insights (AI Predictions)</h3>
                <p>Pattern recognition via Dilated Temporal Convolutional Network</p>
              </div>
            </div>
          </div>
          <ul style={{ paddingLeft: '18px', color: 'var(--nt-text-secondary)', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><b>Anomaly Scoring:</b> Evaluates 10-second non-overlapping temporal windows.</li>
            <li><b>Consecutive Confirmation:</b> Requires 2+ successive windows above 60% probability.</li>
            <li><b>Spectral Decomposition:</b> Calculates Delta, Theta, Alpha, Beta, Gamma power shifts.</li>
          </ul>
        </div>
      </div>

      {/* Latest Recording Waveform Inspection */}
      {latestAnalysis ? (
        <div>
          <h3 style={{ fontSize: '16px', margin: '0 0 12px', color: 'var(--nt-text-primary)' }}>
            Latest Monitored Recording Waveform
          </h3>
          <MultichannelEEGViewer
            multichannel={latestAnalysis.multichannel || []}
            channels={latestAnalysis.channels || []}
            isSeizure={Number(latestAnalysis.confidence ?? latestAnalysis.probabilities?.maxSeizureScore ?? 0) >= 0.65}
            confidence={Number(latestAnalysis.confidence ?? latestAnalysis.probabilities?.maxSeizureScore ?? 0)}
          />
        </div>
      ) : (
        <div className="nt-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--nt-text-muted)' }}>
          <Brain size={28} style={{ marginBottom: '8px' }} />
          <p>No recent EEG recording found for this patient.</p>
        </div>
      )}
    </div>
  );
}


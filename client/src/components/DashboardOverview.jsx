import React from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Brain, CheckCircle2,
  Clock, Download, Eye, FileDown, FileText, Layers, Plus,
  RefreshCw, ShieldCheck, Sparkles, Upload, Users, Waves, Heart
} from 'lucide-react';
import MultichannelEEGViewer from './MultichannelEEGViewer.jsx';

export default function DashboardOverview({
  user,
  patient,
  dashboard,
  overview,
  modelStatus,
  onOpenUpload,
  onSimulate,
  onOpenNewPatient,
  onInspectAnalysis,
  onDownloadReport,
  onSelectTab,
  uploading
}) {
  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin';
  const isPatientOrCaregiver = user?.role === 'patient' || user?.role === 'caregiver';

  const analyses = overview?.analyses || dashboard?.analyses || [];
  const latestAnalysis = analyses[0] || null;

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(isoString);
    }
  };

  const getGreetingName = () => {
    if (isPatientOrCaregiver && patient?.fullName) {
      return patient.fullName.split(' ')[0];
    }
    return user?.name || user?.username || 'Researcher';
  };

  return (
    <div className="dashboard-overview-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Contextual Welcome Banner */}
      <section className="nt-card nt-card-elevated" style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(17, 27, 43, 0.95), rgba(22, 34, 54, 0.85))',
        border: '1px solid rgba(54, 184, 245, 0.2)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(54, 184, 245, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="nt-badge nt-badge-cyan" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Sparkles size={12} /> {isDoctor ? 'Clinical Decision Support' : isAdmin ? 'Governance Platform' : 'Personal Health Workspace'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <h1 style={{
              fontSize: '26px',
              fontWeight: '700',
              color: 'var(--nt-text-primary)',
              margin: '0 0 10px 0',
              letterSpacing: '-0.02em'
            }}>
              Welcome back, {getGreetingName()}
            </h1>

            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--nt-text-secondary)',
              margin: 0
            }}>
              {isDoctor ? (
                <>
                  Monitoring caseload for <strong>{patient?.fullName || 'Active Subject'}</strong>.
                  Automated 18-channel EEG anomaly detection and temporal confirmation active with research-grade neural models.
                </>
              ) : isAdmin ? (
                <>
                  System operating in high-assurance research mode. Real-time access logging, role authorization, and consent enforcement are active.
                </>
              ) : (
                <>
                  Here is your neurological wellness summary. Review recent monitoring sessions and medication schedules prepared by your care team.
                </>
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {isDoctor && (
              <>
                <button
                  type="button"
                  className="nt-btn nt-btn-primary"
                  onClick={onOpenUpload}
                  disabled={uploading}
                >
                  <Upload size={15} /> Upload EDF EEG
                </button>
                <button
                  type="button"
                  className="nt-btn nt-btn-secondary"
                  onClick={() => onSimulate('normal')}
                  disabled={uploading}
                >
                  <Waves size={15} /> Sim Normal
                </button>
                <button
                  type="button"
                  className="nt-btn nt-btn-secondary"
                  style={{ borderColor: 'rgba(241, 107, 120, 0.4)', color: '#F16B78' }}
                  onClick={() => onSimulate('seizure')}
                  disabled={uploading}
                >
                  <Activity size={15} /> Sim Seizure
                </button>
              </>
            )}

            {isAdmin && (
              <button
                type="button"
                className="nt-btn nt-btn-primary"
                onClick={onOpenNewPatient}
              >
                <Plus size={15} /> Enroll New Subject
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Key Summary Metrics Cards */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        <article className="nt-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Analyses
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(54, 184, 245, 0.12)',
              color: 'var(--nt-cyan)',
              display: 'grid',
              placeItems: 'center'
            }}>
              <Activity size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--nt-text-primary)', marginBottom: '4px' }}>
            {overview?.analyses?.length || dashboard?.counts?.analyses || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
            18-channel EEG runs recorded
          </div>
        </article>

        <article className="nt-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Detected Events
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(241, 107, 120, 0.12)',
              color: '#F16B78',
              display: 'grid',
              placeItems: 'center'
            }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#F16B78', marginBottom: '4px' }}>
            {analyses.filter(a => a.findings?.seizureDetected || a.prediction === 'seizure').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
            Temporally confirmed bursts
          </div>
        </article>

        <article className="nt-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Digital Twin State
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(139, 124, 255, 0.12)',
              color: 'var(--nt-indigo)',
              display: 'grid',
              placeItems: 'center'
            }}>
              <Brain size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--nt-indigo)', marginBottom: '4px', textTransform: 'capitalize' }}>
            {overview?.digitalTwin?.stability || 'Active Tracking'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
            Longitudinal score: {Math.round((overview?.digitalTwin?.wellnessScore || 0.85) * 100)}%
          </div>
        </article>

        <article className="nt-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Model Inference Engine
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: modelStatus?.model_state === 'ready' ? 'rgba(53, 201, 139, 0.12)' : 'rgba(244, 184, 96, 0.12)',
              color: modelStatus?.model_state === 'ready' ? '#35C98B' : '#F4B860',
              display: 'grid',
              placeItems: 'center'
            }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: modelStatus?.model_state === 'ready' ? '#35C98B' : '#F4B860',
            marginBottom: '4px'
          }}>
            {modelStatus?.model_state === 'ready' ? 'Ready (CNN 1D)' : 'Connecting...'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--nt-text-muted)' }}>
            CHB-MIT Trained (18-Ch 128Hz)
          </div>
        </article>
      </section>

      {/* 3. Real 18-Channel Multichannel EEG Signal Viewer */}
      <section className="nt-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="nt-badge nt-badge-cyan" style={{ fontSize: '11px' }}>18-Lead Montage</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
                Multichannel EEG Waveform Monitor
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--nt-text-secondary)' }}>
              {latestAnalysis?.fileName ? `Displaying recording: ${latestAnalysis.fileName}` : 'Showing standard 15-second bipolar 10-20 montage window (128 Hz)'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {latestAnalysis?._id && (
              <button
                type="button"
                className="nt-btn nt-btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => onInspectAnalysis(latestAnalysis)}
              >
                <Eye size={14} /> Full Screen Inspection
              </button>
            )}
          </div>
        </div>

        {/* 18-Lead EEG Viewer Component */}
        <MultichannelEEGViewer
          multichannel={latestAnalysis?.multichannel || []}
          channels={latestAnalysis?.channels || []}
          windowSeconds={15}
          isSeizure={latestAnalysis?.findings?.seizureDetected || latestAnalysis?.prediction === 'seizure'}
        />
      </section>

      {/* 4. Recent EEG Activity Table */}
      <section className="nt-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--nt-text-primary)' }}>
              Recent Recording Analyses
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--nt-text-secondary)' }}>
              Latest 18-channel EEG evaluations with temporal confirmation scores
            </p>
          </div>

          <button
            type="button"
            className="nt-btn nt-btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => onSelectTab('analyses')}
          >
            View All ({analyses.length}) <ArrowUpRight size={13} />
          </button>
        </div>

        {analyses.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '10px',
            border: '1px dashed var(--nt-border)'
          }}>
            <Waves size={36} style={{ color: 'var(--nt-text-muted)', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', color: 'var(--nt-text-primary)' }}>No EEG recordings yet</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--nt-text-secondary)', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              Upload an EDF file or run a simulation to inspect 18-lead waveforms and neural model detections.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="nt-table">
              <thead>
                <tr>
                  <th>Recording / Source</th>
                  <th>Timestamp</th>
                  <th>Duration</th>
                  <th>Model Finding</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {analyses.slice(0, 5).map((item) => {
                  const isSeizure = item.findings?.seizureDetected || item.prediction === 'seizure';
                  const score = item.findings?.confidenceScore ?? item.maxScore ?? (isSeizure ? 0.94 : 0.08);

                  return (
                    <tr key={item._id || item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isSeizure ? '#F16B78' : '#35C98B'
                          }} />
                          <span style={{ fontWeight: '600', color: 'var(--nt-text-primary)' }}>
                            {item.fileName || `Recording_${item._id?.slice(-6)}`}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--nt-text-secondary)', fontSize: '13px' }}>
                        {formatDate(item.createdAt)}
                      </td>
                      <td style={{ color: 'var(--nt-text-secondary)', fontSize: '13px' }}>
                        {item.durationSeconds ? `${Math.round(item.durationSeconds)}s` : '15s'}
                      </td>
                      <td>
                        {isSeizure ? (
                          <span className="nt-badge nt-badge-red">
                            <AlertTriangle size={11} /> Seizure Detected
                          </span>
                        ) : (
                          <span className="nt-badge nt-badge-green">
                            <CheckCircle2 size={11} /> Normal Rhythm
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '48px',
                            height: '6px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.round(score * 100)}%`,
                              height: '100%',
                              background: isSeizure ? '#F16B78' : '#36B8F5'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--nt-text-primary)' }}>
                            {Math.round(score * 100)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`nt-badge ${item.clinicianReview === 'reviewed' ? 'nt-badge-green' : 'nt-badge-gray'}`}>
                          {item.clinicianReview === 'reviewed' ? 'Reviewed' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="nt-btn nt-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            title="Inspect Waveform & Predictions"
                            onClick={() => onInspectAnalysis(item)}
                          >
                            <Eye size={13} /> Inspect
                          </button>
                          <button
                            type="button"
                            className="nt-btn nt-btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '12px' }}
                            title="Download PDF Report"
                            onClick={() => onDownloadReport(item._id, patient?.fullName)}
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Non-Diagnostic Research Disclaimer */}
      <footer style={{
        padding: '16px 20px',
        borderRadius: '10px',
        background: 'rgba(244, 184, 96, 0.06)',
        border: '1px solid rgba(244, 184, 96, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <AlertTriangle size={18} style={{ color: '#F4B860', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--nt-text-secondary)', lineHeight: '1.5' }}>
          <strong>Research and Investigational Device Exemption:</strong> NeuroTwin anomaly scores, digital twin state projections,
          and EEG interpretations are generated by experimental machine-learning algorithms. They do not constitute formal medical diagnoses
          or clinical recommendations and must be verified by a board-certified neurologist or licensed healthcare professional.
        </p>
      </footer>
    </div>
  );
}


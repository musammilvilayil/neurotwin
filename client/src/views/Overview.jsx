import React from 'react';
import {
  Activity, AlertTriangle, Brain, Calendar, CheckCircle2, Clock,
  Cpu, FileText, HeartHandshake, Pill, Plus, ShieldCheck, Sparkles, Upload, Users, Zap,
} from 'lucide-react';
import {
  Badge, Card, CardHead, EmptyState, ErrorState, MetricCard, PageHeader, ResearchNotice, SkeletonCards,
} from '../components/ui.jsx';
import { EEGPanel, ScoreTimeline } from '../components/charts.jsx';
import { AnalysisTable, ResultBadge } from '../components/AnalysisTable.jsx';
import { dateLabel, dayLabel, percent } from '../lib/api.js';
import { confirmedEvents, outcomeKeyOf, previewSeconds, scoreOf, sourceOf, thresholdOf } from '../lib/eeg.js';

export function Overview({
  user,
  dashboard,
  analyses = [],
  patients = [],
  selectedPatientId,
  onSelectPatient,
  overview,
  modelStatus,
  loading,
  error,
  onRetry,
  onNavigate,
  onSimulate,
  simulating,
  onViewAnalysis,
  onDownloadReport,
  onOpenEnroll,
}) {
  const isClinician = ['doctor', 'admin'].includes(user?.role);
  const activePatient = overview?.patient || patients.find((p) => p._id === selectedPatientId) || patients[0];
  const latestAnalysis = (overview?.analyses && overview.analyses[0]) || analyses[0] || null;
  const totalAnalyses = dashboard?.counts?.analyses ?? analyses.length;
  const totalPatients = dashboard?.counts?.patients ?? patients.length;
  const pendingReviews = dashboard?.counts?.pending ?? analyses.filter((a) => a.clinicianReview !== 'reviewed').length;
  const detectedEvents = analyses.filter((a) => outcomeKeyOf(a) === 'confirmed').length;
  const modelReady = modelStatus?.model_state === 'ready';
  const meta = modelStatus?.model_metadata || {};

  const latestChannels = latestAnalysis?.multichannel_waveform?.length
    ? latestAnalysis.multichannel_waveform
    : latestAnalysis?.waveform?.length
      ? [latestAnalysis.waveform]
      : [];
  const latestEvents = latestAnalysis ? confirmedEvents(latestAnalysis) : [];

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="page">
      <PageHeader
        eyebrow={today}
        title={`Welcome back, ${user?.name || 'Researcher'}`}
        subtitle="Multi-channel scalp EEG telemetry, 1D-CNN window classification, and longitudinal digital twin context in one research workspace."
        actions={
          <>
            {isClinician && patients.length > 0 && (
              <label className="row" style={{ gap: 8 }}>
                <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>Active subject:</span>
                <select
                  className="select"
                  style={{ width: 'auto', minWidth: 210 }}
                  value={selectedPatientId || ''}
                  onChange={(e) => onSelectPatient(e.target.value)}
                  aria-label="Select active subject"
                >
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {isClinician && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={Boolean(simulating) || !selectedPatientId}
                  onClick={() => onSimulate('normal')}
                >
                  <Activity size={15} />
                  {simulating === 'normal' ? 'Simulating…' : 'Simulate normal EEG'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={Boolean(simulating) || !selectedPatientId}
                  onClick={() => onSimulate('seizure')}
                >
                  <Zap size={15} />
                  {simulating === 'seizure' ? 'Simulating…' : 'Simulate seizure pattern'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => onNavigate('analyses')}>
                  <Upload size={15} /> Upload EDF recording
                </button>
              </>
            )}
          </>
        }
      />

      <ResearchNotice compact />

      {error && <ErrorState message={error} onRetry={onRetry} />}

      {loading && !dashboard ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="grid grid-4">
          <MetricCard
            label="EEG Analyses"
            value={totalAnalyses}
            sub={`${analyses.length} loaded in workspace`}
            icon={Activity}
            tone="primary"
          />
          <MetricCard
            label="Detected Model Events"
            value={detectedEvents}
            sub="Recordings with ≥ 2 consecutive high windows"
            icon={AlertTriangle}
            tone="danger"
          />
          <MetricCard
            label="Active Subjects"
            value={totalPatients}
            sub={activePatient ? `Selected: ${activePatient.fullName}` : 'No subject selected'}
            icon={Users}
            tone="cyan"
          />
          <MetricCard
            label="ML Inference Engine"
            value={modelReady ? 'Ready' : 'Offline'}
            sub={`${meta.architecture || 'Conv1D'} · v${meta.model_version || '1.0.0'} · ${pendingReviews} pending review`}
            icon={Cpu}
            tone={modelReady ? 'success' : 'warning'}
          />
        </div>
      )}

      {/* Patient / Caregiver Wellness Summary Banner */}
      {overview?.wellness && (
        <Card>
          <div className="between" style={{ gap: 16 }}>
            <div className="row" style={{ gap: 14 }}>
              <div className="metric-icon is-success" style={{ width: 44, height: 44 }}>
                <HeartHandshake size={20} />
              </div>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 650 }}>Subject Continuity & Wellness Summary</h2>
                  <Badge tone={overview.wellness.status === 'Stable' ? 'success' : 'warning'} dot>
                    {overview.wellness.status || 'Monitored'}
                  </Badge>
                </div>
                <p className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>
                  {overview.wellness.summary}
                </p>
              </div>
            </div>
            <div className="row" style={{ gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 11.5, textTransform: 'uppercase', fontWeight: 600 }}>
                  Continuity Index
                </div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>
                  {overview.wellness.score ?? 88}/100
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate('notes')}>
                View care plan
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Primary EEG Signal Inspection Panel */}
      <Card>
        <CardHead
          title={
            latestAnalysis
              ? `Latest EEG Recording — ${sourceOf(latestAnalysis)}`
              : 'Multi-Channel EEG Signal Inspector'
          }
          subtitle={
            latestAnalysis
              ? `${activePatient?.fullName || 'Subject'} · Recorded ${dateLabel(latestAnalysis.createdAt)} · Peak window probability ${percent(scoreOf(latestAnalysis), 1)} (threshold ${percent(thresholdOf(latestAnalysis), 0)})`
              : 'Upload a clinical .edf file or trigger a multi-channel simulation to inspect 18-lead bipolar waveforms.'
          }
          right={
            latestAnalysis && (
              <div className="row" style={{ gap: 8 }}>
                <ResultBadge analysis={latestAnalysis} />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onViewAnalysis(latestAnalysis)}
                >
                  Inspect full analysis
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onDownloadReport(latestAnalysis._id)}
                >
                  PDF Report
                </button>
              </div>
            )
          }
        />

        {latestAnalysis ? (
          <div className="stack">
            <EEGPanel
              channels={latestChannels}
              names={latestAnalysis.session?.channels}
              duration={previewSeconds(latestAnalysis)}
              events={latestEvents}
              height={350}
            />
            {latestAnalysis.timeline?.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div className="between" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Window-level seizure probability ({latestAnalysis.timeline.length} × 10s windows)
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {latestEvents.length} confirmed interval{latestEvents.length === 1 ? '' : 's'}
                  </span>
                </div>
                <ScoreTimeline
                  timeline={latestAnalysis.timeline}
                  threshold={thresholdOf(latestAnalysis)}
                  height={150}
                />
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Activity}
            title="No EEG recordings processed yet"
            body="Upload an EDF recording or run a 18-channel simulation to inspect normalized waveforms and model probability timelines."
            action={
              isClinician && (
                <div className="row">
                  <button type="button" className="btn btn-primary" onClick={() => onNavigate('analyses')}>
                    <Upload size={15} /> Upload EDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!selectedPatientId || Boolean(simulating)}
                    onClick={() => onSimulate('seizure')}
                  >
                    <Zap size={15} /> Run demo simulation
                  </button>
                </div>
              )
            }
          />
        )}
      </Card>

      {/* Recent Analyses + Subject & ML Service Summary */}
      <div className="grid grid-12">
        <div className="col-8">
          <Card>
            <CardHead
              title="Recent EEG Analyses"
              subtitle="Latest recordings evaluated by the CHB-MIT 1D-CNN model"
              right={
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('analyses')}>
                  View all ({analyses.length})
                </button>
              }
            />
            {analyses.length ? (
              <AnalysisTable
                analyses={analyses.slice(0, 6)}
                patients={patients}
                onView={onViewAnalysis}
                onDownload={onDownloadReport}
                compact
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="No analyses available"
                body="Processed EEG recordings will appear here with peak scores, confirmed event counts, and downloadable PDF reports."
              />
            )}
          </Card>
        </div>

        <div className="col-4 stack">
          {/* Active Subject Snapshot */}
          <Card>
            <CardHead
              title="Active Subject Profile"
              subtitle={activePatient ? `MRN ${activePatient.mrn}` : 'Subject context'}
              right={
                isClinician && (
                  <button type="button" className="btn btn-ghost btn-xs" onClick={onOpenEnroll}>
                    <Plus size={14} /> Enroll
                  </button>
                )
              }
            />
            {activePatient ? (
              <div className="stack" style={{ gap: 14 }}>
                <div className="list">
                  <div className="list-row">
                    <span className="muted" style={{ fontSize: 12.5 }}>Subject name</span>
                    <strong>{activePatient.fullName}</strong>
                  </div>
                  <div className="list-row">
                    <span className="muted" style={{ fontSize: 12.5 }}>Date of birth</span>
                    <span className="mono">{dayLabel(activePatient.dob)}</span>
                  </div>
                  <div className="list-row">
                    <span className="muted" style={{ fontSize: 12.5 }}>Research consent</span>
                    <Badge tone={activePatient.consented ? 'success' : 'warning'} dot>
                      {activePatient.consented ? 'Consented' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="list-row">
                    <span className="muted" style={{ fontSize: 12.5 }}>Active medications</span>
                    <span className="mono">
                      {(activePatient.prescriptions || []).filter((r) => r.status !== 'Discontinued').length} active
                    </span>
                  </div>
                </div>
                {(activePatient.conditions || []).length > 0 && (
                  <div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Documented conditions</div>
                    <div className="chip-row">
                      {activePatient.conditions.map((c) => (
                        <span key={c} className="chip">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="row" style={{ gap: 8 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate('twin')}>
                    <Brain size={14} /> Digital Twin
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate('notes')}>
                    <Pill size={14} /> Care Plan & Rx
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No subject enrolled"
                body="Enroll a research subject to attach EEG recordings and longitudinal twin state."
                action={
                  isClinician && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={onOpenEnroll}>
                      <Plus size={14} /> Enroll subject
                    </button>
                  )
                }
              />
            )}
          </Card>

          {/* ML Service Telemetry Card */}
          <Card>
            <CardHead
              title="ML Inference Service"
              subtitle="FastAPI PyTorch microservice telemetry"
              right={
                <Badge tone={modelReady ? 'success' : 'warning'} dot>
                  {modelReady ? 'Online' : 'Degraded'}
                </Badge>
              }
            />
            <div className="list">
              <div className="list-row">
                <span className="muted" style={{ fontSize: 12.5 }}>Architecture</span>
                <span className="mono" style={{ fontSize: 12.5 }}>{meta.architecture || 'SeizureConvNet (1D-CNN)'}</span>
              </div>
              <div className="list-row">
                <span className="muted" style={{ fontSize: 12.5 }}>Training corpus</span>
                <span style={{ fontSize: 12.5 }}>{meta.dataset_name || 'CHB-MIT Scalp EEG'}</span>
              </div>
              <div className="list-row">
                <span className="muted" style={{ fontSize: 12.5 }}>Window / Stride</span>
                <span className="mono" style={{ fontSize: 12.5 }}>
                  {meta.window_seconds || 10}s / {meta.sampling_rate || 128} Hz
                </span>
              </div>
              <div className="list-row">
                <span className="muted" style={{ fontSize: 12.5 }}>Operating threshold</span>
                <span className="mono" style={{ fontSize: 12.5 }}>
                  {percent(meta.threshold ?? 0.6, 0)} ({meta.min_consecutive_windows || 2} windows)
                </span>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('performance')}>
                <ShieldCheck size={14} /> Inspect validation metrics
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

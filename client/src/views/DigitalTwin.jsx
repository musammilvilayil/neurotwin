import React from 'react';
import {
  Activity, AlertTriangle, Brain, Calendar, CheckCircle2, Cpu, FileText, Pill, ShieldCheck, Upload, Zap,
} from 'lucide-react';
import {
  Badge, Card, CardHead, EmptyState, Meter, MetricCard, PageHeader, ResearchNotice,
} from '../components/ui.jsx';
import { EEGPanel, LineChart, ScoreTimeline } from '../components/charts.jsx';
import { AnalysisTable, ResultBadge } from '../components/AnalysisTable.jsx';
import { dateLabel, dayLabel, percent, clock } from '../lib/api.js';
import { confirmedEvents, durationOf, outcomeKeyOf, previewSeconds, scoreOf, sourceOf, thresholdOf } from '../lib/eeg.js';

export function DigitalTwin({
  user,
  patients = [],
  selectedPatientId,
  onSelectPatient,
  overview,
  analyses = [],
  onNavigate,
  onSimulate,
  simulating,
  onViewAnalysis,
  onDownloadReport,
}) {
  const isClinician = ['doctor', 'admin'].includes(user?.role);
  const safePatients = Array.isArray(patients) ? patients : [];
  const safeAnalyses = Array.isArray(analyses) ? analyses : (Array.isArray(analyses?.analyses) ? analyses.analyses : []);
  const patient = overview?.patient || safePatients.find((p) => p._id === selectedPatientId) || safePatients[0];
  const twin = overview?.twin || null;
  const subjectAnalyses = overview?.analyses?.length
    ? overview.analyses
    : safeAnalyses.filter((a) => (a.patient?._id || a.patient) === patient?._id);

  const latest = subjectAnalyses[0] || null;
  const latestChannels = latest?.multichannel_waveform?.length
    ? latest.multichannel_waveform
    : latest?.waveform?.length
      ? [latest.waveform]
      : [];
  const latestEvents = latest ? confirmedEvents(latest) : [];
  const confirmedCount = subjectAnalyses.filter((a) => outcomeKeyOf(a) === 'confirmed').length;
  const maxPeak = subjectAnalyses.reduce((m, a) => Math.max(m, scoreOf(a)), 0);
  const activeRx = (patient?.prescriptions || []).filter((r) => r.status !== 'Discontinued');

  // Chronological series of peak scores across sessions
  const chrono = [...subjectAnalyses].reverse();
  const trendSeries = [
    {
      label: 'Peak window probability',
      color: '#2563EB',
      values: chrono.map((a) => scoreOf(a)),
    },
    {
      label: 'Detection threshold',
      color: '#DC535B',
      values: chrono.map((a) => thresholdOf(a)),
    },
  ];
  const trendLabels = chrono.map((a, idx) => `#${idx + 1}`);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Longitudinal Subject Representation"
        title={`EEG Digital Twin — ${patient?.fullName || 'Select Subject'}`}
        subtitle="Separates recorded scalp electrophysiology and documented care context from model-generated seizure probability trajectories."
        actions={
          <>
            {isClinician && patients.length > 0 && (
              <select
                className="select"
                style={{ width: 'auto', minWidth: 220 }}
                value={selectedPatientId || ''}
                onChange={(e) => onSelectPatient(e.target.value)}
                aria-label="Select subject for Digital Twin"
              >
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.fullName} ({p.mrn})
                  </option>
                ))}
              </select>
            )}
            {isClinician && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={Boolean(simulating) || !selectedPatientId}
                  onClick={() => onSimulate('seizure')}
                >
                  <Zap size={15} />
                  {simulating === 'seizure' ? 'Simulating…' : 'Simulate seizure session'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => onNavigate('analyses')}>
                  <Upload size={15} /> Upload EDF
                </button>
              </>
            )}
          </>
        }
      />

      <ResearchNotice compact />

      {!patient ? (
        <EmptyState
          icon={Brain}
          title="No subject selected"
          body="Select or enroll a research subject to inspect their longitudinal EEG Digital Twin."
        />
      ) : (
        <>
          <div className="grid grid-4">
            <MetricCard
              label="Twin Trajectory State"
              value={twin?.trend ? twin.trend.replace(/_/g, ' ') : latest ? 'Monitored' : 'Baseline'}
              sub={twin?.updatedAt ? `Updated ${dateLabel(twin.updatedAt)}` : 'Longitudinal state'}
              icon={Brain}
              tone={twin?.trend === 'elevated_seizure_risk' ? 'danger' : 'primary'}
            />
            <MetricCard
              label="Recorded EEG Sessions"
              value={subjectAnalyses.length}
              sub={`${confirmedCount} with confirmed model events`}
              icon={Activity}
              tone="cyan"
            />
            <MetricCard
              label="Historical Peak Score"
              value={subjectAnalyses.length ? percent(maxPeak, 1) : '—'}
              sub="Highest 10s window probability"
              icon={AlertTriangle}
              tone={maxPeak >= 0.6 ? 'warning' : 'success'}
            />
            <MetricCard
              label="Active Regimen"
              value={`${activeRx.length} Rx`}
              sub={patient.primaryDiagnosis || (patient.conditions || [])[0] || 'Documented care plan'}
              icon={Pill}
              tone="purple"
            />
          </div>

          {/* Explicit separation: Observed Recorded Data vs Model-Generated Insights */}
          <div className="twin-split">
            <Card>
              <CardHead
                title="Observed Electrophysiology & Clinical Context"
                subtitle="Directly measured scalp telemetry and clinician-documented subject records"
                right={<Badge tone="info" dot>Recorded Ground Truth</Badge>}
              />
              <div className="stack" style={{ gap: 14 }}>
                <dl className="kv">
                  <div>
                    <dt>Subject & MRN</dt>
                    <dd>{patient.fullName} ({patient.mrn})</dd>
                  </div>
                  <div>
                    <dt>Date of birth</dt>
                    <dd className="mono">{dayLabel(patient.dob)}</dd>
                  </div>
                  <div>
                    <dt>Primary diagnosis</dt>
                    <dd>{patient.treatment?.diagnosis || patient.primaryDiagnosis || (patient.conditions || [])[0] || 'Under evaluation'}</dd>
                  </div>
                  <div>
                    <dt>Research consent</dt>
                    <dd>
                      <Badge tone={patient.consented ? 'success' : 'warning'}>
                        {patient.consented ? 'Active consent' : 'Pending'}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt>Latest recording</dt>
                    <dd className="mono">{latest ? sourceOf(latest) : 'None'}</dd>
                  </div>
                  <div>
                    <dt>Signal specification</dt>
                    <dd className="mono">
                      {latest
                        ? `${latest.session?.samplingRate || 128} Hz · ${Array.isArray(latest.session?.channels) ? latest.session.channels.length : (latest.session?.channels || 18)} leads`
                        : '128 Hz · 18 leads'}
                    </dd>
                  </div>
                </dl>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div className="between" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>
                      Active Anti-Epileptic Regimen ({activeRx.length})
                    </span>
                    <button type="button" className="btn btn-xs btn-ghost" onClick={() => onNavigate('notes')}>
                      Manage regimen
                    </button>
                  </div>
                  {activeRx.length ? (
                    <div className="chip-row">
                      {activeRx.map((rx, idx) => (
                        <span key={rx._id || idx} className="chip">
                          <strong>{rx.medicineName}</strong> · {rx.dosage} ({rx.frequency})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="muted" style={{ fontSize: 13 }}>No active medications recorded.</span>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <CardHead
                title="Model-Generated Insights & Twin State"
                subtitle="Statistical outputs from the CHB-MIT 1D-CNN model (non-diagnostic)"
                right={<Badge tone="purple" dot>AI Model Inference</Badge>}
              />
              <div className="stack" style={{ gap: 14 }}>
                <div className="list">
                  <div className="list-row">
                    <span className="muted" style={{ fontSize: 13 }}>Latest classification</span>
                    {latest ? <ResultBadge analysis={latest} /> : <Badge tone="neutral">Awaiting EEG</Badge>}
                  </div>
                  <div className="list-row">
                    <span className="muted" style={{ fontSize: 13 }}>Latest peak window score</span>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {latest ? percent(scoreOf(latest), 1) : '—'}
                    </span>
                  </div>
                  <div className="list-row">
                    <span className="muted" style={{ fontSize: 13 }}>Confirmed intervals (latest)</span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {latest ? `${latestEvents.length} interval(s)` : '0'}
                    </span>
                  </div>
                  <div className="list-row">
                    <span className="muted" style={{ fontSize: 13 }}>Recommended research action</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {twin?.state?.clinicalAction ||
                        (latestEvents.length
                          ? 'Prioritize neurologist review of flagged intervals'
                          : 'Continue routine longitudinal EEG monitoring')}
                    </span>
                  </div>
                </div>

                {latest && (
                  <div>
                    <div className="between" style={{ fontSize: 12, marginBottom: 6 }}>
                      <span className="muted">Peak window probability vs. operating threshold ({percent(thresholdOf(latest), 0)})</span>
                      <span className="mono">{percent(scoreOf(latest), 1)}</span>
                    </div>
                    <Meter
                      value={scoreOf(latest) * 100}
                      tone={scoreOf(latest) >= thresholdOf(latest) ? 'danger' : 'primary'}
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Longitudinal Trajectory + Latest Waveform */}
          <div className="grid grid-12">
            <div className="col-5">
              <Card>
                <CardHead
                  title="Longitudinal Seizure Probability Trajectory"
                  subtitle="Peak 10-second window probability across sequential EEG sessions"
                />
                {chrono.length > 0 ? (
                  <LineChart series={trendSeries} xLabels={trendLabels} height={260} yMin={0} yMax={1} />
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="No longitudinal trajectory yet"
                    body="Process one or more EEG sessions for this subject to plot their probability trajectory."
                  />
                )}
              </Card>
            </div>

            <div className="col-7">
              <Card>
                <CardHead
                  title={latest ? `Latest Session Montage — ${sourceOf(latest)}` : '18-Lead Bipolar Montage'}
                  subtitle={
                    latest
                      ? `Recorded ${dateLabel(latest.createdAt)} · Duration ${clock(durationOf(latest))}`
                      : 'No session available for this subject'
                  }
                  right={
                    latest && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewAnalysis(latest)}
                      >
                        Inspect session
                      </button>
                    )
                  }
                />
                {latest ? (
                  <EEGPanel
                    channels={latestChannels}
                    names={latest.session?.channels}
                    duration={previewSeconds(latest)}
                    events={latestEvents}
                    height={280}
                  />
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="No waveform recorded for this subject"
                    body="Upload an EDF file or run a simulated recording to populate the Digital Twin montage."
                  />
                )}
              </Card>
            </div>
          </div>

          {/* Subject Recording History */}
          <Card>
            <CardHead
              title={`Longitudinal EEG Session History — ${patient.fullName}`}
              subtitle={`${subjectAnalyses.length} total recording(s) linked to this Digital Twin`}
            />
            {subjectAnalyses.length ? (
              <AnalysisTable
                analyses={subjectAnalyses}
                patients={patients}
                onView={onViewAnalysis}
                onDownload={onDownloadReport}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="No EEG sessions linked to this subject"
                body="Upload an EDF recording or trigger a simulation to build longitudinal history."
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}

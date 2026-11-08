import React, { useState, useMemo, useRef } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, FileText, Filter, Search,
  Sliders, Trash2, Upload, X, Zap,
} from 'lucide-react';
import {
  Alert, Badge, Card, CardHead, EmptyState, Field, PageHeader, ResearchNotice,
} from '../components/ui.jsx';
import { EEGPanel, ScoreTimeline } from '../components/charts.jsx';
import { AnalysisTable, ResultBadge, ReviewBadge } from '../components/AnalysisTable.jsx';
import { MAX_UPLOAD_BYTES, dateLabel, fileSize, percent, clock, uploadWithProgress } from '../lib/api.js';
import {
  confirmedEvents, durationOf, eventsAt, outcomeKeyOf, patientOf, previewSeconds, scoreOf, sourceOf, thresholdOf,
} from '../lib/eeg.js';

const STAGES = [
  'Select EEG file',
  'Validate file',
  'Upload & preprocess',
  'Inspect signal',
  'Run model inference',
  'Display results',
];

export function Analyses({
  mode = 'analyses', // 'analyses' or 'detection'
  user,
  analyses = [],
  patients = [],
  selectedPatientId,
  onSelectPatient,
  onUploaded,
  onSimulate,
  simulating,
  onViewAnalysis,
  onDownloadReport,
  onToggleReview,
}) {
  const isClinician = ['doctor', 'admin'].includes(user?.role);
  const safeAnalyses = Array.isArray(analyses) ? analyses : (Array.isArray(analyses?.analyses) ? analyses.analyses : []);
  const safePatients = Array.isArray(patients) ? patients : [];
  const fileRef = useRef(null);

  // Upload workflow state
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [stage, setStage] = useState(0); // 0=idle, 1..6=stage index
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [latestResult, setLatestResult] = useState(null);

  // Archive filters
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState(mode === 'detection' ? 'flagged' : 'all');
  const [reviewFilter, setReviewFilter] = useState('all');

  // Detection workbench state
  const [focusedId, setFocusedId] = useState('');
  const [inspectThreshold, setInspectThreshold] = useState(null);

  const focusedAnalysis = useMemo(() => {
  const found = safeAnalyses.find((a) => a._id === focusedId);
  return found || latestResult || safeAnalyses[0] || null;
}, [safeAnalyses, focusedId, latestResult]);

const effectiveThreshold = inspectThreshold ?? (focusedAnalysis ? thresholdOf(focusedAnalysis) : 0.6);

const pickFile = (candidate) => {
  setUploadError('');
  if (!candidate) return;
  const name = candidate.name || '';
  if (!name.toLowerCase().endsWith('.edf')) {
    setUploadError('Unsupported format. Please select a European Data Format (.edf) EEG recording.');
    setStage(2);
    return;
  }
  if (candidate.size > MAX_UPLOAD_BYTES) {
    setUploadError(`File size (${fileSize(candidate.size)}) exceeds the 100 MB maximum upload limit.`);
    setStage(2);
    return;
  }
  if (candidate.size < 256) {
    setUploadError('The selected .edf file appears empty or truncated.');
    setStage(2);
    return;
  }
  setFile(candidate);
  setStage(2);
};

const clearFile = () => {
  setFile(null);
  setUploadError('');
  setStage(0);
  setProgress(0);
  if (fileRef.current) fileRef.current.value = '';
};

const handleUpload = async (e) => {
  e.preventDefault();
  if (!file) {
    setUploadError('Select a valid .edf recording before starting inference.');
    return;
  }
  if (!selectedPatientId) {
    setUploadError('Select a research subject to associate with this EEG recording.');
    return;
  }

  setUploadError('');
  setStage(3);
  setProgress(5);

  const formData = new FormData();
  formData.append('eeg', file);
  formData.append('patientId', selectedPatientId);

  try {
    const token = localStorage.getItem('neurotwin_token');
    const created = await uploadWithProgress('/api/eeg/upload', {
      token,
      formData,
      onProgress: (pct) => {
        setProgress(pct);
        if (pct >= 98) setStage(5);
        else if (pct >= 65) setStage(4);
      },
    });
    const doc = created?.analysis
      ? { ...created.analysis, session: created.session || created.analysis.session }
      : created;
    setStage(6);
    setProgress(100);
    setLatestResult(doc);
    setFocusedId(doc?._id || '');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    if (onUploaded) await onUploaded(doc);
  } catch (err) {
    setUploadError(err.message || 'EEG upload and model inference failed.');
  }
};

const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();
    return safeAnalyses.filter((a) => {
      const p = patientOf(a, safePatients);
      const outcome = outcomeKeyOf(a);
      if (subjectFilter !== 'all' && (p?._id || a.patient) !== subjectFilter) return false;
      if (outcomeFilter === 'flagged' && outcome === 'normal') return false;
      if (outcomeFilter === 'confirmed' && outcome !== 'confirmed') return false;
      if (outcomeFilter === 'elevated' && outcome !== 'high') return false;
      if (outcomeFilter === 'normal' && outcome !== 'normal') return false;
      if (reviewFilter === 'pending' && a.clinicianReview === 'reviewed') return false;
      if (reviewFilter === 'reviewed' && a.clinicianReview !== 'reviewed') return false;
      if (!q) return true;
      const hay = `${sourceOf(a)} ${p?.fullName || ''} ${p?.mrn || ''} ${a.label || ''}`.toLowerCase();
      return hay.includes(q);
    });
}, [safeAnalyses, safePatients, query, subjectFilter, outcomeFilter, reviewFilter]);

const inspectedEvents = focusedAnalysis ? eventsAt(focusedAnalysis, effectiveThreshold, 2) : [];
const focusedChannels = focusedAnalysis?.multichannel_waveform?.length
  ? focusedAnalysis.multichannel_waveform
  : focusedAnalysis?.waveform?.length
    ? [focusedAnalysis.waveform]
    : [];

return (
  <div className="page">
    <PageHeader
      eyebrow={mode === 'detection' ? 'Seizure Detection Workbench' : 'EEG Signal & Inference Pipeline'}
      title={mode === 'detection' ? 'Seizure Detection & Event Review' : 'EEG Upload & Signal Analysis'}
      subtitle={
        mode === 'detection'
          ? 'Inspect window-level seizure probability scores, tune sensitivity thresholds, and verify candidate intervals across 18 bipolar channels.'
          : 'Upload 18-lead European Data Format (.edf) recordings up to 100 MB, run 1D-CNN window classification, and inspect normalized EEG waveforms.'
      }
      actions={
        isClinician && (
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
          </>
        )
      }
    />

    <ResearchNotice compact />

    {/* EEG Upload Pipeline Card (shown on EEG Analysis tab for clinicians) */}
    {isClinician && mode === 'analyses' && (
      <Card>
        <CardHead
          title="Upload Clinical EDF Recording"
          subtitle="18-channel bipolar montage (FP1-F7 … FZ-CZ, CZ-PZ) resampled to 128 Hz, 0.5–40 Hz bandpass filtered, and segmented into 10-second windows."
          right={<Badge tone="info">Max 100 MB · .edf</Badge>}
        />

        <ol className="steps" style={{ marginBottom: 20 }}>
          {STAGES.map((label, idx) => {
            const stepNum = idx + 1;
            let cls = 'step';
            if (uploadError && stepNum === stage) cls += ' is-error';
            else if (stage > stepNum || stage === 6) cls += ' is-done';
            else if (stage === stepNum) cls += ' is-active';
            return (
              <li key={label} className={cls}>
                <b>{label}</b>
              </li>
            );
          })}
        </ol>

        <form onSubmit={handleUpload} className="stack">
          <div className="grid grid-12" style={{ alignItems: 'stretch' }}>
            <div className="col-4 stack">
              <Field label="Target Subject" hint="Recording and Digital Twin metrics will attach to this subject">
                <select
                  className="select"
                  value={selectedPatientId || ''}
                  onChange={(e) => onSelectPatient(e.target.value)}
                  required
                >
                  <option value="" disabled>Select subject…</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="card card-sm card-subtle">
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Preprocessing Specification</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: 'var(--text-2)' }}>
                  <li>Standard 18-lead CHB-MIT longitudinal bipolar montage</li>
                  <li>0.5–40 Hz zero-phase Butterworth bandpass</li>
                  <li>128 Hz resampling & per-channel z-score normalization</li>
                  <li>10-second non-overlapping windows (1,280 samples/window)</li>
                </ul>
              </div>
            </div>

            <div className="col-8 stack" style={{ justifyContent: 'space-between' }}>
              <input
                ref={fileRef}
                type="file"
                accept=".edf,application/octet-stream"
                style={{ display: 'none' }}
                onChange={(e) => pickFile(e.target.files?.[0])}
              />

              {!file ? (
                <div
                  role="button"
                  tabIndex={0}
                  className={`dropzone ${drag ? 'is-drag' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    pickFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  <div className="dropzone-icon">
                    <Upload size={22} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 14.5 }}>Drop an .edf recording here, or click to browse</strong>
                    <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                      Supports standard European Data Format (.edf) scalp EEG recordings up to 100 MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="file-pill">
                  <div className="row" style={{ gap: 12 }}>
                    <div className="dropzone-icon" style={{ width: 40, height: 40 }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: 14 }}>{file.name}</strong>
                      <span className="muted mono" style={{ fontSize: 12 }}>
                        {fileSize(file.size)} · Ready for 18-lead extraction & 1D-CNN inference
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={clearFile}
                    disabled={stage >= 3 && stage < 6}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              )}

              {stage >= 3 && stage < 6 && (
                <div className="stack" style={{ gap: 6 }}>
                  <div className="between" style={{ fontSize: 12.5 }}>
                    <span style={{ fontWeight: 600 }}>
                      {stage === 3
                        ? 'Uploading & parsing EDF header…'
                        : stage === 4
                          ? 'Applying 0.5–40 Hz bandpass & segmenting 10s windows…'
                          : 'Running 1D-CNN window classification…'}
                    </span>
                    <span className="mono">{progress}%</span>
                  </div>
                  <div className={`progress ${progress >= 98 ? 'is-indeterminate' : ''}`}>
                    <div className="progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {uploadError && (
                <Alert tone="danger" title="EEG Upload Error">
                  {uploadError}
                </Alert>
              )}

              <div className="between">
                <span className="muted" style={{ fontSize: 12.5 }}>
                  No local EDF handy? Use <strong>Simulate normal EEG</strong> or <strong>Simulate seizure pattern</strong> above.
                </span>
                <div className="row">
                  {file && (
                    <button type="button" className="btn btn-secondary" onClick={clearFile}>
                      Reset
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!file || !selectedPatientId || (stage >= 3 && stage < 6)}
                  >
                    <Upload size={15} />
                    {stage >= 3 && stage < 6 ? 'Processing EEG…' : 'Upload & run inference'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Card>
    )}

    {/* Interactive Signal & Seizure Detection Inspector */}
    {focusedAnalysis && (
      <Card>
        <CardHead
          title={`Active Recording Inspection — ${sourceOf(focusedAnalysis)}`}
          subtitle={`${patientOf(focusedAnalysis, patients)?.fullName || 'Subject'} · ${dateLabel(focusedAnalysis.createdAt)} · Duration ${clock(durationOf(focusedAnalysis))}`}
          right={
            <div className="row" style={{ gap: 10 }}>
              <label className="row" style={{ gap: 6 }}>
                <span className="muted" style={{ fontSize: 12 }}>Recording:</span>
                <select
                  className="select"
                  style={{ width: 'auto', minWidth: 220, height: 34 }}
                  value={focusedAnalysis._id}
                  onChange={(e) => {
                    setFocusedId(e.target.value);
                    setInspectThreshold(null);
                  }}
                >
                    {
                      safeAnalyses.map((a) => (
                        <option key={a._id} value={a._id}>
                          {sourceOf(a)} — {percent(scoreOf(a), 0)} ({dateLabel(a.createdAt)})
                        </option>
                      ))
                    }
                  </select>
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onViewAnalysis(focusedAnalysis)}
              >
                Open full report modal
              </button>
            </div>
          }
        />

        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <div className="card card-sm card-subtle">
            <span className="muted" style={{ fontSize: 12 }}>Classification</span>
            <div style={{ marginTop: 6 }}>
              <ResultBadge analysis={focusedAnalysis} />
            </div>
          </div>
          <div className="card card-sm card-subtle">
            <span className="muted" style={{ fontSize: 12 }}>Peak window score</span>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              {percent(scoreOf(focusedAnalysis), 1)}
            </div>
          </div>
          <div className="card card-sm card-subtle">
            <span className="muted" style={{ fontSize: 12 }}>Flagged intervals (≥ 2 windows)</span>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              {inspectedEvents.length}
            </div>
          </div>
          <div className="card card-sm card-subtle">
            <span className="muted" style={{ fontSize: 12 }}>Review status</span>
            <div className="between" style={{ marginTop: 6 }}>
              <ReviewBadge status={focusedAnalysis.clinicianReview} />
              {isClinician && onToggleReview && (
                <button
                  type="button"
                  className="btn btn-xs btn-secondary"
                  onClick={() =>
                    onToggleReview(
                      focusedAnalysis._id,
                      focusedAnalysis.clinicianReview === 'reviewed' ? 'pending' : 'reviewed',
                    )
                  }
                >
                  Toggle
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="stack">
          <div>
            <div className="between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Window-level seizure probability timeline ({(focusedAnalysis.timeline || []).length} × 10s windows)
              </span>
              <div className="row" style={{ gap: 8 }}>
                <Sliders size={14} className="muted" />
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                  Sensitivity threshold: {percent(effectiveThreshold, 0)}
                </span>
                <input
                  type="range"
                  min="0.40"
                  max="0.85"
                  step="0.05"
                  value={effectiveThreshold}
                  onChange={(e) => setInspectThreshold(Number(e.target.value))}
                  style={{ width: 120 }}
                  aria-label="Sensitivity threshold"
                />
              </div>
            </div>
            <ScoreTimeline
              timeline={focusedAnalysis.timeline || []}
              threshold={effectiveThreshold}
              height={170}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div className="between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                18-Lead Bipolar Montage Waveform ({focusedChannels.length} channels)
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {typeof focusedAnalysis.session?.preprocessing === 'object'
                  ? focusedAnalysis.session.preprocessing.pipeline
                  : (focusedAnalysis.session?.preprocessing || '0.5–40 Hz bandpass + per-channel z-score')}
              </span>
            </div>
            <EEGPanel
              channels={focusedChannels}
              names={focusedAnalysis.session?.channels}
              duration={previewSeconds(focusedAnalysis)}
              events={inspectedEvents}
              height={340}
            />
          </div>
        </div>
      </Card>
    )}

    {/* Filterable Archive Table */}
    <Card>
      <CardHead
        title="Processed EEG Analyses Archive"
        subtitle={`Showing ${filtered.length} of ${safeAnalyses.length} recordings`}
      />

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="toolbar-left">
          <div className="search" style={{ minWidth: 260 }}>
            <Search size={15} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by file name, subject, or MRN…"
              aria-label="Filter analyses"
            />
          </div>

          <select
            className="select"
            style={{ width: 'auto' }}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Filter by subject"
          >
            <option value="all">All subjects</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>{p.fullName}</option>
            ))}
          </select>

          <select
            className="select"
            style={{ width: 'auto' }}
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            aria-label="Filter by model result"
          >
            <option value="all">All model results</option>
            <option value="flagged">Flagged (confirmed + elevated)</option>
            <option value="confirmed">Confirmed events only</option>
            <option value="elevated">High single-window only</option>
            <option value="normal">Normal baseline only</option>
          </select>

          <select
            className="select"
            style={{ width: 'auto' }}
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            aria-label="Filter by clinician review"
          >
            <option value="all">All review states</option>
            <option value="pending">Pending review</option>
            <option value="reviewed">Clinician reviewed</option>
          </select>
        </div>

        {(query || subjectFilter !== 'all' || outcomeFilter !== 'all' || reviewFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setQuery('');
              setSubjectFilter('all');
              setOutcomeFilter('all');
              setReviewFilter('all');
            }}
          >
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      {filtered.length ? (
        <AnalysisTable
          analyses={filtered}
          patients={patients}
          onView={onViewAnalysis}
          onDownload={onDownloadReport}
        />
      ) : (
        <EmptyState
          icon={Filter}
          title="No matching EEG analyses"
          body="Adjust your search or filter criteria, or upload a new EDF recording above."
        />
      )}
    </Card>
  </div>
);
}

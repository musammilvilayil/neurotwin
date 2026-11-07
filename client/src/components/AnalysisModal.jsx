import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Download, Sliders, Activity, AlertTriangle } from 'lucide-react';
import { Modal, Card, CardHead, Badge, ResearchNotice } from './ui.jsx';
import { EEGPanel, ScoreTimeline } from './charts.jsx';
import { ResultBadge, ReviewBadge } from './AnalysisTable.jsx';
import { dateLabel, percent, clock } from '../lib/api.js';
import { scoreOf, thresholdOf, eventsAt, durationOf, previewSeconds, patientOf, sourceOf } from '../lib/eeg.js';

export function AnalysisModal({ analysis, patients = [], role, onClose, onDownload, onToggleReview }) {
  const baseThreshold = analysis ? thresholdOf(analysis) : 0.6;
  const [threshold, setThreshold] = useState(baseThreshold);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (analysis) setThreshold(thresholdOf(analysis));
  }, [analysis]);

  if (!analysis) return null;

  const patient = patientOf(analysis, patients);
  const score = scoreOf(analysis);
  const events = eventsAt(analysis, threshold, 2);
  const confirmedAtDefault = eventsAt(analysis, baseThreshold, 2);
  const totalSec = durationOf(analysis);
  const previewSec = previewSeconds(analysis);
  const channels = analysis.multichannel_waveform?.length
    ? analysis.multichannel_waveform
    : analysis.waveform?.length
      ? [analysis.waveform]
      : [];
  const channelNames = analysis.session?.channels;
  const isReviewed = analysis.clinicianReview === 'reviewed';
  const canReview = ['doctor', 'admin'].includes(role);

  const handleReviewToggle = async () => {
    if (!onToggleReview) return;
    setBusy(true);
    try {
      await onToggleReview(analysis._id, isReviewed ? 'pending' : 'reviewed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(analysis)}
      onClose={onClose}
      wide
      title={`EEG Analysis — ${sourceOf(analysis)}`}
      subtitle={`${patient?.fullName || 'Unassigned subject'}${patient?.mrn ? ` (${patient.mrn})` : ''} · Processed ${dateLabel(analysis.createdAt)}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {canReview && onToggleReview && (
            <button
              type="button"
              className={`btn ${isReviewed ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleReviewToggle}
              disabled={busy}
            >
              {isReviewed ? <Clock size={15} /> : <CheckCircle2 size={15} />}
              {isReviewed ? 'Mark pending review' : 'Mark clinician reviewed'}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => onDownload(analysis._id)}>
            <Download size={15} /> Download PDF report
          </button>
        </>
      }
    >
      <div className="stack">
        <ResearchNotice compact />

        <div className="grid grid-4">
          <div className="card card-sm">
            <span className="muted" style={{ fontSize: 12 }}>Model output</span>
            <div style={{ marginTop: 6 }}>
              <ResultBadge analysis={analysis} />
            </div>
          </div>
          <div className="card card-sm">
            <span className="muted" style={{ fontSize: 12 }}>Peak window probability</span>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }} className="mono">
              {percent(score, 1)}
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Default threshold {percent(baseThreshold, 0)}</span>
          </div>
          <div className="card card-sm">
            <span className="muted" style={{ fontSize: 12 }}>Confirmed events</span>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }} className="mono">
              {confirmedAtDefault.length}
            </div>
            <span className="muted" style={{ fontSize: 12 }}>≥ 2 consecutive 10s windows</span>
          </div>
          <div className="card card-sm">
            <span className="muted" style={{ fontSize: 12 }}>Clinician review</span>
            <div style={{ marginTop: 6 }}>
              <ReviewBadge status={analysis.clinicianReview} />
            </div>
            <span className="muted" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              Model {analysis.modelVersion || '1.0.0'}
            </span>
          </div>
        </div>

        <Card>
          <CardHead
            title="Window probability timeline & interactive threshold"
            subtitle={`Recording span ${clock(totalSec)} (${(analysis.timeline || []).length} windows × 10s). Drag the sensitivity slider to inspect candidate intervals at different thresholds.`}
            right={
              <div className="row" style={{ gap: 10 }}>
                <Sliders size={15} className="muted" />
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Threshold: {percent(threshold, 0)}</span>
                <input
                  type="range"
                  min="0.40"
                  max="0.85"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  aria-label="Inspect sensitivity threshold"
                  style={{ width: 120 }}
                />
                {Math.abs(threshold - baseThreshold) > 0.001 && (
                  <button type="button" className="btn btn-xs btn-ghost" onClick={() => setThreshold(baseThreshold)}>
                    Reset
                  </button>
                )}
              </div>
            }
          />
          <ScoreTimeline timeline={analysis.timeline || []} threshold={threshold} />
        </Card>

        <div className="grid grid-2">
          <Card>
            <CardHead
              title="Flagged seizure-like intervals"
              subtitle={`Intervals with ≥ 2 consecutive windows at or above ${percent(threshold, 0)}`}
              right={<Badge tone={events.length ? 'danger' : 'success'}>{events.length} interval{events.length === 1 ? '' : 's'}</Badge>}
            />
            {events.length ? (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Start – End</th>
                      <th>Duration</th>
                      <th>Windows</th>
                      <th className="num">Peak score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, i) => (
                      <tr key={ev.start}>
                        <td><Badge tone="danger" dot>Interval #{i + 1}</Badge></td>
                        <td className="mono">{clock(ev.start)} – {clock(ev.end)}</td>
                        <td className="mono">{ev.duration}s</td>
                        <td className="mono">{ev.windows}</td>
                        <td className="num mono">{percent(ev.peak, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="row" style={{ padding: '12px 0', color: 'var(--text-2)' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                <span>No sustained multi-window intervals met the {percent(threshold, 0)} threshold.</span>
              </div>
            )}
          </Card>

          <Card>
            <CardHead
              title="Signal & model metadata"
              subtitle="Preprocessing pipeline and explanatory notes"
            />
            <dl className="kv" style={{ marginBottom: 14 }}>
              <div>
                <dt>Sampling rate</dt>
                <dd className="mono">{analysis.session?.samplingRate || 128} Hz</dd>
              </div>
              <div>
                <dt>Montage leads</dt>
                <dd className="mono">{analysis.session?.channels?.length || channels.length || 18} channels</dd>
              </div>
              <div>
                <dt>Preprocessing</dt>
                <dd>{analysis.session?.preprocessing || '0.5–40 Hz bandpass + per-channel z-score'}</dd>
              </div>
              <div>
                <dt>Model state</dt>
                <dd><Badge tone="info">{analysis.modelState || 'ready'}</Badge></dd>
              </div>
            </dl>
            {(analysis.explanation || []).length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  Model explanation notes
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)', fontSize: 13 }}>
                  {analysis.explanation.map((item, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHead
            title="Multi-channel EEG waveform inspection"
            subtitle="Normalized 18-lead longitudinal bipolar montage (z-score amplitude)"
            right={<Badge tone="neutral"><Activity size={13} /> {channels.length || 0} leads</Badge>}
          />
          <EEGPanel
            channels={channels}
            names={channelNames}
            duration={previewSec}
            events={events}
            height={380}
          />
        </Card>
      </div>
    </Modal>
  );
}


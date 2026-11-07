import React, { useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Cpu, ShieldCheck,
} from 'lucide-react';
import {
  Badge, Card, CardHead, Meter, MetricCard, PageHeader, ResearchNotice, Tabs,
} from '../components/ui.jsx';
import { LineChart } from '../components/charts.jsx';
import { evaluation, limitations } from '../data/evaluation.js';
import { percent } from '../lib/api.js';

const MONTAGE_LEADS = [
  'FP1-F7', 'F7-T7', 'T7-P7', 'P7-O1',
  'FP1-F3', 'F3-C3', 'C3-P3', 'P3-O1',
  'FZ-CZ', 'CZ-PZ',
  'FP2-F4', 'F4-C4', 'C4-P4', 'P4-O2',
  'FP2-F8', 'F8-T8', 'T8-P8', 'P8-O2',
];

export function ModelPerformance({ modelStatus }) {
  const [metricMode, setMetricMode] = useState('confirmed'); // 'confirmed' | 'window'
  const m = metricMode === 'confirmed' ? evaluation.confirmed : evaluation.windowLevel;
  const rocAuc = evaluation.windowLevel.rocAuc;
  const totalWindows = evaluation.windows.test.total;
  const seizureWindows = evaluation.windows.test.seizure;
  const meta = modelStatus?.model_metadata || {};
  const epochs = evaluation.history.loss.map((_, i) => `E${i + 1}`);

  const accSeries = [
    { name: 'Train accuracy', color: '#2563EB', values: evaluation.history.accuracy },
    { name: 'Validation accuracy', color: '#16A36A', values: evaluation.history.valAccuracy },
  ];

  const lossSeries = [
    { name: 'Train loss', color: '#2563EB', values: evaluation.history.loss },
    { name: 'Validation loss', color: '#D99024', values: evaluation.history.valLoss },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Subject-Disjoint Validation & Telemetry"
        title="Model Performance & Evaluation"
        subtitle="Held-out benchmark metrics on CHB-MIT test subjects (chb02, chb07) across 7,669 non-overlapping 10-second windows."
        actions={
          <Tabs
            value={metricMode}
            onChange={setMetricMode}
            items={[
              { value: 'confirmed', label: 'Temporal Confirmation (≥ 2 windows)' },
              { value: 'window', label: 'Raw Per-Window (10s)' },
            ]}
          />
        }
      />

      <ResearchNotice />

      <div className="grid grid-4">
        <MetricCard
          label="Test ROC-AUC"
          value={rocAuc.toFixed(4)}
          sub="Held-out subjects chb02 & chb07"
          icon={BarChart3}
          tone="primary"
        />
        <MetricCard
          label="Sensitivity (Recall)"
          value={percent(m.recall, 1)}
          sub={`${m.tp} of ${m.tp + m.fn} seizure windows detected`}
          icon={Activity}
          tone="success"
        />
        <MetricCard
          label="Specificity"
          value={percent(m.specificity, 2)}
          sub={`${m.tn.toLocaleString()} of ${(m.tn + m.fp).toLocaleString()} non-seizure windows`}
          icon={ShieldCheck}
          tone="cyan"
        />
        <MetricCard
          label="False Alarms / Hour"
          value={`${m.falseAlarmsPerHour.toFixed(2)} / hr`}
          sub={`F1 score ${m.f1.toFixed(3)} · Precision ${percent(m.precision, 1)}`}
          icon={AlertTriangle}
          tone={metricMode === 'confirmed' ? 'purple' : 'warning'}
        />
      </div>

      {/* Confusion Matrix & Metric Comparison */}
      <div className="grid grid-2">
        <Card>
          <CardHead
            title={
              metricMode === 'confirmed'
                ? 'Confusion Matrix — After Temporal Confirmation'
                : 'Confusion Matrix — Raw 10s Window Predictions'
            }
            subtitle={`Evaluated on ${totalWindows.toLocaleString()} held-out test windows (${seizureWindows} ground-truth seizure windows) over ${evaluation.testRecordingHours.toFixed(1)} hours at threshold ${percent(evaluation.threshold, 0)}`}
            right={
              <Badge tone="info">
                {metricMode === 'confirmed' ? `≥ ${evaluation.minConsecutiveWindows} consecutive windows` : 'Single window'}
              </Badge>
            }
          />

          <div className="cm-grid">
            <div className="cm-cell is-good">
              <span className="muted" style={{ fontSize: 12 }}>True Negative (TN) · Normal correctly cleared</span>
              <b>{m.tn.toLocaleString()}</b>
              <span className="muted" style={{ fontSize: 12 }}>Specificity {percent(m.specificity, 2)}</span>
            </div>
            <div className="cm-cell is-warn">
              <span className="muted" style={{ fontSize: 12 }}>False Positive (FP) · False alarm windows</span>
              <b>{m.fp.toLocaleString()}</b>
              <span className="muted" style={{ fontSize: 12 }}>{m.falseAlarmsPerHour.toFixed(2)} false alarms / hour</span>
            </div>
            <div className="cm-cell is-warn">
              <span className="muted" style={{ fontSize: 12 }}>False Negative (FN) · Missed seizure windows</span>
              <b>{m.fn.toLocaleString()}</b>
              <span className="muted" style={{ fontSize: 12 }}>Out of {seizureWindows} seizure windows</span>
            </div>
            <div className="cm-cell is-good">
              <span className="muted" style={{ fontSize: 12 }}>True Positive (TP) · Seizure windows detected</span>
              <b>{m.tp.toLocaleString()}</b>
              <span className="muted" style={{ fontSize: 12 }}>Sensitivity {percent(m.recall, 1)}</span>
            </div>
          </div>

          <div className="stack" style={{ marginTop: 18, gap: 10 }}>
            <div>
              <div className="between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                <span>Overall Accuracy</span>
                <strong className="mono">{percent(m.accuracy, 2)}</strong>
              </div>
              <Meter value={m.accuracy} tone="primary" />
            </div>
            <div>
              <div className="between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                <span>Precision (Positive Predictive Value)</span>
                <strong className="mono">{percent(m.precision, 1)}</strong>
              </div>
              <Meter value={m.precision} tone="purple" />
            </div>
            <div>
              <div className="between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                <span>F1 Harmonic Score</span>
                <strong className="mono">{m.f1.toFixed(4)}</strong>
              </div>
              <Meter value={m.f1} tone="cyan" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHead
            title="Architecture & Dataset Specification"
            subtitle="Subject-disjoint training and evaluation protocol"
            right={
              <Badge tone={modelStatus?.model_state === 'ready' ? 'success' : 'warning'} dot>
                {modelStatus?.model_state === 'ready' ? 'Checkpoint Loaded' : 'Service Offline'}
              </Badge>
            }
          />

          <div className="list">
            <div className="list-row">
              <span className="muted" style={{ fontSize: 13 }}>Model architecture</span>
              <strong className="mono" style={{ fontSize: 12.5 }}>{evaluation.architecture}</strong>
            </div>
            <div className="list-row">
              <span className="muted" style={{ fontSize: 13 }}>Checkpoint version</span>
              <span className="mono" style={{ fontSize: 13 }}>v{meta.model_version || '1.0.0'}</span>
            </div>
            <div className="list-row">
              <span className="muted" style={{ fontSize: 13 }}>Reference corpus</span>
              <span style={{ fontSize: 13 }}>
                {evaluation.dataset} (<span className="mono">DOI: {evaluation.doi}</span>)
              </span>
            </div>
            <div className="list-row">
              <span className="muted" style={{ fontSize: 13 }}>Subject-disjoint split</span>
              <span className="mono" style={{ fontSize: 12.5 }}>
                Train: {evaluation.subjects.train.length} subj · Val: {evaluation.subjects.validation.join(', ')} · Test: {evaluation.subjects.test.join(', ')}
              </span>
            </div>
            <div className="list-row">
              <span className="muted" style={{ fontSize: 13 }}>Input window tensor</span>
              <span className="mono" style={{ fontSize: 13 }}>
                {evaluation.channels} channels × 1,280 samples ({evaluation.windowSeconds}s @ {evaluation.samplingRate} Hz)
              </span>
            </div>
            <div className="list-row">
              <span className="muted" style={{ fontSize: 13 }}>Decision rule</span>
              <span className="mono" style={{ fontSize: 13 }}>
                p ≥ {percent(evaluation.threshold, 0)} for ≥ {evaluation.minConsecutiveWindows} consecutive windows
              </span>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              18-Lead Longitudinal Bipolar Montage
            </div>
            <div className="chip-row">
              {(meta.channels || MONTAGE_LEADS).map((ch) => (
                <span key={ch} className="chip mono" style={{ fontSize: 11.5 }}>{ch}</span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Training History Curves */}
      <div className="grid grid-2">
        <Card>
          <CardHead
            title="10-Epoch Training & Validation Accuracy"
            subtitle="Convergence across 21 training subjects and held-out validation subject chb01"
          />
          <LineChart series={accSeries} labels={epochs} height={240} yMin={0.78} yMax={1.0} />
        </Card>

        <Card>
          <CardHead
            title="10-Epoch Training & Validation Cross-Entropy Loss"
            subtitle="Optimization trajectory across 83,688 training windows and 3,112 validation windows"
          />
          <LineChart series={lossSeries} labels={epochs} height={240} yMin={0} yMax={0.6} />
        </Card>
      </div>

      {/* Explicit Research Limitations */}
      <Card>
        <CardHead
          title="Documented Research Limitations & Boundary Conditions"
          subtitle="Transparency requirements for interpreting NeuroTwin model outputs"
          right={<Badge tone="warning">Non-Diagnostic Research Tool</Badge>}
        />
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8, color: 'var(--text-2)', fontSize: 13.5 }}>
          {limitations.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

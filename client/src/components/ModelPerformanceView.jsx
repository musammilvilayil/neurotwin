import React from 'react';
import {
  Brain, ShieldCheck, Activity, Award, CheckCircle2,
  AlertTriangle, Layers, Database, Cpu, ExternalLink, BarChart3
} from 'lucide-react';
import { mlEvaluationData } from '../data/evaluationData.js';

export default function ModelPerformanceView({ modelStatus }) {
  const m = mlEvaluationData.metrics;
  const cm = mlEvaluationData.confusion_matrix;
  const epochs = mlEvaluationData.training_epochs;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">NEURAL INFERENCE & BENCHMARKING</p>
          <h1>Model Architecture & Benchmark Evaluation</h1>
          <p>
            Evaluated using subject-disjoint cross-validation on the CHB-MIT Scalp EEG Database.
            Metrics represent retrospective research benchmarks and are strictly intended for clinical decision support.
          </p>
        </div>
        <div className="page-header-actions">
          <span className="nt-badge nt-badge-info">
            <Cpu size={12} /> {modelStatus?.model_metadata?.model_version || 'chbmit-multiscale_cnn-v2'}
          </span>
          <span className="nt-badge nt-badge-success">
            <CheckCircle2 size={12} /> Research Trained
          </span>
        </div>
      </div>

      <div className="research-boundary-alert">
        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
        <div>
          <b>Research-Grade Clinical Decision Support Metric Disclaimer:</b>
          <p style={{ margin: '3px 0 0', fontSize: '12px' }}>
            {mlEvaluationData.clinical_disclaimer}
          </p>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Specificity (Negative Correctness)</span>
            <div className="metric-icon-wrap" style={{ background: 'var(--nt-success-subtle)', color: 'var(--nt-success)' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--nt-success)' }}>{m.specificity}%</div>
          <div className="metric-bottom">
            <span>7,579 / 7,613 test windows correct</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Sensitivity / Recall</span>
            <div className="metric-icon-wrap" style={{ background: 'var(--nt-cyan-subtle)', color: 'var(--nt-accent-cyan)' }}>
              <Activity size={18} />
            </div>
          </div>
          <div className="metric-value">{m.sensitivity_recall}%</div>
          <div className="metric-bottom">
            <span>43 / 56 seizure windows flagged</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">ROC-AUC Score</span>
            <div className="metric-icon-wrap" style={{ background: 'var(--nt-purple-subtle)', color: 'var(--nt-accent-purple)' }}>
              <Award size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--nt-accent-purple)' }}>{m.roc_auc}</div>
          <div className="metric-bottom">
            <span>Area under ROC trajectory</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">False Alarms / Hour</span>
            <div className="metric-icon-wrap" style={{ background: 'var(--nt-warning-subtle)', color: 'var(--nt-warning)' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--nt-warning)' }}>{m.false_alarms_per_hour} /h</div>
          <div className="metric-bottom">
            <span>Across 21.3 continuous test hours</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '24px' }}>
        {/* Architecture & Methodology Card */}
        <div className="nt-card">
          <div className="nt-card-header">
            <div className="nt-card-title">
              <Layers size={18} style={{ color: 'var(--nt-accent-cyan)' }} />
              <div>
                <h3>Model Architecture & Validation Protocol</h3>
                <p>Multi-Scale Dilated 1D-CNN with Temporal Confirmation</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '18px' }}>
            <div style={{ background: 'var(--nt-bg-secondary)', padding: '12px 14px', borderRadius: 'var(--nt-radius-md)', border: '1px solid var(--nt-border)' }}>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '11px', display: 'block' }}>Validation Split</small>
              <strong style={{ color: 'var(--nt-text-primary)', fontSize: '13px' }}>Subject-Disjoint (No Data Leakage)</strong>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--nt-text-secondary)' }}>
                Test subjects chb02 & chb07 never seen during training or threshold tuning.
              </p>
            </div>

            <div style={{ background: 'var(--nt-bg-secondary)', padding: '12px 14px', borderRadius: 'var(--nt-radius-md)', border: '1px solid var(--nt-border)' }}>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '11px', display: 'block' }}>Input Format</small>
              <strong style={{ color: 'var(--nt-text-primary)', fontSize: '13px' }}>18 Channels × 1280 Samples</strong>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--nt-text-secondary)' }}>
                10-second bipolar montage intervals resampled to 128 Hz bandpass 0.5–40 Hz.
              </p>
            </div>

            <div style={{ background: 'var(--nt-bg-secondary)', padding: '12px 14px', borderRadius: 'var(--nt-radius-md)', border: '1px solid var(--nt-border)' }}>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '11px', display: 'block' }}>Temporal Post-Processing</small>
              <strong style={{ color: 'var(--nt-text-primary)', fontSize: '13px' }}>Consecutive Confirmation (≥ 2)</strong>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--nt-text-secondary)' }}>
                Suppresses isolated noisy spikes; cuts false alarms from 2.68/h to 1.60/h.
              </p>
            </div>

            <div style={{ background: 'var(--nt-bg-secondary)', padding: '12px 14px', borderRadius: 'var(--nt-radius-md)', border: '1px solid var(--nt-border)' }}>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '11px', display: 'block' }}>Trained Dataset</small>
              <strong style={{ color: 'var(--nt-text-primary)', fontSize: '13px' }}>CHB-MIT Scalp EEG Database</strong>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--nt-text-secondary)' }}>
                PhysioNet DOI: 10.13026/C2K01R (Boston Children's Hospital).
              </p>
            </div>
          </div>

          <h4 style={{ fontSize: '13px', margin: '0 0 10px', color: 'var(--nt-text-primary)' }}>
            Subject Allocation Breakdown
          </h4>
          <div className="table-responsive-wrapper">
            <table className="nt-table">
              <thead>
                <tr>
                  <th>Partition</th>
                  <th>Subjects</th>
                  <th>Total Windows</th>
                  <th>Seizure Windows</th>
                  <th>Hours Evaluated</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Training Set</b></td>
                  <td>21 Subjects (chb03–chb24)</td>
                  <td>83,688</td>
                  <td>1,170 (1.4%)</td>
                  <td>~232.5 hrs</td>
                </tr>
                <tr>
                  <td><b>Validation Set</b></td>
                  <td>1 Subject (chb01)</td>
                  <td>3,112</td>
                  <td>50 (1.6%)</td>
                  <td>~8.6 hrs</td>
                </tr>
                <tr>
                  <td><b>Held-out Test Set</b></td>
                  <td>2 Subjects (chb02, chb07)</td>
                  <td>7,669</td>
                  <td>56 (0.7%)</td>
                  <td>21.3 hrs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Confusion Matrix Card */}
        <div className="nt-card">
          <div className="nt-card-header">
            <div className="nt-card-title">
              <BarChart3 size={18} style={{ color: 'var(--nt-accent-purple)' }} />
              <div>
                <h3>Held-Out Test Confusion Matrix</h3>
                <p>Tested on 7,669 continuous windows</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(53, 201, 139, 0.1)', border: '1px solid rgba(53, 201, 139, 0.3)', borderRadius: 'var(--nt-radius-md)', padding: '14px', textAlign: 'center' }}>
              <span className="eyebrow" style={{ color: 'var(--nt-success)' }}>TRUE NEGATIVES</span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--nt-success)', margin: '4px 0' }}>
                {cm.true_negatives.toLocaleString()}
              </div>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '11px' }}>Baseline normal accurately identified</small>
            </div>

            <div style={{ background: 'rgba(54, 184, 245, 0.1)', border: '1px solid rgba(54, 184, 245, 0.3)', borderRadius: 'var(--nt-radius-md)', padding: '14px', textAlign: 'center' }}>
              <span className="eyebrow" style={{ color: 'var(--nt-accent-cyan)' }}>TRUE POSITIVES</span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--nt-accent-cyan)', margin: '4px 0' }}>
                {cm.true_positives}
              </div>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '11px' }}>Confirmed seizure bursts detected</small>
            </div>

            <div style={{ background: 'rgba(244, 184, 96, 0.1)', border: '1px solid rgba(244, 184, 96, 0.3)', borderRadius: 'var(--nt-radius-md)', padding: '14px', textAlign: 'center' }}>
              <span className="eyebrow" style={{ color: 'var(--nt-warning)' }}>FALSE POSITIVES</span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--nt-warning)', margin: '4px 0' }}>
                {cm.false_positives}
              </div>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '11px' }}>Non-seizure flagged as alert (1.6/h)</small>
            </div>

            <div style={{ background: 'rgba(241, 107, 120, 0.1)', border: '1px solid rgba(241, 107, 120, 0.3)', borderRadius: 'var(--nt-radius-md)', padding: '14px', textAlign: 'center' }}>
              <span className="eyebrow" style={{ color: 'var(--nt-danger)' }}>FALSE NEGATIVES</span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--nt-danger)', margin: '4px 0' }}>
                {cm.false_negatives}
              </div>
              <small style={{ color: 'var(--nt-text-muted)', fontSize: '11px' }}>Seizure windows missed</small>
            </div>
          </div>

          <div style={{ background: 'var(--nt-bg-secondary)', padding: '12px 14px', borderRadius: 'var(--nt-radius-md)', border: '1px solid var(--nt-border)', fontSize: '11.5px', color: 'var(--nt-text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--nt-text-primary)' }}>Performance takeaway:</span>
            <p style={{ margin: '3px 0 0', lineHeight: 1.5 }}>
              Temporal post-processing successfully balances sensitivity (76.8%) with an exceptionally high specificity (99.55%), reducing alarm fatigue in continuous clinical monitoring.
            </p>
          </div>
        </div>
      </div>

      {/* Epochs Training History */}
      <div className="nt-card">
        <div className="nt-card-header">
          <div className="nt-card-title">
            <Activity size={18} style={{ color: 'var(--nt-accent-cyan)' }} />
            <div>
              <h3>10-Epoch Training & Validation Trajectory</h3>
              <p>Convergence and loss curves on 83,688 training intervals</p>
            </div>
          </div>
        </div>

        <div className="table-responsive-wrapper">
          <table className="nt-table">
            <thead>
              <tr>
                <th>Epoch</th>
                <th>Training Loss</th>
                <th>Training Accuracy</th>
                <th>Validation Loss</th>
                <th>Validation Accuracy</th>
                <th>Progress Status</th>
              </tr>
            </thead>
            <tbody>
              {epochs.map(ep => (
                <tr key={ep.epoch}>
                  <td><b>Epoch {ep.epoch}</b></td>
                  <td style={{ fontFamily: 'var(--nt-font-mono)' }}>{ep.loss.toFixed(3)}</td>
                  <td>
                    <span style={{ color: 'var(--nt-accent-cyan)', fontWeight: 600 }}>{ep.accuracy.toFixed(1)}%</span>
                  </td>
                  <td style={{ fontFamily: 'var(--nt-font-mono)' }}>{ep.val_loss.toFixed(3)}</td>
                  <td>
                    <span style={{ color: 'var(--nt-success)', fontWeight: 600 }}>{ep.val_accuracy.toFixed(1)}%</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '80px', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${ep.val_accuracy}%`, height: '100%', background: 'linear-gradient(90deg, var(--nt-accent-cyan), var(--nt-success))' }} />
                      </div>
                      <small style={{ color: 'var(--nt-text-muted)' }}>{ep.epoch === 10 ? 'Final' : 'OK'}</small>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


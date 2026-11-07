import React, { useState, useMemo } from 'react';
import {
  FileText, Download, Filter, Search, Calendar, FileDown,
  Activity, CheckCircle2, AlertTriangle, Brain, Printer, ShieldCheck
} from 'lucide-react';

export default function ReportsView({
  analyses = [],
  patients = [],
  onDownloadReport,
  downloadingId
}) {
  const [selectedPatientId, setSelectedPatientId] = useState('all');
  const [exportType, setExportType] = useState('all');

  const filteredAnalyses = useMemo(() => {
    return analyses.filter(item => {
      if (selectedPatientId !== 'all') {
        const pId = item.patientId?._id || item.patientId || item.patient?._id;
        if (pId !== selectedPatientId) return false;
      }
      return true;
    });
  }, [analyses, selectedPatientId]);

  // Real aggregate statistics
  const totalAnalyses = filteredAnalyses.length;
  const seizureAnalyses = filteredAnalyses.filter(item => {
    const score = Number(item.confidence ?? item.probabilities?.maxSeizureScore ?? 0);
    return score >= 0.65 || item.label?.toLowerCase().includes('seizure');
  });
  const normalAnalyses = totalAnalyses - seizureAnalyses.length;
  const reviewedCount = filteredAnalyses.filter(item => item.clinicianReview === 'reviewed').length;
  const pendingReviewCount = totalAnalyses - reviewedCount;

  // Export CSV summary function
  const exportCSV = () => {
    const headers = ["Analysis_ID", "Created_At", "Patient_Name", "MRN", "EDF_File", "Max_Score", "Classification", "Clinician_Review"];
    const rows = filteredAnalyses.map(a => {
      const score = Number(a.confidence ?? a.probabilities?.maxSeizureScore ?? 0);
      const isSeizure = score >= 0.65 || a.label?.toLowerCase().includes('seizure');
      return [
        a._id,
        new Date(a.createdAt).toISOString(),
        `"${a.patient?.fullName || a.patientId?.fullName || 'Patient Record'}"`,
        `"${a.patient?.mrn || a.patientId?.mrn || ''}"`,
        `"${a.session?.sourceName || a.metadata?.originalFileName || a.edfFileName || 'EDF Record'}"`,
        score.toFixed(4),
        isSeizure ? "SEIZURE" : "NORMAL",
        a.clinicianReview || "pending"
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `neurotwin_eeg_reports_summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">CLINICAL ANALYTICS & EXPORTS</p>
          <h1>Clinical Research Reports & Analytics</h1>
          <p>
            Aggregated metrics across longitudinal patient recordings and research inferences.
            Generate individual clinical PDF reports or export longitudinal cohort CSV summaries.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={exportCSV} disabled={totalAnalyses === 0}>
            <Download size={14} /> Export Cohort CSV
          </button>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Inferences Evaluated</span>
            <div className="metric-icon-wrap">
              <FileText size={18} />
            </div>
          </div>
          <div className="metric-value">{totalAnalyses}</div>
          <div className="metric-bottom">
            <span>{selectedPatientId === 'all' ? 'All cohort subjects' : 'Selected patient'}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Seizure Patterns Detected</span>
            <div className="metric-icon-wrap" style={{ background: 'var(--nt-danger-subtle)', color: 'var(--nt-danger)' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--nt-danger)' }}>{seizureAnalyses.length}</div>
          <div className="metric-bottom">
            <span>{totalAnalyses > 0 ? ((seizureAnalyses.length / totalAnalyses) * 100).toFixed(1) : 0}% of recordings</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Normal Baseline Signals</span>
            <div className="metric-icon-wrap" style={{ background: 'var(--nt-success-subtle)', color: 'var(--nt-success)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--nt-success)' }}>{normalAnalyses}</div>
          <div className="metric-bottom">
            <span>{totalAnalyses > 0 ? ((normalAnalyses / totalAnalyses) * 100).toFixed(1) : 0}% non-epileptiform</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Clinician Supervised Reviews</span>
            <div className="metric-icon-wrap" style={{ background: 'var(--nt-purple-subtle)', color: 'var(--nt-accent-purple)' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--nt-accent-purple)' }}>{reviewedCount}</div>
          <div className="metric-bottom">
            <span>{pendingReviewCount} pending verification</span>
          </div>
        </div>
      </div>

      {/* Cohort Seizure vs Normal Distribution Bar */}
      <div className="nt-card" style={{ marginBottom: '24px' }}>
        <div className="nt-card-header">
          <div className="nt-card-title">
            <Activity size={18} style={{ color: 'var(--nt-accent-cyan)' }} />
            <div>
              <h3>Cohort Distribution: Seizure Bursts vs. Normal Baseline</h3>
              <p>Proportion of model-flagged events across analyzed sessions</p>
            </div>
          </div>
        </div>

        {totalAnalyses > 0 ? (
          <div>
            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.05)', marginBottom: '14px' }}>
              <div
                style={{
                  width: `${(normalAnalyses / totalAnalyses) * 100}%`,
                  background: 'var(--nt-success)',
                  transition: 'width 0.4s ease'
                }}
                title={`Normal: ${normalAnalyses}`}
              />
              <div
                style={{
                  width: `${(seizureAnalyses.length / totalAnalyses) * 100}%`,
                  background: 'var(--nt-danger)',
                  transition: 'width 0.4s ease'
                }}
                title={`Seizure: ${seizureAnalyses.length}`}
              />
            </div>

            <div style={{ display: 'flex', gap: '24px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--nt-success)' }} />
                <b>Normal Baseline:</b> {normalAnalyses} ({(totalAnalyses > 0 ? (normalAnalyses / totalAnalyses) * 100 : 0).toFixed(1)}%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--nt-danger)' }} />
                <b>Flagged Seizure Bursts:</b> {seizureAnalyses.length} ({(totalAnalyses > 0 ? (seizureAnalyses.length / totalAnalyses) * 100 : 0).toFixed(1)}%)
              </span>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--nt-text-muted)', fontSize: '13px' }}>No recording data available to plot cohort distribution.</p>
        )}
      </div>

      {/* Available Reports Table */}
      <div className="nt-card">
        <div className="nt-card-header">
          <div className="nt-card-title">
            <FileDown size={18} style={{ color: 'var(--nt-accent-cyan)' }} />
            <div>
              <h3>Individual Recording Clinical PDF Reports</h3>
              <p>Download structured clinical research summaries with 18-channel waveforms and explainability metrics</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--nt-text-muted)' }}>Filter Subject:</span>
            <select
              className="nt-select"
              style={{ width: 'auto', minWidth: '180px', padding: '6px 10px', fontSize: '12px' }}
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
            >
              <option value="all">All Subjects ({patients.length})</option>
              {patients.map(p => (
                <option value={p._id} key={p._id}>{p.fullName} {p.mrn ? `(${p.mrn})` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredAnalyses.length > 0 ? (
          <div className="table-responsive-wrapper">
            <table className="nt-table">
              <thead>
                <tr>
                  <th>Recording / Date</th>
                  <th>Subject</th>
                  <th>Source EDF</th>
                  <th>Max Seizure Score</th>
                  <th>Classification</th>
                  <th>Review Status</th>
                  <th>Export Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalyses.map(item => {
                  const maxScore = Number(item.confidence ?? item.probabilities?.maxSeizureScore ?? 0);
                  const isSeizure = maxScore >= 0.65 || item.label?.toLowerCase().includes('seizure');
                  const pName = item.patient?.fullName || item.patientId?.fullName || 'Patient Record';
                  const pMrn = item.patient?.mrn || item.patientId?.mrn;
                  const file = item.session?.sourceName || item.metadata?.originalFileName || item.edfFileName || 'EDF Record';
                  const isDownloading = downloadingId === item._id;

                  return (
                    <tr key={item._id}>
                      <td>
                        <strong>{new Date(item.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}</strong>
                        <small style={{ display: 'block', color: 'var(--nt-text-muted)' }}>
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </td>
                      <td>
                        <strong>{pName}</strong>
                        {pMrn && <small style={{ display: 'block', color: 'var(--nt-text-muted)' }}>MRN: {pMrn}</small>}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--nt-font-mono)', fontSize: '11px', color: 'var(--nt-accent-cyan)' }}>
                          {file}
                        </span>
                      </td>
                      <td>
                        <span className={`score-pill ${isSeizure ? 'score-elevated' : 'score-normal'}`}>
                          {(maxScore * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`nt-badge ${isSeizure ? 'nt-badge-danger' : 'nt-badge-success'}`}>
                          {isSeizure ? 'Seizure Pattern' : 'Normal / Baseline'}
                        </span>
                      </td>
                      <td>
                        <span className={`nt-badge ${item.clinicianReview === 'reviewed' ? 'nt-badge-success' : 'nt-badge-warning'}`}>
                          {item.clinicianReview === 'reviewed' ? 'Reviewed' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onDownloadReport(item._id)}
                          disabled={isDownloading}
                        >
                          <FileDown size={13} /> {isDownloading ? 'Generating…' : 'Download PDF'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--nt-text-muted)' }}>
            <FileText size={28} style={{ marginBottom: '8px' }} />
            <p>No recording analyses found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}


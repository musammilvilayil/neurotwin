import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, Download, FileSpreadsheet, FileText, Filter,
} from 'lucide-react';
import {
  Badge, Card, CardHead, EmptyState, MetricCard, PageHeader, ResearchNotice,
} from '../components/ui.jsx';
import { Donut } from '../components/charts.jsx';
import { AnalysisTable } from '../components/AnalysisTable.jsx';
import { dateLabel, percent } from '../lib/api.js';
import { confirmedEvents, outcomeKeyOf, patientOf, scoreOf, sourceOf, thresholdOf } from '../lib/eeg.js';

export function Reports({
  analyses = [],
  patients = [],
  onViewAnalysis,
  onDownloadReport,
}) {
  const safeAnalyses = Array.isArray(analyses) ? analyses : (Array.isArray(analyses?.analyses) ? analyses.analyses : []);
  const safePatients = Array.isArray(patients) ? patients : [];
  const [subjectFilter, setSubjectFilter] = useState('all');

  const filtered = useMemo(() => {
  if (subjectFilter === 'all') return safeAnalyses;
  return safeAnalyses.filter((a) => (patientOf(a, safePatients)?._id || a.patient) === subjectFilter);
}, [safeAnalyses, safePatients, subjectFilter]);

const counts = useMemo(() => {
  const confirmed = filtered.filter((a) => outcomeKeyOf(a) === 'confirmed').length;
  const elevated = filtered.filter((a) => outcomeKeyOf(a) === 'high').length;
  const normal = filtered.filter((a) => outcomeKeyOf(a) === 'normal').length;
  const reviewed = filtered.filter((a) => a.clinicianReview === 'reviewed').length;
  const pending = filtered.length - reviewed;
  return { confirmed, elevated, normal, reviewed, pending };
}, [filtered]);

const exportCsv = () => {
  const headers = [
    'Analysis ID',
    'Subject Name',
    'MRN',
    'Recording Source',
    'Processed At',
    'Outcome',
    'Peak Probability',
    'Threshold',
    'Confirmed Events',
    'Clinician Review',
    'Model Version',
  ];
  const rows = filtered.map((a) => {
    const p = patientOf(a, patients);
    return [
      a._id,
      `"${(p?.fullName || 'Unassigned').replace(/"/g, '""')}"`,
      p?.mrn || '',
      `"${sourceOf(a).replace(/"/g, '""')}"`,
      a.createdAt || '',
      outcomeKeyOf(a),
      scoreOf(a).toFixed(4),
      thresholdOf(a).toFixed(2),
      confirmedEvents(a).length,
      a.clinicianReview || 'pending',
      a.modelVersion || '1.0.0',
    ].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `neurotwin-analyses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const outcomeSegments = [
  { label: 'Confirmed model events (≥ 2 windows)', value: counts.confirmed, color: '#DC535B' },
  { label: 'Single-window high score', value: counts.elevated, color: '#D99024' },
  { label: 'Within normal baseline', value: counts.normal, color: '#16A36A' },
];

const reviewSegments = [
  { label: 'Clinician reviewed', value: counts.reviewed, color: '#2563EB' },
  { label: 'Pending clinician review', value: counts.pending, color: '#94A3B8' },
];

return (
  <div className="page">
    <PageHeader
      eyebrow="Exportable Research Documentation"
      title="Reports & Cohort Summary"
      subtitle="Generate structured PDF analysis reports for individual EEG sessions and export cohort-wide CSV summaries."
      actions={
        <>
          <select
            className="select"
            style={{ width: 'auto', minWidth: 210 }}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Filter reports by subject"
          >
              <option value="all">All subjects ({safeAnalyses.length} sessions)</option>
              {
                safePatients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.fullName} ({p.mrn})
                  </option>
                ))
              }
            </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <FileSpreadsheet size={15} /> Export CSV summary
          </button>
        </>
      }
    />

    <ResearchNotice compact />

    <div className="grid grid-4">
      <MetricCard
        label="Total Reports"
        value={filtered.length}
        sub="Available for PDF download"
        icon={FileText}
        tone="primary"
      />
      <MetricCard
        label="Confirmed Events"
        value={counts.confirmed}
        sub="Sessions with ≥ 2 consecutive high windows"
        icon={AlertTriangle}
        tone="danger"
      />
      <MetricCard
        label="Clinician Reviewed"
        value={counts.reviewed}
        sub={`${filtered.length ? Math.round((counts.reviewed / filtered.length) * 100) : 0}% of selected sessions`}
        icon={CheckCircle2}
        tone="success"
      />
      <MetricCard
        label="Pending Review"
        value={counts.pending}
        sub="Awaiting neurologist sign-off"
        icon={Clock}
        tone="warning"
      />
    </div>

    <div className="grid grid-2">
      <Card>
        <CardHead
          title="Model Outcome Distribution"
          subtitle="Breakdown of processed recordings by temporal confirmation rules"
        />
        <div className="donut-wrap">
          <Donut segments={outcomeSegments} label="Recordings" />
          <div className="stack" style={{ flex: 1, gap: 10 }}>
            {outcomeSegments.map((s) => (
              <div key={s.label} className="between" style={{ fontSize: 13 }}>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: s.color }} />
                  {s.label}
                </span>
                <strong className="mono">{s.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          title="Clinician Review Progress"
          subtitle="Verification status across selected EEG sessions"
        />
        <div className="donut-wrap">
          <Donut segments={reviewSegments} label="Sessions" />
          <div className="stack" style={{ flex: 1, gap: 10 }}>
            {reviewSegments.map((s) => (
              <div key={s.label} className="between" style={{ fontSize: 13 }}>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: s.color }} />
                  {s.label}
                </span>
                <strong className="mono">{s.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>

    <Card>
      <CardHead
        title="Individual Session PDF Reports"
        subtitle="Click PDF to download the formal session report or View to inspect the interactive 18-lead waveform."
      />
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
          title="No reports for selected filter"
          body="Select another subject or process a new EEG recording."
        />
      )}
    </Card>
  </div>
);
}

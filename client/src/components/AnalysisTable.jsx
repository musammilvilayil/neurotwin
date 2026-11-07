import React from 'react';
import { Download, Eye, RefreshCw } from 'lucide-react';
import { Badge } from './ui.jsx';
import { clock, dateLabel, percent } from '../lib/api.js';
import { durationOf, outcomeOf, patientOf, scoreOf, sourceOf } from '../lib/eeg.js';

export const ResultBadge = ({ analysis }) => {
  const o = outcomeOf(analysis);
  return <Badge tone={o.tone} dot>{o.label}</Badge>;
};

export const ReviewBadge = ({ analysis, status }) => {
  const s = status ?? analysis?.clinicianReview;
  return s === 'reviewed'
    ? <Badge tone="info">Reviewed</Badge>
    : <Badge tone="warning">Pending review</Badge>;
};

/**
 * Responsive analyses table. Collapses to labelled cards on small screens.
 * Columns hide with `showSubject` so the same component works for single-patient views.
 */
export function AnalysisTable({ rows, analyses, patients = [], onView, onDownload, downloadingId, showSubject = true, showReview = true }) {
  const list = rows || analyses || [];
  return (
    <div className="table-wrap">
      <table className="tbl is-stacked">
        <thead>
          <tr>
            <th>Recording</th>
            {showSubject && <th>Subject</th>}
            <th>Analysed</th>
            <th>Duration</th>
            <th>Research result</th>
            {showReview && <th>Review</th>}
            <th className="is-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((a) => {
            const p = patientOf(a, patients);
            return (
              <tr key={a._id}>
                <td data-label="Recording">
                  <div>
                    <div className="cell-main">{sourceOf(a)}</div>
                    <div className="cell-sub mono">#{String(a._id).slice(-8)}</div>
                  </div>
                </td>
                {showSubject && (
                  <td data-label="Subject">
                    <div>
                      <div className="cell-main">{p?.fullName || 'Patient record'}</div>
                      {p?.mrn && <div className="cell-sub">MRN {p.mrn}</div>}
                    </div>
                  </td>
                )}
                <td data-label="Analysed">{dateLabel(a.createdAt)}</td>
                <td data-label="Duration" className="num">{durationOf(a) ? clock(durationOf(a)) : '—'}</td>
                <td data-label="Result">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <ResultBadge analysis={a} />
                    <span className="cell-sub num">Peak {percent(scoreOf(a))}</span>
                  </div>
                </td>
                {showReview && <td data-label="Review"><ReviewBadge analysis={a} /></td>}
                <td className="is-right" data-label="">
                  <div className="tbl-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onView(a)}><Eye size={14} /> View details</button>
                    {onDownload && (
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => onDownload(a._id, p?.fullName)} disabled={downloadingId === a._id} aria-label="Download PDF report" data-tip="PDF report">
                        {downloadingId === a._id ? <RefreshCw size={15} className="spin" /> : <Download size={15} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AnalysisTable;


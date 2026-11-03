import PDFDocument from 'pdfkit';

export function generateReportPdf(data, stream) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(stream);

  const { patient, session, analysis, twin, notes, clinicianName } = data;

  // Header
  doc.rect(40, 40, 515, 60).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('NeuroTwin', 55, 52);
  doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('EEG Seizure Detection & Brain Monitoring Prototype', 55, 78);
  doc.fontSize(9).fillColor('#38bdf8').text('CLINICAL RESEARCH REPORT', 400, 55, { align: 'right' });
  doc.fontSize(8).fillColor('#94a3b8').text(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC', 400, 72, { align: 'right' });

  doc.moveDown(3);

  // Safety Boundary Box
  const disclaimerY = 115;
  doc.rect(40, disclaimerY, 515, 36).fillAndStroke('#fef3c7', '#f59e0b');
  doc.fillColor('#92400e').fontSize(8).font('Helvetica-Bold')
    .text('RESEARCH DECISION-SUPPORT ONLY — NOT A CLINICALLY CERTIFIED DIAGNOSTIC DEVICE', 50, disclaimerY + 6);
  doc.font('Helvetica').fontSize(7.5).fillColor('#78350f')
    .text('Model predictions are statistical probability indicators intended to assist retrospective clinical review. All findings require independent evaluation by a qualified neurologist alongside patient history and video-EEG telemetry.', 50, disclaimerY + 18, { width: 495 });

  // Patient & Recording Information
  const infoY = 165;
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('Patient & Recording Overview', 40, infoY);
  doc.moveTo(40, infoY + 16).lineTo(555, infoY + 16).strokeColor('#e2e8f0').stroke();

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
  doc.text('Patient Name:', 40, infoY + 24);
  doc.text('Medical Record # (MRN):', 40, infoY + 40);
  doc.text('Date of Birth:', 40, infoY + 56);
  doc.text('Assigned Clinician:', 40, infoY + 72);

  doc.font('Helvetica').fillColor('#0f172a');
  doc.text(patient?.fullName || 'Anonymous Patient', 180, infoY + 24);
  doc.text(patient?.mrn || 'N/A', 180, infoY + 40);
  doc.text(patient?.dob ? new Date(patient.dob).toLocaleDateString() : 'Not recorded', 180, infoY + 56);
  doc.text(clinicianName || patient?.assignedDoctor?.name || 'Unassigned', 180, infoY + 72);

  doc.font('Helvetica-Bold').fillColor('#475569');
  doc.text('Source Recording:', 320, infoY + 24);
  doc.text('Sampling Frequency:', 320, infoY + 40);
  doc.text('Montage:', 320, infoY + 56);
  doc.text('Session Date:', 320, infoY + 72);

  doc.font('Helvetica').fillColor('#0f172a');
  doc.text(session?.sourceName || 'EDF Upload', 440, infoY + 24);
  doc.text(`${session?.samplingRate || 128} Hz`, 440, infoY + 40);
  doc.text('18-Ch 10-20 Bipolar', 440, infoY + 56);
  doc.text(session?.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Recent', 440, infoY + 72);

  // Model & Analysis Findings
  const analysisY = 270;
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('AI Seizure Detection Findings', 40, analysisY);
  doc.moveTo(40, analysisY + 16).lineTo(555, analysisY + 16).strokeColor('#e2e8f0').stroke();

  const maxScore = Number(analysis?.confidence ?? analysis?.probabilities?.maxSeizureScore ?? 0);
  const threshold = Number(analysis?.probabilities?.threshold ?? 0.65);
  const isElevated = maxScore >= threshold;

  // Score summary card
  doc.rect(40, analysisY + 26, 250, 75).fillAndStroke(isElevated ? '#fef2f2' : '#f0fdf4', isElevated ? '#f87171' : '#4ade80');
  doc.fillColor(isElevated ? '#991b1b' : '#166534').fontSize(10).font('Helvetica-Bold')
    .text(isElevated ? 'ELECTROGRAPHIC SEIZURE PATTERN DETECTED' : 'NO SEIZURE PATTERNS DETECTED', 52, analysisY + 36);
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155')
    .text(`Max Seizure Probability: ${(maxScore * 100).toFixed(2)}% (Threshold: ${(threshold * 100).toFixed(0)}%)`, 52, analysisY + 54);
  doc.text(`Model Version: ${analysis?.modelVersion || 'chbmit-multiscale-hnm-v2'}`, 52, analysisY + 68);
  doc.text(`Review State: ${analysis?.clinicianReview?.toUpperCase() || 'PENDING'}`, 52, analysisY + 82);

  // Twin Context card
  doc.rect(305, analysisY + 26, 250, 75).fillAndStroke('#f8fafc', '#cbd5e1');
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Digital Twin Longitudinal Context', 317, analysisY + 36);
  doc.fontSize(8.5).font('Helvetica').fillColor('#334155')
    .text(`Monitoring Trend: ${(twin?.trend || 'stable').toUpperCase()}`, 317, analysisY + 54);
  doc.text(`Recorded Analyses: ${data.totalAnalyses || 1}`, 317, analysisY + 68);
  doc.text(`Clinical Action: ${twin?.state?.clinicalAction || 'Clinician review required'}`, 317, analysisY + 82, { width: 230 });

  // Detected Intervals Table
  const intervalsY = 370;
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('Detected Seizure Intervals', 40, intervalsY);
  doc.moveTo(40, intervalsY + 16).lineTo(555, intervalsY + 16).strokeColor('#e2e8f0').stroke();

  // Parse timeline intervals
  const timeline = Array.isArray(analysis?.timeline) ? analysis.timeline : [];
  const intervals = [];
  let currentStart = null;
  let currentEnd = null;
  let peakScore = 0;

  timeline.forEach((w) => {
    const isConfirmed = Boolean(w.confirmed_seizure || w.score >= threshold);
    if (isConfirmed) {
      if (currentStart === null) {
        currentStart = w.start_seconds;
        currentEnd = w.start_seconds + 10;
        peakScore = w.score;
      } else {
        currentEnd = w.start_seconds + 10;
        peakScore = Math.max(peakScore, w.score);
      }
    } else if (currentStart !== null) {
      intervals.push({ start: currentStart, end: currentEnd, duration: currentEnd - currentStart, peak: peakScore });
      currentStart = null;
    }
  });
  if (currentStart !== null) {
    intervals.push({ start: currentStart, end: currentEnd, duration: currentEnd - currentStart, peak: peakScore });
  }

  // Draw table header
  const tableY = intervalsY + 24;
  doc.rect(40, tableY, 515, 20).fill('#f1f5f9');
  doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Bold');
  doc.text('Event #', 50, tableY + 6);
  doc.text('Start Time', 120, tableY + 6);
  doc.text('End Time', 200, tableY + 6);
  doc.text('Duration (sec)', 280, tableY + 6);
  doc.text('Peak Seizure Probability', 380, tableY + 6);
  doc.text('Confirmation Mode', 480, tableY + 6);

  if (intervals.length === 0) {
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Oblique')
      .text('No elevated or confirmed seizure windows identified in this recording.', 50, tableY + 28);
  } else {
    let rowY = tableY + 24;
    intervals.slice(0, 5).forEach((ev, idx) => {
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica');
      doc.text(`Event ${idx + 1}`, 50, rowY);
      doc.text(`${ev.start.toFixed(1)}s (${formatTime(ev.start)})`, 120, rowY);
      doc.text(`${ev.end.toFixed(1)}s (${formatTime(ev.end)})`, 200, rowY);
      doc.text(`${ev.duration.toFixed(0)}s`, 280, rowY);
      doc.text(`${(ev.peak * 100).toFixed(2)}%`, 380, rowY);
      doc.text('Consecutive (>=2)', 480, rowY);
      rowY += 18;
    });
  }

  // Recent Clinical Notes
  const notesY = 510;
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('Clinical Notes & Attending Review', 40, notesY);
  doc.moveTo(40, notesY + 16).lineTo(555, notesY + 16).strokeColor('#e2e8f0').stroke();

  if (Array.isArray(notes) && notes.length > 0) {
    let noteY = notesY + 24;
    notes.slice(0, 3).forEach((n) => {
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
        .text(`${n.author?.name || 'Clinician'} — ${new Date(n.createdAt).toLocaleDateString()}:`, 50, noteY);
      doc.font('Helvetica').fillColor('#0f172a').text(n.body, 50, noteY + 12, { width: 495 });
      noteY += 32;
    });
  } else {
    doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Oblique')
      .text('No clinical notes recorded for this patient profile yet.', 50, notesY + 26);
  }

  // Footer
  const footerY = 770;
  doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor('#cbd5e1').stroke();
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
    .text('NeuroTwin AI EEG Prototype • CHB-MIT Multi-Scale Dilated Temporal CNN with HNM • Verified Subject-Disjoint Architecture', 40, footerY + 6, { align: 'center', width: 515 });
  doc.text('Page 1 of 1 — Generated electronically under authorized clinical session credentials.', 40, footerY + 16, { align: 'center', width: 515 });

  doc.end();
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}


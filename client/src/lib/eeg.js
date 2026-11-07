// Pure helpers that interpret stored analysis documents. Nothing here invents data.
import { WINDOW_SECONDS } from './api.js';

export const DEFAULT_THRESHOLD = 0.6; // fallback only; every stored analysis carries probabilities.threshold

export const scoreOf = (a) => Number(a?.confidence ?? a?.probabilities?.maxSeizureScore ?? 0);
export const thresholdOf = (a) => Number(a?.probabilities?.threshold ?? DEFAULT_THRESHOLD);

/** Classify one prediction window. `confirmed` comes from the server's consecutive-window confirmation. */
export const classifyWindow = (w, threshold) => {
  if (w.confirmed_seizure) return 'confirmed';
  return w.score >= threshold ? 'high' : 'normal';
};

/**
 * Contiguous runs of windows at or above `threshold` lasting at least `minRun` windows.
 * At the stored threshold this reproduces the server-confirmed events; moving the threshold
 * is a display-only what-if for review and never changes stored results.
 */
export const eventsAt = (input = [], threshold = DEFAULT_THRESHOLD, minRun = 2) => {
  const timeline = Array.isArray(input) ? input : (input?.timeline || []);
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length >= minRun) {
      const start = run[0].start_seconds;
      const end = run[run.length - 1].start_seconds + WINDOW_SECONDS;
      out.push({
        start,
        end,
        duration: end - start,
        peak: Math.max(...run.map((w) => w.score)),
        windows: run.length
      });
    }
    run = [];
  };
  timeline.forEach((w) => (w.score >= threshold ? run.push(w) : flush()));
  flush();
  return out;
};

/** Server-confirmed events (contiguous confirmed windows). */
export const confirmedEvents = (input = []) => {
  const timeline = Array.isArray(input) ? input : (input?.timeline || []);
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length) {
      const start = run[0].start_seconds;
      const end = run[run.length - 1].start_seconds + WINDOW_SECONDS;
      out.push({
        start,
        end,
        duration: end - start,
        peak: Math.max(...run.map((w) => w.score)),
        windows: run.length
      });
    }
    run = [];
  };
  timeline.forEach((w) => (w.confirmed_seizure ? run.push(w) : flush()));
  flush();
  return out;
};

export const durationOf = (a) => {
  const t = a?.timeline;
  if (!t?.length) return 0;
  return t[t.length - 1].start_seconds + WINDOW_SECONDS;
};

/** Plain-language outcome label. Never a diagnosis. */
export const outcomeOf = (a) => {
  const events = confirmedEvents(a?.timeline);
  if (events.length) return { key: 'confirmed', label: `${events.length} model event${events.length > 1 ? 's' : ''}`, tone: 'danger' };
  if (scoreOf(a) >= thresholdOf(a)) return { key: 'high', label: 'High-probability window', tone: 'warning' };
  return { key: 'normal', label: 'No model events', tone: 'success' };
};

export const outcomeKeyOf = (a) => outcomeOf(a).key;

/**
 * EDF uploads return the first 15 s (downsampled); simulations return 1280 samples at 128 Hz (10 s).
 */
export const previewSeconds = (input = []) => {
  if (Array.isArray(input)) {
    const first = Array.isArray(input[0]) ? input[0] : input;
    return first.length === 1280 ? 10 : 15;
  }
  const ch = input?.multichannel_waveform?.[0] || input?.waveform || [];
  return ch.length === 1280 ? 10 : 15;
};

export const patientOf = (a, patients = []) => {
  if (a?.patient && typeof a.patient === 'object') return a.patient;
  const pid = patientIdOf(a);
  if (pid && Array.isArray(patients)) {
    return patients.find((p) => p._id === pid) || null;
  }
  return null;
};
export const patientIdOf = (a) => a?.patient?._id || a?.patient || a?.patientId?._id || a?.patientId;
export const sourceOf = (a) => a?.session?.sourceName || 'EEG recording';


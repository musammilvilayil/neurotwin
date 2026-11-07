import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clock, WINDOW_SECONDS } from '../lib/api.js';
import { classifyWindow, confirmedEvents } from '../lib/eeg.js';
import { Tabs } from './ui.jsx';

/** Tracks an element's rendered width so SVG charts redraw crisply at any size. */
export function useWidth(initial = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const measure = () => setWidth(Math.max(240, Math.round(node.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

const COLORS = { normal: '#93c5fd', high: '#d99024', confirmed: '#dc535b', line: '#2563eb', grid: '#e5eaf1', gridStrong: '#d3dbe7', text: '#64748b' };
const OUTCOME_TEXT = { normal: 'Normal prediction window', high: 'High-probability window (not confirmed)', confirmed: 'Temporally confirmed model event' };

export const Legend = ({ items }) => (
  <div className="chart-legend">
    {items.map((item) => (
      <span key={item.label} className="legend-item"><i className="legend-dot" style={{ background: item.color }} />{item.label}</span>
    ))}
  </div>
);

export const WINDOW_LEGEND = [
  { label: 'Normal window', color: COLORS.normal },
  { label: 'High probability', color: COLORS.high },
  { label: 'Confirmed event', color: COLORS.confirmed }
];

/* ------------------------------------------------------------------ */
/* Multichannel EEG viewer                                             */
/* ------------------------------------------------------------------ */
const GAINS = [{ id: '0.5', label: '0.5×' }, { id: '1', label: '1×' }, { id: '2', label: '2×' }];

const DEFAULT_LEADS = [
  'FP1-F7', 'F7-T7', 'T7-P7', 'P7-O1',
  'FP1-F3', 'F3-C3', 'C3-P3', 'P3-O1',
  'FZ-CZ', 'CZ-PZ',
  'FP2-F4', 'F4-C4', 'C4-P4', 'P4-O2',
  'FP2-F8', 'F8-T8', 'T8-P8', 'P8-O2',
];

export function EEGPanel({ signals, channels, names, duration = 10, events = [], caption }) {
  const signalList = signals || (Array.isArray(channels?.[0]) ? channels : []);
  const rawLabels = names || (typeof channels?.[0] === 'string' ? channels : []);
  const channelLabels = Array.isArray(rawLabels) && rawLabels.length ? rawLabels : DEFAULT_LEADS;
  const [ref, width] = useWidth();
  const [gain, setGain] = useState('1');
  const [hover, setHover] = useState(null);
  const narrow = width < 520;
  const gutter = narrow ? 56 : 72;
  const rowH = narrow ? 22 : 26;
  const axisH = 24;
  const rows = signalList.length;
  const height = Math.max(120, axisH + rows * rowH + 6);
  const plotW = Math.max(120, width - gutter - 10);
  const g = Number(gain);
  const amp = (rowH * 0.5) / 3.2;

  const seconds = useMemo(() => {
    const step = plotW > 640 ? 1 : plotW > 360 ? 2 : 5;
    const list = [];
    for (let s = 0; s <= duration; s += step) list.push(s);
    return { list, step };
  }, [duration, plotW]);

  const paths = useMemo(() => signalList.map((samples = [], row) => {
    const n = samples.length;
    const mid = axisH + row * rowH + rowH / 2;
    let d = '';
    for (let i = 0; i < n; i += 1) {
      const v = Math.max(-3.2, Math.min(3.2, (Number(samples[i]) || 0) * g));
      const x = gutter + (n > 1 ? (i / (n - 1)) * plotW : 0);
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(mid - v * amp).toFixed(1)}`;
    }
    return d;
  }), [signalList, g, gutter, plotW, rowH, amp]);

  const onMove = useCallback((event) => {
    if (!rows) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < gutter || x > gutter + plotW || y < axisH || y > axisH + rows * rowH) { setHover(null); return; }
    const row = Math.min(rows - 1, Math.floor((y - axisH) / rowH));
    const frac = (x - gutter) / plotW;
    const n = signalList[row]?.length || 1;
    const idx = Math.round(frac * (n - 1));
    setHover({ x, row, t: frac * duration, v: Number(signalList[row]?.[idx]) || 0, w: rect.width });
  }, [gutter, plotW, rows, rowH, signalList, duration]);

  if (!rows) {
    return <div className="empty"><p>No multichannel waveform stored for this recording.</p></div>;
  }

  return (
    <div className="chart" ref={ref}>
      <div className="chart-bar">
        <div className="muted" style={{ fontSize: 12.5 }}>{caption || `${rows} bipolar leads · ${duration}s preview`}</div>
        <div className="row" style={{ gap: 8 }}>
          <span className="muted" style={{ fontSize: 12.5 }}>Amplitude gain</span>
          <Tabs tabs={GAINS} value={gain} onChange={setGain} label="Amplitude gain" />
        </div>
      </div>
      <div className="chart-canvas" style={{ height }}>
        <svg width={width} height={height} role="img" aria-label={`${rows}-channel EEG preview over ${duration} seconds`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
          {events.map((e, i) => {
            const x1 = gutter + (Math.max(0, e.start) / duration) * plotW;
            const x2 = gutter + (Math.min(duration, e.end) / duration) * plotW;
            if (x2 <= gutter || x1 >= gutter + plotW) return null;
            return (
              <g key={i}>
                <rect x={x1} y={axisH} width={Math.max(2, x2 - x1)} height={rows * rowH} fill="rgba(220,83,91,0.10)" stroke="rgba(220,83,91,0.45)" strokeDasharray="4 3" />
                <text x={x1 + 4} y={axisH - 8} fontSize="10.5" fill="#b3333c" fontWeight="600">Model event</text>
              </g>
            );
          })}
          {seconds.list.map((s) => {
            const x = gutter + (s / duration) * plotW;
            const strong = s % 5 === 0;
            return (
              <g key={s}>
                <line x1={x} x2={x} y1={axisH} y2={axisH + rows * rowH} stroke={strong ? COLORS.gridStrong : COLORS.grid} strokeWidth={strong ? 1 : 0.7} />
                {(strong || seconds.step >= 2) && <text x={x} y={14} textAnchor="middle" fontSize="10.5" fill={COLORS.text}>{s}s</text>}
              </g>
            );
          })}
          {signalList.map((_, row) => (
            <g key={row}>
              <line x1={gutter} x2={gutter + plotW} y1={axisH + (row + 1) * rowH} y2={axisH + (row + 1) * rowH} stroke={COLORS.grid} strokeWidth="0.7" />
              <text x={gutter - 8} y={axisH + row * rowH + rowH / 2 + 3.5} textAnchor="end" fontSize={narrow ? 9.5 : 10.5} fill={hover?.row === row ? '#172033' : COLORS.text} fontWeight={hover?.row === row ? 650 : 500} fontFamily="ui-monospace, Menlo, Consolas, monospace">{channelLabels[row] || `CH-${row + 1}`}</text>
              <path d={paths[row]} fill="none" stroke={hover?.row === row ? '#1d4ed8' : COLORS.line} strokeWidth={hover?.row === row ? 1.5 : 1.1} strokeLinejoin="round" opacity={hover && hover.row !== row ? 0.55 : 1} />
            </g>
          ))}
          {hover && <line x1={hover.x} x2={hover.x} y1={axisH} y2={axisH + rows * rowH} stroke="#172033" strokeWidth="1" strokeDasharray="3 3" />}
        </svg>
        {hover && (
          <div className="chart-tip" style={{ left: Math.min(hover.x + 12, hover.w - 190), top: Math.max(4, axisH + hover.row * rowH - 38) }}>
            <b>{channelLabels[hover.row] || `CH-${hover.row + 1}`}</b>
            <span>{hover.t.toFixed(1)} s · {hover.v >= 0 ? '+' : ''}{hover.v.toFixed(2)} σ</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Prediction timeline                                                 */
/* ------------------------------------------------------------------ */
export function ScoreTimeline({ timeline = [], threshold, height = 230 }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const n = timeline.length;
  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 30;
  const plotW = Math.max(120, width - padL - padR);
  const plotH = height - padT - padB;
  const total = n * WINDOW_SECONDS;
  const y = (score) => padT + (1 - Math.max(0, Math.min(1, score))) * plotH;
  const barW = n ? plotW / n : 0;
  const events = useMemo(() => confirmedEvents(timeline), [timeline]);

  const ticks = useMemo(() => {
    const steps = [30, 60, 120, 300, 600, 900, 1800, 3600];
    const step = steps.find((s) => total / s <= (plotW > 560 ? 8 : 4)) || 3600;
    const list = [];
    for (let s = 0; s <= total; s += step) list.push(s);
    return list;
  }, [total, plotW]);

  const onMove = (event) => {
    if (!n) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - padL;
    if (x < 0 || x > plotW) { setHover(null); return; }
    const index = Math.min(n - 1, Math.floor((x / plotW) * n));
    setHover({ index, w: rect.width });
  };

  if (!n) return <div className="empty"><p>No prediction windows were stored for this recording.</p></div>;
  const hw = hover ? timeline[hover.index] : null;
  const hCls = hw ? classifyWindow(hw, threshold) : null;

  return (
    <div className="chart" ref={ref}>
      <div className="chart-canvas" style={{ height }}>
        <svg width={width} height={height} role="img" aria-label={`Seizure-probability timeline with ${n} ten-second windows and a ${Math.round(threshold * 100)}% threshold`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={padL} x2={padL + plotW} y1={y(v)} y2={y(v)} stroke={v === 0 ? COLORS.gridStrong : COLORS.grid} strokeWidth="1" />
              <text x={padL - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10.5" fill={COLORS.text}>{Math.round(v * 100)}%</text>
            </g>
          ))}
          {events.map((e, i) => (
            <rect key={i} x={padL + (e.start / total) * plotW} width={Math.max(2, ((e.end - e.start) / total) * plotW)} y={padT} height={plotH} fill="rgba(220,83,91,0.09)" />
          ))}
          {timeline.map((w, i) => (
            <rect key={i} x={padL + i * barW} width={Math.max(1, barW - (barW > 4 ? 1 : 0.2))} y={y(w.score)} height={Math.max(0.5, padT + plotH - y(w.score))} fill={COLORS[classifyWindow(w, threshold)]} opacity={hover && hover.index !== i ? 0.55 : 1} rx={barW > 4 ? 1 : 0} />
          ))}
          <line x1={padL} x2={padL + plotW} y1={y(threshold)} y2={y(threshold)} stroke="#172033" strokeWidth="1.2" strokeDasharray="5 4" />
          <text x={padL + plotW} y={y(threshold) - 5} textAnchor="end" fontSize="10.5" fontWeight="600" fill="#172033">Threshold {Math.round(threshold * 100)}%</text>
          {ticks.map((s) => (
            <g key={s}>
              <line x1={padL + (s / total) * plotW} x2={padL + (s / total) * plotW} y1={padT + plotH} y2={padT + plotH + 4} stroke={COLORS.gridStrong} />
              <text x={padL + (s / total) * plotW} y={height - 8} textAnchor={s === 0 ? 'start' : 'middle'} fontSize="10.5" fill={COLORS.text}>{clock(s)}</text>
            </g>
          ))}
          {hover && <line x1={padL + (hover.index + 0.5) * barW} x2={padL + (hover.index + 0.5) * barW} y1={padT} y2={padT + plotH} stroke="#172033" strokeWidth="1" />}
        </svg>
        {hover && hw && (
          <div className="chart-tip" style={{ left: Math.max(8, Math.min(padL + (hover.index + 0.5) * barW + 12, hover.w - 230)), top: 6 }}>
            <b>{clock(hw.start_seconds)}–{clock(hw.start_seconds + WINDOW_SECONDS)}</b>
            <span>Probability {(hw.score * 100).toFixed(1)}%</span>
            <span style={{ display: 'block', color: hCls === 'confirmed' ? '#b3333c' : hCls === 'high' ? '#9a6110' : '#475569' }}>{OUTCOME_TEXT[hCls]}</span>
          </div>
        )}
      </div>
      <Legend items={WINDOW_LEGEND} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generic line chart (training curves)                                */
/* ------------------------------------------------------------------ */
export function LineChart({ series = [], labels, xLabels, format = (v) => Number(v || 0).toFixed(2), height = 220, yMin, yMax }) {
  const axisLabels = labels || xLabels || [];
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const padL = 44;
  const padR = 14;
  const padT = 12;
  const padB = 30;
  const plotW = Math.max(120, width - padL - padR);
  const plotH = height - padT - padB;
  const all = series.flatMap((s) => s.values || []);
  const lo = yMin ?? Math.min(0, ...all);
  const hi = yMax ?? (all.length ? Math.max(...all) * 1.08 : 1);
  const x = (i) => padL + (axisLabels.length > 1 ? (i / (axisLabels.length - 1)) * plotW : plotW / 2);
  const y = (v) => padT + (1 - (v - lo) / (hi - lo || 1)) * plotH;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + f * (hi - lo));

  const onMove = (event) => {
    if (!axisLabels.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left - padL;
    const idx = Math.max(0, Math.min(axisLabels.length - 1, Math.round((px / plotW) * (axisLabels.length - 1))));
    setHover({ idx, w: rect.width });
  };

  return (
    <div className="chart" ref={ref}>
      <div className="chart-canvas" style={{ height }}>
        <svg width={width} height={height} role="img" aria-label="Training history chart" onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
          {grid.map((v) => (
            <g key={v}>
              <line x1={padL} x2={padL + plotW} y1={y(v)} y2={y(v)} stroke={COLORS.grid} />
              <text x={padL - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10.5" fill={COLORS.text}>{format(v)}</text>
            </g>
          ))}
          {axisLabels.map((l, i) => <text key={l} x={x(i)} y={height - 8} textAnchor="middle" fontSize="10.5" fill={COLORS.text}>{l}</text>)}
          {series.map((s) => {
            const sName = s.name || s.label;
            return (
              <g key={sName}>
                <path d={(s.values || []).map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('')} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
                {hover && s.values?.[hover.idx] !== undefined && <circle cx={x(hover.idx)} cy={y(s.values[hover.idx])} r="4" fill="#fff" stroke={s.color} strokeWidth="2" />}
              </g>
            );
          })}
          {hover && <line x1={x(hover.idx)} x2={x(hover.idx)} y1={padT} y2={padT + plotH} stroke="#172033" strokeOpacity="0.35" />}
        </svg>
        {hover && (
          <div className="chart-tip" style={{ left: Math.max(8, Math.min(x(hover.idx) + 12, hover.w - 190)), top: 6 }}>
            <b>{axisLabels[hover.idx]}</b>
            {series.map((s) => {
              const sName = s.name || s.label;
              return <span key={sName} style={{ display: 'block' }}>{sName}: {format(s.values?.[hover.idx])}</span>;
            })}
          </div>
        )}
      </div>
      <Legend items={series.map((s) => ({ label: s.name || s.label, color: s.color }))} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */
export function Donut({ segments = [], size = 148, center, sub, label }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const centerValue = center ?? total;
  const subLabel = sub ?? label;
  const r = (size - 20) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth="16" />
        {total > 0 && segments.map((s) => {
          const len = (s.value / total) * c;
          const el = <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 1.5)} ${c - len + 1.5}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          offset += len;
          return el;
        })}
      </svg>
      <div className="donut-center"><b>{centerValue}</b>{subLabel && <span>{subLabel}</span>}</div>
    </div>
  );
}


import React, { useState } from 'react';
import { Activity, Sliders, Maximize2, Waves, AlertTriangle } from 'lucide-react';

const defaultLeads = [
  "FP1-F7", "F7-T7", "T7-P7", "P7-O1",
  "FP2-F8", "F8-T8", "T8-P8", "P8-O2",
  "FP1-F3", "F3-C3", "C3-P3", "P3-O1",
  "FP2-F4", "F4-C4", "C4-P4", "P4-O2",
  "FZ-CZ", "CZ-PZ"
];

export default function MultichannelEEGViewer({
  multichannel = [],
  channels = [],
  windowSeconds = 15,
  isSeizure = false,
  confidence = 0,
  samplingRate = 128
}) {
  const [gain, setGain] = useState(1);
  const channelNames = Array.isArray(channels) && channels.length === multichannel.length ? channels : defaultLeads;

  if (!Array.isArray(multichannel) || multichannel.length === 0) {
    return (
      <div className="eeg-console-card" style={{ padding: '36px', textAlign: 'center' }}>
        <Waves size={32} style={{ color: 'var(--nt-text-muted)', marginBottom: '8px' }} />
        <h4 style={{ color: 'var(--nt-text-primary)', margin: '0 0 4px' }}>No Multichannel Signal Available</h4>
        <p style={{ color: 'var(--nt-text-muted)', fontSize: '12px' }}>
          Select or upload an 18-channel bipolar EDF recording to inspect signal waveforms.
        </p>
      </div>
    );
  }

  return (
    <div className="eeg-console-card">
      <div className="eeg-console-header">
        <div className="eeg-console-title">
          <Activity size={15} style={{ color: 'var(--nt-accent-cyan)' }} />
          <span>18-CHANNEL BIPOLAR 10–20 MONTAGE (FIRST {windowSeconds}s)</span>
          {isSeizure && (
            <span className="nt-badge nt-badge-danger" style={{ marginLeft: '8px' }}>
              <AlertTriangle size={11} /> Seizure Detected ({(confidence * 100).toFixed(1)}%)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--nt-text-secondary)' }}>
            <span>Gain:</span>
            <button
              type="button"
              className={`btn btn-sm ${gain === 0.75 ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '2px 7px', fontSize: '10px' }}
              onClick={() => setGain(0.75)}
            >
              0.75x
            </button>
            <button
              type="button"
              className={`btn btn-sm ${gain === 1 ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '2px 7px', fontSize: '10px' }}
              onClick={() => setGain(1)}
            >
              1.0x
            </button>
            <button
              type="button"
              className={`btn btn-sm ${gain === 1.5 ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '2px 7px', fontSize: '10px' }}
              onClick={() => setGain(1.5)}
            >
              1.5x
            </button>
          </div>
          <span className="eeg-time-axis-label">
            {samplingRate} Hz · 0.5–40 Hz Bandpass · 50 µV Scale
          </span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Time Axis Grid Markers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0 4px 85px', fontSize: '10px', color: 'var(--nt-text-muted)', fontFamily: 'var(--nt-font-mono)' }}>
          <span>0.0s</span>
          <span>{(windowSeconds * 0.25).toFixed(1)}s</span>
          <span>{(windowSeconds * 0.5).toFixed(1)}s</span>
          <span>{(windowSeconds * 0.75).toFixed(1)}s</span>
          <span>{windowSeconds}.0s</span>
        </div>

        {multichannel.map((samples, idx) => {
          const leadName = channelNames[idx] || `CH-${idx + 1}`;
          const pts = samples.map((v, i) => {
            const clamped = Math.max(-3.5, Math.min(3.5, Number(v) || 0)) * gain;
            const y = 13 - clamped * 3.4;
            const x = (i / (samples.length - 1)) * 100;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ');

          return (
            <div className="eeg-trace-row" key={leadName}>
              <span className="eeg-channel-tag">{leadName}</span>
              <svg className="eeg-lead-canvas" viewBox="0 0 100 26" preserveAspectRatio="none">
                <line x1="0" y1="13" x2="100" y2="13" />
                <polyline
                  points={pts}
                  style={{
                    stroke: isSeizure ? '#F16B78' : 'var(--nt-accent-cyan)',
                    strokeWidth: isSeizure ? '1.45px' : '1.3px'
                  }}
                />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}


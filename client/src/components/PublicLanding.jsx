import React, { useState } from 'react';
import {
  Brain, ShieldCheck, Activity, Users, ArrowUpRight, Sparkles,
  Lock, AlertTriangle, Waves, Heart, CheckCircle2, ChevronRight, X
} from 'lucide-react';

const roleCredentials = {
  doctor: { username: 'doctor', roleName: 'Clinician / Doctor' },
  patient: { username: 'patient', roleName: 'Patient' },
  caregiver: { username: 'caregiver', roleName: 'Caregiver' },
  admin: { username: 'admin', roleName: 'Administrator' }
};

export default function PublicLanding({ onLogin, api }) {
  const [page, setPage] = useState('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [identifier, setIdentifier] = useState('doctor');
  const [password, setPassword] = useState('DemoPass123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      onLogin(data);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setBusy(false);
    }
  };

  const selectDemoRole = (roleKey) => {
    setIdentifier(roleCredentials[roleKey].username);
    setPassword('DemoPass123!');
    setError('');
  };

  return (
    <div className="public-site">
      {/* Translucent Glass Top Navigation */}
      <header className="public-nav">
        <button className="public-brand" onClick={() => setPage('home')}>
          <div className="logo-mark">
            <Brain size={22} />
          </div>
          <div>
            NeuroTwin
            <small>EEG WORKSPACE</small>
          </div>
        </button>

        <nav aria-label="Public site pages">
          <button className={page === 'home' ? 'selected' : ''} onClick={() => setPage('home')}>Home</button>
          <button className={page === 'about' ? 'selected' : ''} onClick={() => setPage('about')}>About</button>
          <button className={page === 'features' ? 'selected' : ''} onClick={() => setPage('features')}>Capabilities</button>
          <button className={page === 'research' ? 'selected' : ''} onClick={() => setPage('research')}>Research & Safety</button>
        </nav>

        <button className="public-login-cta" onClick={() => setShowLoginModal(true)}>
          Enter Workspace <ArrowUpRight size={15} />
        </button>
      </header>

      {/* Main Content Pages */}
      <main className="public-main">
        {page === 'home' && (
          <>
            <section className="public-hero">
              <div className="public-hero-copy">
                <p className="eyebrow">
                  <Sparkles size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                  CLINICAL BCI DIGITAL TWIN PLATFORM
                </p>
                <h1>Understand the signal.<br /><i>Keep the clinical context.</i></h1>
                <p>
                  NeuroTwin unifies automated 18-channel EEG anomaly detection with patient-specific
                  Digital Twin trajectory tracking to accelerate clinical review and reduce cognitive burden.
                </p>

                <div className="public-hero-actions">
                  <button className="primary-button" onClick={() => setShowLoginModal(true)}>
                    Enter Workspace <ArrowUpRight size={17} />
                  </button>
                  <button className="public-secondary-button" onClick={() => setPage('features')}>
                    Explore Capabilities
                  </button>
                </div>

                <div className="public-trust">
                  <span><ShieldCheck size={16} /> Role-Based Access</span>
                  <span><Activity size={16} /> Automated 18-Ch EEG Processing</span>
                  <span><Users size={16} /> Connected Care Team</span>
                </div>
              </div>

              {/* High-Tech Visual Brain Card */}
              <div className="public-visual">
                <div className="public-orbit orbit-a" />
                <div className="public-orbit orbit-b" />
                <div className="public-brain">
                  <Brain size={90} strokeWidth={1.2} />
                </div>
                <span className="public-signal signal-one" />
                <span className="public-signal signal-two" />
                <div className="public-visual-label">
                  <Waves size={15} /> 18-CH BIPOLAR · DIGITAL TWIN STREAM
                </div>
              </div>
            </section>

            {/* Architecture Overview Section */}
            <section className="public-section">
              <p className="eyebrow">INTEGRATED ARCHITECTURE</p>
              <h2>From Raw Waveform to Longitudinal Insight</h2>
              <p className="public-section-lead">
                Combining Brain-Computer Interface principles with convolutional neural networks
                to generate patient-tailored neurological representations.
              </p>

              <div className="public-feature-grid">
                <div className="public-feature-card">
                  <span><Activity size={22} /></span>
                  <h3>18-Channel EEG Analysis</h3>
                  <p>
                    Automated signal preprocessing, temporal smoothing, and multi-scale CNN
                    inference on standard 10–20 bipolar montages.
                  </p>
                </div>

                <div className="public-feature-card">
                  <span><Brain size={22} /></span>
                  <h3>Patient-Specific Digital Twin</h3>
                  <p>
                    Computational representation tracking individual baseline stability,
                    anomaly recurrence frequency, and longitudinal response.
                  </p>
                </div>

                <div className="public-feature-card">
                  <span><ShieldCheck size={22} /></span>
                  <h3>Dual-View Role Architecture</h3>
                  <p>
                    Specialized dashboards: clinicians review raw waveforms and explainability metrics;
                    patients view simplified wellness scores and plain-language notes.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {page === 'about' && (
          <section className="public-section public-copy-section">
            <p className="eyebrow">ABOUT NEUROTWIN</p>
            <h2>An AI-Driven Framework for BCI-Based Neurological Monitoring</h2>
            <p>
              NeuroTwin is an academic research software prototype demonstrating how Brain-Computer Interface (BCI) concepts,
              artificial intelligence, and Digital Twin technology can be combined for clinical decision support.
            </p>
            <p>
              By applying deep CNN architectures trained on public benchmarks (PhysioNet CHB-MIT), the framework flags
              potential seizure intervals with confidence metrics and explainable frequency band distributions, reducing
              clinician workload during continuous EEG monitoring.
            </p>
            <div className="public-boundary">
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div>
                <b>Clinical Decision Support Scope:</b>
                <p style={{ margin: '3px 0 0', fontSize: '13px' }}>
                  NeuroTwin is an assistive tool for research and clinical review. It does not replace clinical judgment,
                  independent medical examination, or certified diagnostic medical devices.
                </p>
              </div>
            </div>
          </section>
        )}

        {page === 'features' && (
          <section className="public-section">
            <p className="eyebrow">ROLE SEPARATION</p>
            <h2>Built Around Four Connected Care Roles</h2>
            <p className="public-section-lead">
              Strict role-based access control ensures data privacy while providing each participant with role-tailored tools.
            </p>

            <div className="public-feature-grid">
              <div className="public-feature-card">
                <span><Activity size={22} /></span>
                <h3>Doctor / Clinician</h3>
                <p>
                  Inspect raw 18-channel bipolar waveforms, review AI-flagged seizure intervals, adjust threshold sensitivity,
                  manage caseloads, and enter diagnoses and medication regimens.
                </p>
              </div>

              <div className="public-feature-card">
                <span><Heart size={22} /></span>
                <h3>Patient</h3>
                <p>
                  Access simplified brain wellness scores, plain-language clinical summaries, medication schedules with
                  timing badges, and printable prescription slips.
                </p>
              </div>

              <div className="public-feature-card">
                <span><Users size={22} /></span>
                <h3>Caregiver</h3>
                <p>
                  Read-only access to the patient's wellness scores, care instructions, upcoming consultation appointments,
                  and medication schedules.
                </p>
              </div>

              <div className="public-feature-card">
                <span><ShieldCheck size={22} /></span>
                <h3>Administrator</h3>
                <p>
                  User account management, role assignment, patient consent and privacy tracking, and platform audit logging.
                </p>
              </div>
            </div>
          </section>
        )}

        {page === 'research' && (
          <section className="public-section public-copy-section">
            <p className="eyebrow">RESEARCH METHODOLOGY & SAFETY</p>
            <h2>Transparency, Explainability, and Clinical Boundaries</h2>
            <p>
              All AI outputs generated within NeuroTwin include confidence scores and frequency-band explainability metrics
              (Delta, Theta, Alpha, Beta, Gamma) to facilitate informed clinician verification.
            </p>
            <p>
              The system utilizes a 10-second window multi-scale temporal CNN architecture with consecutive confirmation
              to suppress transient artifacts and reduce false alarm rates.
            </p>
            <div className="public-boundary">
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div>
                <b>Regulatory Notice:</b>
                <p style={{ margin: '3px 0 0', fontSize: '13px' }}>
                  This platform is designed for research, retrospective analysis, and educational demonstration.
                  It has not received regulatory clearance as a medical device for standalone diagnostic decision-making.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Bottom Call to Action */}
        <section className="public-bottom-cta">
          <div>
            <p className="eyebrow">AUTHORIZED WORKSPACE</p>
            <h2>Access Your NeuroTwin Research Session</h2>
            <p>Sign in with your authorized credentials to access your role-specific dashboard.</p>
          </div>
          <button className="primary-button" onClick={() => setShowLoginModal(true)}>
            Open Workspace Login <ArrowUpRight size={17} />
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <span>© NeuroTwin · AI-Driven BCI Digital Twin Research Platform</span>
        <span>Decision Support Only · Not a Diagnostic Medical Device</span>
      </footer>

      {/* Login Modal Dialog */}
      {showLoginModal && (
        <div className="modal-backdrop" onClick={() => setShowLoginModal(false)}>
          <div className="modal-dialog" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} style={{ color: 'var(--nt-accent-cyan)' }} />
                <h3 style={{ margin: 0, fontSize: '16px' }}>Sign In to NeuroTwin</h3>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowLoginModal(false)}
                aria-label="Close login dialog"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <div className="modal-content-body">
                <p style={{ fontSize: '12.5px', color: 'var(--nt-text-secondary)', marginBottom: '16px' }}>
                  Select a demo account below or enter your authorized login credentials:
                </p>

                {/* 1-Click Role Fill Buttons */}
                <div style={{ marginBottom: '18px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--nt-text-muted)', display: 'block', marginBottom: '6px' }}>
                    DEMO ROLES (1-CLICK FILL):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {Object.entries(roleCredentials).map(([rKey, rVal]) => (
                      <button
                        key={rKey}
                        type="button"
                        className={`btn btn-sm ${identifier === rVal.username ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => selectDemoRole(rKey)}
                      >
                        {rVal.roleName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="login-username">Username or Email</label>
                  <input
                    id="login-username"
                    className="nt-input"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    className="nt-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <small style={{ color: 'var(--nt-text-muted)', fontSize: '10.5px', marginTop: '3px' }}>
                    Default password for demo accounts: <b>DemoPass123!</b>
                  </small>
                </div>

                {error && (
                  <div className="nt-badge nt-badge-danger" style={{ width: '100%', padding: '8px 12px', fontSize: '12px', marginTop: '10px' }}>
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}
              </div>

              <div className="modal-footer-bar">
                <button type="button" className="btn btn-outline" onClick={() => setShowLoginModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Authenticating…' : 'Sign In Securely'} <ArrowUpRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


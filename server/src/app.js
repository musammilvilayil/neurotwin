import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authenticate, allow, sign } from './auth.js';
import { User, Patient, EEGSession, Analysis, TwinSnapshot, ClinicalNote, AuditEvent } from './models.js';
import { generateReportPdf } from './report.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, file.originalname.toLowerCase().endsWith('.edf'))
});

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || false }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const audit = async (req, action, target, meta = {}) => AuditEvent.create({ actor: req.user?.id, action, target, meta });

const canAccess = async (req, id) => {
  const p = await Patient.findById(id);
  if (!p) return false;
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'doctor') return String(p.assignedDoctor) === String(req.user.id);
  const u = await User.findById(req.user.id);
  if (req.user.role === 'patient') return String(u?.linkedPatient) === String(p._id);
  if (req.user.role === 'caregiver') return (p.caregiverUsers || []).some((x) => String(x) === String(req.user.id));
  return false;
};

app.get('/api/health', (_, res) => res.json({ status: 'ok', clinicalBoundary: 'Decision support only; not a diagnostic device.' }));

app.get('/api/model/state', async (_, res) => {
  try {
    const response = await fetch(`${process.env.ML_SERVICE_URL || 'http://localhost:8001'}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    const state = await response.json();
    res.status(response.ok ? 200 : 503).json({
      ...state,
      source: 'ml-service',
      clinicalBoundary: 'Research only; not for diagnosis or treatment decisions.'
    });
  } catch {
    res.status(503).json({
      model_state: 'not_ready',
      error: 'ML service unavailable',
      clinicalBoundary: 'Research only; not for diagnosis or treatment decisions.'
    });
  }
});

app.post('/api/auth/login', ah(async (req, res) => {
  const identifier = String(req.body.identifier || req.body.username || req.body.email || '').trim().toLowerCase();
  const u = identifier ? await User.findOne({ $or: [{ username: identifier }, { email: identifier }] }) : null;
  if (!u || u.active === false || typeof u.passwordHash !== 'string' || !u.passwordHash || typeof req.body.password !== 'string' || !(await bcrypt.compare(req.body.password, u.passwordHash))) {
    return res.status(401).json({ error: 'Invalid username/email or password' });
  }
  res.json({ token: sign(u), user: { id: u._id, name: u.name, username: u.username, email: u.email, role: u.role, linkedPatient: u.linkedPatient } });
}));

app.get('/api/auth/me', authenticate, ah(async (req, res) => {
  res.json(await User.findById(req.user.id).select('-passwordHash'));
}));

app.get('/api/dashboard', authenticate, ah(async (req, res) => {
  const u = await User.findById(req.user.id);
  if (!u) return res.status(401).json({ error: 'User account no longer exists' });
  let patients = [];
  if (req.user.role === 'doctor') patients = await Patient.find({ assignedDoctor: u._id });
  else if (req.user.role === 'admin') patients = await Patient.find();
  else if (req.user.role === 'caregiver') patients = await Patient.find({ caregiverUsers: u._id });
  else if (req.user.role === 'patient' && u.linkedPatient) patients = await Patient.find({ _id: u.linkedPatient });

  const patientIds = patients.map((p) => p._id);
  const scope = req.user.role === 'admin' ? {} : { patient: { $in: patientIds } };
  const recent = patientIds.length ? await Analysis.find(scope).populate('patient', 'fullName').sort({ createdAt: -1 }).limit(5) : [];
  const counts = {
    patients: patients.length,
    analyses: await Analysis.countDocuments(scope),
    pending: await Analysis.countDocuments({ ...scope, clinicianReview: 'pending' })
  };
  if (req.user.role === 'admin') counts.users = await User.countDocuments({ active: { $ne: false } });
  res.json({ role: u.role, patients, recent, counts });
}));

app.get('/api/patients', authenticate, allow('admin', 'doctor'), ah(async (req, res) => {
  res.json(await Patient.find(req.user.role === 'doctor' ? { assignedDoctor: req.user.id } : {}).populate('assignedDoctor', 'name'));
}));

app.post('/api/patients', authenticate, allow('admin', 'doctor'), ah(async (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  if (!fullName) return res.status(400).json({ error: 'Patient full name is required' });
  const assignedDoctor = req.user.role === 'doctor' ? req.user.id : (req.body.assignedDoctor || undefined);
  const p = await Patient.create({
    fullName,
    dob: req.body.dob || undefined,
    mrn: req.body.mrn ? String(req.body.mrn).trim() : undefined,
    assignedDoctor,
    conditions: Array.isArray(req.body.conditions) ? req.body.conditions.map((x) => String(x).trim()).filter(Boolean) : [],
    consented: req.body.consented === true
  });
  await audit(req, 'patient.created', p._id);
  res.status(201).json(p);
}));

app.get('/api/patients/:id/overview', authenticate, ah(async (req, res) => {
  if (!(await canAccess(req, req.params.id))) return res.status(403).json({ error: 'Not authorized for this patient' });
  const [patient, analyses, twin, notes] = await Promise.all([
    Patient.findById(req.params.id).populate('assignedDoctor', 'name'),
    Analysis.find({ patient: req.params.id }).sort({ createdAt: -1 }).limit(12),
    TwinSnapshot.findOne({ patient: req.params.id }).sort({ date: -1 }),
    ClinicalNote.find({ patient: req.params.id, ...(req.user.role === 'patient' || req.user.role === 'caregiver' ? { visibility: 'patient' } : {}) }).populate('author', 'name').sort({ createdAt: -1 })
  ]);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  await audit(req, 'patient.viewed', patient._id);
  res.json({ patient, analyses, twin, notes });
}));

app.post('/api/patients/:id/notes', authenticate, allow('doctor', 'admin'), ah(async (req, res) => {
  if (!(await canAccess(req, req.params.id))) return res.status(403).json({ error: 'Not authorized for this patient' });
  const body = String(req.body.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Note content is required' });
  const visibility = req.body.visibility === 'patient' ? 'patient' : 'clinical';
  const n = await ClinicalNote.create({ patient: req.params.id, author: req.user.id, body, visibility });
  await audit(req, 'note.created', n._id);
  res.status(201).json(n);
}));

app.post('/api/eeg/upload', authenticate, allow('doctor', 'admin'), upload.single('eeg'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An EDF EEG file is required' });
    if (!(await canAccess(req, req.body.patientId))) return res.status(403).json({ error: 'Not authorized for this patient' });
    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], { type: 'application/octet-stream' }), req.file.originalname);
    const ml = await fetch(`${process.env.ML_SERVICE_URL || 'http://localhost:8001'}/infer`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(120000)
    });
    const result = await ml.json();
    if (!ml.ok) return res.status(ml.status).json({ error: result.detail?.error || result.error || 'ML inference failed', message: result.detail?.message || result.message || 'No inference result was produced' });
    const s = await EEGSession.create({
      patient: req.body.patientId,
      uploadedBy: req.user.id,
      sourceName: req.file.originalname,
      status: 'processed',
      samplingRate: result.sampling_rate,
      channels: result.channels.length,
      preprocessing: { pipeline: 'MNE EEG pick, 0.5–40 Hz bandpass, 128 Hz resample, z-score', state: 'complete' }
    });
    const a = await Analysis.create({
      patient: req.body.patientId,
      session: s._id,
      label: 'Research seizure-score analysis — clinician review required',
      confidence: result.summary.max_score,
      probabilities: { maxSeizureScore: result.summary.max_score, threshold: result.summary.threshold },
      timeline: result.timeline,
      waveform: result.waveform,
      multichannel_waveform: result.multichannel_waveform,
      explanation: [result.notice],
      modelVersion: result.model_version || 'artifact-backed',
      modelState: result.model_state
    });
    await TwinSnapshot.create({
      patient: req.body.patientId,
      sourceAnalysis: a._id,
      trend: 'monitor',
      state: { lastUpload: req.file.originalname, modelState: 'Trained research model', maxSeizureScore: result.summary.max_score, clinicalAction: 'Clinician review required; not a diagnosis.' }
    });
    await audit(req, 'eeg.inferred', s._id, { name: req.file.originalname });
    res.status(201).json({ session: s, analysis: a, notice: result.notice });
  } catch (error) {
    next(error);
  }
});

app.get('/api/analyses', authenticate, ah(async (req, res) => {
  let patientFilter = {};
  if (req.user.role === 'doctor') {
    const docPatients = await Patient.find({ assignedDoctor: req.user.id }, '_id');
    patientFilter = { patient: { $in: docPatients.map((p) => p._id) } };
  } else if (req.user.role === 'patient') {
    const u = await User.findById(req.user.id);
    patientFilter = { patient: u?.linkedPatient };
  } else if (req.user.role === 'caregiver') {
    const carePatients = await Patient.find({ caregiverUsers: req.user.id }, '_id');
    patientFilter = { patient: { $in: carePatients.map((p) => p._id) } };
  }

  if (req.query.patientId) {
    if (!(await canAccess(req, req.query.patientId))) {
      return res.status(403).json({ error: 'Not authorized for this patient' });
    }
    patientFilter = { patient: req.query.patientId };
  }

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  const [analyses, total] = await Promise.all([
    Analysis.find(patientFilter)
      .populate('patient', 'fullName mrn assignedDoctor')
      .populate('session', 'sourceName samplingRate createdAt')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit),
    Analysis.countDocuments(patientFilter)
  ]);

  res.json({ analyses, total, limit, offset });
}));

app.get('/api/analyses/:id', authenticate, ah(async (req, res) => {
  const analysis = await Analysis.findById(req.params.id)
    .populate('patient', 'fullName mrn assignedDoctor dob conditions')
    .populate('session');
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  if (!(await canAccess(req, analysis.patient?._id || analysis.patient))) {
    return res.status(403).json({ error: 'Not authorized for this patient analysis' });
  }
  res.json(analysis);
}));

app.get('/api/analyses/:id/report', authenticate, ah(async (req, res) => {
  const analysis = await Analysis.findById(req.params.id)
    .populate('patient')
    .populate('session');
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  if (!(await canAccess(req, analysis.patient?._id || analysis.patient))) {
    return res.status(403).json({ error: 'Not authorized for this report' });
  }

  const [twin, notes, totalAnalyses] = await Promise.all([
    TwinSnapshot.findOne({ patient: analysis.patient._id }).sort({ date: -1 }),
    ClinicalNote.find({ patient: analysis.patient._id }).populate('author', 'name').sort({ createdAt: -1 }),
    Analysis.countDocuments({ patient: analysis.patient._id })
  ]);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="neurotwin-report-${analysis._id}.pdf"`);

  generateReportPdf({
    patient: analysis.patient,
    session: analysis.session,
    analysis,
    twin,
    notes,
    totalAnalyses,
    clinicianName: req.user.name
  }, res);
}));

app.patch('/api/analyses/:id/review', authenticate, allow('doctor', 'admin'), ah(async (req, res) => {
  const analysis = await Analysis.findById(req.params.id);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  if (!(await canAccess(req, analysis.patient))) return res.status(403).json({ error: 'Not authorized for this patient' });

  const reviewState = req.body.status === 'reviewed' ? 'reviewed' : 'pending';
  analysis.clinicianReview = reviewState;
  await analysis.save();
  await audit(req, 'analysis.reviewed', analysis._id, { status: reviewState });
  res.json(analysis);
}));

app.get('/api/admin/audit', authenticate, allow('admin'), ah(async (_, res) => {
  res.json(await AuditEvent.find().populate('actor', 'name role').sort({ createdAt: -1 }).limit(100));
}));

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return res.status(504).json({ error: 'ML service timed out' });
  if (error?.name === 'CastError') return res.status(400).json({ error: 'Invalid resource identifier' });
  if (error?.name === 'ValidationError') return res.status(400).json({ error: 'Submitted data is invalid' });
  if (error?.code === 11000) return res.status(409).json({ error: 'A record with this unique value already exists' });
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

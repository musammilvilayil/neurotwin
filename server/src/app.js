import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { authenticate, allow, sign } from './auth.js';
import { User, Patient, EEGSession, Analysis, TwinSnapshot, ClinicalNote, AuditEvent } from './models.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());

const audit = async (req, action, target, meta = {}) => AuditEvent.create({ actor: req.user?.id, action, target, meta });
const canAccess = async (req, id) => {
  if (req.user.role === 'admin' || req.user.role === 'doctor') return true;
  const p = await Patient.findById(id);
  return String(req.user.id) === String((await User.findById(req.user.id)).linkedPatient) || p?.caregiverUsers.some((x) => String(x) === req.user.id);
};

const modelDirectory = path.resolve(process.cwd(), '..', 'services', 'ml', 'models');
const defaultModelCandidates = ['model.keras', 'neurotwin-model.keras', 'best_model.keras'];
const getModelStatus = () => {
  const hasTrainedModel = defaultModelCandidates.some((fileName) => fs.existsSync(path.join(modelDirectory, fileName)));
  return hasTrainedModel
    ? {
        modelVersion: 'research-v0.1',
        datasetName: 'not-set',
        taskName: 'research-only',
        modelState: 'trained',
        confidence: 0.0,
        notice: 'Research only / not diagnostic.',
        status: 'trained',
      }
    : {
        modelVersion: 'research-v0.1',
        datasetName: 'not-set',
        taskName: 'research-only',
        modelState: 'untrained/demo',
        confidence: 0.0,
        notice: 'Research only / not diagnostic. No validated weights are available in this repository.',
        status: 'untrained/demo',
      };
};

const buildTwinState = (datasetName = 'research', taskName = 'research-only') => {
  const lowered = `${datasetName} ${taskName}`.toLowerCase();
  if (lowered.includes('auditory') || lowered.includes('evoked')) {
    return {
      trend: 'participant baseline vs experiment deviation',
      modelState: 'untrained/demo',
      longitudinalStatus: 'Baseline comparison',
      clinicalAction: 'Research-only comparison of participant baselines and experiment-level signal deviation; no diagnosis or patient-health claim.',
    };
  }
  if (lowered.includes('motor') || lowered.includes('imagery') || lowered.includes('execution')) {
    return {
      trend: 'rest vs imagery/execution probability trend',
      modelState: 'untrained/demo',
      longitudinalStatus: 'Rest vs task trend',
      clinicalAction: 'Research-only trend tracking for rest, motor imagery, and execution class probabilities; no diagnosis or patient-health claim.',
    };
  }
  return {
    trend: 'research-only trend tracking',
    modelState: 'untrained/demo',
    longitudinalStatus: 'Research state monitoring',
    clinicalAction: 'No diagnosis or patient-health claim is made. This is a research-only longitudinal trend.',
  };
};

app.get('/api/health', (_, res) => res.json({ status: 'ok', clinicalBoundary: 'Decision support only; not a diagnostic device.' }));

app.get('/api/model/state', (_, res) => {
  const status = getModelStatus();
  res.json({
    ...status,
    dataset: status.datasetName,
    task: status.taskName,
    source: 'research-only',
    clinicalBoundary: 'This model output is for research use only and is not a diagnostic finding.',
  });
});

app.post('/api/auth/login', async (req, res) => {
  const u = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(u), user: { id: u._id, name: u.name, email: u.email, role: u.role, linkedPatient: u.linkedPatient } });
});

app.get('/api/auth/me', authenticate, async (req, res) => res.json(await User.findById(req.user.id).select('-passwordHash')));
app.get('/api/dashboard', authenticate, async (req, res) => {
  const u = await User.findById(req.user.id);
  const patientId = u.linkedPatient;
  const patients = req.user.role === 'doctor' ? await Patient.find({ assignedDoctor: u._id }) : req.user.role === 'admin' ? await Patient.find() : patientId ? [await Patient.findById(patientId)] : [];
  const recent = patientId ? await Analysis.find({ patient: patientId }).sort({ createdAt: -1 }).limit(5) : [];
  res.json({ role: u.role, patients, recent, counts: { patients: await Patient.countDocuments(), analyses: await Analysis.countDocuments(), pending: await Analysis.countDocuments({ clinicianReview: 'pending' }) } });
});

app.get('/api/patients', authenticate, allow('admin', 'doctor'), async (req, res) => res.json(await Patient.find(req.user.role === 'doctor' ? { assignedDoctor: req.user.id } : {}).populate('assignedDoctor', 'name')));
app.post('/api/patients', authenticate, allow('admin', 'doctor'), async (req, res) => {
  const p = await Patient.create({ ...req.body, assignedDoctor: req.body.assignedDoctor || req.user.id });
  await audit(req, 'patient.created', p._id);
  res.status(201).json(p);
});

app.get('/api/patients/:id/overview', authenticate, async (req, res) => {
  if (!(await canAccess(req, req.params.id))) return res.status(403).json({ error: 'Not authorized for this patient' });
  const [patient, analyses, twin, notes] = await Promise.all([
    Patient.findById(req.params.id).populate('assignedDoctor', 'name'),
    Analysis.find({ patient: req.params.id }).sort({ createdAt: -1 }).limit(12),
    TwinSnapshot.findOne({ patient: req.params.id }).sort({ date: -1 }),
    ClinicalNote.find({ patient: req.params.id, ...(req.user.role === 'patient' || req.user.role === 'caregiver' ? { visibility: 'patient' } : {}) }).populate('author', 'name').sort({ createdAt: -1 }),
  ]);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  await audit(req, 'patient.viewed', patient._id);
  res.json({ patient, analyses, twin, notes });
});

app.post('/api/patients/:id/notes', authenticate, allow('doctor', 'admin'), async (req, res) => {
  const n = await ClinicalNote.create({ patient: req.params.id, author: req.user.id, body: req.body.body, visibility: req.body.visibility || 'clinical' });
  await audit(req, 'note.created', n._id);
  res.status(201).json(n);
});

app.post('/api/eeg/upload', authenticate, allow('doctor', 'admin'), upload.single('eeg'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'EEG file is required' });

  const modelStatus = getModelStatus();
  const twinState = buildTwinState(req.body.datasetName || 'research', req.body.taskName || 'research-only');
  const s = await EEGSession.create({ patient: req.body.patientId, uploadedBy: req.user.id, sourceName: req.file.originalname, status: 'processed', preprocessing: { pipeline: 'MNE bandpass 0.5–40 Hz, notch 50/60 Hz, resample only if needed, z-score', state: 'research upload metadata' } });
  const a = await Analysis.create({
    patient: req.body.patientId,
    session: s._id,
    label: 'Research-only EEG record — clinician review required',
    confidence: modelStatus.confidence,
    probabilities: { research: modelStatus.confidence, unknown: 1 - modelStatus.confidence },
    explanation: ['No validated model weights are currently deployed to this repository.', 'Research-only processing and longitudinal snapshot tracking are recorded.'],
    modelVersion: modelStatus.modelVersion,
    modelState: modelStatus.modelState,
    datasetName: req.body.datasetName || 'research',
    taskName: req.body.taskName || 'research-only',
    researchOnly: true,
  });
  await TwinSnapshot.create({
    patient: req.body.patientId,
    sourceAnalysis: a._id,
    trend: twinState.trend,
    state: { lastUpload: req.file.originalname, modelState: modelStatus.modelState, clinicalAction: twinState.clinicalAction, longitudinalStatus: twinState.longitudinalStatus },
  });
  await audit(req, 'eeg.uploaded', s._id, { name: req.file.originalname, modelState: modelStatus.modelState });
  res.status(201).json({
    session: s,
    analysis: a,
    modelState: modelStatus.modelState,
    notice: modelStatus.notice,
    clinicalBoundary: 'This output is research-only and is not a diagnosis.',
  });
});

app.get('/api/admin/audit', authenticate, allow('admin'), async (_, res) => res.json(await AuditEvent.find().populate('actor', 'name role').sort({ createdAt: -1 }).limit(100)));
export default app;

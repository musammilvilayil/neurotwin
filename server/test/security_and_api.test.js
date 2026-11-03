import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { seed } from '../src/seed.js';
import { User, Patient, ClinicalNote, Analysis, TwinSnapshot, EEGSession, AuditEvent } from '../src/models.js';

let mongoServer;
let tokens = {};
let seededPatient;

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: { version: '7.0.14' }
  });
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([User.init(), Patient.init()]);
  await seed();

  // Obtain login tokens for each role
  for (const role of ['admin', 'doctor', 'patient', 'caregiver']) {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: role, password: 'DemoPass123!' });
    assert.equal(res.status, 200, `Login failed for role ${role}`);
    tokens[role] = res.body.token;
  }

  seededPatient = await Patient.findOne({ mrn: 'NT-1001' });
  assert.ok(seededPatient, 'Seeded patient not found');
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('1. Authentication: valid login returns token and user info', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'doctor', password: 'DemoPass123!' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'doctor');
  assert.equal(res.body.user.username, 'doctor');
});

test('2. Authentication: invalid password rejected with 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'doctor', password: 'WrongPassword!' });
  assert.equal(res.status, 401);
  assert.match(res.body.error, /Invalid username\/email or password/);
});

test('3. Authentication: non-existent identifier rejected with 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'ghost_user', password: 'DemoPass123!' });
  assert.equal(res.status, 401);
});

test('4. Authentication: expired or malformed JWT rejected with 401', async () => {
  const expiredToken = jwt.sign(
    { id: seededPatient.assignedDoctor, role: 'doctor', name: 'Dr. Expired' },
    process.env.JWT_SECRET || 'development-only-secret',
    { expiresIn: -10 } // already expired
  );
  const res1 = await request(app)
    .get('/api/patients')
    .set('Authorization', `Bearer ${expiredToken}`);
  assert.equal(res1.status, 401);

  const res2 = await request(app)
    .get('/api/patients')
    .set('Authorization', 'Bearer invalid.token.value');
  assert.equal(res2.status, 401);
});

test('5. Authorization: unauthorized request with missing token rejected with 401', async () => {
  const res = await request(app).get('/api/patients');
  assert.equal(res.status, 401);
});

test('6. RBAC: patient and caregiver cannot access /api/patients', async () => {
  const resPatient = await request(app)
    .get('/api/patients')
    .set('Authorization', `Bearer ${tokens.patient}`);
  assert.equal(resPatient.status, 403);

  const resCaregiver = await request(app)
    .get('/api/patients')
    .set('Authorization', `Bearer ${tokens.caregiver}`);
  assert.equal(resCaregiver.status, 403);
});

test('7. RBAC: doctor and admin can access /api/patients', async () => {
  const resDoc = await request(app)
    .get('/api/patients')
    .set('Authorization', `Bearer ${tokens.doctor}`);
  assert.equal(resDoc.status, 200);
  assert.ok(Array.isArray(resDoc.body));
  assert.equal(resDoc.body.length, 1);

  const resAdmin = await request(app)
    .get('/api/patients')
    .set('Authorization', `Bearer ${tokens.admin}`);
  assert.equal(resAdmin.status, 200);
  assert.ok(Array.isArray(resAdmin.body));
});

test('8. RBAC: non-admin cannot access /api/admin/audit', async () => {
  for (const role of ['doctor', 'patient', 'caregiver']) {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${tokens[role]}`);
    assert.equal(res.status, 403, `Role ${role} should be forbidden from admin audit`);
  }

  const resAdmin = await request(app)
    .get('/api/admin/audit')
    .set('Authorization', `Bearer ${tokens.admin}`);
  assert.equal(resAdmin.status, 200);
  assert.ok(Array.isArray(resAdmin.body));
});

test('9. Patient isolation: doctor cannot access an unassigned patient', async () => {
  // Create doctor B and patient B
  const doctorB = await User.create({
    name: 'Dr. Second Doctor',
    username: 'doctor_b',
    email: 'doctor_b@neurotwin.demo',
    role: 'doctor',
    passwordHash: 'hash'
  });
  const patientB = await Patient.create({
    fullName: 'Private Patient of Doctor B',
    mrn: 'NT-9999',
    assignedDoctor: doctorB._id
  });

  // Doctor A tries to access Patient B
  const res = await request(app)
    .get(`/api/patients/${patientB._id}/overview`)
    .set('Authorization', `Bearer ${tokens.doctor}`);
  assert.equal(res.status, 403);
  assert.match(res.body.error, /Not authorized/);

  // Doctor A tries to add a note to Patient B
  const noteRes = await request(app)
    .post(`/api/patients/${patientB._id}/notes`)
    .set('Authorization', `Bearer ${tokens.doctor}`)
    .send({ body: 'Unauthorized note' });
  assert.equal(noteRes.status, 403);
});

test('10. Patient self-access: patient only sees patient-visible notes', async () => {
  // Doctor adds a clinical-only note and a patient-visible note
  await ClinicalNote.create({
    patient: seededPatient._id,
    author: seededPatient.assignedDoctor,
    body: 'Confidential clinical discussion',
    visibility: 'clinical'
  });
  await ClinicalNote.create({
    patient: seededPatient._id,
    author: seededPatient.assignedDoctor,
    body: 'Shared with patient: keep regular sleep schedule',
    visibility: 'patient'
  });

  const res = await request(app)
    .get(`/api/patients/${seededPatient._id}/overview`)
    .set('Authorization', `Bearer ${tokens.patient}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.notes.every(n => n.visibility === 'patient'));
  assert.ok(res.body.notes.some(n => n.body.includes('Shared with patient')));
  assert.ok(!res.body.notes.some(n => n.body.includes('Confidential clinical discussion')));
});

test('11. Input validation & Error handling: invalid MongoDB ID returns 400', async () => {
  const res = await request(app)
    .get('/api/patients/not-a-valid-object-id/overview')
    .set('Authorization', `Bearer ${tokens.doctor}`);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Invalid resource identifier/);
});

test('12. Input validation: creating patient without fullName returns 400', async () => {
  const res = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${tokens.doctor}`)
    .send({ fullName: '', mrn: 'NT-EMPTY' });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Patient full name is required/);
});

test('13. Input validation: duplicate patient MRN returns 409', async () => {
  const res = await request(app)
    .post('/api/patients')
    .set('Authorization', `Bearer ${tokens.doctor}`)
    .send({ fullName: 'Duplicate MRN Test', mrn: 'NT-1001' }); // same as seededPatient
  assert.equal(res.status, 409);
  assert.match(res.body.error, /already exists/);
});

test('14. Dashboard: scoped to user role', async () => {
  for (const role of ['doctor', 'admin', 'patient', 'caregiver']) {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokens[role]}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.role, role);
    assert.ok(res.body.counts);
    if (role === 'admin') {
      assert.ok(typeof res.body.counts.users === 'number');
    }
  }
});

test('15. Model state proxy: reports ML service state', async () => {
  const res = await request(app).get('/api/model/state');
  // When ML service is not running on localhost:8001, backend gracefully returns 503
  assert.ok([200, 503].includes(res.status));
  assert.ok(res.body.clinicalBoundary);
});

test('16. Caregiver restrictions: caregiver cannot access unlinked patient', async () => {
  // Create an unlinked patient
  const unlinked = await Patient.create({
    fullName: 'Unlinked Patient for Caregiver Test',
    mrn: 'NT-CARE-UNLINKED'
  });
  const res = await request(app)
    .get(`/api/patients/${unlinked._id}/overview`)
    .set('Authorization', `Bearer ${tokens.caregiver}`);
  assert.equal(res.status, 403);
  assert.match(res.body.error, /Not authorized/);
});

test('17. Inactive user restriction: inactive user cannot log in', async () => {
  const inactiveUser = await User.create({
    name: 'Inactive Doctor',
    username: 'inactive_doc',
    email: 'inactive@neurotwin.demo',
    passwordHash: await bcrypt.hash('DemoPass123!', 10),
    role: 'doctor',
    active: false
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'inactive_doc', password: 'DemoPass123!' });
  assert.equal(res.status, 401);
  assert.match(res.body.error, /Invalid username\/email or password/);
});

test('18. EEG upload RBAC: patients and caregivers are forbidden from upload endpoint', async () => {
  for (const role of ['patient', 'caregiver']) {
    const res = await request(app)
      .post('/api/eeg/upload')
      .set('Authorization', `Bearer ${tokens[role]}`);
    assert.equal(res.status, 403, `Role ${role} should be forbidden from EEG upload`);
  }
});

test('19. GET /api/analyses: returns analyses and filters by patientId', async () => {
  const session = await EEGSession.create({
    patient: seededPatient._id,
    uploadedBy: (await User.findOne({ username: 'admin' }))._id,
    sourceName: 'chb01_03.edf',
    fileSize: 1024,
    status: 'completed'
  });

  const analysis = await Analysis.create({
    patient: seededPatient._id,
    session: session._id,
    label: 'Epileptiform / Seizure Activity Detected',
    confidence: 0.88,
    modelState: 'trained_research_model',
    clinicianReview: 'pending',
    timeline: [
      { start_seconds: 0, score: 0.12, confirmed_seizure: false },
      { start_seconds: 10, score: 0.88, confirmed_seizure: true },
      { start_seconds: 20, score: 0.85, confirmed_seizure: true }
    ],
    probabilities: { threshold: 0.65, maxSeizureScore: 0.88, meanScore: 0.61 },
    multichannel_waveform: [[0.1, 0.2], [0.3, 0.4]],
    channels: ['FP1-F7', 'F7-T7']
  });

  const res = await request(app)
    .get('/api/analyses')
    .set('Authorization', `Bearer ${tokens.doctor}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.analyses));
  assert.ok(res.body.analyses.length >= 1);

  // Filter by patientId
  const resFiltered = await request(app)
    .get(`/api/analyses?patientId=${seededPatient._id}`)
    .set('Authorization', `Bearer ${tokens.doctor}`);
  assert.equal(resFiltered.status, 200);
  assert.ok(resFiltered.body.analyses.some(a => a._id.toString() === analysis._id.toString()));
});

test('20. GET /api/analyses/:id: returns full details and enforces patient isolation', async () => {
  const analysis = await Analysis.findOne({ patient: seededPatient._id });
  assert.ok(analysis, 'Analysis not found for seeded patient');

  // Doctor assigned to seededPatient can access
  const resDoc = await request(app)
    .get(`/api/analyses/${analysis._id}`)
    .set('Authorization', `Bearer ${tokens.doctor}`);
  assert.equal(resDoc.status, 200);
  assert.equal(resDoc.body._id.toString(), analysis._id.toString());
  assert.ok(resDoc.body.patient);
  assert.equal(resDoc.body.patient.fullName, seededPatient.fullName);

  // Other unassigned doctor cannot access
  const otherDoctor = await User.create({
    name: 'Unassigned Doctor',
    username: 'other_doc_2',
    email: 'other_doc_2@neurotwin.demo',
    passwordHash: await bcrypt.hash('DemoPass123!', 10),
    role: 'doctor',
    active: true
  });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'other_doc_2', password: 'DemoPass123!' });
  const otherToken = loginRes.body.token;

  const resForbidden = await request(app)
    .get(`/api/analyses/${analysis._id}`)
    .set('Authorization', `Bearer ${otherToken}`);
  assert.equal(resForbidden.status, 403);
});

test('21. PATCH /api/analyses/:id/review: toggles review state and logs audit event', async () => {
  const analysis = await Analysis.findOne({ patient: seededPatient._id });
  assert.ok(analysis);

  // Patient cannot review
  const resPatient = await request(app)
    .patch(`/api/analyses/${analysis._id}/review`)
    .set('Authorization', `Bearer ${tokens.patient}`)
    .send({ status: 'reviewed' });
  assert.equal(resPatient.status, 403);

  // Doctor can review
  const resDoc = await request(app)
    .patch(`/api/analyses/${analysis._id}/review`)
    .set('Authorization', `Bearer ${tokens.doctor}`)
    .send({ status: 'reviewed' });
  assert.equal(resDoc.status, 200);
  assert.equal(resDoc.body.clinicianReview, 'reviewed');

  // Verify AuditEvent was created
  const audit = await AuditEvent.findOne({ action: 'analysis.reviewed' });
  assert.ok(audit, 'AuditEvent for analysis_reviewed was not created');
  assert.equal(audit.meta.status, 'reviewed');
});

test('22. GET /api/analyses/:id/report: generates valid clinical research PDF report', async () => {
  const analysis = await Analysis.findOne({ patient: seededPatient._id });
  assert.ok(analysis);

  const res = await request(app)
    .get(`/api/analyses/${analysis._id}/report`)
    .set('Authorization', `Bearer ${tokens.doctor}`);

  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'application/pdf');
  assert.ok(res.headers['content-disposition'].includes('.pdf'));
  assert.ok(Buffer.isBuffer(res.body));
  assert.ok(res.body.length > 500, 'PDF buffer is too small to be valid');
  assert.equal(res.body.subarray(0, 4).toString(), '%PDF', 'Buffer does not begin with %PDF header');
});

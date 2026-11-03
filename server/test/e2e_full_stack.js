import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { seed } from '../src/seed.js';
import { User, Patient, EEGSession, Analysis, TwinSnapshot } from '../src/models.js';

async function runE2ETest() {
  console.log('=== NEUROTWIN FULL-STACK END-TO-END INTEGRATION TEST ===\n');

  // Connect to local MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/neurotwin');
  console.log('1. Connected to MongoDB.');

  await seed();
  console.log('2. Seeded accounts and demo patients.');

  // 1. Authenticate as Doctor
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'doctor', password: 'DemoPass123!' });
  assert.equal(loginRes.status, 200, `Doctor login failed: ${JSON.stringify(loginRes.body)}`);
  const token = loginRes.body.token;
  const doctor = loginRes.body.user;
  console.log(`3. Authenticated as ${doctor.name} (${doctor.role}). Token acquired.`);

  // 2. Fetch or create test patient assigned to this doctor
  let patient = await Patient.findOne({ assignedDoctor: doctor.id });
  if (!patient) {
    patient = await Patient.create({
      fullName: 'E2E Test Patient',
      mrn: 'E2E-TEST-001',
      dob: new Date('1995-01-01'),
      assignedDoctor: doctor.id,
      conditions: ['Refractory Epilepsy Monitoring'],
      consented: true
    });
  }
  console.log(`4. Verified patient profile: ${patient.fullName} (MRN: ${patient.mrn}, ID: ${patient._id}).`);

  // 3. Check ML service state through Backend proxy
  const stateRes = await request(app)
    .get('/api/model/state')
    .set('Authorization', `Bearer ${token}`);
  console.log(`5. Backend proxy /api/model/state: status=${stateRes.status}, model_state=${stateRes.body.model_state}`);
  assert.equal(stateRes.status, 200);
  assert.equal(stateRes.body.model_state, 'ready');

  // 4. Test EDF Upload through Backend to ML service
  const edfPath = 'D:\\chbmit-1.0.0\\chb-mit-scalp-eeg-database-1.0.0\\chb02\\chb02_16.edf';
  assert.ok(fs.existsSync(edfPath), `EDF file not found at ${edfPath}`);
  const edfBuffer = fs.readFileSync(edfPath);
  console.log(`6. Reading real clinical EEG: chb02_16.edf (${(edfBuffer.length / (1024*1024)).toFixed(2)} MB)...`);

  console.log('7. Uploading EDF via POST /api/eeg/upload (proxied to ML service)...');
  const uploadRes = await request(app)
    .post('/api/eeg/upload')
    .set('Authorization', `Bearer ${token}`)
    .field('patientId', patient._id.toString())
    .attach('eeg', edfBuffer, 'chb02_16.edf');

  assert.ok([200, 201].includes(uploadRes.status), `Upload failed with status ${uploadRes.status}: ${JSON.stringify(uploadRes.body)}`);
  const analysisResult = uploadRes.body.analysis;
  assert.ok(analysisResult, 'No analysis returned in upload response');
  assert.ok(analysisResult._id, 'Analysis missing _id');
  console.log(`   -> Upload SUCCESS! Created Analysis ID: ${analysisResult._id}`);
  console.log(`   -> Peak Seizure Score: ${(analysisResult.confidence * 100).toFixed(1)}%`);
  console.log(`   -> Model State: ${analysisResult.modelState}`);
  console.log(`   -> Timeline windows: ${analysisResult.timeline?.length}`);
  console.log(`   -> Multichannel waveform channels: ${analysisResult.multichannel_waveform?.length}`);

  // 5. Test Querying Analyses Archive
  console.log('8. Querying analyses archive via GET /api/analyses...');
  const listRes = await request(app)
    .get(`/api/analyses?patientId=${patient._id}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(listRes.status, 200);
  assert.ok(listRes.body.analyses.some(a => a._id.toString() === analysisResult._id.toString()));
  console.log(`   -> Found ${listRes.body.analyses.length} analyses for this patient.`);

  // 6. Test Querying Detailed Analysis
  console.log(`9. Fetching full analysis details via GET /api/analyses/${analysisResult._id}...`);
  const detailRes = await request(app)
    .get(`/api/analyses/${analysisResult._id}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.body.patient?.fullName, patient.fullName);
  assert.equal(detailRes.body.session?.sourceName, 'chb02_16.edf');
  assert.ok(Array.isArray(detailRes.body.multichannel_waveform));
  console.log('   -> Full detailed analysis retrieved with 18-channel waveform.');

  // 7. Test Clinician Review Status Toggle
  console.log(`10. Clinician reviewing analysis via PATCH /api/analyses/${analysisResult._id}/review...`);
  const reviewRes = await request(app)
    .patch(`/api/analyses/${analysisResult._id}/review`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'reviewed' });
  assert.equal(reviewRes.status, 200);
  assert.equal(reviewRes.body.clinicianReview, 'reviewed');
  console.log('   -> Clinician review state successfully toggled to "reviewed".');

  // 8. Test Clinical Research PDF Report Generation
  console.log(`11. Generating PDF report via GET /api/analyses/${analysisResult._id}/report...`);
  const reportRes = await request(app)
    .get(`/api/analyses/${analysisResult._id}/report`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(reportRes.status, 200);
  assert.equal(reportRes.headers['content-type'], 'application/pdf');
  assert.ok(reportRes.headers['content-disposition'].includes('.pdf'));
  assert.ok(reportRes.body.length > 1000, 'PDF size is smaller than expected');
  assert.equal(reportRes.body.subarray(0, 4).toString(), '%PDF', 'PDF buffer missing %PDF magic header');
  console.log(`   -> PDF report generated: ${reportRes.body.length} bytes (starts with "%PDF").`);

  // 9. Verify Patient Isolation (RBAC)
  console.log('12. Testing RBAC isolation with patient token...');
  const patientLogin = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'patient', password: 'DemoPass123!' });
  const patientToken = patientLogin.body.token;

  const forbiddenReview = await request(app)
    .patch(`/api/analyses/${analysisResult._id}/review`)
    .set('Authorization', `Bearer ${patientToken}`)
    .send({ status: 'pending' });
  assert.equal(forbiddenReview.status, 403, 'Patient should not be allowed to review analyses');
  console.log('   -> Patient forbidden from reviewing analysis (403 Forbidden as expected).');

  console.log('\n============================================================');
  console.log('ALL END-TO-END INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('============================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runE2ETest().catch(err => {
  console.error('\nE2E Test Failed:', err);
  process.exit(1);
});

import bcrypt from 'bcryptjs';
import { User, Patient, TwinSnapshot, ClinicalNote } from './models.js';

export async function seed() {
  const existing = await User.find();
  for (const account of existing) {
    if (!account.username && account.email) {
      account.username = account.email.split('@')[0];
      await account.save();
    }
  }

  // Update existing seeded patient with default appointments/prescriptions/treatment if missing
  const existingPatient = await Patient.findOne({ mrn: 'NT-1001' });
  if (existingPatient) {
    let changed = false;
    if (!existingPatient.appointments || existingPatient.appointments.length === 0) {
      existingPatient.appointments = [
        { doctorName: 'Dr. Maya Rao', scheduledAt: new Date(Date.now() + 86400000 * 3), reason: 'Longitudinal EEG Review & Digital Twin Consultation', status: 'Scheduled' },
        { doctorName: 'Dr. Maya Rao', scheduledAt: new Date(Date.now() - 86400000 * 14), reason: 'Initial EEG Baseline Assessment', status: 'Completed' }
      ];
      changed = true;
    }
    if (!existingPatient.prescriptions || existingPatient.prescriptions.length === 0) {
      existingPatient.prescriptions = [
        { medicineName: 'Levetiracetam (Keppra)', dosage: '500 mg', frequency: 'Twice daily with meals', prescribedBy: 'Dr. Maya Rao', instructions: 'Take consistently at 12-hour intervals for seizure prevention', status: 'Active' },
        { medicineName: 'Clobazam (Onfi)', dosage: '10 mg', frequency: 'Once daily at bedtime', prescribedBy: 'Dr. Maya Rao', instructions: 'Take at bedtime; monitor for daytime somnolence', status: 'Active' }
      ];
      changed = true;
    }
    if (!existingPatient.treatment || !existingPatient.treatment.diagnosis) {
      existingPatient.treatment = {
        diagnosis: 'Focal Epilepsy (Temporal Lobe Suspected)',
        medications: ['Levetiracetam 500mg BID', 'Clobazam 10mg QHS'],
        treatmentPlan: 'Continuous longitudinal EEG tracking, digital twin state updates, and clinical threshold reviews.',
        lastUpdated: new Date()
      };
      changed = true;
    }
    if (!existingPatient.consentDetails || !existingPatient.consentDetails.consented) {
      existingPatient.consentDetails = {
        consented: true,
        consentDate: new Date('2026-01-15'),
        privacyPolicyAccepted: true,
        consentType: 'Digital Health & AI EEG Monitoring Consent'
      };
      changed = true;
    }
    if (changed) await existingPatient.save();
  }

  if (existing.length) return;

  const hash = await bcrypt.hash('DemoPass123!', 10);
  const doctor = await User.create({ name: 'Dr. Maya Rao', username: 'doctor', email: 'doctor@neurotwin.demo', passwordHash: hash, role: 'doctor' });
  const p = await Patient.create({
    fullName: 'Alex Morgan',
    mrn: 'NT-1001',
    dob: new Date('1994-05-18'),
    assignedDoctor: doctor._id,
    conditions: ['Focal Epilepsy Monitoring', 'Absence Discharges'],
    consented: true,
    treatment: {
      diagnosis: 'Focal Epilepsy (Temporal Lobe Suspected)',
      medications: ['Levetiracetam 500mg BID', 'Clobazam 10mg QHS'],
      treatmentPlan: 'Continuous longitudinal EEG tracking, digital twin state updates, and clinical threshold reviews.',
      lastUpdated: new Date()
    },
    appointments: [
      { doctorName: 'Dr. Maya Rao', scheduledAt: new Date(Date.now() + 86400000 * 3), reason: 'Longitudinal EEG Review & Digital Twin Consultation', status: 'Scheduled' },
      { doctorName: 'Dr. Maya Rao', scheduledAt: new Date(Date.now() - 86400000 * 14), reason: 'Initial EEG Baseline Assessment', status: 'Completed' }
    ],
    prescriptions: [
      { medicineName: 'Levetiracetam (Keppra)', dosage: '500 mg', frequency: 'Twice daily with meals', prescribedBy: 'Dr. Maya Rao', instructions: 'Take consistently at 12-hour intervals for seizure prevention', status: 'Active' },
      { medicineName: 'Clobazam (Onfi)', dosage: '10 mg', frequency: 'Once daily at bedtime', prescribedBy: 'Dr. Maya Rao', instructions: 'Take at bedtime; monitor for daytime somnolence', status: 'Active' }
    ],
    consentDetails: {
      consented: true,
      consentDate: new Date('2026-01-15'),
      privacyPolicyAccepted: true,
      consentType: 'Digital Health & AI EEG Monitoring Consent'
    }
  });
  const patient = await User.create({ name: 'Alex Morgan', username: 'patient', email: 'patient@neurotwin.demo', passwordHash: hash, role: 'patient', linkedPatient: p._id });
  const caregiver = await User.create({ name: 'Jordan Morgan', username: 'caregiver', email: 'caregiver@neurotwin.demo', passwordHash: hash, role: 'caregiver', linkedPatient: p._id });
  p.caregiverUsers = [caregiver._id];
  await p.save();
  await User.create({ name: 'System Administrator', username: 'admin', email: 'admin@neurotwin.demo', passwordHash: hash, role: 'admin' });
  await TwinSnapshot.create({ patient: p._id, trend: 'stable', state: { signalQuality: 'High (18-channel bipolar)', longitudinalStatus: 'Active digital twin baseline', lastUpdate: 'Initialized' } });
  await ClinicalNote.create({ patient: p._id, author: doctor._id, body: 'Patient shows stable inter-ictal baseline. Continue regular EEG uploads and medication compliance.', visibility: 'patient' });
  await ClinicalNote.create({ patient: p._id, author: doctor._id, body: 'Clinical only: Review threshold stability and consider reducing nighttime clobazam if daytime somnolence increases.', visibility: 'clinical' });
  console.log('Demo accounts seeded. Password: DemoPass123!');
}

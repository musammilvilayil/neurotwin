import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const existing = (name, schema) => mongoose.models[name] || model(name, schema);

const departmentSchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  description: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const doctorProfileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  department: { type: Schema.Types.ObjectId, ref: 'HMSDepartment', required: true },
  registrationNumber: { type: String, trim: true, unique: true, sparse: true },
  qualification: { type: String, trim: true, default: '' },
  specialization: { type: String, trim: true, default: '' },
  consultationFee: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const appointmentSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: 'PatientProfile', required: true, index: true },
  doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  department: { type: Schema.Types.ObjectId, ref: 'HMSDepartment' },
  scheduledAt: { type: Date, required: true, index: true },
  reason: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['booked','checked_in','in_consultation','completed','cancelled','no_show'], default: 'booked', index: true },
  tokenNumber: { type: Number, min: 1 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const encounterSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: 'PatientProfile', required: true, index: true },
  doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  appointment: { type: Schema.Types.ObjectId, ref: 'HMSAppointment' },
  type: { type: String, enum: ['OPD','emergency','follow_up'], default: 'OPD' },
  chiefComplaint: { type: String, trim: true, maxlength: 2000, default: '' },
  examination: { type: String, trim: true, maxlength: 5000, default: '' },
  diagnosis: { type: String, trim: true, maxlength: 2000, default: '' },
  plan: { type: String, trim: true, maxlength: 5000, default: '' },
  vitals: { bloodPressure: String, pulse: Number, temperatureC: Number, respiratoryRate: Number, spo2: Number, weightKg: Number },
  status: { type: String, enum: ['open','completed'], default: 'open' }
}, { timestamps: true });

const bedSchema = new Schema({
  ward: { type: String, required: true, trim: true },
  room: { type: String, trim: true, default: '' },
  bedNumber: { type: String, required: true, trim: true },
  category: { type: String, enum: ['general','semi_private','private','icu','emergency'], default: 'general' },
  dailyRate: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['available','occupied','maintenance'], default: 'available', index: true }
}, { timestamps: true });
bedSchema.index({ ward: 1, bedNumber: 1 }, { unique: true });

const admissionSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: 'PatientProfile', required: true, index: true },
  attendingDoctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bed: { type: Schema.Types.ObjectId, ref: 'HMSBed', required: true },
  admittedAt: { type: Date, default: Date.now },
  dischargedAt: Date,
  admissionReason: { type: String, trim: true, maxlength: 2000, default: '' },
  dischargeSummary: { type: String, trim: true, maxlength: 5000, default: '' },
  status: { type: String, enum: ['admitted','discharged','transferred'], default: 'admitted', index: true }
}, { timestamps: true });

const labOrderSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: 'PatientProfile', required: true, index: true },
  encounter: { type: Schema.Types.ObjectId, ref: 'HMSEncounter' },
  orderedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  testName: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['routine','urgent'], default: 'routine' },
  status: { type: String, enum: ['ordered','sample_collected','processing','verified','cancelled'], default: 'ordered', index: true },
  result: { type: String, trim: true, maxlength: 10000, default: '' },
  resultUnit: { type: String, trim: true, default: '' },
  referenceRange: { type: String, trim: true, default: '' },
  collectedAt: Date,
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date
}, { timestamps: true });

const medicineSchema = new Schema({
  name: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true, default: '' },
  sku: { type: String, required: true, trim: true, uppercase: true, unique: true },
  unit: { type: String, trim: true, default: 'unit' },
  batchNumber: { type: String, trim: true, default: '' },
  expiryDate: Date,
  quantity: { type: Number, min: 0, default: 0 },
  reorderLevel: { type: Number, min: 0, default: 10 },
  unitPrice: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const prescriptionSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: 'PatientProfile', required: true, index: true },
  encounter: { type: Schema.Types.ObjectId, ref: 'HMSEncounter' },
  prescribedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ medicine: { type: Schema.Types.ObjectId, ref: 'HMSMedicine', required: true }, medicineName: String, dosage: String, frequency: String, duration: String, quantity: { type: Number, min: 1, required: true }, instructions: String, dispensedQuantity: { type: Number, min: 0, default: 0 } }],
  status: { type: String, enum: ['active','partially_dispensed','dispensed','cancelled'], default: 'active' }
}, { timestamps: true });

const invoiceSchema = new Schema({
  patient: { type: Schema.Types.ObjectId, ref: 'PatientProfile', required: true, index: true },
  admission: { type: Schema.Types.ObjectId, ref: 'HMSAdmission' },
  encounter: { type: Schema.Types.ObjectId, ref: 'HMSEncounter' },
  invoiceNumber: { type: String, required: true, unique: true },
  items: [{ description: { type: String, required: true }, quantity: { type: Number, min: 1, default: 1 }, unitPrice: { type: Number, min: 0, required: true }, amount: { type: Number, min: 0, required: true } }],
  subtotal: { type: Number, min: 0, required: true },
  discount: { type: Number, min: 0, default: 0 },
  total: { type: Number, min: 0, required: true },
  paid: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['unpaid','partially_paid','paid','cancelled'], default: 'unpaid' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const paymentSchema = new Schema({
  invoice: { type: Schema.Types.ObjectId, ref: 'HMSInvoice', required: true, index: true },
  amount: { type: Number, min: 0.01, required: true },
  method: { type: String, enum: ['cash','card','upi','bank_transfer','insurance'], required: true },
  reference: { type: String, trim: true, default: '' },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const HMSDepartment = existing('HMSDepartment', departmentSchema);
export const HMSDoctorProfile = existing('HMSDoctorProfile', doctorProfileSchema);
export const HMSAppointment = existing('HMSAppointment', appointmentSchema);
export const HMSEncounter = existing('HMSEncounter', encounterSchema);
export const HMSBed = existing('HMSBed', bedSchema);
export const HMSAdmission = existing('HMSAdmission', admissionSchema);
export const HMSLabOrder = existing('HMSLabOrder', labOrderSchema);
export const HMSMedicine = existing('HMSMedicine', medicineSchema);
export const HMSPrescription = existing('HMSPrescription', prescriptionSchema);
export const HMSInvoice = existing('HMSInvoice', invoiceSchema);
export const HMSPayment = existing('HMSPayment', paymentSchema);

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { seed } from '../src/seed.js';
import { User, Patient } from '../src/models.js';
import { HMSBed, HMSAppointment, HMSAdmission, HMSInvoice, HMSMedicine } from '../src/hms-models.js';

let mongo, tokens={}, patient, doctor;
before(async()=>{
  mongo=await MongoMemoryServer.create({binary:{version:'7.0.14'}});
  await mongoose.connect(mongo.getUri());
  await seed();
  doctor=await User.findOne({username:'doctor'});
  patient=await Patient.findOne({mrn:'NT-1001'});
  for(const role of ['admin','doctor']){
    const login=await request(app).post('/api/auth/login').send({identifier:role,password:'DemoPass123!'});
    assert.equal(login.status,200);tokens[role]=login.body.token;
  }
  const hash=await bcrypt.hash('HospitalTest123!',10);
  for(const role of ['receptionist','billing','lab_technician']){
    const user=await User.create({name:role,email:role+'@test.local',username:role,passwordHash:hash,role});
    const login=await request(app).post('/api/auth/login').send({identifier:role,password:'HospitalTest123!'});
    assert.equal(login.status,200);tokens[role]=login.body.token;
  }
});
after(async()=>{await mongoose.disconnect();await mongo.stop();});

test('HMS summary is authenticated and role-scoped',async()=>{
  const denied=await request(app).get('/api/hms/summary');
  assert.equal(denied.status,401);
  const allowed=await request(app).get('/api/hms/summary').set('Authorization','Bearer '+tokens.admin);
  assert.equal(allowed.status,200);
  assert.equal(typeof allowed.body.appointmentsToday,'number');
});

test('department creation is admin-only',async()=>{
  const forbidden=await request(app).post('/api/hms/departments').set('Authorization','Bearer '+tokens.doctor).send({name:'Neurology',code:'NEU'});
  assert.equal(forbidden.status,403);
  const created=await request(app).post('/api/hms/departments').set('Authorization','Bearer '+tokens.admin).send({name:'Neurology',code:'NEU'});
  assert.equal(created.status,201);assert.equal(created.body.code,'NEU');
});

test('appointment booking validates patient, doctor and conflicting slot',async()=>{
  const scheduledAt=new Date(Date.now()+86400000).toISOString();
  const payload={patient:String(patient._id),doctor:String(doctor._id),scheduledAt,reason:'Follow-up'};
  const created=await request(app).post('/api/hms/appointments').set('Authorization','Bearer '+tokens.doctor).send(payload);
  assert.equal(created.status,201);
  const conflict=await request(app).post('/api/hms/appointments').set('Authorization','Bearer '+tokens.doctor).send(payload);
  assert.equal(conflict.status,409);
  const wrongRole=await request(app).post('/api/hms/appointments').set('Authorization','Bearer '+tokens.billing).send(payload);
  assert.equal(wrongRole.status,403);
});

test('admission allocates a free bed and discharge releases it',async()=>{
  const bed=await HMSBed.create({ward:'General',bedNumber:'G-01'});
  const created=await request(app).post('/api/hms/admissions').set('Authorization','Bearer '+tokens.doctor).send({patient:String(patient._id),bed:String(bed._id),admissionReason:'Observation'});
  assert.equal(created.status,201);
  assert.equal((await HMSBed.findById(bed._id)).status,'occupied');
  const discharged=await request(app).patch('/api/hms/admissions/'+created.body._id+'/discharge').set('Authorization','Bearer '+tokens.doctor).send({dischargeSummary:'Discharged after review'});
  assert.equal(discharged.status,200);
  assert.equal((await HMSBed.findById(bed._id)).status,'available');
});


test('medicine stock adjustment rejects negative stock and applies valid adjustments',async()=>{
  const medicine=await HMSMedicine.create({name:'Test saline',sku:'TEST-SALINE',quantity:4,reorderLevel:2});
  const denied=await request(app).patch('/api/hms/pharmacy/medicines/'+medicine._id+'/stock').set('Authorization','Bearer '+tokens.doctor).send({quantityChange:2});
  assert.equal(denied.status,403);
  const insufficient=await request(app).patch('/api/hms/pharmacy/medicines/'+medicine._id+'/stock').set('Authorization','Bearer '+tokens.admin).send({quantityChange:-5});
  assert.equal(insufficient.status,409);
  const adjusted=await request(app).patch('/api/hms/pharmacy/medicines/'+medicine._id+'/stock').set('Authorization','Bearer '+tokens.admin).send({quantityChange:3});
  assert.equal(adjusted.status,200);
  assert.equal(adjusted.body.quantity,7);
});

test('billing creates invoice and records payment against outstanding balance',async()=>{
  const created=await request(app).post('/api/hms/billing/invoices').set('Authorization','Bearer '+tokens.billing).send({
    patient:String(patient._id),items:[{description:'Consultation',quantity:1,unitPrice:500}]
  });
  assert.equal(created.status,201);assert.equal(created.body.total,500);
  const paid=await request(app).post('/api/hms/billing/invoices/'+created.body._id+'/payments').set('Authorization','Bearer '+tokens.billing).send({amount:500,method:'upi'});
  assert.equal(paid.status,201);assert.equal(paid.body.invoice.status,'paid');
  const duplicate=await request(app).post('/api/hms/billing/invoices/'+created.body._id+'/payments').set('Authorization','Bearer '+tokens.billing).send({amount:1,method:'upi'});
  assert.equal(duplicate.status,409);
});

import { Router } from 'express';
import { Types } from 'mongoose';
import { User, Patient, AuditEvent } from './models.js';
import {
  HMSDepartment, HMSDoctorProfile, HMSAppointment, HMSEncounter, HMSBed,
  HMSAdmission, HMSLabOrder, HMSMedicine, HMSPrescription, HMSInvoice, HMSPayment
} from './hms-models.js';

const router = Router();
const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const roles = (...allowed) => (req,res,next) => allowed.includes(req.user.role) ? next() : res.status(403).json({error:'Insufficient role'});
const record = async (req, action, target, meta={}) => AuditEvent.create({actor:req.user.id,action,target:String(target),meta});
const validId = id => Types.ObjectId.isValid(id);
const patientAccess = async (req, patientId) => {
  if (!validId(patientId)) return false;
  if (req.user.role === 'admin') return true;
  const patient = await Patient.findById(patientId).select('assignedDoctor caregiverUsers');
  if (!patient) return false;
  if (req.user.role === 'doctor') return String(patient.assignedDoctor) === String(req.user.id);
  if (req.user.role === 'patient') {
    const user = await User.findById(req.user.id).select('linkedPatient');
    return String(user?.linkedPatient || '') === String(patientId);
  }
  if (req.user.role === 'caregiver') return (patient.caregiverUsers || []).some(id => String(id) === String(req.user.id));
  return false;
};
const scopedPatientFilter = async req => {
  if (req.user.role === 'admin') return {};
  if (req.user.role === 'doctor') {
    const ids = await Patient.find({assignedDoctor:req.user.id}).distinct('_id');
    return {patient:{$in:ids}};
  }
  if (req.user.role === 'patient') {
    const user = await User.findById(req.user.id).select('linkedPatient');
    return {patient:user?.linkedPatient || null};
  }
  if (req.user.role === 'caregiver') {
    const ids = await Patient.find({caregiverUsers:req.user.id}).distinct('_id');
    return {patient:{$in:ids}};
  }
  return {patient:null};
};
const cleanText = (value, max=2000) => String(value || '').trim().slice(0,max);

router.get('/summary', roles('admin','doctor','receptionist','nurse','lab_technician','pharmacist','billing'), wrap(async(req,res)=>{
  const [patients, appointments, admissions, pendingLabs, lowStock, invoices] = await Promise.all([
    Patient.countDocuments(),
    HMSAppointment.countDocuments({scheduledAt:{$gte:new Date(new Date().setHours(0,0,0,0)),$lt:new Date(new Date().setHours(24,0,0,0))},status:{$nin:['cancelled','no_show']}}),
    HMSAdmission.countDocuments({status:'admitted'}),
    HMSLabOrder.countDocuments({status:{$in:['ordered','sample_collected','processing']}}),
    HMSMedicine.countDocuments({active:true,$expr:{$lte:['$quantity','$reorderLevel']}}),
    HMSInvoice.countDocuments({status:{$in:['unpaid','partially_paid']}})
  ]);
  res.json({patients,appointmentsToday:appointments,activeAdmissions:admissions,pendingLabOrders:pendingLabs,lowStockItems:lowStock,unsettledInvoices:invoices});
}));

router.get('/patients', roles('admin','doctor','receptionist','nurse','billing','lab_technician','pharmacist'), wrap(async(req,res)=>{
  let filter={};
  if(req.user.role==='doctor')filter={assignedDoctor:req.user.id};
  const list=await Patient.find(filter).select('fullName mrn').sort({fullName:1}).limit(1000);
  res.json(list);
}));
router.get('/departments', roles('admin','doctor','receptionist','nurse'), wrap(async(req,res)=>{
  res.json(await HMSDepartment.find({active:true}).sort({name:1}));
}));
router.post('/departments', roles('admin'), wrap(async(req,res)=>{
  const name=cleanText(req.body.name,100), code=cleanText(req.body.code,12).toUpperCase();
  if(!name||!code) return res.status(400).json({error:'Department name and code are required'});
  const item=await HMSDepartment.create({name,code,description:cleanText(req.body.description,500)});
  await record(req,'hms.department.created',item._id); res.status(201).json(item);
}));
router.get('/doctors', roles('admin','doctor','receptionist'), wrap(async(req,res)=>{
  const docs=await User.find({role:'doctor',active:{$ne:false}}).select('name email');
  const profiles=await HMSDoctorProfile.find({active:true}).populate('department','name code');
  const byUser=new Map(profiles.map(p=>[String(p.user),p]));
  res.json(docs.map(d=>({user:d,profile:byUser.get(String(d._id))||null})));
}));
router.post('/doctors/:userId/profile', roles('admin'), wrap(async(req,res)=>{
  if(!validId(req.params.userId)) return res.status(400).json({error:'Invalid doctor identifier'});
  const user=await User.findOne({_id:req.params.userId,role:'doctor'});
  if(!user) return res.status(404).json({error:'Doctor account not found'});
  if(!validId(req.body.department)) return res.status(400).json({error:'A valid department is required'});
  const profile=await HMSDoctorProfile.findOneAndUpdate({user:user._id},{
    department:req.body.department,registrationNumber:cleanText(req.body.registrationNumber,80)||undefined,
    qualification:cleanText(req.body.qualification,200),specialization:cleanText(req.body.specialization,200),
    consultationFee:Math.max(0,Number(req.body.consultationFee)||0),active:true
  },{upsert:true,new:true,runValidators:true}).populate('department','name code');
  await record(req,'hms.doctor_profile.updated',profile._id); res.json(profile);
}));
router.get('/staff', roles('admin'), wrap(async(req,res)=>{
  res.json(await User.find({role:{$in:['doctor','receptionist','nurse','lab_technician','pharmacist','billing','admin']}}).select('-passwordHash').sort({name:1}));
}));
router.post('/staff', roles('admin'), wrap(async(req,res)=>{
  const name=cleanText(req.body.name,120), email=cleanText(req.body.email,160).toLowerCase(), username=cleanText(req.body.username,60).toLowerCase(), password=String(req.body.password||'');
  const allowed=['doctor','receptionist','nurse','lab_technician','pharmacist','billing','admin'];
  if(!name||!email||!username||password.length<10||!allowed.includes(req.body.role)) return res.status(400).json({error:'Name, email, username, valid role and password (minimum 10 characters) are required'});
  const bcrypt=(await import('bcryptjs')).default;
  const user=await User.create({name,email,username,role:req.body.role,passwordHash:await bcrypt.hash(password,12)});
  await record(req,'hms.staff.created',user._id,{role:user.role}); res.status(201).json({id:user._id,name:user.name,email:user.email,username:user.username,role:user.role});
}));

router.get('/appointments', roles('admin','doctor','receptionist','nurse'), wrap(async(req,res)=>{
  const filter= req.user.role==='doctor'?{doctor:req.user.id}:{};
  if(req.query.date){const start=new Date(req.query.date);if(Number.isNaN(start.getTime()))return res.status(400).json({error:'Invalid date'});start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);filter.scheduledAt={$gte:start,$lt:end};}
  res.json(await HMSAppointment.find(filter).populate('patient','fullName mrn').populate('doctor','name').populate('department','name').sort({scheduledAt:1}).limit(500));
}));
router.post('/appointments', roles('admin','doctor','receptionist'), wrap(async(req,res)=>{
  const {patient,doctor,scheduledAt}=req.body;
  if(!validId(patient)||!validId(doctor)||!scheduledAt||Number.isNaN(new Date(scheduledAt).getTime()))return res.status(400).json({error:'Patient, doctor and valid appointment date/time are required'});
  if(!(await Patient.exists({_id:patient})))return res.status(404).json({error:'Patient not found'});
  if(!(await User.exists({_id:doctor,role:'doctor',active:{$ne:false}})))return res.status(404).json({error:'Active doctor not found'});
  if(req.user.role==='doctor'&&String(doctor)!==String(req.user.id))return res.status(403).json({error:'Doctors may only book appointments with themselves'});
  const when=new Date(scheduledAt);if(when<new Date(Date.now()-60000))return res.status(400).json({error:'Appointment must be in the future'});
  const conflict=await HMSAppointment.exists({doctor,scheduledAt:when,status:{$nin:['cancelled','no_show']}});
  if(conflict)return res.status(409).json({error:'Doctor already has an appointment at this time'});
  const item=await HMSAppointment.create({patient,doctor,department:validId(req.body.department)?req.body.department:undefined,scheduledAt:when,reason:cleanText(req.body.reason,1000),createdBy:req.user.id});
  await record(req,'hms.appointment.created',item._id);res.status(201).json(await item.populate(['patient','doctor','department']));
}));
router.patch('/appointments/:id/status', roles('admin','doctor','receptionist'), wrap(async(req,res)=>{
  const statuses=['booked','checked_in','in_consultation','completed','cancelled','no_show'];
  if(!statuses.includes(req.body.status))return res.status(400).json({error:'Invalid appointment status'});
  const item=await HMSAppointment.findById(req.params.id);if(!item)return res.status(404).json({error:'Appointment not found'});
  if(req.user.role==='doctor'&&String(item.doctor)!==String(req.user.id))return res.status(403).json({error:'Not authorized for this appointment'});
  item.status=req.body.status;await item.save();await record(req,'hms.appointment.status_changed',item._id,{status:item.status});res.json(item);
}));

router.get('/encounters', roles('admin','doctor','nurse'), wrap(async(req,res)=>{
  const filter=req.user.role==='doctor'?{doctor:req.user.id}:{};
  res.json(await HMSEncounter.find(filter).populate('patient','fullName mrn').populate('doctor','name').sort({createdAt:-1}).limit(300));
}));
router.post('/encounters', roles('admin','doctor'), wrap(async(req,res)=>{
  if(!validId(req.body.patient)||!(await patientAccess(req,req.body.patient)))return res.status(403).json({error:'Patient access denied'});
  const item=await HMSEncounter.create({patient:req.body.patient,doctor:req.user.role==='doctor'?req.user.id:req.body.doctor||req.user.id,appointment:validId(req.body.appointment)?req.body.appointment:undefined,type:['OPD','emergency','follow_up'].includes(req.body.type)?req.body.type:'OPD',chiefComplaint:cleanText(req.body.chiefComplaint),examination:cleanText(req.body.examination,5000),diagnosis:cleanText(req.body.diagnosis),plan:cleanText(req.body.plan,5000),vitals:req.body.vitals||{}});
  await record(req,'hms.encounter.created',item._id);res.status(201).json(item);
}));
router.patch('/encounters/:id/complete', roles('admin','doctor'), wrap(async(req,res)=>{
  const item=await HMSEncounter.findById(req.params.id);if(!item)return res.status(404).json({error:'Encounter not found'});
  if(req.user.role==='doctor'&&String(item.doctor)!==String(req.user.id))return res.status(403).json({error:'Not authorized'});
  item.status='completed';await item.save();await record(req,'hms.encounter.completed',item._id);res.json(item);
}));

router.get('/beds', roles('admin','doctor','nurse','receptionist'), wrap(async(req,res)=>res.json(await HMSBed.find().sort({ward:1,bedNumber:1}))));
router.post('/beds', roles('admin'), wrap(async(req,res)=>{
  const ward=cleanText(req.body.ward,80),bedNumber=cleanText(req.body.bedNumber,30);
  if(!ward||!bedNumber)return res.status(400).json({error:'Ward and bed number are required'});
  const bed=await HMSBed.create({ward,bedNumber,room:cleanText(req.body.room,40),category:req.body.category,dailyRate:Math.max(0,Number(req.body.dailyRate)||0)});
  await record(req,'hms.bed.created',bed._id);res.status(201).json(bed);
}));
router.get('/admissions', roles('admin','doctor','nurse','receptionist','billing'), wrap(async(req,res)=>{
  const filter=req.user.role==='doctor'?{attendingDoctor:req.user.id}:{};
  res.json(await HMSAdmission.find(filter).populate('patient','fullName mrn').populate('attendingDoctor','name').populate('bed').sort({admittedAt:-1}).limit(300));
}));
router.post('/admissions', roles('admin','doctor'), wrap(async(req,res)=>{
  const {patient,bed}=req.body;if(!validId(patient)||!validId(bed))return res.status(400).json({error:'Patient and bed are required'});
  if(!(await patientAccess(req,patient)))return res.status(403).json({error:'Patient access denied'});
  const target=await HMSBed.findOneAndUpdate({_id:bed,status:'available'},{$set:{status:'occupied'}},{new:true});
  if(!target)return res.status(409).json({error:'Selected bed is unavailable'});
  try{
    const admission=await HMSAdmission.create({patient,bed,attendingDoctor:req.user.role==='doctor'?req.user.id:req.body.attendingDoctor||req.user.id,admissionReason:cleanText(req.body.admissionReason)});
    await record(req,'hms.admission.created',admission._id);res.status(201).json(await admission.populate(['patient','attendingDoctor','bed']));
  }catch(error){target.status='available';await target.save();throw error;}
}));
router.patch('/admissions/:id/discharge', roles('admin','doctor'), wrap(async(req,res)=>{
  const item=await HMSAdmission.findOne({_id:req.params.id,status:'admitted'});if(!item)return res.status(404).json({error:'Active admission not found'});
  if(req.user.role==='doctor'&&String(item.attendingDoctor)!==String(req.user.id))return res.status(403).json({error:'Not authorized'});
  item.status='discharged';item.dischargedAt=new Date();item.dischargeSummary=cleanText(req.body.dischargeSummary,5000);await item.save();
  await HMSBed.updateOne({_id:item.bed,status:'occupied'},{$set:{status:'available'}});
  await record(req,'hms.admission.discharged',item._id);res.json(item);
}));

router.get('/lab/orders', roles('admin','doctor','lab_technician','nurse'), wrap(async(req,res)=>{
  const filter=req.user.role==='doctor'?{orderedBy:req.user.id}:{};
  res.json(await HMSLabOrder.find(filter).populate('patient','fullName mrn').populate('orderedBy','name').populate('verifiedBy','name').sort({createdAt:-1}).limit(500));
}));
router.post('/lab/orders', roles('admin','doctor'), wrap(async(req,res)=>{
  if(!validId(req.body.patient)||!(await patientAccess(req,req.body.patient)))return res.status(403).json({error:'Patient access denied'});
  const testName=cleanText(req.body.testName,120);if(!testName)return res.status(400).json({error:'Test name is required'});
  const order=await HMSLabOrder.create({patient:req.body.patient,orderedBy:req.user.id,testName,priority:req.body.priority==='urgent'?'urgent':'routine'});
  await record(req,'hms.lab_order.created',order._id);res.status(201).json(order);
}));
router.patch('/lab/orders/:id', roles('admin','lab_technician'), wrap(async(req,res)=>{
  const order=await HMSLabOrder.findById(req.params.id);if(!order)return res.status(404).json({error:'Lab order not found'});
  const states=['ordered','sample_collected','processing','verified','cancelled'];
  if(!states.includes(req.body.status))return res.status(400).json({error:'Valid lab status is required'});
  if(req.body.status==='verified'&&!cleanText(req.body.result,10000))return res.status(400).json({error:'A result is required before verification'});
  order.status=req.body.status;
  if(req.body.result!==undefined)order.result=cleanText(req.body.result,10000);
  if(req.body.resultUnit!==undefined)order.resultUnit=cleanText(req.body.resultUnit,40);
  if(req.body.referenceRange!==undefined)order.referenceRange=cleanText(req.body.referenceRange,100);
  if(req.body.status==='sample_collected')order.collectedAt=new Date();
  if(req.body.status==='verified'){order.verifiedBy=req.user.id;order.verifiedAt=new Date();}
  await order.save();await record(req,'hms.lab_order.updated',order._id,{status:order.status});res.json(order);
}));

router.get('/pharmacy/medicines', roles('admin','doctor','pharmacist','nurse'), wrap(async(req,res)=>{
  const filter=req.user.role==='doctor'||req.user.role==='nurse'?{active:true}:{};
  res.json(await HMSMedicine.find(filter).sort({name:1}).limit(1000));
}));
router.post('/pharmacy/medicines', roles('admin','pharmacist'), wrap(async(req,res)=>{
  const name=cleanText(req.body.name,120),sku=cleanText(req.body.sku,40).toUpperCase();
  if(!name||!sku)return res.status(400).json({error:'Medicine name and SKU are required'});
  const item=await HMSMedicine.create({name,sku,genericName:cleanText(req.body.genericName,120),unit:cleanText(req.body.unit,30)||'unit',batchNumber:cleanText(req.body.batchNumber,60),expiryDate:req.body.expiryDate||undefined,quantity:Math.max(0,Number(req.body.quantity)||0),reorderLevel:Math.max(0,Number(req.body.reorderLevel)||0),unitPrice:Math.max(0,Number(req.body.unitPrice)||0)});
  await record(req,'hms.medicine.created',item._id);res.status(201).json(item);
}));
router.patch('/pharmacy/medicines/:id/stock', roles('admin','pharmacist'), wrap(async(req,res)=>{
  const delta=Number(req.body.quantityChange);if(!Number.isFinite(delta)||delta===0)return res.status(400).json({error:'Non-zero quantityChange is required'});
  const item=await HMSMedicine.findById(req.params.id);if(!item)return res.status(404).json({error:'Medicine not found'});
  if(item.quantity+delta<0)return res.status(409).json({error:'Insufficient stock'});
  item.quantity+=delta;await item.save();await record(req,'hms.medicine.stock_adjusted',item._id,{delta});res.json(item);
}));
router.get('/pharmacy/prescriptions', roles('admin','doctor','pharmacist','nurse'), wrap(async(req,res)=>{
  const filter=req.user.role==='doctor'?{prescribedBy:req.user.id}:{};
  res.json(await HMSPrescription.find(filter).populate('patient','fullName mrn').populate('prescribedBy','name').populate('items.medicine','name sku').sort({createdAt:-1}).limit(500));
}));
router.post('/pharmacy/prescriptions', roles('admin','doctor'), wrap(async(req,res)=>{
  if(!validId(req.body.patient)||!(await patientAccess(req,req.body.patient)))return res.status(403).json({error:'Patient access denied'});
  if(!Array.isArray(req.body.items)||!req.body.items.length)return res.status(400).json({error:'At least one prescription item is required'});
  const items=[];
  for(const entry of req.body.items){
    if(!validId(entry.medicine)||!Number.isInteger(Number(entry.quantity))||Number(entry.quantity)<1)return res.status(400).json({error:'Each item needs a valid medicine and positive integer quantity'});
    const med=await HMSMedicine.findOne({_id:entry.medicine,active:true});if(!med)return res.status(404).json({error:'A selected medicine was not found'});
    items.push({medicine:med._id,medicineName:med.name,dosage:cleanText(entry.dosage,80),frequency:cleanText(entry.frequency,80),duration:cleanText(entry.duration,80),quantity:Number(entry.quantity),instructions:cleanText(entry.instructions,500)});
  }
  const prescription=await HMSPrescription.create({patient:req.body.patient,prescribedBy:req.user.id,encounter:validId(req.body.encounter)?req.body.encounter:undefined,items});
  await record(req,'hms.prescription.created',prescription._id);res.status(201).json(prescription);
}));
router.post('/pharmacy/prescriptions/:id/dispense', roles('admin','pharmacist'), wrap(async(req,res)=>{
  const prescription=await HMSPrescription.findById(req.params.id);if(!prescription)return res.status(404).json({error:'Prescription not found'});
  if(prescription.status==='cancelled')return res.status(409).json({error:'Prescription is cancelled'});
  for(const item of prescription.items){
    const remaining=item.quantity-item.dispensedQuantity;if(!remaining)continue;
    const med=await HMSMedicine.findById(item.medicine);
    if(!med||med.quantity<remaining)return res.status(409).json({error:'Insufficient stock for '+item.medicineName});
  }
  for(const item of prescription.items){const remaining=item.quantity-item.dispensedQuantity;if(remaining){await HMSMedicine.updateOne({_id:item.medicine},{$inc:{quantity:-remaining}});item.dispensedQuantity+=remaining;}}
  prescription.status='dispensed';await prescription.save();await record(req,'hms.prescription.dispensed',prescription._id);res.json(prescription);
}));

router.get('/billing/invoices', roles('admin','billing','receptionist','doctor'), wrap(async(req,res)=>{
  const filter=req.user.role==='doctor'?await scopedPatientFilter(req):{};
  res.json(await HMSInvoice.find(filter).populate('patient','fullName mrn').populate('admission').sort({createdAt:-1}).limit(500));
}));
router.post('/billing/invoices', roles('admin','billing'), wrap(async(req,res)=>{
  if(!validId(req.body.patient)||!(await Patient.exists({_id:req.body.patient})))return res.status(400).json({error:'Valid patient is required'});
  if(!Array.isArray(req.body.items)||!req.body.items.length)return res.status(400).json({error:'Invoice items are required'});
  const items=req.body.items.map(i=>({description:cleanText(i.description,160),quantity:Math.max(1,Math.floor(Number(i.quantity)||1)),unitPrice:Math.max(0,Number(i.unitPrice)||0),amount:Math.max(1,Math.floor(Number(i.quantity)||1))*Math.max(0,Number(i.unitPrice)||0)}));
  if(items.some(i=>!i.description))return res.status(400).json({error:'Every invoice item needs a description'});
  const subtotal=items.reduce((sum,i)=>sum+i.amount,0),discount=Math.max(0,Number(req.body.discount)||0);
  if(discount>subtotal)return res.status(400).json({error:'Discount cannot exceed subtotal'});
  const invoice=await HMSInvoice.create({patient:req.body.patient,invoiceNumber:'NTI-'+Date.now()+'-'+Math.floor(Math.random()*900+100),items,subtotal,discount,total:subtotal-discount,createdBy:req.user.id});
  await record(req,'hms.invoice.created',invoice._id);res.status(201).json(invoice);
}));
router.post('/billing/invoices/:id/payments', roles('admin','billing'), wrap(async(req,res)=>{
  const amount=Number(req.body.amount),method=req.body.method;
  if(!Number.isFinite(amount)||amount<=0||!['cash','card','upi','bank_transfer','insurance'].includes(method))return res.status(400).json({error:'Positive amount and valid payment method are required'});
  const invoice=await HMSInvoice.findById(req.params.id);if(!invoice)return res.status(404).json({error:'Invoice not found'});
  if(invoice.status==='cancelled'||amount>invoice.total-invoice.paid)return res.status(409).json({error:'Payment exceeds the outstanding invoice balance'});
  const payment=await HMSPayment.create({invoice:invoice._id,amount,method,reference:cleanText(req.body.reference,100),receivedBy:req.user.id});
  invoice.paid+=amount;invoice.status=invoice.paid>=invoice.total?'paid':'partially_paid';await invoice.save();
  await record(req,'hms.invoice.payment_received',invoice._id,{amount,method});res.status(201).json({payment,invoice});
}));

export default router;

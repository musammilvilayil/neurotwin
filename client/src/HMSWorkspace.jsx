import React, { useEffect, useState } from 'react';

const sections = [
  ['summary','Overview'],['appointments','Appointments'],['encounters','OPD'],
  ['admissions','IPD Admissions'],['beds','Beds'],['lab','Laboratory'],['pharmacy','Pharmacy'],
  ['prescriptions','Prescriptions'],['billing','Billing'],['departments','Departments'],['staff','Staff']
];
const urls = {
  summary:'/api/hms/summary',appointments:'/api/hms/appointments',encounters:'/api/hms/encounters',
  admissions:'/api/hms/admissions',beds:'/api/hms/beds',lab:'/api/hms/lab/orders',
  pharmacy:'/api/hms/pharmacy/medicines',prescriptions:'/api/hms/pharmacy/prescriptions',billing:'/api/hms/billing/invoices',
  departments:'/api/hms/departments',staff:'/api/hms/staff'
};
const stamp = v => v ? new Date(v).toLocaleString() : '—';
const rupees = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(v)||0);
const allowed = {
  summary:['admin','doctor','receptionist','nurse','lab_technician','pharmacist','billing'],
  appointments:['admin','doctor','receptionist','nurse'],encounters:['admin','doctor','nurse'],
  admissions:['admin','doctor','nurse','receptionist','billing'],beds:['admin','doctor','nurse','receptionist'],lab:['admin','doctor','lab_technician','nurse'],
  pharmacy:['admin','doctor','pharmacist','nurse'],prescriptions:['admin','doctor','pharmacist','nurse'],billing:['admin','billing','receptionist','doctor'],
  departments:['admin','doctor','receptionist','nurse'],staff:['admin']
};

export default function HMSWorkspace({token,user}) {
  const [section,setSection]=useState('summary'),[data,setData]=useState([]),[summary,setSummary]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [form,setForm]=useState({}),[showForm,setShowForm]=useState(false),[patientChoices,setPatientChoices]=useState([]),[doctorChoices,setDoctorChoices]=useState([]),[medicineChoices,setMedicineChoices]=useState([]),[bedChoices,setBedChoices]=useState([]);
  const role=user?.role,canAdmin=role==='admin',canDoctor=['admin','doctor'].includes(role);
  const canLab=['admin','lab_technician'].includes(role),canPharmacy=['admin','pharmacist'].includes(role),canBilling=['admin','billing'].includes(role);
  const canCreate={appointments:['admin','doctor','receptionist'].includes(role),encounters:canDoctor,admissions:canDoctor,lab:canDoctor,pharmacy:canPharmacy,prescriptions:canDoctor,billing:canBilling,departments:canAdmin,staff:canAdmin,beds:canAdmin};
  const api=async(path,options={})=>{
    const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'Request failed');
    return result;
  };
  const load=async(key=section)=>{
    setBusy(true);setError('');
    try{
      if(key==='summary'){setSummary(await api(urls.summary));setData([]);}
      else setData(await api(urls[key]));
      if(['appointments','encounters','admissions','lab','billing','prescriptions'].includes(key)){
        const p=await api('/api/hms/patients');
        setPatientChoices(p.map(x=>({value:x._id,label:x.fullName+' · '+(x.mrn||'No MRN')})));
        if(key==='appointments'){const d=await api('/api/hms/doctors');setDoctorChoices(d.filter(x=>role!=='doctor'||x.user._id===user.id).map(x=>({value:x.user._id,label:x.user.name})));}
        if(key==='prescriptions'){const m=await api('/api/hms/pharmacy/medicines');setMedicineChoices(m.map(x=>({value:x._id,label:x.name+' · '+x.sku})));}
        if(key==='admissions'){const beds=await api('/api/hms/beds');setBedChoices(beds.filter(x=>x.status==='available').map(x=>({value:x._id,label:x.ward+' · '+x.bedNumber+' · '+x.category})));}
      }
    }catch(e){setError(e.message);setData([]);}
    finally{setBusy(false);}
  };
  useEffect(()=>{if((allowed[section]||[]).includes(role))load(section);},[section,token,role]);
  const field=(name,value)=>setForm(old=>({...old,[name]:value}));
  const submit=async e=>{
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      let path=urls[section],body={...form};
      if(section==='appointments')body.scheduledAt=new Date(body.scheduledAt).toISOString();
      if(section==='billing')body.items=[{description:body.description,quantity:Number(body.quantity)||1,unitPrice:Number(body.unitPrice)||0}];
      if(section==='prescriptions')body.items=[{medicine:body.medicine,quantity:Number(body.quantity)||1,dosage:body.dosage,frequency:body.frequency,duration:body.duration,instructions:body.instructions}];
      await api(path,{method:'POST',body:JSON.stringify(body)});
      setForm({});setShowForm(false);setNotice('Record saved successfully.');await load(section);
    }catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const patch=async(path,body,message)=>{
    setBusy(true);setError('');setNotice('');
    try{await api(path,{method:'PATCH',body:JSON.stringify(body)});setNotice(message);await load(section);}
    catch(err){setError(err.message);}finally{setBusy(false);}
  };
  const Field=({name,label,type='text',required=false,options=[],forceSelect=false})=><label className="hms-field">{label}{options.length||forceSelect?<select required={required} value={form[name]||''} onChange={e=>field(name,e.target.value)}><option value="">Select {label}</option>{options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}</select>:<input required={required} type={type} value={form[name]||''} onChange={e=>field(name,e.target.value)}/>}</label>;
  const renderForm=()=>{
    if(section==='appointments')return <><Field name="patient" label="Patient" required options={patientChoices} forceSelect/><Field name="doctor" label="Doctor" required options={doctorChoices} forceSelect/><Field name="scheduledAt" label="Date & time" type="datetime-local" required/><Field name="reason" label="Reason"/></>;
    if(section==='encounters')return <><Field name="patient" label="Patient" required options={patientChoices} forceSelect/><Field name="type" label="Type" options={['OPD','emergency','follow_up']}/><Field name="chiefComplaint" label="Chief complaint" required/><Field name="diagnosis" label="Diagnosis"/><Field name="examination" label="Examination"/><Field name="plan" label="Plan"/></>;
    if(section==='admissions')return <><Field name="patient" label="Patient" required options={patientChoices} forceSelect/><Field name="bed" label="Available bed" required options={bedChoices} forceSelect/><Field name="admissionReason" label="Admission reason"/></>;
    if(section==='beds')return <><Field name="ward" label="Ward" required/><Field name="bedNumber" label="Bed number" required/><Field name="room" label="Room"/><Field name="category" label="Category" options={['general','semi_private','private','icu','emergency']}/><Field name="dailyRate" label="Daily rate" type="number"/></>;
    if(section==='lab')return <><Field name="patient" label="Patient" required options={patientChoices} forceSelect/><Field name="testName" label="Test name" required/><Field name="priority" label="Priority" options={['routine','urgent']}/></>;
    if(section==='pharmacy')return <><Field name="name" label="Medicine name" required/><Field name="sku" label="SKU" required/><Field name="genericName" label="Generic name"/><Field name="batchNumber" label="Batch number"/><Field name="quantity" label="Opening stock" type="number"/><Field name="reorderLevel" label="Reorder level" type="number"/><Field name="unitPrice" label="Unit price" type="number"/><Field name="expiryDate" label="Expiry date" type="date"/></>;
    if(section==='prescriptions')return <><Field name="patient" label="Patient" required options={patientChoices} forceSelect/><Field name="medicine" label="Medicine" required options={medicineChoices} forceSelect/><Field name="quantity" label="Quantity" type="number" required/><Field name="dosage" label="Dosage" required/><Field name="frequency" label="Frequency" required/><Field name="duration" label="Duration"/><Field name="instructions" label="Instructions"/></>;
    if(section==='billing')return <><Field name="patient" label="Patient" required options={patientChoices} forceSelect/><Field name="description" label="Charge description" required/><Field name="quantity" label="Quantity" type="number"/><Field name="unitPrice" label="Unit price" type="number" required/><Field name="discount" label="Discount" type="number"/></>;
    if(section==='departments')return <><Field name="name" label="Department name" required/><Field name="code" label="Department code" required/><Field name="description" label="Description"/></>;
    if(section==='staff')return <><Field name="name" label="Full name" required/><Field name="email" label="Email" type="email" required/><Field name="username" label="Username" required/><Field name="password" label="Temporary password (10+ characters)" type="password" required/><Field name="role" label="Role" options={['doctor','receptionist','nurse','lab_technician','pharmacist','billing','admin']}/></>;
    return null;
  };
  const title=(sections.find(x=>x[0]===section)||[])[1]||'Hospital';
  return <section className="panel page-panel hms-workspace">
    <div className="section-heading inside"><div><p className="eyebrow">HOSPITAL OPERATIONS</p><h2>{title}</h2><p className="muted">Role-restricted hospital workflows and operational records.</p></div><button className="secondary-btn" onClick={()=>load()} disabled={busy}>Refresh</button></div>
    <div className="hms-tabs">{sections.filter(x=>(allowed[x[0]]||[]).includes(role)).map(([key,label])=><button key={key} className={section===key?'active':''} onClick={()=>{setSection(key);setForm({});setShowForm(false);}}>{label}</button>)}</div>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
    {section==='summary'&&summary&&<div className="hms-stats">{[['Patients',summary.patients],['Appointments today',summary.appointmentsToday],['Active admissions',summary.activeAdmissions],['Pending lab orders',summary.pendingLabOrders],['Low-stock medicines',summary.lowStockItems],['Unsettled invoices',summary.unsettledInvoices]].map(([label,value])=><article className="stat-card" key={label}><small>{label}</small><strong>{value??0}</strong></article>)}</div>}
    {canCreate[section]&&<div className="hms-actions"><button className="primary-button" onClick={()=>setShowForm(v=>!v)}>{showForm?'Close':'Add new record'}</button></div>}
    {showForm&&<form className="new-patient-panel hms-form" onSubmit={submit}><div className="new-patient-grid">{renderForm()}</div><button className="primary-button" disabled={busy}>{busy?'Saving…':'Save record'}</button></form>}
    {busy&&<p className="muted">Loading…</p>}
    {section!=='summary'&&!busy&&<div className="hms-records">
      {section==='appointments'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{(x.patient?.fullName||'Patient')+' · '+(x.doctor?.name||'Doctor')}</b><span>{stamp(x.scheduledAt)+' · '+(x.reason||'Consultation')+' · '+x.status}</span></div>{['admin','doctor','receptionist'].includes(role)?<select value={x.status} onChange={e=>patch('/api/hms/appointments/'+x._id+'/status',{status:e.target.value},'Appointment updated')}><option value="booked">Booked</option><option value="checked_in">Checked in</option><option value="in_consultation">In consultation</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select>:<span className="badge">{x.status}</span>}</article>)}
      {section==='encounters'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{(x.patient?.fullName||'Patient')+' · '+x.type}</b><span>{stamp(x.createdAt)+' · '+(x.chiefComplaint||'No complaint')+' · '+(x.diagnosis||'Diagnosis pending')}</span></div>{x.status==='open'&&canDoctor&&<button className="secondary-btn" onClick={()=>patch('/api/hms/encounters/'+x._id+'/complete',{},'OPD encounter completed')}>Complete</button>}</article>)}
      {section==='admissions'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{(x.patient?.fullName||'Patient')+' · '+(x.bed?.ward||'Ward')+' / '+(x.bed?.bedNumber||'')}</b><span>{stamp(x.admittedAt)+' · '+x.status}</span></div>{x.status==='admitted'&&canDoctor&&<button className="secondary-btn" onClick={()=>{const dischargeSummary=window.prompt('Enter the discharge summary');if(dischargeSummary?.trim())patch('/api/hms/admissions/'+x._id+'/discharge',{dischargeSummary},'Patient discharged and bed released');}}>Discharge</button>}</article>)}
      {section==='beds'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{x.ward+' · Bed '+x.bedNumber}</b><span>{x.category+' · '+rupees(x.dailyRate)+'/day · '+x.status}</span></div></article>)}
      {section==='lab'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{x.testName+' · '+(x.patient?.fullName||'Patient')}</b><span>{stamp(x.createdAt)+' · '+x.priority+' · '+x.status+(x.result?' · Result: '+x.result:'')}</span></div>{canLab&&x.status==='ordered'&&<button className="secondary-btn" onClick={()=>patch('/api/hms/lab/orders/'+x._id,{status:'sample_collected'},'Sample marked as collected')}>Collect sample</button>}{canLab&&x.status==='sample_collected'&&<button className="secondary-btn" onClick={()=>patch('/api/hms/lab/orders/'+x._id,{status:'processing'},'Lab processing started')}>Start processing</button>}{canLab&&x.status==='processing'&&<button className="secondary-btn" onClick={()=>{const result=window.prompt('Enter result for this test');if(result?.trim())patch('/api/hms/lab/orders/'+x._id,{status:'verified',result},'Lab result verified');}}>Verify result</button>}</article>)}
      {section==='pharmacy'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{x.name+' · '+x.sku}</b><span>{(x.genericName||'')+' · Stock: '+x.quantity+' '+x.unit+' · Reorder at '+x.reorderLevel+' · '+rupees(x.unitPrice)}</span></div><span className="badge">{x.quantity<=x.reorderLevel?'Low stock':'In stock'}</span>{canPharmacy&&<button className="secondary-btn" onClick={()=>{const quantityChange=window.prompt('Current stock: '+x.quantity+'. Enter adjustment (use a negative number to remove stock)');if(quantityChange&&Number.isFinite(Number(quantityChange))&&Number(quantityChange)!==0)patch('/api/hms/pharmacy/medicines/'+x._id+'/stock',{quantityChange:Number(quantityChange)},'Medicine stock updated');}}>Adjust stock</button>}</article>)}
      {section==='prescriptions'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{(x.patient?.fullName||'Patient')+' · Prescription'}</b><span>{stamp(x.createdAt)+' · '+x.items.map(i=>i.medicineName+' × '+i.quantity).join(', ')+' · '+x.status}</span></div>{canPharmacy&&x.status!=='dispensed'&&<button className="secondary-btn" onClick={()=>{if(window.confirm('Dispense the remaining prescription quantity and deduct it from stock?'))patch('/api/hms/pharmacy/prescriptions/'+x._id+'/dispense',{},'Prescription dispensed and stock updated');}}>Dispense</button>}</article>)}
      {section==='billing'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{x.invoiceNumber+' · '+(x.patient?.fullName||'Patient')}</b><span>{stamp(x.createdAt)+' · Total '+rupees(x.total)+' · Paid '+rupees(x.paid)+' · '+x.status}</span></div>{canBilling&&x.status!=='paid'&&<button className="secondary-btn" onClick={()=>{const amount=window.prompt('Outstanding '+rupees(x.total-x.paid)+'. Enter payment amount');if(amount&&Number.isFinite(Number(amount))&&Number(amount)>0){const method=window.prompt('Payment method: cash, card, upi, bank_transfer or insurance','upi');if(method)patch('/api/hms/billing/invoices/'+x._id+'/payments',{amount:Number(amount),method:method.trim().toLowerCase()},'Payment recorded');}}}>Record payment</button>}</article>)}
      {section==='departments'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{x.name}</b><span>{x.code+' · '+(x.description||'No description')}</span></div></article>)}
      {section==='staff'&&data.map(x=><article className="record-row" key={x._id}><div className="record-copy"><b>{x.name}</b><span>{x.email+' · '+x.username+' · '+x.role+' · '+(x.active===false?'Inactive':'Active')}</span></div></article>)}
      {data.length===0&&<p className="muted">No records found for this section yet.</p>}
    </div>}
    <p className="chart-note">Operational prototype. Configure hospital-specific workflows, clinical protocols, financial rules and staff permissions before real deployment.</p>
  </section>;
}

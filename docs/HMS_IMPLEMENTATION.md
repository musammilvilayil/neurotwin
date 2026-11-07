# Hospital Management System (HMS)

The HMS is being added alongside the existing NeuroTwin EEG research workspace. The EEG analysis, seizure-research and Digital Twin implementation remains unchanged in scope and is still a research prototype.

## Implemented workflow areas

- Departments and doctor profiles
- Staff accounts with dedicated roles: receptionist, nurse, laboratory technician, pharmacist and billing
- Appointment booking and status updates
- OPD encounters and completion
- IPD admissions, ward beds and discharge with bed release
- Laboratory test orders, sample/result workflow and verification
- Medicine catalogue and stock adjustment
- Prescriptions and pharmacy dispensing
- Patient invoices and payment receipts
- Audit events for key HMS mutations

## API prefix

All endpoints are authenticated under `/api/hms`.

| Area | Endpoints |
| --- | --- |
| Overview | `GET /summary` |
| Patient directory | `GET /patients` |
| Departments | `GET, POST /departments` |
| Doctors | `GET /doctors`, `POST /doctors/:userId/profile` |
| Staff | `GET, POST /staff` |
| Appointments | `GET, POST /appointments`, `PATCH /appointments/:id/status` |
| OPD | `GET, POST /encounters`, `PATCH /encounters/:id/complete` |
| Beds | `GET, POST /beds` |
| IPD | `GET, POST /admissions`, `PATCH /admissions/:id/discharge` |
| Laboratory | `GET, POST /lab/orders`, `PATCH /lab/orders/:id` |
| Pharmacy | `GET, POST /pharmacy/medicines`, `PATCH /pharmacy/medicines/:id/stock` |
| Prescriptions | `GET, POST /pharmacy/prescriptions`, `POST /pharmacy/prescriptions/:id/dispense` |
| Billing | `GET, POST /billing/invoices`, `POST /billing/invoices/:id/payments` |

## Staff roles

- `admin`: system administration, staff, departments, beds and full operational oversight
- `doctor`: assigned patient workflows, appointments, OPD, admissions, lab orders and prescriptions
- `receptionist`: patient directory, appointments and front-desk workflows
- `nurse`: operational visibility for appointments, OPD, IPD, beds, laboratory and pharmacy records
- `lab_technician`: laboratory worklist and result verification
- `pharmacist`: medicine catalogue, stock and prescription dispensing
- `billing`: invoices and payment collection
- Existing `patient` and `caregiver` roles remain within the existing research-facing portal; they do not receive HMS staff navigation.

## Local verification

From the repository root:

```bash
npm ci
npm ci --prefix server
npm ci --prefix client
npm test
npm run build
```

The manual full-stack EEG integration script remains separate:

```bash
npm run test:e2e --prefix server
```

That script requires a running MongoDB instance, the ML service and a locally available EDF file. It is not a CI-safe unit test.

## Deployment and safety notes

This implementation is an application-development milestone, not a production hospital deployment. Before real patient use, hospital-specific workflows, clinical responsibility, privacy/retention, backups, access reviews, financial controls, regulatory obligations and operational procedures must be reviewed and approved by the relevant hospital stakeholders. Do not use demo accounts or demo data for real patient care.

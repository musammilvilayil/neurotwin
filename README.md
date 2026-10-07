# NeuroTwin

NeuroTwin is an academic/research prototype for EEG-informed neurological monitoring and a patient-specific Digital Twin. It pairs a React clinical workspace, Express/MongoDB API, and Python/MNE/TensorFlow research pipeline.

> **Safety boundary:** this is clinical decision-support software, not a diagnostic device. It does not replace clinician judgement. The repository ships **no trained model and no performance claims**. All demo outputs are labelled untrained/demo and require clinician review.

## What is included

- JWT authentication and RBAC for Doctor, Patient, Caregiver, and Admin roles
- Doctor/patient-oriented dashboard, clinical notes, caregiver read-only patient access, admin audit endpoint
- MongoDB models for users, patients, EEG sessions, analyses, Digital Twin snapshots, notes, and audit events
- EEG upload contract plus Python MNE EDF inspection/preprocessing (EEG pick, 0.5–40 Hz filter, 128 Hz resample, z-score)
- CNN–LSTM architecture and reproducible training entry point for appropriately approved, de-identified labelled data
- Prototype confidence/explanation fields and longitudinal snapshot updates, intentionally marked demo until validated weights are deployed
- Demo seed accounts and a responsive frontend

## Run locally

Requirements: Node 20+, MongoDB 7+, and Python 3.11+ for the ML service.

```bash
cp .env.example server/.env
npm run install:all
npm run dev
```

Start MongoDB locally first. The web app opens at `http://localhost:5173`; API at `http://localhost:5000`. Alternatively, run `docker compose up --build` for MongoDB, API, and ML service (run the Vite client separately).

Demo password for every account: `DemoPass123!`

| Role | Email |
|---|---|
| Doctor | doctor@neurotwin.demo |
| Patient | patient@neurotwin.demo |
| Caregiver | caregiver@neurotwin.demo |
| Admin | admin@neurotwin.demo |

## API and data boundaries

`POST /api/eeg/upload` registers an EEG file and produces a clearly labelled demo analysis/snapshot. It does not infer a medical condition. The ML service's `POST /inspect-eeg` accepts EDF files and returns preprocessing metadata only; it intentionally performs no inference without validated supplied weights.

Never upload identifiable health information to an unapproved environment. Before any real-world use, add institutional approvals, informed consent, encryption/key management, data retention rules, model validation, bias evaluation, monitoring, and applicable regulatory review.

## Tests and deployment

Run `npm test` for the API health/safety-boundary test and `npm run build` for the production client bundle. Set a strong unique `JWT_SECRET`, restricted `CLIENT_ORIGIN`, production MongoDB credentials, TLS, and durable object storage before deployment. See [architecture notes](docs/ARCHITECTURE.md).

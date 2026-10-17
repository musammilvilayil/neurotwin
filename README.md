# NeuroTwin

NeuroTwin is an academic/research prototype for EEG-informed neurological monitoring and a patient-specific Digital Twin. It pairs a React clinical workspace, Express/MongoDB API, and Python/MNE/TensorFlow research pipeline.

> **Safety boundary:** this is clinical decision-support software, not a diagnostic device. It does not replace clinician judgement. The repository ships **no trained model and no performance claims**. Seeded accounts contain no simulated seizure prediction; all inference requires a trained artifact and clinician review.

## What is included

- JWT authentication and RBAC for Doctor, Patient, Caregiver, and Admin roles
- Doctor/patient-oriented dashboard, clinical notes, caregiver read-only patient access, admin audit endpoint
- MongoDB models for users, patients, EEG sessions, analyses, Digital Twin snapshots, notes, and audit events
- EEG upload contract plus Python MNE EDF inspection/preprocessing (EEG pick, 0.5–40 Hz filter, 128 Hz resample, z-score)
- CNN–LSTM architecture and reproducible training entry point for appropriately approved, de-identified labelled data
- Artifact-backed seizure-score timelines, waveform snapshots, and longitudinal Digital Twin updates only after successful model inference
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

`POST /api/eeg/upload` accepts an EDF only for an authorized doctor/admin and proxies it to the ML service. It creates no analysis or Digital Twin snapshot when the model is absent or inference fails. The ML service returns HTTP 503 with `model_not_ready` until both `artifacts/model.keras` and `artifacts/metadata.json` are installed. Outputs are research seizure scores, not medical findings.

Never upload identifiable health information to an unapproved environment. Before any real-world use, add institutional approvals, informed consent, encryption/key management, data retention rules, model validation, bias evaluation, monitoring, and applicable regulatory review.

## Tests and deployment

Run `npm test` for API checks and `npm run build` for the production client bundle. Run `python -m unittest discover -s tests` from `services/ml` for preprocessing checks. Set a strong unique `JWT_SECRET`, restricted `CLIENT_ORIGIN`, production MongoDB credentials, TLS, and durable object storage before deployment. See [architecture notes](docs/ARCHITECTURE.md) and [reproducibility](docs/REPRODUCIBILITY.md).

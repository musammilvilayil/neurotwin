# NeuroTwin — EEG Research & Digital Twin Prototype

NeuroTwin is a full-stack academic research prototype combining scalp EEG preprocessing, an experimental deep-learning model, longitudinal patient-context records and role-based web access. It includes a React 18/Vite frontend, Node.js/Express/MongoDB application API, and an MNE-Python/TensorFlow FastAPI inference service.

> **Research-only boundary:** NeuroTwin is not a certified medical device. Model outputs are experimental scores, not diagnoses. They must not be used to rule out seizures, recommend treatment or make emergency decisions. Real EEG requires qualified professional review.

## Core capabilities

- Role-based access for administrator, doctor, patient and caregiver accounts
- Patient assignment and record isolation
- EDF upload, validation and MNE-based EEG preprocessing
- Multi-Scale Dilated Temporal CNN inference when valid model artifacts are installed
- 18-channel bipolar EEG waveform and score timeline visualization
- Longitudinal analysis snapshots and clinician review workflow
- Audit events and downloadable PDF research summaries
- CHB-MIT data preparation and subject-disjoint model training pipeline

## Architecture

\`\`\`mermaid
flowchart LR
  A[React + Vite] -->|JWT / REST| B[Express API]
  B --> C[(MongoDB)]
  B -->|EDF| D[FastAPI ML service]
  D --> E[MNE preprocessing]
  E --> F[Multi-Scale Dilated CNN]
  F --> G[Temporal confirmation]
  G --> D
  D -->|Scores and waveform| B
  B --> H[PDF research report]
\`\`\`

## Prerequisites

- Node.js 20+
- Python 3.11
- MongoDB 7+ (local or Docker)
- Authorized CHB-MIT data only if you intend to reproduce training

## Local setup

\`\`\`bash
# Install JavaScript dependencies
npm run install:all

# Configure the Express API
cp server/.env.example server/.env
# Edit server/.env and set a unique random JWT_SECRET

# Start MongoDB separately, then run frontend + Express
npm run dev
\`\`\`

Frontend: \`http://localhost:5173\`  
Express API: \`http://localhost:5000\`

In another terminal, install and launch the Python ML service:

\`\`\`bash
cd services/ml
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn api:app --host 127.0.0.1 --port 8001
\`\`\`

The ML API reports \`model_state: not_ready\` if its artifact directory does not contain a compatible \`model.keras\` and \`metadata.json\`. This is intentional; the API does not fabricate predictions.

## Demo accounts

Seeded local demo password: \`DemoPass123!\` (development only; change or remove demo credentials before any deployment).

| Role | Username | Email |
|---|---|---|
| Admin | \`admin\` | admin@neurotwin.demo |
| Doctor | \`doctor\` | doctor@neurotwin.demo |
| Patient | \`patient\` | patient@neurotwin.demo |
| Caregiver | \`caregiver\` | caregiver@neurotwin.demo |

## Tests and build

\`\`\`bash
# Backend tests
npm test --prefix server

# Frontend production build
npm run build --prefix client

# Python syntax check and ML unit tests
python -m compileall -q services/ml
cd services/ml
python -m unittest discover -s tests -v
\`\`\`

The GitHub Actions workflow \`.github/workflows/ci.yml\` runs the frontend build, backend tests and ML checks on pushes and pull requests.

## CHB-MIT preparation and training

Download CHB-MIT under its official terms. The data is not included in this repository.

\`\`\`bash
cd services/ml
python download_chbmit.py --help
python prepare_chbmit.py --data-dir data/chbmit --output-dir data/processed
python train.py \\
  --features data/processed/features.npy \\
  --labels data/processed/labels.npy \\
  --subjects data/processed/subjects.npy \\
  --architecture multiscale_cnn \\
  --hard-negative-mining \\
  --output-dir artifacts
\`\`\`

The training script supports subject-disjoint partitions, validation-only threshold selection, held-out testing and memory-mapped feature batches. Review its saved \`metadata.json\` and \`evaluation.json\` before using any reported number. A manual GitHub Actions training workflow is available under Actions → Train CHB-MIT research model.

## Research metrics

A previous repository experiment reported precision 55.84%, recall 76.79%, F1 64.66%, specificity 99.55%, ROC-AUC 91.55% and 1.60 false alarms/hour on its held-out test protocol. Treat these as historical experiment results until reproduced from the exact data split, code, artifact and threshold. Do not compare runs unless their splits and evaluation methods match.

## Project documentation

- [B.Tech major project report, scope and readiness checklist](docs/BTECH_MAJOR_PROJECT.md)
- [B.Tech viva preparation](docs/BTECH_VIVA.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Reproducibility](docs/REPRODUCIBILITY.md)
- [API documentation](API_DOCUMENTATION.md)
- [Model report](MODEL_REPORT.md)
- [Training report](TRAINING_REPORT.md)

## Limitations

The prototype has not been clinically validated, certified or prospectively evaluated. Dataset shift, montage variation, artifacts, class imbalance, false positives and false negatives remain important. Secure deployment also requires privacy, consent, retention, access-control, secret-management and operational review.

## Frontend UI and motion components

The frontend uses selected official free React Bits source components (Aurora and SpotlightCard) copied into `client/src/components/reactbits/` and customized through the local NeuroTwin theme. The component source is included in the repository; no paid React Bits Pro blocks or license-gated assets are used. React Bits: https://reactbits.dev/ (MIT + Commons Clause; see upstream repository license for the applicable terms).


## One-command local startup (recommended)

Requirements: Node.js 20+, Python 3.11, and internet access for first-time package setup. MongoDB can be local or configured through `server/.env`; if the default local MongoDB is unavailable, the launcher uses the bundled temporary MongoDB instance for that session (data is not persistent across restarts).

From the repository root, run:

```bash
npm run dev:all
```

This automatically installs missing JavaScript dependencies, creates the Python 3.11 virtual environment, installs the pinned ML requirements, creates `server/.env` from the example when needed, then starts the FastAPI ML service, Express API and React/Vite frontend. On Windows it also opens the frontend in your browser.

- Frontend: `http://localhost:5173`
- Express API: `http://localhost:5000`
- ML health: `http://localhost:8001/health`

Stop everything with `npm run stop:all` or press `Ctrl+C` in the launcher terminal. You can also double-click `RUN-NEUROTWIN.bat` on Windows.

For repeatable setup without starting services, run `npm run setup`. If you use a persistent local/Atlas MongoDB, set `MONGODB_URI` in `server/.env`. The launcher never creates a trained model: if compatible `model.keras` and `metadata.json` artifacts are absent, the ML API starts in `not_ready` state and does not fabricate predictions.

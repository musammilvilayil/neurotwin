# NeuroTwin EEG Dataset Training Pipeline

This repository contains a research-only EEG training pipeline for public PhysioNet datasets, integrated with the NeuroTwin workspace. It is intentionally built around safe research boundaries: no clinical diagnosis claim, no fake trained model results, and no dataset files committed to Git.

## Datasets supported

1. Auditory evoked potential EEG-Biometric dataset
   - DOI: https://doi.org/10.13026/ps31-fc50
   - Use only valid subject identity or raw experiment-ID labels.
   - No clinical disease prediction claim is made.

2. EEG Motor Movement/Imagery dataset
   - DOI: https://doi.org/10.13026/C28G6P
   - Uses EDF+ files and annotations.
   - Handles baseline, motor execution, and motor imagery tasks separately.

## Safety boundary

This project is research-only. It does not diagnose disease, predict patient health status, or claim clinical validity. Outputs must carry a `research_only` or `untrained/demo` status whenever validated weights are absent.

## Repository setup

Requirements:
- Node.js 20+
- Python 3.11+
- MongoDB 7+ (optional for API smoke testing)
- pip/venv

Install:
```bash
npm install
npm install --prefix server
npm install --prefix client
python -m venv services/ml/.venv
services/ml/.venv\Scripts\python -m pip install --upgrade pip
services/ml/.venv\Scripts\python -m pip install -r services/ml/requirements.txt
```

On macOS/Linux use:
```bash
python -m venv services/ml/.venv
. services/ml/.venv/bin/activate
python -m pip install -r services/ml/requirements.txt
```

## Dataset preparation

The dataset archives are not committed to this repository. Download them into `data/` or a local research directory and then prepare features.

Auditory dataset:
```bash
python services/ml/download_physionet.py --dataset auditory --doi 10.13026/ps31-fc50 --output-dir data/raw
```

Motor imagery dataset:
```bash
python services/ml/download_physionet.py --dataset motor-imagery --doi 10.13026/C28G6P --output-dir data/raw
```

Place/inspect dataset files under a local path such as:
```bash
data/raw/auditory/
data/raw/motor-imagery/
```

## Preparation and training commands

Preprocess and inspect a single EEG file:
```bash
services/ml/.venv\Scripts\python -c "from preprocessing import preprocess_eeg_record; print(preprocess_eeg_record('data/raw/example.edf', window_size=512)['metadata'])"
```

Prepare a dataset for training (example):
```bash
services/ml/.venv\Scripts\python - <<'PY'
from preprocessing import parse_physionet_dataset
print(parse_physionet_dataset('data/raw/auditory', dataset_type='auditory'))
PY
```

Train a model with subject-wise split protection:
```bash
services/ml/.venv\Scripts\python services/ml/train.py --features data/features/X.npy --labels data/features/y.npy --subject-ids data/features/subject_ids.npy --dataset-name auditory --task-name subject_identity --output-dir model_artifacts/auditory --epochs 25 --batch-size 32 --learning-rate 1e-3 --seed 42
```

Train motor imagery/execution pipeline:
```bash
services/ml/.venv\Scripts\python services/ml/train.py --features data/features/motor_X.npy --labels data/features/motor_y.npy --subject-ids data/features/motor_subject_ids.npy --dataset-name motor_imagery --task-name motor_imagery_execution --output-dir model_artifacts/motor_imagery --epochs 25 --batch-size 32 --learning-rate 1e-3 --seed 42
```

## Evaluation and output

The training script exports:
- `metrics.json`
- `training_history.csv`
- `model_metadata.json`
- `model.keras` (when generated locally)

Evaluate using held-out subjects only; do not mix windows from the same participant across splits.

## API and UI model-state behavior

The backend exposes a safety endpoint:
```bash
curl http://localhost:5000/api/model/state
```

When no trained weight file is present, it must return a state of `untrained/demo` and include a research-only notice rather than a fake result.

## License and data use

This repository does not bundle the PhysioNet datasets. Users must comply with the dataset's own license and access conditions, including PhysioNet credentialing and approved research use.

## Running the app

Start the API and frontend:
```bash
cp .env.example server/.env
npm run dev
```

The web app runs at `http://localhost:5173` and the API at `http://localhost:5000`.

## Tests

Server safety checks:
```bash
npm test --prefix server
```

Dataset parsing and leakage-protection tests:
```bash
services/ml/.venv\Scripts\python -m pytest services/ml/tests/test_dataset_pipeline.py
```

Frontend build:
```bash
npm run build --prefix client
```

## Important limitations

- This repository does not include any trained model weights.
- No clinical or diagnostic claim is made.
- Public dataset use is subject to data access and licensing terms.
- Only de-identified and approved research data should be used.

# Main-branch technical audit — 7 November 2026

Repository: musammilvilayil/neurotwin
Audited ref: main
Audited commit: 5852d9e022bb9e61204010e89805feca8718c239
Scope: repository tree, README, architecture/reproducibility docs, package manifests, server/API source, ML service/training source, tests, artifacts and GitHub Actions configuration.

## Executive summary

The main branch already contains a substantial full-stack academic prototype: React/Vite frontend, Express/Mongoose API, MongoDB data models, FastAPI/MNE/TensorFlow inference service, CHB-MIT preparation/training scripts, model artifacts, API/security tests and project reports. The architecture is suitable for a B.Tech major-project demonstration after the application is clean-installed and its end-to-end paths are reverified.

The key issue is verification and repository consistency. Main had no general CI workflow, the model-training workflow auto-triggered only on an old feature branch, the README referenced scratch test files absent from the committed tree, and reproducibility notes contradicted the presence of committed model artifacts. Historical reports claimed completion on feature branches and are not proof that this exact main commit passed every check.

## Component inventory

| Area | Main-branch evidence | Assessment |
|---|---|---|
| Frontend | React 18, Vite, responsive UI, EEG plots and role workspaces | Implemented; production build must be run in CI |
| Application API | Express, JWT, bcrypt, Helmet, rate limiting, Mongoose | Implemented; security/integration tests exist |
| Data layer | User, Patient, EEGSession, Analysis, TwinSnapshot, ClinicalNote, AuditEvent | Implemented |
| ML API | FastAPI health, inspect-eeg and infer endpoints; EDF validation and artifact loading | Implemented; actual inference requires compatible artifacts and a supported sample |
| EEG processing | MNE EDF reader, filtering, resampling, fixed montage and windowing | Implemented; verify training/inference parity |
| Training | prepare_chbmit.py, train.py, multi-scale CNN, optional HNM and evaluation outputs | Implemented; reproducibility requires authorized data and exact split |
| Model artifacts | Keras weights and JSON reports in services/ml/artifacts* | Present; provenance and metadata compatibility need validation |
| Tests | Server tests and ML API/preprocessing tests | Present; run against current branch |
| CI | No general client/server/ML CI workflow in audited main tree | Gap |
| Academic docs | Model/training reports, architecture and API docs | Present but historical status claims need cautious interpretation |

## Issues identified

1. No unified CI workflow on main. The tree contained a CHB-MIT training workflow but no separate workflow building the client, testing the server and running ML checks on pull requests.
2. Training workflow branch mismatch. Its push trigger referenced feat/chbmit-training-and-inference, not current main. Expensive training should be manually dispatched rather than run on every ordinary push.
3. README referenced scratch test files absent from the Git tree. Those commands were not reproducible from a clean clone.
4. Reproducibility documentation said no model artifacts were included, while main contained multiple artifact folders and model weights.
5. Historical reports referenced feature branches and older commit hashes. Their pass counts cannot automatically be attributed to the audited main SHA.
6. Source presence and unit tests do not prove that a real supported EDF passes through upload, preprocessing, inference, persistence, UI rendering and PDF export on a clean machine.
7. Model provenance needs review. Confirm model checksum, training metadata, channel order, preprocessing and exact test subjects before quoting metrics.

## Changes prepared on the readiness branch

- Added a unified GitHub Actions workflow for frontend build, backend tests and ML syntax/unit tests.
- Changed CHB-MIT training to a manual workflow dispatch available from the default branch; selected the multi-scale CNN and hard-negative-mining options.
- Rewrote README setup and test commands to refer to committed files and document Python service setup.
- Added a B.Tech major-project report/readiness checklist and viva preparation notes.
- Corrected reproducibility guidance to describe the artifact folders actually present.

## Acceptance gates before final college presentation

- Green CI on the exact pull-request commit.
- Clean-clone installation and successful frontend/backend/ML startup.
- Successful EDF upload and ML inference using an authorized sample compatible with the model.
- Confirmed role-isolation tests and PDF report smoke test.
- Reproduced metrics with saved subject split, threshold, model artifact and dataset preparation report.
- Screenshots/demo recording with synthetic or authorized de-identified data only.
- No clinical diagnosis or treatment claims.

## Safety boundary

NeuroTwin remains a research/educational prototype. These changes do not make it a certified medical device or establish clinical validity.

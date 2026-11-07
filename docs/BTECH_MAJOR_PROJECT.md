# NeuroTwin — B.Tech Major Project Readiness Pack

**Project title:** NeuroTwin: An EEG-Based Brain Digital Twin and Research-Oriented Seizure Event Analysis Platform  
**Audit baseline:** GitHub \`main\`, commit \`5852d9e022bb9e61204010e89805feca8718c239\`, reviewed 7 November 2026.

## Abstract

NeuroTwin is an academic software prototype combining scalp electroencephalogram (EEG) preprocessing, a deep-learning research model, longitudinal patient-context records and role-based web access. Supported EDF recordings are uploaded through an authenticated workflow, processed with MNE-Python, divided into fixed multichannel windows and passed to a TensorFlow model. Experimental scores, waveform summaries and timelines are returned through a FastAPI service, stored by an Express/MongoDB application and displayed in a React dashboard. The platform also demonstrates review workflows, audit events and PDF research summaries.

The research pipeline uses CHB-MIT Scalp EEG data and subject-disjoint partitions. Repository-reported held-out results include precision 55.84%, recall 76.79%, F1 64.66%, specificity 99.55% and ROC-AUC 91.55% for a documented experiment. These are experimental dataset-specific results, not clinical performance guarantees. NeuroTwin is not a medical device and must not be used to diagnose, rule out seizures, recommend treatment or make emergency decisions.

## Problem statement

EEG recordings are multichannel time-series data and require consistent preprocessing and careful review. A research workflow can benefit from repeatable signal preparation, traceable model outputs, longitudinal organization and access controls. NeuroTwin explores an integrated software architecture for these tasks while preserving human review and research-only boundaries.

## Objectives

1. Develop a web application for authenticated, role-scoped EEG research workflows.
2. Read EDF recordings and standardize channel selection, filtering and sampling rate.
3. Generate fixed-duration multichannel windows and estimate experimental seizure-window scores.
4. Display waveform summaries, channel information and score timelines.
5. Maintain longitudinal snapshots, review state and audit history.
6. Generate downloadable research PDF summaries.
7. Evaluate with subject-disjoint testing and class-imbalance-aware metrics.
8. Provide reproducible setup, tests and demonstration instructions.

## Scope and exclusions

**Included:** EDF upload, preprocessing, artifact-backed inference, role-based portals, patient/session/analysis records, waveform/timeline visualization, review state, audit events, PDF export and CHB-MIT model training.

**Excluded:** clinical diagnosis, treatment advice, seizure-risk prediction, medical-device certification, bedside monitoring and claims of generalization to every hospital or EEG device.

## Architecture

\`\`\`mermaid
flowchart LR
  A[React + Vite UI] -->|JWT / REST| B[Express API]
  B --> C[(MongoDB)]
  B -->|EDF upload| D[FastAPI ML service]
  D --> E[MNE preprocessing]
  E --> F[Multi-scale dilated CNN]
  F --> G[Temporal confirmation]
  G --> D
  D -->|scores / waveform / timeline| B
  B --> H[PDF research report]
\`\`\`

- **Frontend:** React 18, Vite and Lucide icons.
- **Application API:** Node.js, Express, JWT, bcrypt, Mongoose and PDFKit.
- **Database:** MongoDB.
- **ML service:** FastAPI, MNE-Python, NumPy, SciPy and TensorFlow/Keras.
- **Research data:** CHB-MIT Scalp EEG; obtain it under official dataset terms.

## Methodology

1. **Data acquisition:** obtain the de-identified CHB-MIT dataset and preserve subject identifiers.
2. **Annotation parsing:** parse seizure start/end timestamps from each subject summary.
3. **Preprocessing:** select the fixed bipolar montage, band-pass filter 0.5–40 Hz, resample to 128 Hz and normalize channels.
4. **Windowing:** create 10-second windows (1,280 samples at 128 Hz); label windows overlapping annotated seizure intervals.
5. **Partitioning:** split by subject, never randomly mix windows from the same subject across train/validation/test.
6. **Model:** train the Multi-Scale Dilated Temporal CNN; use validation for threshold selection and early stopping.
7. **Post-processing:** apply the configured consecutive-window confirmation rule and report raw and confirmed metrics separately.
8. **Integration:** upload EDF, run inference, store outputs and expose a human-review workflow.
9. **Evaluation:** report confusion matrix, precision, recall, F1, specificity, ROC-AUC and false alarms per hour where recording duration is available.

## Repository-reported experiment

| Metric | Reported result |
|---|---:|
| Precision | 55.84% |
| Recall / sensitivity | 76.79% |
| F1 score | 64.66% |
| Specificity | 99.55% |
| ROC-AUC | 91.55% |
| False alarm rate | 1.60 per hour |
| False positives | 34 |

Before using these as final viva results, reproduce them from the exact training code, saved model, dataset subset, held-out subject list, threshold and temporal post-processing configuration. Do not present accuracy alone because the data are class-imbalanced.

## Functional modules

- Public project and research information pages
- Login and JWT-based authentication
- Administrator, clinician, patient and caregiver views
- Patient records and assignment checks
- EDF upload and ML-service proxy
- EEG preprocessing and inference
- Analysis archive and waveform/timeline inspection
- Longitudinal Digital Twin snapshots
- Clinician review state and audit trail
- PDF research report export

## Verification checklist

- [ ] Install from a clean clone using documented Node/Python versions.
- [ ] Run backend tests and record exact pass/fail totals.
- [ ] Run ML tests and Python compile checks.
- [ ] Build the frontend in production mode.
- [ ] Start MongoDB, ML service, API and frontend.
- [ ] Verify backend \`/api/health\` and ML \`/health\`.
- [ ] Verify model metadata matches actual model input shape and channel order.
- [ ] Upload an authorized supported EDF and complete end-to-end inference.
- [ ] Verify patient/doctor/caregiver/admin access boundaries.
- [ ] Verify the PDF opens and includes the research disclaimer.
- [ ] Reproduce metrics from exact held-out subjects and saved artifacts.
- [ ] Capture screenshots and a short screen-recorded demonstration.
- [ ] Confirm no secrets, identifiable patient data or CHB-MIT EDF recordings are committed.

## Known limitations and risks

- A model file and metadata file require integrity and provenance checks; filenames alone do not prove which data and code produced them.
- EEG montage labels and reference conventions vary. Unsupported channel layouts must be rejected rather than silently substituted.
- Per-recording z-score normalization can differ from training normalization; training and inference must use identical preprocessing.
- Model scores are not clinical event labels. False positives and false negatives remain material.
- The application stores sensitive health-related records; deployment requires privacy, retention, access-control, backup and security review.
- The training workflow and older project reports need to be kept consistent with current \`main\`.
- A successful build or unit-test suite does not prove clinical validity or production readiness.

## Ethics, privacy and safety

Use only authorized, de-identified research data. Restrict access by role and do not include identifiable patient information in screenshots, reports or public demonstrations. Display the research-only notice wherever model output appears. A qualified clinician must independently assess real-world EEG recordings; NeuroTwin outputs must never be the sole basis for care.

## Suggested B.Tech demonstration sequence

1. Introduce the problem and project objectives.
2. Explain architecture and technology stack.
3. Sign in with a seeded demo role and explain access boundaries.
4. Open a synthetic/demo patient and session.
5. Upload a permitted sample EDF and show preprocessing/inference status.
6. Explain a waveform, timeline and the difference between raw score and confirmed windows.
7. Demonstrate review workflow, audit event and PDF export.
8. Present evaluation metrics with class-imbalance limitations.
9. Close with limitations, future scope and research-only boundary.

## Future scope

- External multi-centre validation and calibration
- Better artifact rejection and channel-quality checks
- Event-level sensitivity and false-alarm analysis
- Explainability tools designed for EEG review
- Secure consent, retention and data-governance workflows
- Deployment hardening, observability and backup
- Prospective usability evaluation with qualified researchers/clinicians

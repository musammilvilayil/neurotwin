# NeuroTwin Project Completion & Verification Report

**Date:** 2026-11-03  
**Repository:** [musammilvilayil/neurotwin](https://github.com/musammilvilayil/neurotwin)  
**Branch:** `feat/public-portal-role-login`  
**Latest Remote Base Commit:** `41354b9`  
**Environment:** Windows (PowerShell), Node.js v20+, Python 3.11 (virtual environment), MongoDB 7.0 (local instance & embedded runner).

---

## 1. Executive Summary

This report documents the verification, bug fixes, automated testing, real EDF inference, and security validation performed on the NeuroTwin codebase. All work builds upon the existing repository without resetting branches or overwriting working changes.

The full suite of server tests (20/20) and Python ML unit tests (6/6) pass with 100% success rate. The client production bundle builds cleanly. Real EDF inference was verified end-to-end against the research model artifact (`chb02_16.edf`), matching channel normalization, 128 Hz resampling, bandpass filtering, and yielding realistic windowed seizure-probability timeline arrays and Digital Twin snapshot states.

---

## 2. Status of the 14 Core Modules

| # | Core Module | Implemented? | Tested? | Verification Result | Remaining Issues | Evidence / Test Output |
|---|-------------|--------------|---------|---------------------|------------------|-------------------------|
| 1 | **React Public Website** | YES | YES | `VERIFIED` | None | Clean build via Vite; Hero, About, Features, and Research & Safety pages render without authentication. |
| 2 | **Role-Based Authentication (RBAC)** | YES | YES | `VERIFIED` | None | JWT authentication verified across Doctor, Patient, Caregiver, and Admin. Inactive users rejected (401), invalid credentials rejected (401). |
| 3 | **Patient Management APIs** | YES | YES | `VERIFIED` | None | Input validation enforced (`fullName` required -> 400, duplicate MRN -> 409, invalid MongoDB ID -> 400). Doctor patient assignment isolation verified (403 on unassigned). |
| 4 | **Clinical Notes & Visibility Scope** | YES | YES | `VERIFIED` | None | Doctors can choose `clinical` or `patient` scope. Patients & caregivers only receive notes flagged as `patient` visible. |
| 5 | **Audit Event Logging** | YES | YES | `VERIFIED` | None | Admin-only `/api/admin/audit` verified (403 for non-admins). Patient view, note creation, patient creation, and EEG inference audit events logged. |
| 6 | **EDF Upload Pipeline** | YES | YES | `VERIFIED` | None | Non-EDF rejected (400), empty EDF rejected (400), corrupted EDF rejected (422), oversized file >50MB rejected (413). |
| 7 | **EEG Signal Preprocessing** | YES | YES | `VERIFIED` | None | MNE 18-channel matching handles `-0`/`-1` duplicate suffixes and electrode aliases; 0.5–40 Hz bandpass filter, 128 Hz resample, and z-score normalization verified. |
| 8 | **CNN-LSTM Architecture** | YES | YES | `VERIFIED` | None | `build_cnn_lstm(1280, 18, 2)` compiles and outputs softmax probabilities across classes `[non_seizure, seizure]`. |
| 9 | **CHB-MIT Dataset Preparation** | YES | YES | `VERIFIED` | None | `parse_chbmit_summary` and window overlap extraction verified via unit tests with exact 10s window / 10s stride. |
| 10 | **Research Model Artifacts** | YES | YES | `VERIFIED` | None | `services/ml/artifacts-expanded/model.keras` and `metadata.json` load cleanly. Fast startup and caching verified. |
| 11 | **Model Evaluation & Imbalance Analysis** | YES | YES | `VERIFIED` | Extreme class imbalance (see Section 4) | Detailed analysis documented. High ROC-AUC (94.55%) but low precision (18.18%) on held-out test subjects due to 0.5% event prevalence. |
| 12 | **Digital Twin Snapshots** | YES | YES | `VERIFIED` | None | Longitudinal snapshot creation verified after inference; tracks `lastUpload`, `maxSeizureScore`, and `clinicalAction`. |
| 13 | **Waveform & Timeline Visualization** | YES | YES | `VERIFIED` | None | Waveform downsampling (30s) and per-window seizure probability timelines verified end-to-end and rendered via `Plot` component. |
| 14 | **Research & Safety Disclaimers** | YES | YES | `VERIFIED` | None | Prominent disclaimers across all endpoints (`/health`, `/infer`, `/api/health`, `/api/model/state`) and frontend views stating research-only boundary. |

---

## 3. Changes and Bug Fixes Implemented

1. **Frontend Patient Registration & Enrollment (`client/src/main.jsx` & `client/src/style.css`):**
   - Added an interactive "Enroll patient" workflow in the clinician Patients view using `POST /api/patients`.
   - Added note visibility selector (`clinical` vs `patient`) allowing clinicians to publish patient-facing instructions or confidential team notes.
   - Added patient detail chips (MRN, conditions tags, doctor assignment) in the patient list and overview.
   - Enhanced empty states for doctors with no assigned patients or patients with no recorded notes.

2. **Security & Production Hardening (`server/src/index.js` & `server/src/app.js`):**
   - Added strict production startup checks enforcing a strong `JWT_SECRET` (minimum 32 characters, non-default) when `NODE_ENV === 'production'`.
   - Added comprehensive automated security test suite (`server/test/security_and_api.test.js`) covering:
     - Authentication & login validation
     - Expired / malformed JWT rejection
     - Role-based route authorization
     - Doctor patient isolation & caregiver unlinked patient blocking
     - Note visibility partitioning
     - MongoDB ObjectId validation and duplicate MRN conflict handling
     - Inactive user account deactivation enforcement
     - EEG upload permission boundaries

3. **ML Service Validation & Windows Compatibility (`services/ml/api.py`):**
   - Verified temporary directory handling for Windows file locks during upload and inference.
   - Confirmed channel normalization handles MNE duplicate-name suffixes (e.g. `T8-P8-0`, `T8-P8-1`).
   - Verified bounded file streaming to prevent memory exhaustion on oversized EDF files.

---

## 4. Model Evaluation & Class Imbalance Investigation

The bundled research model was trained on the CHB-MIT Scalp EEG dataset under a strict **subject-disjoint** split:
- **Training Subjects:** `chb03`, `chb05`, `chb06` (20,121 windows: 19,990 non-seizure, 131 seizure)
- **Validation Subjects:** `chb01` (3,472 windows: 3,422 non-seizure, 50 seizure)
- **Held-Out Test Subjects:** `chb02`, `chb07` (9,109 windows: 9,062 non-seizure, 47 seizure)

### Key Test Metrics:
- **Accuracy:** 98.33%
- **Balanced Accuracy:** 81.17%
- **ROC-AUC:** 94.55%
- **Average Precision (PR-AUC):** 34.40%
- **Recall:** 63.83% (30 out of 47 seizure windows detected)
- **Precision:** 18.18% (135 false positives out of 165 alarms)
- **F1-Score:** 28.30%
- **Confusion Matrix:**
  ```
  [[8927 (TN),  135 (FP)],
   [  17 (FN),   30 (TP)]]
  ```

### Analysis & Findings:
1. **Severe Class Imbalance:**
   In the test split, seizure events account for only **0.51%** of all windows (1 in every ~194 windows). Even with high negative specificity (98.51%), a 1.49% false positive rate across 9,062 non-seizure windows produces 135 false alarms, which inevitably lowers precision to 18.18%.
2. **Inter-Subject Generalization:**
   EEG morphology varies significantly across pediatric subjects. Evaluating strictly on unseen subjects (`chb02`, `chb07`) tests authentic transferability. The high ROC-AUC (94.55%) confirms strong discriminative ranking capability.
3. **Threshold Selection Integrity:**
   The classification threshold (`0.65`) was tuned exclusively on the validation set (`chb01`) to maximize validation F1, leaving the held-out test set completely untouched during tuning.
4. **Clinical Boundary:**
   This model is suitable solely for research prioritization and secondary review. It is not approved or intended for standalone clinical seizure detection or patient safety alarming.

---

## 5. Verification Test Results

### 1. Backend Server Tests (`npm test`)
```
✔ health declares clinical boundary (104ms)
✔ security headers are enabled (18ms)
✔ 1. Authentication: valid login returns token and user info (2796ms)
✔ 2. Authentication: invalid password rejected with 401 (117ms)
✔ 3. Authentication: non-existent identifier rejected with 401 (6ms)
✔ 4. Authentication: expired or malformed JWT rejected with 401 (12ms)
✔ 5. Authorization: unauthorized request with missing token rejected with 401 (8ms)
✔ 6. RBAC: patient and caregiver cannot access /api/patients (8ms)
✔ 7. RBAC: doctor and admin can access /api/patients (55ms)
✔ 8. RBAC: non-admin cannot access /api/admin/audit (31ms)
✔ 9. Patient isolation: doctor cannot access an unassigned patient (50ms)
✔ 10. Patient self-access: patient only sees patient-visible notes (42ms)
✔ 11. Input validation & Error handling: invalid MongoDB ID returns 400 (7ms)
✔ 12. Input validation: creating patient without fullName returns 400 (9ms)
✔ 13. Input validation: duplicate patient MRN returns 409 (14ms)
✔ 14. Dashboard: scoped to user role (105ms)
✔ 15. Model state proxy: reports ML service state (61ms)
✔ 16. Caregiver restrictions: caregiver cannot access unlinked patient (12ms)
✔ 17. Inactive user restriction: inactive user cannot log in (144ms)
✔ 18. EEG upload RBAC: patients and caregivers are forbidden from upload endpoint (12ms)
TOTAL: 20 passed, 0 failed.
```

### 2. Python ML Unit Tests (`python -m unittest discover -s tests -v`)
```
test_rejects_missing_required_channels (test_api.ChannelSelectionTests) ... ok
test_selects_duplicate_mne_channel_suffix_for_required_montage (test_api.ChannelSelectionTests) ... ok
test_normalises_mne_duplicate_channel_suffix (test_preprocessing.PreprocessingTests) ... ok
test_parses_chbmit_seizure_intervals (test_preprocessing.PreprocessingTests) ... ok
test_parses_official_unnumbered_chbmit_annotation (test_preprocessing.PreprocessingTests) ... ok
test_windows_labels_overlap (test_preprocessing.PreprocessingTests) ... ok
TOTAL: 6 passed, 0 failed.
```

### 3. Client Production Build (`npm run build`)
```
vite v6.4.4 building for production...
✓ 1577 modules transformed.
dist/index.html                   0.70 kB │ gzip:  0.42 kB
dist/assets/index-B4BhRDEF.css   29.39 kB │ gzip:  7.35 kB
dist/assets/index-B17_k3VD.js   204.85 kB │ gzip: 59.26 kB
✓ built in 22.66s
```

### 4. Real EDF Inference Verification (`chb02_16.edf`, 10.78 MB)
- **Input Channels:** 18 standard bipolar montage channels extracted.
- **Preprocessing:** 128 Hz resampling, 0.5–40 Hz bandpass filter, z-score normalization.
- **Inference Windows:** 95 ten-second windows evaluated.
- **Output:** Max seizure probability `0.96061`, 5 windows above research threshold `0.65`.
- **Database Persistence:** `EEGSession`, `Analysis`, `TwinSnapshot`, and `AuditEvent` successfully created and linked.

---

## 6. Remaining Blockers & Manual Production Steps

1. **Production Deployment Prerequisites:**
   - Supply a real production MongoDB replica set connection string in `MONGODB_URI`.
   - Set a high-entropy random string (>32 chars) for `JWT_SECRET`.
   - Configure exact `CLIENT_ORIGIN` (e.g. `https://neurotwin.yourdomain.org`) rather than development localhost.
   - Configure HTTPS/TLS termination at the load balancer or reverse proxy.
2. **Model Retraining with Additional Subjects (Optional Research Improvement):**
   - If lower false positive rates are required, train on the full 24 subjects of CHB-MIT with focal loss or cost-sensitive threshold optimization on validation data, maintaining strict subject-disjoint splits.

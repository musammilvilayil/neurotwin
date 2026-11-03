# NeuroTwin Project Audit & Architectural Specification

**Date:** 2026-11-03  
**Auditor:** Senior Full-Stack, ML, and EEG Systems Engineer  
**Repository:** [musammilvilayil/neurotwin](https://github.com/musammilvilayil/neurotwin)  
**Branch:** `feat/public-portal-role-login`  
**Dataset Directory:** `D:\chbmit-1.0.0` (42.61 GB, 686 EDF files, 24 subjects)

---

## 1. Executive Summary

This audit evaluates the entire NeuroTwin codebase across frontend, backend, ML/EEG signal processing, database, testing, and documentation. NeuroTwin is an EEG-based seizure detection and longitudinal monitoring research prototype designed to support retrospective clinical review of scalp EEG recordings.

### Overall Status:
- **Baseline Foundation:** Solid architectural foundations with role-based authentication (Admin, Doctor, Patient, Caregiver), MNE EEG preprocessing, and FastAPI ML service.
- **Key Bottlenecks Identified:**
  1. **Dataset Ingestion Memory Limits:** `prepare_chbmit.py` accumulated all window arrays in Python lists before running `np.concatenate`, which would crash with Out-Of-Memory (OOM) when ingesting the full 42.6 GB dataset.
  2. **Streaming / Sharded Dataset Storage:** A disk-backed, memory-mapped array or sharded parquet/npy format is required for reproducible training on the full 24 subjects without RAM exhaustion.
  3. **Frontend Analysis & Visualization Gaps:** The frontend only displayed a single averaged waveform channel rather than multi-channel EEG views or interactive interval zoom, and lacked downloadable PDF clinical reports.
  4. **Backend Patient & Analysis Endpoints:** Analysis history lacked filtering/search across patients, and upload progress tracking needed clearer state representations.

---

## 2. Component-by-Component Audit Findings

### 2.1 CHB-MIT Dataset (`D:\chbmit-1.0.0`)
- **Total Subjects:** 24 subjects (`chb01` through `chb24`).
- **Total EDF Files:** 686 continuous EEG recordings (~1 hour each, total size 42.61 GB).
- **Seizure Records:** 142 files contain documented electrographic seizure events.
- **Summary Annotations:** All 24 subjects possess corresponding `*-summary.txt` annotation files detailing seizure start/end timestamps.
- **Sampling Frequency:** Standardized at 256 Hz across all recordings.
- **Montage Compatibility:**
  - 18-channel standard international 10–20 bipolar montage (`FP1-F7`, `F7-T7`, `T7-P7`, `P7-O1`, `FP2-F8`, `F8-T8`, `T8-P8`, `P8-O2`, `FP1-F3`, `F3-C3`, `C3-P3`, `P3-O1`, `FP2-F4`, `F4-C4`, `C4-P4`, `P4-O2`, `FZ-CZ`, `CZ-PZ`).
  - **683 of 686 files (99.56%)** across all 24 subjects match this exact montage.
  - Minor artifact: MNE renames duplicate channels (e.g. `T8-P8-0`, `T8-P8-1`) and inserts dummy markers (`--0`), which our normalizer cleanly handles.

### 2.2 Machine Learning & EEG Processing (`services/ml`)
- **Preprocessing Pipeline:**
  - `load_edf`: Uses MNE raw reader.
  - `preprocess`: Bandpass filter (0.5–40 Hz), resampling (128 Hz), channel-wise z-score standardization.
  - `windows`: 10-second non-overlapping windows (1,280 samples x 18 channels) with binary ground-truth labeling.
- **Model Architecture:**
  - Multi-Scale Dilated Temporal CNN with 1D convolutions across receptive field dilation rates (1, 2, 4) + Hard Negative Mining (HNM).
  - Consecutive temporal confirmation filter ($\ge 2$ consecutive windows) eliminates 87.4% of false alarms (0.67 FP/hour).
- **Training Pipeline Enhancement Needed:**
  - Must support streaming/chunked ingestion from `D:\chbmit-1.0.0`.
  - Checkpointing with resume support.
  - Subject-disjoint splits: Train (`chb03-06`, `chb08-11`, `chb13-24`), Validation (`chb01`), Held-out Test (`chb02`, `chb07`).

### 2.3 Backend API (`server/`)
- **Framework:** Express.js, MongoDB (Mongoose), Multer, Helmet, Rate-Limiting.
- **Authentication & RBAC:** JWT with bcrypt. Strict role enforcement (Admin, Doctor, Patient, Caregiver).
- **Existing Routes:**
  - `POST /api/auth/login`, `GET /api/auth/me`
  - `GET /api/dashboard` (role-scoped statistics and recent analyses)
  - `GET /api/patients`, `POST /api/patients`, `GET /api/patients/:id/overview`
  - `POST /api/patients/:id/notes`
  - `POST /api/eeg/upload` (streams EDF to FastAPI ML service, records analysis, snapshot, audit event)
  - `GET /api/admin/audit`
- **Gaps & Needed Additions:**
  - `GET /api/analyses`: Search, pagination, and patient filtering.
  - `GET /api/analyses/:id/report`: PDF generation or structured report endpoint.
  - Multi-channel waveform snippet support for frontend EEG review.

### 2.4 Frontend Web Application (`client/`)
- **Framework:** React 18, Vite 6, Lucide Icons, Pure CSS design system.
- **Existing Pages/Views:**
  - Public landing portal with clear medical/research disclaimers.
  - Role-scoped dashboards (Doctor, Patient, Caregiver, Admin).
  - EDF EEG upload component.
  - Signal review and score timeline SVG plots.
  - Digital Twin snapshot and clinical notes.
- **Gaps & Needed Additions:**
  - **Multi-channel EEG Signal Display:** Display stacked 10-20 EEG lead traces rather than only single mean waveform.
  - **Downloadable PDF Clinical Reports:** Generate clean, formatted clinical-research reports with patient details, detection timeline, seizure intervals, and research boundaries.
  - **Search & Filter in Analysis History:** Allow doctors to filter analyses by patient, date, or seizure detection status.
  - **Upload Progress & Granular Status:** Real-time feedback during large EDF upload and model inference.

---

## 3. Prioritized Implementation Plan

1. **Phase 2: Scalable, Memory-Efficient Dataset Preprocessing:**
   - Implement incremental generator / disk-backed memory-mapped array processing in `prepare_chbmit.py`.
   - Process compatible recordings across all 24 subjects from `D:\chbmit-1.0.0`.
   - Save sharded/mmap dataset with zero RAM blowout.
2. **Phase 3: Complete AI Model Training & Checkpointing:**
   - Train the Multi-Scale Dilated CNN architecture on the expanded training subjects with checkpointing and resume support.
   - Run window-level and event-level evaluation on held-out test data.
   - Record complete training logs, history, and metrics.
3. **Phase 4: Backend Feature Completion & Robustness:**
   - Add analysis search/filter endpoint (`GET /api/analyses`).
   - Add clinical PDF report endpoint or export payload.
   - Add multichannel EEG sample support.
4. **Phase 5: Frontend Enhancements:**
   - Implement multichannel EEG display.
   - Implement PDF report download with print/export formatting.
   - Add analysis history filtering and enhanced seizure interval visualization.
5. **Phase 6: End-to-End Integration:**
   - Connect all frontend actions to live backend endpoints.
   - Verify upload -> inference -> timeline -> multichannel -> PDF workflow.
6. **Phase 7: Comprehensive Testing:**
   - Run all backend, ML, and frontend tests.
   - Execute real EDF end-to-end integration test with `chb02_16.edf`.
7. **Phase 8: Documentation & Git Commit/Push:**
   - Update README, API docs, training report, and model report.
   - Commit and push clean working changes.

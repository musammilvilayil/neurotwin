# NeuroTwin — API & System Architecture Documentation

> **Safety Notice:** NeuroTwin is an academic clinical decision-support prototype, not a certified medical device. Output scores are experimental research metrics and do not constitute clinical diagnoses, ruling out of seizures, or treatment recommendations. All recordings require review by qualified clinicians.

---

## 1. System Architecture Overview

NeuroTwin consists of three cooperating components:
1. **Frontend Client (`client/`):** React 18 SPA bundled with Vite, Lucide icons, responsive layout, real-time waveform visualization, and multi-channel international 10–20 bipolar montage display.
2. **Backend Gateway API (`server/`):** Node.js 20+ and Express service with Mongoose ODM connected to MongoDB. Handles role-based authentication, patient privacy boundaries, audit logging, file streaming, PDF generation via PDFKit, and ML orchestration.
3. **ML Microservice (`services/ml/`):** Python 3.11+ FastAPI service with MNE-Python for signal preprocessing, bandpass filtering, and reslicing, and TensorFlow 2.16+ running a Multi-Scale Dilated Temporal Convolutional Network with temporal post-processing filters.

---

## 2. Authentication & Role-Based Access Control (RBAC)

All private endpoints require a Bearer token in the `Authorization` header:
```http
Authorization: Bearer <jwt_token>
```

### Roles and Permissions Matrix

| Endpoint Group | Description | Admin | Doctor | Patient | Caregiver |
|---|---|:---:|:---:|:---:|:---:|
| `POST /api/auth/login` | Authentication | ✔ | ✔ | ✔ | ✔ |
| `GET /api/dashboard` | Role-tailored summary dashboard | ✔ | ✔ | ✔ | ✔ |
| `GET /api/patients` | List authorized patient records | ✔ | ✔ (Assigned) | ✖ | ✖ |
| `POST /api/patients` | Enroll new patient record | ✔ | ✔ | ✖ | ✖ |
| `GET /api/patients/:id/overview` | Patient longitudinal twin view | ✔ | ✔ (Assigned) | ✔ (Self) | ✔ (Linked) |
| `POST /api/patients/:id/notes` | Add clinical context note | ✔ | ✔ | ✖ | ✖ |
| `POST /api/eeg/upload` | Upload EDF recording for inference | ✔ | ✔ (Assigned) | ✖ | ✖ |
| `GET /api/analyses` | Query EEG analyses archive | ✔ | ✔ (Assigned) | ✔ (Self) | ✔ (Linked) |
| `GET /api/analyses/:id` | Full analysis details & waveforms | ✔ | ✔ (Assigned) | ✔ (Self) | ✔ (Linked) |
| `PATCH /api/analyses/:id/review` | Toggle review status (`pending`/`reviewed`) | ✔ | ✔ (Assigned) | ✖ | ✖ |
| `GET /api/analyses/:id/report` | Stream clinical research PDF report | ✔ | ✔ (Assigned) | ✔ (Self) | ✔ (Linked) |
| `GET /api/admin/audit` | View governance audit trail | ✔ | ✖ | ✖ | ✖ |

---

## 3. Backend Gateway REST API Specification

### 3.1 Authentication
#### `POST /api/auth/login`
Authenticates a user via username or email and returns a signed JWT token.
- **Request Body:**
  ```json
  {
    "identifier": "doctor",
    "password": "DemoPass123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "6724...",
      "name": "Dr. Sarah Lin",
      "username": "doctor",
      "email": "doctor@neurotwin.demo",
      "role": "doctor"
    }
  }
  ```
- **Error Codes:** `401 Unauthorized` for invalid credentials or inactive accounts.

---

### 3.2 Patient Management
#### `GET /api/patients`
Retrieves patient records authorized for the current user's role and assignments.
- **Response (200 OK):**
  ```json
  [
    {
      "_id": "6724...",
      "fullName": "Robin Taylor",
      "mrn": "NT-1001",
      "dob": "1994-05-12T00:00:00.000Z",
      "conditions": ["Focal Epilepsy", "Nocturnal Monitoring"],
      "assignedDoctor": { "_id": "...", "name": "Dr. Sarah Lin" }
    }
  ]
  ```

#### `POST /api/patients`
Enrolls a new patient record.
- **Request Body:**
  ```json
  {
    "fullName": "Jordan Hayes",
    "mrn": "NT-1002",
    "dob": "1998-11-20",
    "conditions": ["Generalized Absence"],
    "consented": true
  }
  ```
- **Response (201 Created):** Newly created patient document.
- **Error Codes:** `400 Bad Request` if `fullName` is missing; `409 Conflict` if `mrn` is duplicate.

---

### 3.3 Clinical Notes
#### `POST /api/patients/:id/notes`
Adds a longitudinal clinical note.
- **Request Body:**
  ```json
  {
    "body": "Patient reports aura symptoms prior to sleep onset. Scheduled continuous nocturnal EEG monitoring.",
    "visibility": "clinical"
  }
  ```
  *Note:* `visibility` accepts `"clinical"` (accessible only by care team) or `"patient"` (shared with patient and caregivers).

---

### 3.4 EEG Upload & Model Orchestration
#### `POST /api/eeg/upload`
Accepts a raw `.edf` scalp EEG recording, streams it to the ML service for inference, extracts multi-channel signals and timelines, and updates the patient's Digital Twin snapshot.
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `file`: EDF file binary (standard European Data Format)
  - `patientId`: Target MongoDB ObjectId of the patient
- **Processing Steps:**
  1. Validates patient existence and doctor assignment.
  2. Creates `EEGSession` record in status `queued`.
  3. Sends multipart stream to Python ML service `POST /infer`.
  4. Stores resulting `Analysis` with `multichannel_waveform`, `timeline`, `probabilities`, and `clinicianReview: "pending"`.
  5. Updates `TwinSnapshot` longitudinal trend (`stable`, `monitor`, or `improving`).
  6. Logs `AuditEvent` action `eeg_analyzed`.
- **Response (201 Created):** Full populated Analysis object.

---

### 3.5 EEG Analyses & Reports
#### `GET /api/analyses`
Searches and lists EEG analysis records with pagination and patient filtering.
- **Query Parameters:**
  - `patientId` (optional): Filter to specific patient
  - `limit` (optional, default 50)
  - `skip` (optional, default 0)
- **Response (200 OK):**
  ```json
  {
    "analyses": [
      {
        "_id": "6724...",
        "patient": { "fullName": "Robin Taylor", "mrn": "NT-1001" },
        "session": { "sourceName": "chb02_16.edf" },
        "label": "Epileptiform / Seizure Activity Detected",
        "confidence": 0.99906,
        "modelState": "trained_research_model",
        "clinicianReview": "pending",
        "probabilities": { "threshold": 0.65, "maxSeizureScore": 0.99906 },
        "createdAt": "2026-11-03T13:30:00.000Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "skip": 0
  }
  ```

#### `GET /api/analyses/:id`
Retrieves the complete analysis document including all 18-channel waveform traces and per-window timeline scores.

#### `PATCH /api/analyses/:id/review`
Toggles clinician review status between `"pending"` and `"reviewed"`.
- **Request Body:**
  ```json
  { "status": "reviewed" }
  ```
- **Response (200 OK):** Updated analysis document.
- **Audit Event:** Emits `analysis.reviewed` with actor ID and status change.

#### `GET /api/analyses/:id/report`
Generates and downloads a clinical research PDF report via PDFKit.
- **Response:** Streaming binary with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=NeuroTwin_Report_...pdf`.
- **Content:** Header banner with clinical disclaimer, patient demographics, recording metadata, classification metrics, confirmed seizure interval table, and legal disclaimers.

---

## 4. Python ML Service REST API Specification

Running on port `8000` (FastAPI).

### 4.1 Service Health
#### `GET /health`
Returns the operational readiness and installed artifact metadata.
- **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "service": "neurotwin-ml",
    "model_state": "ready",
    "model_metadata": {
      "model_version": "chbmit-multiscale-hnm-v2",
      "architecture": "Multi-Scale Dilated Temporal CNN + Hard Negative Mining + Consecutive Temporal Confirmation",
      "sampling_rate": 128,
      "channels": ["FP1-F7", "F7-T7", "T7-P7", "P7-O1", "FP2-F8", ...],
      "threshold": 0.65,
      "min_consecutive_windows": 2
    },
    "clinical_boundary": "Research only. Not for diagnosis, treatment, or ruling out seizures."
  }
  ```

### 4.2 EEG Inspection
#### `POST /inspect-eeg`
Validates channel montage and sampling properties of an uploaded EDF without invoking TensorFlow inference.
- **Content-Type:** `multipart/form-data`
- **Response (200 OK):** Channel names, duration, and sampling rate.

### 4.3 EEG Inference
#### `POST /infer`
Runs end-to-end preprocessing, windowing, deep learning prediction, and temporal consecutive confirmation filtering.
- **Content-Type:** `multipart/form-data`
- **Output Schema:**
  - `model_state`: `"trained_research_model"`
  - `sampling_rate`: `128.0`
  - `channels`: Array of 18 channel labels
  - `waveform`: Downsampled mean waveform across channels
  - `multichannel_waveform`: Array of 18 arrays representing downsampled signals for each channel
  - `timeline`: Array of 10-second stride window objects:
    ```json
    {
      "start_seconds": 170.0,
      "score": 0.99906,
      "confirmed_seizure": true
    }
    ```
  - `summary`:
    ```json
    {
      "max_score": 0.99906,
      "windows_at_or_above_research_threshold": 5,
      "confirmed_seizure_windows": 4,
      "temporal_confirmation": {
        "enabled": true,
        "min_consecutive_windows": 2,
        "window_duration_seconds": 10.0
      },
      "threshold": 0.65,
      "window_count": 95
    }
    ```
  - `notice`: Research warning notice.

---

## 5. Security & Data Protection Measures

1. **Patient Data Isolation:** Doctors only access patients explicitly assigned via `assignedDoctor`. Patients and caregivers only access their own linked profile.
2. **Timing Attack Resistant Password Verification:** Uses `bcryptjs` for constant-time hash comparisons.
3. **HTTP Header Hardening:** `helmet` applies Content Security Policy (CSP), Strict Transport Security (HSTS), X-Frame-Options (`DENY`), and X-Content-Type-Options (`nosniff`).
4. **CORS Whitelisting:** Restricted to authorized frontends via `CLIENT_ORIGIN`.
5. **Auditing:** Every patient access, note creation, EEG upload, and clinician review event creates an immutable `AuditEvent` with actor ID, timestamp, and metadata.

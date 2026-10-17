# NeuroTwin Architecture

Authorized EDF upload -> authenticated Express proxy -> MNE preprocessing -> artifact-backed CNN-LSTM -> seizure-score timeline/waveform -> patient Digital Twin snapshot -> role-based dashboards.

## Roles
Patient, Doctor, Caregiver, Admin.

## Core entities
User, PatientProfile, EEGSession, Analysis, TwinSnapshot, ClinicalNote, Appointment, Prescription, Consent, AuditEvent.

## Safety boundary
NeuroTwin is an academic clinical decision-support system. Outputs require clinician review and are not independent diagnoses.

## Model boundary

The API never manufactures an analysis. The ML service returns `503 model_not_ready` until a paired Keras artifact and metadata file are mounted. Training uses subject-disjoint partitions and persists evaluation metadata, but those results require independent review before any research deployment.

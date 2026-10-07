# NeuroTwin Architecture

Public/de-identified EEG -> preprocessing -> CNN-LSTM -> confidence/explanation -> patient Digital Twin -> role-based dashboards.

## Roles
Patient, Doctor, Caregiver, Admin.

## Core entities
User, PatientProfile, EEGSession, Analysis, TwinSnapshot, ClinicalNote, Appointment, Prescription, Consent, AuditEvent.

## Safety boundary
NeuroTwin is an academic clinical decision-support system. Outputs require clinician review and are not independent diagnoses.

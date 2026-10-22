# NeuroTwin multi-model development

This branch adds a model registry and truthful readiness reporting. It does **not** ship trained disease models or claim to diagnose conditions.

## Current inference
Only the existing seizure CNN-LSTM adapter is implemented. It requires model.keras and metadata.json in services/ml/artifacts, with the original CHB-MIT training and validation workflow. Registry readiness means artifacts are present, not that clinical validity has been demonstrated.

## Candidate next integrations
1. Sleep staging: evaluate a pretrained sleep staging implementation against Sleep-EDF, verify EEG/EOG channel requirements, sampling rate, license, calibration, and independent subject-level metrics. Add a real adapter before enabling.
2. Alzheimer's: evaluate published EEG classification checkpoints against their intended dataset and acquisition protocol.
3. Parkinson's, depression, schizophrenia: research-only candidate classifiers; a generic pretrained EEG encoder is not a disease detector without task-specific heads and validation.

Never execute all classifiers blindly on an arbitrary EDF. Reject incompatible channels, montage, sample rate, duration, or population. Keep results distinct per task; never interpret independent scores as mutually exclusive disease probabilities.

## Test
From services/ml: python -m unittest discover -s tests
Check GET /models on the ML service. Existing /infer behavior is unchanged.

## Required before any clinical use
Independent validation, approved datasets and consent, calibration, bias assessment, secure data handling, clinician review, regulatory/institutional approvals.

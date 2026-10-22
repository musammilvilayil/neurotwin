# Verified externally published seizure checkpoint candidate

Source: https://github.com/CRCHUM-Epilepsy-Group/sz_detection_challenge2025

The authors publish a pretrained seizure detection model as a Docker image:
`ghcr.io/crchum-epilepsy-group/sz_detect_crchum:the-og`.

Their documented usage accepts BIDS-compliant EDF names and emits HED-score TSV output, requiring approximately 50 GB RAM and 10 CPU cores. The model has **not** been downloaded, run, validated or wired into NeuroTwin in this branch. It cannot be substituted for the existing TensorFlow CNN-LSTM model.keras checkpoint. Any integration must be a separate worker with explicit resource limits, controlled input validation, TSV parsing, model provenance, and research-only outputs. Do not auto-pull and execute an unreviewed container in a clinical environment.

A pretrained EEG foundation encoder such as https://huggingface.co/dayu-lab/DB-EpiFM is **not** itself a trained seizure classifier: fine-tuning and evaluation are required.

Current completed inference adapter: YASA pretrained sleep staging. The Docker worker is implemented but end-to-end execution is still pending.

# Pretrained model integration status

## Sleep staging (YASA)
Source: https://github.com/raphaelvallat/yasa
Documentation: https://yasa-sleep.org/generated/yasa.SleepStaging.html

The optional `POST /infer-sleep` endpoint uses YASA's pretrained LightGBM sleep staging model, not random or mock predictions. It accepts EDF, plus a **required** EEG channel name and optional EOG/EMG channel names. Use appropriate sleep PSG channels (prefer central referenced EEG). Sampling rate must exceed 80 Hz, duration at least 5 minutes. The result is a sequence of 30-second sleep stages. This is sleep staging, **not** diagnosis of sleep disorders.

Install in a compatible Python environment with `pip install -r requirements-sleep.txt`. YASA 0.8.0 has newer dependency requirements than the existing TensorFlow environment. Resolve these in a separate worker/environment before deploying; the current Docker image does not install YASA. Pretrained weights are supplied/resolved by the upstream package; no model file is committed to this repository. The integration has not been executed end-to-end here.

Example:
```bash
curl -X POST http://localhost:8001/infer-sleep -F "file=@sleep_recording.edf" -F "eeg_channel=C4-M1"
```

## Seizure
The existing CNN-LSTM adapter requires trained `artifacts/model.keras` and `artifacts/metadata.json`. No pretrained seizure checkpoint has been verified compatible with this architecture and preprocessing. Do not label the model as ready until valid weights are installed and independently tested.

## Other conditions
EEG foundation checkpoints (BIOT/EEGPT) are not disease-specific classifiers. Alzheimer's, Parkinson's, depression, and schizophrenia inference remains unavailable pending task-specific checkpoints, compatible data, and external validation.

## Safety
No inference should be represented as a diagnosis. EDFs can contain identifiable patient information; use only approved/de-identified recordings.

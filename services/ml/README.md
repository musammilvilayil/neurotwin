# NeuroTwin ML Service

This service provides research-only EEG preprocessing and training scaffolding using MNE and TensorFlow. It intentionally avoids clinical claims and requires an explicit trained model artifact before any inference is treated as a research result.

## Environment
```bash
python -m venv .venv
. .venv/bin/activate  # or .venv\Scripts\activate on Windows
python -m pip install -r requirements.txt
```

## Run the API
```bash
uvicorn api:app --reload --port 8001
```

## Supported workflows

- `load_edf` / `load_raw`: EDF/BDF/FIF ingestion
- `validate_channels`: EEG channel validation
- `bandpass_and_notch`: band-pass + notch filtering
- `resample_if_justified`: opt-in resampling only when justified
- `make_windows`: EEG window creation without leakage across subjects
- `normalize_per_channel`: per-channel normalization
- `map_run_number_to_label`: T0/T1/T2/run mapping for motor tasks
- `split_subjectwise_windows`: subject-wise train/validation/test assignment

## Safety contract

- All outputs are `research_only` and `not diagnostic`.
- If no weights are available, the API and UI must show `untrained/demo`.
- Public datasets must be copied into local research storage only; they are not committed to the repo.

## Preparation / training examples
```bash
python -m pytest tests/test_dataset_pipeline.py
python train.py --features data/features/X.npy --labels data/features/y.npy --subject-ids data/features/subject_ids.npy --dataset-name auditory --task-name subject_identity --output-dir model_artifacts/auditory
```

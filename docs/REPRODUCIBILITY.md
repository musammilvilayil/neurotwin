# Reproducible CHB-MIT research workflow

Do not commit CHB-MIT EDF recordings, identifiable health data, credentials or unreviewed experiment results. Obtain and use the de-identified CHB-MIT dataset under its official terms. Keep original subject identifiers so train, validation and test partitions are separated by person.

## 1. Environment and data

Use Python 3.11 and the pinned dependencies:

```bash
cd services/ml
python -m venv .venv
# Activate the environment
python -m pip install -r requirements.txt
```

Place the downloaded PhysioNet dataset under services/ml/data/chbmit/. It should contain subject folders, EDF recordings and each subject's summary file.

## 2. Prepare windows

```bash
python prepare_chbmit.py --data-dir data/chbmit --output-dir data/processed --window-seconds 10 --stride-seconds 10
```

The preparation step produces features.npy (windows × samples × channels), labels.npy, subjects.npy, a preparation report and resumable per-subject shards. Review skipped files, subject counts, class counts, channel order and annotations.

## 3. Train and evaluate

```bash
python train.py --features data/processed/features.npy --labels data/processed/labels.npy --subjects data/processed/subjects.npy --architecture multiscale_cnn --hard-negative-mining --output-dir artifacts --seed 42
```

The trainer supports subject-disjoint partitions, validation-only threshold selection, optional hard-negative mining and held-out testing. It saves model.keras, best_model.keras, metadata.json, evaluation.json and training_history.json. Review the actual subject split and class counts. Never use test subjects for training, hard-negative mining, threshold selection or repeated model selection. Training should stop if any split lacks both classes.

## 4. Artifact policy

The repository currently contains small research model artifacts and metadata under services/ml/artifacts*/. These are illustrative research assets, not a substitute for reproducing the experiment. Verify provenance, input shape, channel order, preprocessing and checksum before use. Do not commit CHB-MIT recordings or generated feature arrays.

## 5. Validation

Perform independent external validation, subgroup/error analysis, calibration and threshold review, security/privacy review and applicable institutional/regulatory review. A research score must never be represented as a diagnosis or used for treatment decisions.

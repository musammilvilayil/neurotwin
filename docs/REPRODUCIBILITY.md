# Reproducible CHB-MIT research workflow

Do not commit CHB-MIT files, protected health data, model weights, or metrics obtained from unreviewed experiments. Obtain and use the de-identified CHB-MIT dataset under its terms. For every EDF, parse the corresponding `chbXX-summary.txt` with `parse_chbmit_summary`, preprocess EEG to 0.5–40 Hz and 128 Hz, generate fixed windows, and retain a subject identifier for every window.

Place the downloaded PhysioNet directory under a local path such as `services/ml/data/`; it must contain subject directories (`chb01/`, …), EDF recordings, and each subject's `*-summary.txt`. Use the pinned dependencies with Python 3.11 (the Dockerfile's version), then build arrays with fixed/reordered bipolar channels:

```bash
cd services/ml
pip install -r requirements.txt
python download_chbmit.py --output-dir data
python prepare_chbmit.py --data-dir data --output-dir prepared
```

This produces `features.npy` (`windows, samples, channels`), `labels.npy` (0/1), `subjects.npy` (one `chbXX` string per window), and a skipped-file report. Train with:

```bash
cd services/ml
python train.py --features prepared/features.npy --labels prepared/labels.npy --subjects prepared/subjects.npy --output-dir artifacts --seed 42
```

The trainer uses group splitting so no subject belongs to more than one of train, validation, and test. It saves `model.keras`, `metadata.json`, and `evaluation.json`; preserve these with dataset version, preprocessing choices, package versions, seed, threshold selection, and independent validation protocol. The repository deliberately includes none of those artifacts and makes no accuracy claim.

Before deploying an artifact, perform independent validation, subgroup/error analysis, calibration and threshold review, security/privacy review, and applicable regulatory/institutional review. A research score must never be represented as a diagnosis.

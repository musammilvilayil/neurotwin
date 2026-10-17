# Reproducible CHB-MIT research workflow

Do not commit CHB-MIT files, protected health data, model weights, or metrics obtained from unreviewed experiments. Obtain and use the de-identified CHB-MIT dataset under its terms. For every EDF, parse the corresponding `chbXX-summary.txt` with `parse_chbmit_summary`, preprocess EEG to 0.5–40 Hz and 128 Hz, generate fixed windows, and retain a subject identifier for every window.

Create `features.npy` (`windows, samples, channels`), `labels.npy` (0/1), and `subjects.npy` (one `chbXX` string per window). Train with:

```bash
cd services/ml
python train.py --features features.npy --labels labels.npy --subjects subjects.npy --output-dir artifacts --seed 42
```

The trainer uses group splitting so no subject belongs to more than one of train, validation, and test. It saves `model.keras`, `metadata.json`, and `evaluation.json`; preserve these with dataset version, preprocessing choices, package versions, seed, threshold selection, and independent validation protocol. The repository deliberately includes none of those artifacts and makes no accuracy claim.

Before deploying an artifact, perform independent validation, subgroup/error analysis, calibration and threshold review, security/privacy review, and applicable regulatory/institutional review. A research score must never be represented as a diagnosis.

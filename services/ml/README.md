# NeuroTwin EEG model training (research only)

NeuroTwin's seizure-window model is a **CNN-LSTM research prototype**, not a medical device. An EEG LLM is not a substitute for a signal model: LLMs do not directly validate seizure labels or provide clinically trustworthy EEG inference. This pipeline uses labelled EEG recordings and keeps inference separate from clinical decisions.

## Dataset

The pipeline uses the public **CHB-MIT Scalp EEG Database** (PhysioNet, DOI [10.13026/C2K01R](https://doi.org/10.13026/C2K01R)). It contains EDF recordings and seizure start/end annotations. The complete download is about 42.6 GB, so the downloader fetches only the chosen subjects' seizure-annotated EDF files plus a small number of non-seizure files. Dataset files and patient data must stay out of Git.

## Train on GitHub Actions

The workflow `.github/workflows/train-chbmit.yml` starts on pushes to the model-training branch and can also be run manually from **Actions → Train CHB-MIT research model → Run workflow**. It downloads a six-subject subset, prepares windows, trains, evaluates on subject-disjoint splits, and uploads a downloadable artifact named `neurotwin-chbmit-research-model`.

The workflow may fail if the runner's available disk/RAM/time is insufficient, the source dataset changes, or one split does not contain both classes. Review the Action logs and `evaluation.json`; do not report the model as trained unless the run succeeds and the artifact exists.

## Run locally

From `services/ml/`:

```bash
python -m venv .venv
# Activate the environment, then:
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python download_chbmit.py --data-dir data/chbmit --subjects chb01,chb02,chb03,chb05,chb06,chb07,chb08,chb09,chb10,chb11 --negative-files-per-subject 1
python prepare_chbmit.py --data-dir data/chbmit --output-dir data/processed --window-seconds 10 --stride-seconds 10
python train.py --features data/processed/features.npy --labels data/processed/labels.npy --subjects data/processed/subjects.npy --output-dir artifacts --epochs 10
```

The model uses 18 fixed bipolar channels at 128 Hz and 10-second windows. Files without the required channel montage are skipped during preparation; inspect `preparation_report.json`. Splits are separated by subject (60% train / 20% validation / 20% test), and the threshold is selected on validation data before the test set is scored. Metrics are exported to `artifacts/evaluation.json`; the exact test metrics must be reviewed rather than assumed.

## Install the trained artifact

Download the workflow artifact, extract it locally, and copy its contents into `services/ml/artifacts/` so that `model.keras` and `metadata.json` are present. Then restart the ML service. Docker Compose mounts this directory into the service as read-only. The API remains `not_ready` if either file is absent or the metadata does not declare `model_state: research_trained`.

## API contract

- `GET /health`: whether a compatible model artifact is installed.
- `POST /inspect-eeg`: preprocessing metadata only; no prediction.
- `POST /infer`: per-window experimental scores, only when trained artifacts exist. Input EDF must contain the expected channel montage. Other montages are rejected instead of silently feeding misaligned channels.

## Limits and safety

- The downloaded dataset contains paediatric recordings from a specific clinical cohort; it is not representative of every age, device, montage, or neurological condition.
- A successful training run is **not** clinical validation. High window-level metrics do not establish real-world sensitivity, specificity, false-alarm rates, or patient-level safety.
- Scores are research outputs only. Do not use them to diagnose, rule out a seizure, alter treatment, or delay emergency care. Qualified clinical review and independent external validation are required before any clinical use.
- The dataset licence and citation requirements must be followed. Do not commit raw EEG, patient files, or trained weights into this repository.

# NeuroTwin ML Service

Real EEG processing foundation using MNE and a TensorFlow CNN-LSTM architecture.

## Run
```bash
python -m venv .venv
pip install -r requirements.txt
uvicorn api:app --reload --port 8001
```

No diagnostic or model-performance claim is made until a labelled public dataset is trained and independently evaluated.

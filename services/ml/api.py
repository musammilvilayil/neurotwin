"""Research-only EEG model service. It never presents its output as a diagnosis."""
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, File, HTTPException, UploadFile

from preprocessing import load_edf, preprocess

app = FastAPI(title='NeuroTwin ML Service', version='0.1.0')


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'service': 'neurotwin-ml',
        'model_state': 'untrained/demo',
        'clinical_boundary': 'Decision support only; no validated model is bundled.',
        'notice': 'Research only / not diagnostic.',
    }


@app.post('/inspect-eeg')
async def inspect_eeg(file: UploadFile = File(...)):
    """Inspect EDF metadata and preprocessing readiness without inference."""
    if file.filename is None or not file.filename.lower().endswith(('.edf', '.bdf', '.fif', '.fif.gz')):
        raise HTTPException(400, 'This prototype endpoint accepts EDF/BDF/FIF files only.')
    suffix = Path(file.filename).suffix
    with NamedTemporaryFile(suffix=suffix) as temp:
        temp.write(await file.read())
        temp.flush()
        raw = load_edf(temp.name)
        cleaned, data = preprocess(raw)
    return {
        'state': 'preprocessed_no_inference',
        'samples': int(data.shape[0]),
        'channels': int(data.shape[1]),
        'sampling_rate': cleaned.info['sfreq'],
        'pipeline': 'MNE EEG pick → 0.5–40 Hz bandpass → optional notch → optional resample → per-channel z-score',
        'notice': 'No trained weights are included. This response is not a clinical finding.',
        'model_state': 'untrained/demo',
        'research_only': True,
    }

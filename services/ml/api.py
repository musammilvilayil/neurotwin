"""Research-only EEG model service. It never presents its output as a diagnosis."""
from pathlib import Path
from tempfile import NamedTemporaryFile
from fastapi import FastAPI, File, HTTPException, UploadFile
from preprocessing import load_edf, preprocess

app=FastAPI(title='NeuroTwin ML Service',version='0.1.0')

@app.get('/health')
def health():
    return {'status':'ok','service':'neurotwin-ml','model_state':'untrained','clinical_boundary':'Decision support only; no validated model is bundled.'}

@app.post('/inspect-eeg')
async def inspect_eeg(file: UploadFile = File(...)):
    """Safely inspect EDF metadata and preprocessing readiness without inference.

    Model training and validated weights are deliberately external to this repository.
    """
    if not file.filename.lower().endswith('.edf'):
        raise HTTPException(400, 'This prototype endpoint currently accepts EDF files only.')
    suffix=Path(file.filename).suffix
    with NamedTemporaryFile(suffix=suffix) as temp:
        temp.write(await file.read()); temp.flush()
        raw=load_edf(temp.name)
        cleaned,data=preprocess(raw)
    return {'state':'preprocessed_no_inference','samples':int(data.shape[0]),'channels':int(data.shape[1]),'sampling_rate':cleaned.info['sfreq'],'pipeline':'MNE EEG pick → 0.5–40 Hz bandpass → 128 Hz resample → per-channel z-score','notice':'No trained weights are included. This response is not a clinical finding.'}

"""Research EEG inference service. It never presents output as a diagnosis."""
import json, os
from pathlib import Path
from tempfile import NamedTemporaryFile
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from tensorflow import keras
from preprocessing import load_edf, preprocess, windows
from model_registry import list_models

app=FastAPI(title='NeuroTwin ML Service',version='1.0.0')
ARTIFACT_DIR=Path(os.getenv('MODEL_ARTIFACT_DIR','artifacts'))
def artifacts():
    model_path,metadata_path=ARTIFACT_DIR/'model.keras',ARTIFACT_DIR/'metadata.json'
    if not model_path.is_file() or not metadata_path.is_file(): return None,None
    return model_path,json.loads(metadata_path.read_text())

@app.get('/models')
def models():
    return {'models': list_models(ARTIFACT_DIR), 'notice': 'Availability is not clinical validation.'}

@app.get('/health')
def health():
    model,meta=artifacts()
    return {'status':'ok','service':'neurotwin-ml','model_state':'ready' if model else 'not_ready','model_metadata':meta,'clinical_boundary':'Research decision support only; no diagnostic claim.'}

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

@app.post('/infer')
async def infer(file: UploadFile=File(...)):
    model_path,metadata=artifacts()
    if not model_path: raise HTTPException(503,{'error':'model_not_ready','message':'No trained model artifact is installed. Train and validate a model before inference.'})
    if not file.filename or not file.filename.lower().endswith('.edf'): raise HTTPException(400,'Only EDF files are accepted.')
    with NamedTemporaryFile(suffix='.edf') as temp:
        temp.write(await file.read()); temp.flush(); cleaned,data=preprocess(load_edf(temp.name)); window_seconds=metadata['window_samples']/cleaned.info['sfreq']; X,_,starts=windows(data,cleaned.info['sfreq'],[],window_seconds,window_seconds)
    if not len(X): raise HTTPException(422,'Recording is shorter than one model window.')
    scores=keras.models.load_model(model_path).predict(X,verbose=0)[:,1]; threshold=float(metadata.get('threshold',.5)); step=max(1,int(cleaned.info['sfreq']//8))
    return {'model_state':'trained_research_model','sampling_rate':cleaned.info['sfreq'],'channels':cleaned.ch_names,'waveform':data[:min(len(data),int(cleaned.info['sfreq']*30)):step].mean(axis=1).tolist(),'timeline':[{'start_seconds':round(s,2),'score':round(float(score),5)} for s,score in zip(starts,scores)],'summary':{'max_score':round(float(scores.max()),5),'windows_at_or_above_threshold':int((scores>=threshold).sum()),'threshold':threshold},'notice':'Seizure likelihood scores are research outputs, not diagnoses; clinician review and external validation are required.'}

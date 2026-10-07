from pathlib import Path
import mne
import numpy as np


def load_edf(path: str):
    p=Path(path)
    if not p.exists(): raise FileNotFoundError(p)
    return mne.io.read_raw_edf(p, preload=True, verbose=False)


def preprocess(raw, low_hz=0.5, high_hz=40.0, resample_hz=128.0):
    cleaned=raw.copy().pick_types(eeg=True)
    cleaned.filter(low_hz, high_hz, verbose=False)
    if resample_hz and cleaned.info['sfreq'] != resample_hz:
        cleaned.resample(resample_hz, verbose=False)
    data=cleaned.get_data().T
    scale=np.std(data, axis=0, keepdims=True)+1e-8
    data=(data-np.mean(data,axis=0,keepdims=True))/scale
    return cleaned, data.astype('float32')

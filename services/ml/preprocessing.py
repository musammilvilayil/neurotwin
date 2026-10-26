"""CHB-MIT EDF preparation utilities (research use only)."""
from pathlib import Path
import re
import mne
import numpy as np


def load_edf(path: str):
    path = Path(path)
    if not path.is_file(): raise FileNotFoundError(path)
    return mne.io.read_raw_edf(path, preload=True, verbose=False)


def preprocess(raw, low_hz=0.5, high_hz=40.0, resample_hz=128.0):
    cleaned=raw.copy().pick_types(eeg=True)
    if not len(cleaned.ch_names): raise ValueError('EDF contains no EEG channels')
    cleaned.filter(low_hz, high_hz, verbose=False)
    if resample_hz and cleaned.info['sfreq'] != resample_hz: cleaned.resample(resample_hz, verbose=False)
    data=cleaned.get_data().T
    data=(data-data.mean(axis=0,keepdims=True))/(data.std(axis=0,keepdims=True)+1e-8)
    return cleaned, data.astype('float32')

def parse_chbmit_summary(path: str):
    """Return {EDF filename: [(start_seconds, end_seconds)]} from a CHB-MIT summary."""
    blocks=re.split(r'(?=File Name:)',Path(path).read_text(encoding='utf-8',errors='ignore'),flags=re.I); annotations={}
    for block in blocks:
        name=re.search(r'File Name:\s*(\S+)',block,re.I)
        if not name: continue
        starts=[int(x) for x in re.findall(r'Seizure(?: \d+)? Start Time:\s*(\d+)\s*seconds',block,re.I)]; ends=[int(x) for x in re.findall(r'Seizure(?: \d+)? End Time:\s*(\d+)\s*seconds',block,re.I)]
        if len(starts)!=len(ends): raise ValueError(f'Malformed seizure times for {name.group(1)}')
        annotations[name.group(1)]=list(zip(starts,ends))
    return annotations

def windows(data, sfreq, intervals, window_seconds=10, stride_seconds=5):
    """Create windows and label those overlapping documented seizure intervals."""
    size,stride=int(sfreq*window_seconds),int(sfreq*stride_seconds)
    if len(data)<size: return np.empty((0,size,data.shape[1]),dtype='float32'),np.empty(0,dtype='int64'),[]
    out,labels,starts=[],[],[]
    for start in range(0,len(data)-size+1,stride):
        end,start_s,end_s=start+size,start/sfreq,(start+size)/sfreq
        out.append(data[start:end]); labels.append(int(any(start_s<e and end_s>s for s,e in intervals))); starts.append(start_s)
    return np.asarray(out,dtype='float32'),np.asarray(labels,dtype='int64'),starts

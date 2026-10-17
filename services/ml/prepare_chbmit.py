"""Build window-level CHB-MIT arrays from downloaded EDF files and summaries.

The source tree must be organised as downloaded from PhysioNet, for example
data/chb01/chb01_03.edf and data/chb01/chb01-summary.txt. This command does
not download data, and it intentionally excludes all non-EDF source material.
"""
import argparse
from pathlib import Path
import numpy as np
from preprocessing import load_edf, parse_chbmit_summary, preprocess, windows

DEFAULT_CHANNELS = ('FP1-F7','F7-T7','T7-P7','P7-O1','FP2-F8','F8-T8','T8-P8','P8-O2',
                    'FP1-F3','F3-C3','C3-P3','P3-O1','FP2-F4','F4-C4','C4-P4','P4-O2',
                    'FZ-CZ','CZ-PZ')

def normalise(name):
    return name.upper().replace('EEG ','').replace('-REF','').replace('--','-').strip()

def select_channels(raw, expected):
    index={normalise(name):name for name in raw.ch_names}
    missing=[name for name in expected if name not in index]
    if missing: raise ValueError(f'missing channels: {", ".join(missing)}')
    return raw.copy().pick([index[name] for name in expected])

def main():
    p=argparse.ArgumentParser(); p.add_argument('--data-dir',required=True); p.add_argument('--output-dir',required=True); p.add_argument('--window-seconds',type=float,default=10); p.add_argument('--stride-seconds',type=float,default=5); p.add_argument('--channels',default=','.join(DEFAULT_CHANNELS),help='comma-separated canonical channel names')
    args=p.parse_args(); root,out=Path(args.data_dir),Path(args.output_dir); expected=tuple(normalise(x) for x in args.channels.split(',')); features=[]; labels=[]; subjects=[]; skipped=[]
    for subject_dir in sorted(p for p in root.iterdir() if p.is_dir() and p.name.lower().startswith('chb')):
        summaries=list(subject_dir.glob('*-summary.txt'))
        if not summaries: skipped.append({'subject':subject_dir.name,'reason':'summary file missing'}); continue
        annotations=parse_chbmit_summary(summaries[0])
        for edf in sorted(subject_dir.glob('*.edf')):
            try:
                raw=select_channels(load_edf(edf),expected); cleaned,data=preprocess(raw); X,y,_=windows(data,cleaned.info['sfreq'],annotations.get(edf.name,[]),args.window_seconds,args.stride_seconds)
                if len(X): features.append(X); labels.append(y); subjects.extend([subject_dir.name]*len(y))
            except (ValueError,RuntimeError,EOFError) as error: skipped.append({'file':str(edf),'reason':str(error)})
    if not features: raise RuntimeError('No usable EDF windows were produced; verify the CHB-MIT root and channel configuration.')
    out.mkdir(parents=True,exist_ok=True); np.save(out/'features.npy',np.concatenate(features)); np.save(out/'labels.npy',np.concatenate(labels)); np.save(out/'subjects.npy',np.asarray(subjects)); (out/'preparation_report.json').write_text(__import__('json').dumps({'subjects':sorted(set(subjects)),'windows':len(subjects),'channels':list(expected),'window_seconds':args.window_seconds,'stride_seconds':args.stride_seconds,'skipped':skipped},indent=2)); print(f'Prepared {len(subjects)} windows from {len(set(subjects))} subjects in {out}')
if __name__=='__main__': main()

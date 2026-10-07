"""Minimal reproducible CNN-LSTM training entry point for labelled, de-identified data.

It intentionally does not ship a model or claim metrics. Supply X.npy shaped
(examples, timesteps, channels) and y.npy integer labels, then document a held-out
evaluation before any research use beyond prototyping.
"""
import argparse
import numpy as np
from model import build_cnn_lstm

parser=argparse.ArgumentParser()
parser.add_argument('--features',required=True); parser.add_argument('--labels',required=True)
parser.add_argument('--output',default='model.keras'); parser.add_argument('--epochs',type=int,default=10)
args=parser.parse_args(); X=np.load(args.features); y=np.load(args.labels)
if X.ndim!=3 or len(X)!=len(y): raise ValueError('X must be (n, timesteps, channels) and align with y')
model=build_cnn_lstm(X.shape[1],X.shape[2],len(np.unique(y)))
model.fit(X,y,validation_split=.2,epochs=args.epochs,batch_size=16)
model.save(args.output)
print('Saved research model. Perform and document external/held-out evaluation before use.')

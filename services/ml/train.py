"""Train a CNN-LSTM with subject-disjoint CHB-MIT partitions; research use only."""
import argparse, json, random
from pathlib import Path
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit
from tensorflow import keras
from model import build_cnn_lstm

def split_subjects(X, y, subjects, seed):
    if len(set(subjects)) < 3: raise ValueError('At least three subjects are required for subject-separated train/validation/test splits')
    train_idx, held_idx=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=seed).split(X,y,subjects))
    held_subjects=np.asarray(subjects)[held_idx]
    val_local,test_local=next(GroupShuffleSplit(n_splits=1,test_size=.5,random_state=seed+1).split(X[held_idx],y[held_idx],held_subjects))
    return train_idx,held_idx[val_local],held_idx[test_local]

def main():
    p=argparse.ArgumentParser(); p.add_argument('--features',required=True); p.add_argument('--labels',required=True); p.add_argument('--subjects',required=True,help='one CHB-MIT subject id per window'); p.add_argument('--output-dir',default='artifacts'); p.add_argument('--epochs',type=int,default=20); p.add_argument('--seed',type=int,default=42); args=p.parse_args()
    random.seed(args.seed); np.random.seed(args.seed); keras.utils.set_random_seed(args.seed)
    X,y,subjects=np.load(args.features),np.load(args.labels),np.load(args.subjects,allow_pickle=True)
    if X.ndim!=3 or len(X)!=len(y) or len(y)!=len(subjects): raise ValueError('Features must be (windows, timesteps, channels); labels and subjects must align')
    train,val,test=split_subjects(X,y,subjects,args.seed); model=build_cnn_lstm(X.shape[1],X.shape[2],2)
    weights={int(c):len(train)/(2*max(1,int((y[train]==c).sum()))) for c in np.unique(y[train])}
    history=model.fit(X[train],y[train],validation_data=(X[val],y[val]),epochs=args.epochs,batch_size=32,class_weight=weights,callbacks=[keras.callbacks.EarlyStopping(monitor='val_loss',patience=5,restore_best_weights=True)],verbose=2)
    probabilities=model.predict(X[test],verbose=0)[:,1]; predicted=(probabilities>=.5).astype(int)
    metrics={'seed':args.seed,'split':'subject-disjoint','subjects':{'train':sorted(set(subjects[train].tolist())),'validation':sorted(set(subjects[val].tolist())),'test':sorted(set(subjects[test].tolist()))},'test_windows':int(len(test)),'confusion_matrix':confusion_matrix(y[test],predicted).tolist(),'classification_report':classification_report(y[test],predicted,output_dict=True,zero_division=0),'roc_auc':float(roc_auc_score(y[test],probabilities)) if len(set(y[test]))==2 else None,'history':history.history,'clinical_notice':'Research metric only; no clinical diagnostic claim or validation is implied.'}
    out=Path(args.output_dir); out.mkdir(parents=True,exist_ok=True); model.save(out/'model.keras'); (out/'metadata.json').write_text(json.dumps({'window_samples':int(X.shape[1]),'channels':int(X.shape[2]),'sampling_rate':128,'classes':['non_seizure','seizure'],'threshold':.5},indent=2)); (out/'evaluation.json').write_text(json.dumps(metrics,indent=2)); print(f'Saved model and reproducducibility artifacts to {out}')
if __name__=='__main__': main()

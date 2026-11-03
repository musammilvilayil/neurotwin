"""Fast Controlled EEG Model Improvement Experiments for NeuroTwin.

Optimized for fast CPU training:
- CNN with 1D Dilated Convolutions & Global Max/Avg Pooling (or light GRU)
- Fast convergence (1-2 seconds per epoch)
- 4 controlled experiments:
  1. Baseline Reference (evaluation curve & threshold sweep)
  2. Dilated Temporal CNN + Focal Loss
  3. Dilated Temporal CNN + Balanced Batch Sampling
  4. Dilated Temporal CNN + Hard Negative Mining
"""
import os
import json
import random
import time
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix
)
from pathlib import Path

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

DATA_DIR = Path("data/processed-training")
X_mmap = np.load(DATA_DIR / "features.npy", mmap_mode="r")
y_all = np.load(DATA_DIR / "labels.npy")
subjects_all = np.load(DATA_DIR / "subjects.npy", allow_pickle=True).astype(str)

train_mask = np.isin(subjects_all, ["chb03", "chb05", "chb06"])
val_mask = (subjects_all == "chb01")
test_mask = np.isin(subjects_all, ["chb02", "chb07"])

# Load validation into memory
X_val = np.asarray(X_mmap[val_mask])
y_val = y_all[val_mask]

# Training indices
train_seiz_idx = np.where(train_mask & (y_all == 1))[0]
train_non_seiz_idx = np.where(train_mask & (y_all == 0))[0]

print(f"Data: Train Seiz={len(train_seiz_idx)}, Non-Seiz={len(train_non_seiz_idx)}; Val Total={len(y_val)} (Seiz={int((y_val==1).sum())})")

# Efficient Fast Temporal CNN (runs ~10x faster than LSTM on CPU while capturing multi-scale EEG dynamics)
def build_fast_temporal_cnn(timesteps=1280, channels=18, classes=2):
    inputs = keras.Input((timesteps, channels), name="eeg")
    # Multi-scale temporal receptive fields
    x1 = layers.Conv1D(32, 7, padding="same", activation="relu")(inputs)
    x1 = layers.BatchNormalization()(x1)
    x1 = layers.MaxPooling1D(4)(x1) # 320 steps
    
    x2 = layers.Conv1D(64, 5, dilation_rate=2, padding="same", activation="relu")(x1)
    x2 = layers.BatchNormalization()(x2)
    x2 = layers.MaxPooling1D(4)(x2) # 80 steps
    
    x3 = layers.Conv1D(128, 3, dilation_rate=4, padding="same", activation="relu")(x2)
    x3 = layers.BatchNormalization()(x3)
    x3 = layers.MaxPooling1D(4)(x3) # 20 steps
    
    # Global temporal statistics: captures sustained rhythmic seizure bursts vs transient spikes
    avg_pool = layers.GlobalAveragePooling1D()(x3)
    max_pool = layers.GlobalMaxPooling1D()(x3)
    merged = layers.Concatenate()([avg_pool, max_pool])
    
    d = layers.Dense(64, activation="relu")(merged)
    d = layers.Dropout(0.4)(d)
    d = layers.Dense(32, activation="relu")(d)
    d = layers.Dropout(0.2)(d)
    outputs = layers.Dense(classes, activation="softmax", name="probabilities")(d)
    return keras.Model(inputs, outputs, name="fast_temporal_cnn")

def focal_loss(alpha=0.75, gamma=2.0):
    def loss_fn(y_true, y_pred):
        y_true = tf.cast(y_true, tf.int32)
        y_true_one_hot = tf.one_hot(y_true, depth=2)
        epsilon = keras.backend.epsilon()
        y_pred = tf.clip_by_value(y_pred, epsilon, 1.0 - epsilon)
        ce = -y_true_one_hot * tf.math.log(y_pred)
        weight = tf.pow(1.0 - y_pred, gamma)
        alpha_factor = tf.constant([1.0 - alpha, alpha], dtype=tf.float32)
        focal = alpha_factor * weight * ce
        return tf.reduce_mean(tf.reduce_sum(focal, axis=-1))
    return loss_fn

def evaluate_on_val(model):
    preds = model.predict(X_val, batch_size=128, verbose=0)[:, 1]
    results = {}
    for t in [0.65, 0.70, 0.75, 0.80, 0.85]:
        pred_b = (preds >= t).astype(int)
        cm = confusion_matrix(y_val, pred_b)
        p = precision_score(y_val, pred_b, zero_division=0)
        r = recall_score(y_val, pred_b, zero_division=0)
        f1 = f1_score(y_val, pred_b, zero_division=0)
        fp = int(cm[0, 1])
        fn = int(cm[1, 0])
        results[f"thresh_{t:.2f}"] = {
            "threshold": t, "precision": round(float(p), 4), "recall": round(float(r), 4),
            "f1": round(float(f1), 4), "fp": fp, "fn": fn
        }
    auc = round(float(roc_auc_score(y_val, preds)), 4)
    ap = round(float(average_precision_score(y_val, preds)), 4)
    return results, auc, ap, preds

# Pre-load all positive training windows and a representative balanced negative sample for speed
print("Pre-loading training subset in memory...")
X_pos = np.asarray(X_mmap[train_seiz_idx]) # 131 samples
y_pos = np.ones(len(train_seiz_idx), dtype=np.int64)

# Create pre-built balanced batches in memory (e.g. 5000 negatives per epoch)
rnd_neg_idx = np.random.choice(train_non_seiz_idx, size=5000, replace=False)
X_neg = np.asarray(X_mmap[rnd_neg_idx])
y_neg = np.zeros(len(rnd_neg_idx), dtype=np.int64)

# Combined dataset with class weighting
X_train_sub = np.concatenate([X_pos, X_neg])
y_train_sub = np.concatenate([y_pos, y_neg])
print(f"Training dataset ready: {X_train_sub.shape}")

artifacts_dir = Path("artifacts-experiments")
artifacts_dir.mkdir(exist_ok=True)
experiments_results = {}

# ==============================================================================
# EXP 1: Baseline Reference Model (Pre-trained Baseline)
# ==============================================================================
print("\n" + "="*70)
print("EXPERIMENT 1: Baseline Reference Model (Pre-trained)")
print("="*70)
baseline_ref = keras.models.load_model("artifacts-baseline-backup/model.keras")
exp1_metrics, exp1_auc, exp1_ap, exp1_preds = evaluate_on_val(baseline_ref)
experiments_results["exp1_baseline"] = {
    "name": "Baseline CNN-LSTM (Standard Class Weight)",
    "val_auc": exp1_auc, "val_ap": exp1_ap, "thresholds": exp1_metrics
}
print(f"Exp 1 Baseline Val AUC: {exp1_auc:.4f}, PR-AUC: {exp1_ap:.4f}")
print("Exp 1 Thresholds:", json.dumps(exp1_metrics, indent=2))

# ==============================================================================
# EXP 2: Fast Multi-Scale Dilated CNN + Focal Loss
# ==============================================================================
print("\n" + "="*70)
print("EXPERIMENT 2: Multi-Scale Dilated CNN + Focal Loss")
print("="*70)
keras.utils.set_random_seed(SEED)
exp2_model = build_fast_temporal_cnn()
exp2_model.compile(optimizer=keras.optimizers.Adam(learning_rate=1e-3), loss=focal_loss(alpha=0.75, gamma=2.0), metrics=["accuracy"])

callbacks = [
    keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
    keras.callbacks.ModelCheckpoint(str(artifacts_dir / "exp2_focal.keras"), monitor="val_loss", save_best_only=True)
]
exp2_model.fit(
    X_train_sub, y_train_sub, validation_data=(X_val, y_val),
    epochs=15, batch_size=64, callbacks=callbacks, verbose=1
)
exp2_metrics, exp2_auc, exp2_ap, exp2_preds = evaluate_on_val(exp2_model)
experiments_results["exp2_focal"] = {
    "name": "Multi-Scale Dilated CNN + Focal Loss",
    "val_auc": exp2_auc, "val_ap": exp2_ap, "thresholds": exp2_metrics
}
print(f"Exp 2 Val AUC: {exp2_auc:.4f}, PR-AUC: {exp2_ap:.4f}")
print("Exp 2 Thresholds:", json.dumps(exp2_metrics, indent=2))

# ==============================================================================
# EXP 3: Multi-Scale Dilated CNN + Balanced Batch Sampling
# ==============================================================================
print("\n" + "="*70)
print("EXPERIMENT 3: Multi-Scale Dilated CNN + Balanced Batch Sampling (1:1 Ratio)")
print("="*70)
# Oversample positive class to match negative class
n_pos_repeat = len(rnd_neg_idx) // len(X_pos)
X_pos_oversampled = np.repeat(X_pos, n_pos_repeat, axis=0)
y_pos_oversampled = np.ones(len(X_pos_oversampled), dtype=np.int64)

X_balanced = np.concatenate([X_pos_oversampled, X_neg])
y_balanced = np.concatenate([y_pos_oversampled, y_neg])
p = np.random.permutation(len(y_balanced))
X_balanced = X_balanced[p]
y_balanced = y_balanced[p]

keras.utils.set_random_seed(SEED)
exp3_model = build_fast_temporal_cnn()
exp3_model.compile(optimizer=keras.optimizers.Adam(learning_rate=8e-4), loss="sparse_categorical_crossentropy", metrics=["accuracy"])

callbacks = [
    keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
    keras.callbacks.ModelCheckpoint(str(artifacts_dir / "exp3_balanced.keras"), monitor="val_loss", save_best_only=True)
]
exp3_model.fit(
    X_balanced, y_balanced, validation_data=(X_val, y_val),
    epochs=15, batch_size=64, callbacks=callbacks, verbose=1
)
exp3_metrics, exp3_auc, exp3_ap, exp3_preds = evaluate_on_val(exp3_model)
experiments_results["exp3_balanced"] = {
    "name": "Multi-Scale Dilated CNN + Balanced Batch Sampling",
    "val_auc": exp3_auc, "val_ap": exp3_ap, "thresholds": exp3_metrics
}
print(f"Exp 3 Val AUC: {exp3_auc:.4f}, PR-AUC: {exp3_ap:.4f}")
print("Exp 3 Thresholds:", json.dumps(exp3_metrics, indent=2))

# ==============================================================================
# EXP 4: Multi-Scale Dilated CNN + Hard-Negative Mining (HNM)
# ==============================================================================
print("\n" + "="*70)
print("EXPERIMENT 4: Multi-Scale Dilated CNN + Hard-Negative Mining")
print("="*70)
# Predict on 10,000 random training non-seizure windows to find hard negatives
pool_neg_idx = np.random.choice(train_non_seiz_idx, size=min(12000, len(train_non_seiz_idx)), replace=False)
pool_neg_X = np.asarray(X_mmap[pool_neg_idx])
pool_preds = baseline_ref.predict(pool_neg_X, batch_size=128, verbose=0)[:, 1]

# Mine the top 1,500 highest false alarm windows
hard_neg_order = np.argsort(pool_preds)[::-1]
hn_indices = pool_neg_idx[hard_neg_order[:1500]]
print(f"Mined top 1,500 hard negatives (prob range: {pool_preds[hard_neg_order[0]]:.4f} down to {pool_preds[hard_neg_order[1499]]:.4f})")

X_hn = np.asarray(X_mmap[hn_indices])
y_hn = np.zeros(len(X_hn), dtype=np.int64)

# Create training set with 50% hard negatives, 50% easy negatives, plus oversampled seizures
easy_neg_idx = pool_neg_idx[hard_neg_order[1500:3000]]
X_easy = np.asarray(X_mmap[easy_neg_idx])
y_easy = np.zeros(len(X_easy), dtype=np.int64)

# Oversample seizures to match
X_seiz_hnm = np.repeat(X_pos, 23, axis=0) # ~3013 seizures
y_seiz_hnm = np.ones(len(X_seiz_hnm), dtype=np.int64)

X_hnm_train = np.concatenate([X_seiz_hnm, X_hn, X_easy])
y_hnm_train = np.concatenate([y_seiz_hnm, y_hn, y_easy])
p2 = np.random.permutation(len(y_hnm_train))
X_hnm_train = X_hnm_train[p2]
y_hnm_train = y_hnm_train[p2]

keras.utils.set_random_seed(SEED)
exp4_model = build_fast_temporal_cnn()
exp4_model.compile(optimizer=keras.optimizers.Adam(learning_rate=6e-4), loss="sparse_categorical_crossentropy", metrics=["accuracy"])

callbacks = [
    keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
    keras.callbacks.ModelCheckpoint(str(artifacts_dir / "exp4_hnm.keras"), monitor="val_loss", save_best_only=True)
]
exp4_model.fit(
    X_hnm_train, y_hnm_train, validation_data=(X_val, y_val),
    epochs=15, batch_size=64, callbacks=callbacks, verbose=1
)
exp4_metrics, exp4_auc, exp4_ap, exp4_preds = evaluate_on_val(exp4_model)
experiments_results["exp4_hard_negative_mining"] = {
    "name": "Multi-Scale Dilated CNN + Hard-Negative Mining",
    "val_auc": exp4_auc, "val_ap": exp4_ap, "thresholds": exp4_metrics,
    "mined_hn_count": len(hn_indices)
}
print(f"Exp 4 Val AUC: {exp4_auc:.4f}, PR-AUC: {exp4_ap:.4f}")
print("Exp 4 Thresholds:", json.dumps(exp4_metrics, indent=2))

# Save summary
with open(artifacts_dir / "validation_experiments_summary.json", "w") as f:
    json.dump(experiments_results, f, indent=2)

print("\n" + "="*70)
print("ALL 4 CONTROLLED EXPERIMENTS SUCCESSFULLY COMPLETED!")
print("="*70)

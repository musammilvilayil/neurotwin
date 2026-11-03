"""Train and evaluate the NeuroTwin CHB-MIT seizure-window classifier.

All splits are subject-disjoint. The output is research-only and must not be
used to diagnose, rule out, or treat seizures.
"""
import argparse
import gc
import json
import random
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.metrics import (
    accuracy_score, average_precision_score, balanced_accuracy_score,
    classification_report, confusion_matrix, f1_score, precision_score,
    recall_score, roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit
from tensorflow import keras

from model import build_cnn_lstm, build_multiscale_dilated_cnn

DEFAULT_CHANNELS = [
    "FP1-F7", "F7-T7", "T7-P7", "P7-O1", "FP2-F8", "F8-T8", "T8-P8", "P8-O2",
    "FP1-F3", "F3-C3", "C3-P3", "P3-O1", "FP2-F4", "F4-C4", "C4-P4", "P4-O2",
    "FZ-CZ", "CZ-PZ",
]


class MemmapBatchSequence(keras.utils.Sequence):
    """Memory-efficient batch sequence that slices directly from numpy mmap arrays."""
    def __init__(self, X_mmap, y, indices, batch_size=32, shuffle=True):
        self.X_mmap = X_mmap
        self.y = y
        self.indices = np.asarray(indices, dtype=np.int64).copy()
        self.batch_size = batch_size
        self.shuffle = shuffle
        if self.shuffle:
            np.random.shuffle(self.indices)

    def __len__(self):
        return int(np.ceil(len(self.indices) / self.batch_size))

    def __getitem__(self, idx):
        batch_idx = self.indices[idx * self.batch_size : (idx + 1) * self.batch_size]
        batch_x = np.asarray(self.X_mmap[batch_idx], dtype=np.float32)
        batch_y = self.y[batch_idx]
        return batch_x, batch_y

    def on_epoch_end(self):
        if self.shuffle:
            np.random.shuffle(self.indices)


def apply_consecutive_confirmation(scores, threshold, min_consecutive=2):
    """Enforce consecutive positive window confirmation to eliminate transient spike noise."""
    raw_binary = scores >= threshold
    confirmed = np.zeros_like(raw_binary, dtype=bool)
    n = len(raw_binary)
    i = 0
    while i < n:
        if raw_binary[i]:
            j = i
            while j < n and raw_binary[j]:
                j += 1
            if (j - i) >= min_consecutive:
                confirmed[i:j] = True
            i = j
        else:
            i += 1
    return confirmed


def split_subjects_auto(X, y, subjects, seed):
    unique = np.unique(subjects.astype(str))
    if len(unique) < 6:
        raise ValueError(
            f"At least 6 distinct subjects are required; found {len(unique)}. "
            "Use --subjects with at least six CHB-MIT subjects."
        )
    train_idx, held_idx = next(
        GroupShuffleSplit(n_splits=1, test_size=0.4, random_state=seed).split(X, y, subjects)
    )
    held_subjects = np.asarray(subjects)[held_idx]
    val_local, test_local = next(
        GroupShuffleSplit(n_splits=1, test_size=0.5, random_state=seed + 1).split(
            X[held_idx], y[held_idx], held_subjects
        )
    )
    result = (train_idx, held_idx[val_local], held_idx[test_local])
    for name, indices in zip(("train", "validation", "test"), result):
        classes = np.unique(y[indices])
        if not np.array_equal(classes, np.array([0, 1])):
            subject_list = sorted(set(np.asarray(subjects)[indices].astype(str).tolist()))
            raise ValueError(
                f"{name} split {subject_list} does not contain both seizure and non-seizure "
                f"windows (labels={classes.tolist()}). Download more annotated and non-seizure "
                "files for the selected subjects; refusing to report misleading metrics."
            )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", required=True)
    parser.add_argument("--labels", required=True)
    parser.add_argument("--subjects", required=True, help="One subject ID per window, aligned with features.")
    parser.add_argument("--architecture", default="multiscale_cnn", choices=["multiscale_cnn", "cnn_lstm"])
    parser.add_argument("--val-subjects", default="chb01", help="Comma-separated subject IDs for validation.")
    parser.add_argument("--test-subjects", default="chb02,chb07", help="Comma-separated subject IDs for held-out test.")
    parser.add_argument("--output-dir", default="artifacts")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--window-seconds", type=float, default=10.0)
    parser.add_argument("--sampling-rate", type=int, default=128)
    parser.add_argument("--min-consecutive-windows", type=int, default=2)
    parser.add_argument("--hard-negative-mining", action="store_true", help="Run second-stage fine-tuning on hard negative false positives.")
    parser.add_argument("--channels", default=",".join(DEFAULT_CHANNELS))
    args = parser.parse_args()
    if args.epochs < 1 or args.batch_size < 1:
        parser.error("--epochs and --batch-size must be positive")

    random.seed(args.seed)
    np.random.seed(args.seed)
    keras.utils.set_random_seed(args.seed)

    X = np.load(args.features, mmap_mode="r")
    y = np.load(args.labels).astype(np.int64)
    subjects = np.load(args.subjects, allow_pickle=True).astype(str)
    if X.ndim != 3 or len(X) != len(y) or len(y) != len(subjects):
        raise ValueError("Expected X=(windows,timesteps,channels) and aligned y/subjects arrays.")
    if set(np.unique(y).tolist()) != {0, 1}:
        raise ValueError("Training labels must contain 0=non_seizure and 1=seizure.")
    channels = [part.strip().upper() for part in args.channels.split(",") if part.strip()]
    if len(channels) != X.shape[2]:
        raise ValueError(f"Channel metadata has {len(channels)} names but X has {X.shape[2]} channels.")
    if X.shape[1] != int(args.window_seconds * args.sampling_rate):
        raise ValueError("Window duration does not match the feature timestep dimension.")

    # Partition subjects
    val_subs = [s.strip() for s in args.val_subjects.split(",") if s.strip()]
    test_subs = [s.strip() for s in args.test_subjects.split(",") if s.strip()]
    available_subs = set(np.unique(subjects))

    if val_subs and test_subs and set(val_subs).issubset(available_subs) and set(test_subs).issubset(available_subs):
        val_idx = np.where(np.isin(subjects, val_subs))[0]
        test_idx = np.where(np.isin(subjects, test_subs))[0]
        train_idx = np.where(~np.isin(subjects, val_subs + test_subs))[0]
        print(f"Subject splits explicitly configured:")
        print(f"  Train ({len(train_idx)} win): {sorted(set(subjects[train_idx].tolist()))}")
        print(f"  Val   ({len(val_idx)} win): {sorted(set(subjects[val_idx].tolist()))}")
        print(f"  Test  ({len(test_idx)} win): {sorted(set(subjects[test_idx].tolist()))}")
    else:
        print("Using automatic subject-disjoint split...")
        train_idx, val_idx, test_idx = split_subjects_auto(X, y, subjects, args.seed)

    # Class weights for training
    counts = np.bincount(y[train_idx], minlength=2)
    class_weights = {int(label): float(len(train_idx) / (2 * max(1, counts[label]))) for label in (0, 1)}
    print(f"Train class balance: non-seizure={counts[0]}, seizure={counts[1]} (weight={class_weights[1]:.2f})")

    # Build architecture
    if args.architecture == "multiscale_cnn":
        model = build_multiscale_dilated_cnn(X.shape[1], X.shape[2], 2)
        model_name = "Multi-Scale Dilated Temporal CNN"
    else:
        model = build_cnn_lstm(X.shape[1], X.shape[2], 2)
        model_name = "CNN-LSTM"

    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    best_path = output / "best_model.keras"

    train_gen = MemmapBatchSequence(X, y, train_idx, batch_size=args.batch_size, shuffle=True)
    val_gen = MemmapBatchSequence(X, y, val_idx, batch_size=args.batch_size, shuffle=False)

    callbacks = [
        keras.callbacks.EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        keras.callbacks.ModelCheckpoint(str(best_path), monitor="val_loss", save_best_only=True),
        keras.callbacks.TerminateOnNaN(),
    ]

    print(f"\n--- Phase 1: Training {model_name} ({args.epochs} epochs) ---")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=args.epochs,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=2,
    )

    if best_path.exists():
        model = keras.models.load_model(best_path)

    # Optional Hard-Negative Mining fine-tuning
    if args.hard_negative_mining:
        print("\n--- Phase 2: Hard-Negative Mining Fine-Tuning ---")
        train_eval_gen = MemmapBatchSequence(X, y, train_idx, batch_size=args.batch_size, shuffle=False)
        train_preds = model.predict(train_eval_gen, verbose=0)[:, 1]
        
        # Hard negatives are non-seizure windows with false alarm probability >= 0.40
        non_seiz_in_train = train_idx[y[train_idx] == 0]
        train_preds_non_seiz = train_preds[y[train_idx] == 0]
        hard_neg_mask = train_preds_non_seiz >= 0.35
        hard_neg_idx = non_seiz_in_train[hard_neg_mask]
        print(f"Mined {len(hard_neg_idx)} hard negative non-seizure windows from training set (score >= 0.35)")

        seiz_in_train = train_idx[y[train_idx] == 1]
        easy_neg_sample = np.random.choice(non_seiz_in_train, size=min(len(non_seiz_in_train), len(seiz_in_train) * 3), replace=False)
        hnm_train_idx = np.concatenate([seiz_in_train, hard_neg_idx, easy_neg_sample])
        np.random.shuffle(hnm_train_idx)

        counts_hnm = np.bincount(y[hnm_train_idx], minlength=2)
        cw_hnm = {int(l): float(len(hnm_train_idx) / (2 * max(1, counts_hnm[l]))) for l in (0, 1)}

        hnm_train_gen = MemmapBatchSequence(X, y, hnm_train_idx, batch_size=args.batch_size, shuffle=True)
        model.compile(optimizer=keras.optimizers.Adam(learning_rate=1e-4), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
        hnm_callbacks = [
            keras.callbacks.EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True),
            keras.callbacks.ModelCheckpoint(str(best_path), monitor="val_loss", save_best_only=True),
        ]
        model.fit(
            hnm_train_gen,
            validation_data=val_gen,
            epochs=6,
            class_weight=cw_hnm,
            callbacks=hnm_callbacks,
            verbose=2,
        )
        if best_path.exists():
            model = keras.models.load_model(best_path)

    # Threshold selection strictly on validation set
    print("\n--- Validation Threshold Optimization ---")
    val_prob = model.predict(val_gen, verbose=0)[:, 1]
    candidates = np.linspace(0.1, 0.9, 17)
    val_f1_scores = [f1_score(y[val_idx], val_prob >= t, zero_division=0) for t in candidates]
    best_t_idx = int(np.argmax(val_f1_scores))
    threshold = float(candidates[best_t_idx])
    print(f"Candidate thresholds: {list(np.round(candidates, 2))}")
    print(f"Validation F1 scores: {list(np.round(val_f1_scores, 4))}")
    print(f"Selected threshold on validation set: {threshold:.2f} (Val F1: {val_f1_scores[best_t_idx]:.4f})")

    # Evaluation on held-out test set
    print("\n--- Final Evaluation on Held-Out Test Set ---")
    test_gen = MemmapBatchSequence(X, y, test_idx, batch_size=args.batch_size, shuffle=False)
    test_prob = model.predict(test_gen, verbose=0)[:, 1]
    raw_pred = (test_prob >= threshold).astype(int)

    # Raw window metrics
    cm_raw = confusion_matrix(y[test_idx], raw_pred, labels=[0, 1])
    tn_raw, fp_raw, fn_raw, tp_raw = cm_raw.ravel()
    total_hours = (len(test_idx) * args.window_seconds) / 3600.0
    fp_rate_raw = float(fp_raw / max(0.01, total_hours))

    raw_metrics = {
        "accuracy": float(accuracy_score(y[test_idx], raw_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y[test_idx], raw_pred)),
        "precision": float(precision_score(y[test_idx], raw_pred, zero_division=0)),
        "recall": float(recall_score(y[test_idx], raw_pred, zero_division=0)),
        "specificity": float(tn_raw / max(1, tn_raw + fp_raw)),
        "f1": float(f1_score(y[test_idx], raw_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y[test_idx], test_prob)),
        "average_precision": float(average_precision_score(y[test_idx], test_prob)),
        "false_positives": int(fp_raw),
        "false_positives_per_hour": fp_rate_raw,
        "confusion_matrix": cm_raw.tolist(),
    }

    # Temporally confirmed metrics
    confirmed_pred = apply_consecutive_confirmation(test_prob, threshold, args.min_consecutive_windows).astype(int)
    cm_conf = confusion_matrix(y[test_idx], confirmed_pred, labels=[0, 1])
    tn_c, fp_c, fn_c, tp_c = cm_conf.ravel()
    fp_rate_conf = float(fp_c / max(0.01, total_hours))

    confirmed_metrics = {
        "accuracy": float(accuracy_score(y[test_idx], confirmed_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y[test_idx], confirmed_pred)),
        "precision": float(precision_score(y[test_idx], confirmed_pred, zero_division=0)),
        "recall": float(recall_score(y[test_idx], confirmed_pred, zero_division=0)),
        "specificity": float(tn_c / max(1, tn_c + fp_c)),
        "f1": float(f1_score(y[test_idx], confirmed_pred, zero_division=0)),
        "false_positives": int(fp_c),
        "false_positives_per_hour": fp_rate_conf,
        "false_negatives": int(fn_c),
        "true_positives": int(tp_c),
        "true_negatives": int(tn_c),
        "confusion_matrix": cm_conf.tolist(),
    }

    print("\n--- Raw Window Metrics on Test Set ---")
    print(f"Precision: {raw_metrics['precision']*100:.2f}% | Recall: {raw_metrics['recall']*100:.2f}% | F1: {raw_metrics['f1']*100:.2f}%")
    print(f"False Positives: {raw_metrics['false_positives']} ({fp_rate_raw:.2f} FP/hr) | ROC-AUC: {raw_metrics['roc_auc']*100:.2f}%")

    print("\n--- Consecutive Confirmed Metrics (min 2 windows) ---")
    print(f"Precision: {confirmed_metrics['precision']*100:.2f}% | Recall: {confirmed_metrics['recall']*100:.2f}% | F1: {confirmed_metrics['f1']*100:.2f}%")
    print(f"False Positives: {confirmed_metrics['false_positives']} ({fp_rate_conf:.2f} FP/hr) | False Negatives: {confirmed_metrics['false_negatives']}")

    # Save artifacts
    model.save(output / "model.keras")
    
    metadata = {
        "model_version": f"chbmit-{args.architecture}-v2",
        "model_state": "research_trained",
        "architecture": f"{model_name} + Consecutive Temporal Confirmation",
        "dataset_name": "CHB-MIT Scalp EEG Database",
        "dataset_doi": "10.13026/C2K01R",
        "task_name": "seizure_window_classification",
        "window_samples": int(X.shape[1]),
        "window_seconds": float(args.window_seconds),
        "sampling_rate": int(args.sampling_rate),
        "channels": channels,
        "classes": ["non_seizure", "seizure"],
        "threshold": threshold,
        "min_consecutive_windows": int(args.min_consecutive_windows),
        "temporal_post_processing": "consecutive_window_confirmation",
        "research_only": True,
        "notice": "Research only; not for diagnosis or treatment decisions.",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2))

    full_evaluation = {
        "seed": int(args.seed),
        "architecture": args.architecture,
        "split": "subject-disjoint",
        "subjects": {
            "train": sorted(set(subjects[train_idx].tolist())),
            "validation": sorted(set(subjects[val_idx].tolist())),
            "test": sorted(set(subjects[test_idx].tolist())),
        },
        "window_counts": {
            "train": int(len(train_idx)),
            "validation": int(len(val_idx)),
            "test": int(len(test_idx)),
        },
        "class_counts": {
            split_name: {"non_seizure": int((y[idx] == 0).sum()), "seizure": int((y[idx] == 1).sum())}
            for split_name, idx in (("train", train_idx), ("validation", val_idx), ("test", test_idx))
        },
        "threshold_selected_on_validation": threshold,
        "min_consecutive_windows": int(args.min_consecutive_windows),
        "test": {
            "total_recording_hours": float(total_hours),
            "raw_metrics": raw_metrics,
            "temporally_confirmed_metrics": confirmed_metrics,
        },
        "history": {key: [float(v) for v in values] for key, values in history.history.items()},
        "dataset": "CHB-MIT Scalp EEG Database",
        "dataset_doi": "10.13026/C2K01R",
        "model": f"{model_name} + Consecutive Temporal Confirmation",
        "model_state": "research_trained",
        "clinical_notice": "Research metrics only; not a clinical diagnostic validation.",
    }
    (output / "evaluation.json").write_text(json.dumps(full_evaluation, indent=2))
    print(f"\nArtifacts successfully saved to {output.resolve()}")


if __name__ == "__main__":
    main()

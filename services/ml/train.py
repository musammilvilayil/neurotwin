"""Train and evaluate the NeuroTwin CHB-MIT seizure-window classifier.

All splits are subject-disjoint. The output is research-only and must not be
used to diagnose, rule out, or treat seizures.
"""
import argparse
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

from model import build_cnn_lstm

DEFAULT_CHANNELS = [
    "FP1-F7", "F7-T7", "T7-P7", "P7-O1", "FP2-F8", "F8-T8", "T8-P8", "P8-O2",
    "FP1-F3", "F3-C3", "C3-P3", "P3-O1", "FP2-F4", "F4-C4", "C4-P4", "P4-O2",
    "FZ-CZ", "CZ-PZ",
]


def split_subjects(X, y, subjects, seed):
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
    parser.add_argument("--output-dir", default="artifacts")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--window-seconds", type=float, default=10.0)
    parser.add_argument("--sampling-rate", type=int, default=128)
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

    train_idx, val_idx, test_idx = split_subjects(X, y, subjects, args.seed)
    # Materialize one split at a time so the full float32 array need not be duplicated.
    X_train, X_val, X_test = np.asarray(X[train_idx]), np.asarray(X[val_idx]), np.asarray(X[test_idx])
    model = build_cnn_lstm(X.shape[1], X.shape[2], 2)
    counts = np.bincount(y[train_idx], minlength=2)
    class_weights = {int(label): float(len(train_idx) / (2 * max(1, counts[label]))) for label in (0, 1)}

    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    best_path = output / "best_model.keras"
    callbacks = [
        keras.callbacks.EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True),
        keras.callbacks.ModelCheckpoint(str(best_path), monitor="val_loss", save_best_only=True),
        keras.callbacks.TerminateOnNaN(),
    ]
    history = model.fit(
        X_train, y[train_idx], validation_data=(X_val, y[val_idx]),
        epochs=args.epochs, batch_size=args.batch_size, class_weight=class_weights,
        callbacks=callbacks, verbose=2,
    )
    if best_path.exists():
        model = keras.models.load_model(best_path)

    val_prob = model.predict(X_val, batch_size=args.batch_size, verbose=0)[:, 1]
    # Select a threshold on validation only; the test set remains untouched until final evaluation.
    candidates = np.linspace(0.1, 0.9, 17)
    val_f1 = [f1_score(y[val_idx], val_prob >= t, zero_division=0) for t in candidates]
    threshold = float(candidates[int(np.argmax(val_f1))])

    test_prob = model.predict(X_test, batch_size=args.batch_size, verbose=0)[:, 1]
    predicted = (test_prob >= threshold).astype(int)
    metrics = {
        "seed": int(args.seed),
        "split": "subject-disjoint",
        "subjects": {
            "train": sorted(set(subjects[train_idx].tolist())),
            "validation": sorted(set(subjects[val_idx].tolist())),
            "test": sorted(set(subjects[test_idx].tolist())),
        },
        "window_counts": {"train": int(len(train_idx)), "validation": int(len(val_idx)), "test": int(len(test_idx))},
        "class_counts": {
            split_name: {"non_seizure": int((y[idx] == 0).sum()), "seizure": int((y[idx] == 1).sum())}
            for split_name, idx in (("train", train_idx), ("validation", val_idx), ("test", test_idx))
        },
        "threshold_selected_on_validation": threshold,
        "test": {
            "accuracy": float(accuracy_score(y[test_idx], predicted)),
            "balanced_accuracy": float(balanced_accuracy_score(y[test_idx], predicted)),
            "precision": float(precision_score(y[test_idx], predicted, zero_division=0)),
            "recall": float(recall_score(y[test_idx], predicted, zero_division=0)),
            "f1": float(f1_score(y[test_idx], predicted, zero_division=0)),
            "roc_auc": float(roc_auc_score(y[test_idx], test_prob)),
            "average_precision": float(average_precision_score(y[test_idx], test_prob)),
            "confusion_matrix": confusion_matrix(y[test_idx], predicted, labels=[0, 1]).tolist(),
            "classification_report": classification_report(
                y[test_idx], predicted, labels=[0, 1],
                target_names=["non_seizure", "seizure"], output_dict=True, zero_division=0
            ),
        },
        "history": {key: [float(v) for v in values] for key, values in history.history.items()},
        "dataset": "CHB-MIT Scalp EEG Database",
        "dataset_doi": "10.13026/C2K01R",
        "model": "CNN-LSTM",
        "model_state": "research_trained",
        "clinical_notice": "Research metrics only; not a clinical diagnostic validation.",
    }
    model.save(output / "model.keras")
    (output / "metadata.json").write_text(json.dumps({
        "model_version": "chbmit-cnn-lstm-research-v1",
        "model_state": "research_trained",
        "dataset_name": "CHB-MIT Scalp EEG Database",
        "dataset_doi": "10.13026/C2K01R",
        "task_name": "seizure_window_classification",
        "window_samples": int(X.shape[1]),
        "window_seconds": float(args.window_seconds),
        "sampling_rate": int(args.sampling_rate),
        "channels": channels,
        "classes": ["non_seizure", "seizure"],
        "threshold": threshold,
        "research_only": True,
        "notice": "Research only; not for diagnosis or treatment decisions.",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
    }, indent=2))
    (output / "evaluation.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps({"artifact_dir": str(output), "metrics_file": str(output / "evaluation.json"), "test": metrics["test"]}, indent=2))


if __name__ == "__main__":
    main()

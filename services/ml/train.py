from __future__ import annotations

import argparse
import random
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.utils import class_weight

from model import build_cnn_lstm, make_model_metadata
from preprocessing import export_json, split_subjectwise_windows


def set_seed(seed: int = 42) -> None:
    random.seed(seed)
    np.random.seed(seed)
    try:
        import tensorflow as tf
        tf.random.set_seed(seed)
    except Exception:
        pass


def compute_class_weights(labels: np.ndarray) -> dict[int, float]:
    if labels.ndim != 1:
        labels = labels.ravel()
    weights = class_weight.compute_class_weight("balanced", classes=np.unique(labels), y=labels)
    return {int(label): float(weight) for label, weight in zip(np.unique(labels), weights)}


def load_features_and_labels(features_path: str | Path, labels_path: str | Path):
    X = np.load(features_path)
    y = np.load(labels_path)
    if X.ndim != 3 or len(X) != len(y):
        raise ValueError("X must be shaped (n_windows, timesteps, channels) and match y length.")
    return X, y.astype(np.int32)


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray) -> dict:
    preds = model.predict(X_test, verbose=0)
    predicted_labels = np.argmax(preds, axis=1)
    return {
        "accuracy": float(accuracy_score(y_test, predicted_labels)),
        "precision": float(precision_score(y_test, predicted_labels, average="weighted", zero_division=0)),
        "recall": float(recall_score(y_test, predicted_labels, average="weighted", zero_division=0)),
        "f1": float(f1_score(y_test, predicted_labels, average="weighted", zero_division=0)),
        "confusion_matrix": confusion_matrix(y_test, predicted_labels).tolist(),
        "classification_report": classification_report(y_test, predicted_labels, output_dict=True, zero_division=0),
    }


def prepare_training_data(features_path: str | Path, labels_path: str | Path, subject_ids_path: str | Path | None = None, train_ratio: float = 0.7, val_ratio: float = 0.15):
    X, y = load_features_and_labels(features_path, labels_path)
    if subject_ids_path is None:
        subject_ids = np.arange(len(y), dtype=int)
    else:
        subject_ids = np.load(subject_ids_path)
    if len(subject_ids) != len(y):
        raise ValueError("subject_ids length must match labels length.")

    splits = split_subjectwise_windows(subject_ids.tolist(), test_size=1.0 - train_ratio - val_ratio, val_size=val_ratio, random_state=42)
    train_idx = splits["train"]
    val_idx = splits["validation"]
    test_idx = splits["test"]
    if len(train_idx) == 0 or len(val_idx) == 0 or len(test_idx) == 0:
        raise ValueError("Subject-wise split did not create non-empty train/validation/test sets.")
    return X[train_idx], y[train_idx], X[val_idx], y[val_idx], X[test_idx], y[test_idx]


def train_pipeline(
    features_path: str | Path,
    labels_path: str | Path,
    dataset_name: str,
    task_name: str,
    output_dir: str | Path,
    epochs: int = 25,
    learning_rate: float = 1e-3,
    subject_ids_path: str | Path | None = None,
    batch_size: int = 32,
    seed: int = 42,
):
    set_seed(seed)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    X_train, y_train, X_val, y_val, X_test, y_test = prepare_training_data(
        features_path,
        labels_path,
        subject_ids_path=subject_ids_path,
        train_ratio=0.7,
        val_ratio=0.15,
    )

    model = build_cnn_lstm(X_train.shape[1], X_train.shape[2], len(np.unique(y_train)), learning_rate=learning_rate)
    class_weights_map = compute_class_weights(y_train)
    class_weight_tensor = {int(label): float(weight) for label, weight in class_weights_map.items()}

    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

    early_stop = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
    checkpoint_path = output_dir / "best_model.keras"
    checkpoint = ModelCheckpoint(str(checkpoint_path), monitor="val_loss", save_best_only=True, save_weights_only=False)

    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        class_weight=class_weight_tensor,
        callbacks=[early_stop, checkpoint],
        verbose=0,
    )

    metrics = evaluate_model(model, X_test, y_test)
    metrics["history"] = {
        "training_loss": [float(v) for v in history.history["loss"]],
        "validation_loss": [float(v) for v in history.history["val_loss"]],
        "training_accuracy": [float(v) for v in history.history["accuracy"]],
        "validation_accuracy": [float(v) for v in history.history["val_accuracy"]],
    }
    metrics["dataset_name"] = dataset_name
    metrics["task_name"] = task_name
    metrics["model_state"] = "trained"
    metrics["model_version"] = "research-v0.1"
    metrics["research_only"] = True
    metrics["notice"] = "Research only / not diagnostic."

    export_json(metrics, output_dir / "metrics.json")
    pd.DataFrame([
        {
            "epoch": idx + 1,
            "loss": float(loss),
            "val_loss": float(val_loss),
            "accuracy": float(acc),
            "val_accuracy": float(val_acc),
        }
        for idx, (loss, val_loss, acc, val_acc) in enumerate(
            zip(history.history["loss"], history.history["val_loss"], history.history["accuracy"], history.history["val_accuracy"])
        )
    ]).to_csv(output_dir / "training_history.csv", index=False)

    model_metadata = make_model_metadata(dataset_name, task_name, model_state="trained", model_version="research-v0.1")
    export_json(model_metadata, output_dir / "model_metadata.json")
    model.save(output_dir / "model.keras")
    return {"model": model, "metrics": metrics, "metadata": model_metadata}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a research-only CNN-LSTM EEG classifier.")
    parser.add_argument("--features", required=True, help="Path to X.npy file with shape (n, timesteps, channels).")
    parser.add_argument("--labels", required=True, help="Path to y.npy file with integer labels.")
    parser.add_argument("--subject-ids", default=None, help="Optional array of subject IDs aligned with labels.")
    parser.add_argument("--dataset-name", default="research_dataset", help="Human-readable dataset name.")
    parser.add_argument("--task-name", default="classification", help="Task name for the trained model metadata.")
    parser.add_argument("--output-dir", default="model_artifacts", help="Directory for metrics and final model.")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train_pipeline(
        features_path=args.features,
        labels_path=args.labels,
        dataset_name=args.dataset_name,
        task_name=args.task_name,
        output_dir=args.output_dir,
        epochs=args.epochs,
        learning_rate=args.learning_rate,
        subject_ids_path=args.subject_ids,
        batch_size=args.batch_size,
        seed=args.seed,
    )
    print("Training complete. Research-only metrics were exported and the model was saved to disk.")

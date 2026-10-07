from __future__ import annotations

from typing import Any

from tensorflow import keras
from tensorflow.keras import layers


def build_cnn_lstm(
    timesteps: int,
    channels: int,
    classes: int,
    learning_rate: float = 1e-3,
    lstm_units: int = 64,
    dropout_rate: float = 0.3,
):
    inputs = keras.Input((timesteps, channels), name="eeg")
    x = layers.Conv1D(64, kernel_size=7, padding="same", activation="relu")(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling1D(pool_size=2)(x)
    x = layers.Conv1D(128, kernel_size=5, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling1D(pool_size=2)(x)
    x = layers.LSTM(lstm_units, return_sequences=False)(x)
    x = layers.Dropout(dropout_rate)(x)
    outputs = layers.Dense(classes, activation="softmax", name="probabilities")(x)
    model = keras.Model(inputs=inputs, outputs=outputs, name="neurotwin_cnn_lstm")
    optimizer = keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def make_model_metadata(dataset_name: str, task_name: str, model_state: str = "untrained/demo", model_version: str = "research-v0.1") -> dict[str, Any]:
    return {
        "model_version": model_version,
        "dataset_name": dataset_name,
        "task_name": task_name,
        "model_state": model_state,
        "confidence": 0.0,
        "research_only": True,
        "notice": "Research only / not diagnostic.",
    }

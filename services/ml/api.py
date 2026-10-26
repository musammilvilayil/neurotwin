"""Research EEG inference service; outputs are never clinical diagnoses."""
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from tensorflow import keras

from preprocessing import load_edf, preprocess, windows

app = FastAPI(title="NeuroTwin ML Service", version="1.1.0")
ARTIFACT_DIR = Path(os.getenv("MODEL_ARTIFACT_DIR", "artifacts"))
_MODEL = None
_MODEL_KEY = None


def artifacts():
    model_path = ARTIFACT_DIR / "model.keras"
    metadata_path = ARTIFACT_DIR / "metadata.json"
    if not model_path.is_file() or not metadata_path.is_file():
        return None, None
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None, None
    if metadata.get("model_state") != "research_trained":
        return None, metadata
    return model_path, metadata


def get_model(model_path: Path):
    global _MODEL, _MODEL_KEY
    key = (str(model_path.resolve()), model_path.stat().st_mtime_ns)
    if _MODEL is None or _MODEL_KEY != key:
        _MODEL = keras.models.load_model(model_path)
        _MODEL_KEY = key
    return _MODEL


def normalise_channel(name: str) -> str:
    value = name.upper().strip().replace("EEG ", "")
    value = value.replace("-REF", "").replace("-LE", "").replace("--", "-")
    aliases = {"T3": "T7", "T4": "T8", "T5": "P7", "T6": "P8"}
    return "-".join(aliases.get(part, part) for part in value.split("-"))


def select_model_channels(raw, required_channels):
    index = {normalise_channel(name): name for name in raw.ch_names}
    missing = [name for name in required_channels if normalise_channel(name) not in index]
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "channel_mismatch",
                "message": "This research model requires the CHB-MIT bipolar channel montage. "
                           "The uploaded EDF is missing required channels.",
                "missing_channels": missing,
                "required_channels": required_channels,
            },
        )
    names = [index[normalise_channel(name)] for name in required_channels]
    return raw.copy().pick_channels(names, ordered=True)


@app.get("/health")
def health():
    model_path, metadata = artifacts()
    return {
        "status": "ok",
        "service": "neurotwin-ml",
        "model_state": "ready" if model_path else "not_ready",
        "model_metadata": metadata,
        "clinical_boundary": "Research only. Not for diagnosis, treatment, or ruling out seizures.",
    }


@app.post("/inspect-eeg")
async def inspect_eeg(file: UploadFile = File(...)):
    """Inspect EDF metadata and preprocessing readiness without making predictions."""
    if not file.filename or not file.filename.lower().endswith(".edf"):
        raise HTTPException(400, "This service accepts EDF files only.")
    with NamedTemporaryFile(suffix=".edf") as temp:
        temp.write(await file.read())
        temp.flush()
        try:
            raw = load_edf(temp.name)
            cleaned, data = preprocess(raw)
        except (ValueError, RuntimeError, OSError) as exc:
            raise HTTPException(422, f"Unable to parse/preprocess EDF: {exc}") from exc
    model_path, metadata = artifacts()
    return {
        "state": "preprocessed_no_inference",
        "samples": int(data.shape[0]),
        "channels": int(data.shape[1]),
        "channel_names": cleaned.ch_names,
        "sampling_rate": float(cleaned.info["sfreq"]),
        "model_state": "ready" if model_path else "not_ready",
        "model_metadata": metadata,
        "notice": "Preprocessing metadata only; this is not a clinical finding.",
    }


@app.post("/infer")
async def infer(file: UploadFile = File(...)):
    """Return per-window experimental scores only when trained artifacts exist."""
    model_path, metadata = artifacts()
    if not model_path:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "model_not_ready",
                "message": "No trained research artifact is installed. Prepare data, train, and evaluate the model first.",
            },
        )
    if not file.filename or not file.filename.lower().endswith(".edf"):
        raise HTTPException(400, "Only EDF files are accepted.")
    required_channels = metadata.get("channels")
    if not isinstance(required_channels, list) or len(required_channels) != int(metadata.get("channels_count", len(required_channels or []))):
        raise HTTPException(503, "Model metadata has no valid channel specification.")

    with NamedTemporaryFile(suffix=".edf") as temp:
        temp.write(await file.read())
        temp.flush()
        try:
            raw = load_edf(temp.name)
            selected = select_model_channels(raw, required_channels)
            cleaned, data = preprocess(
                selected,
                resample_hz=float(metadata.get("sampling_rate", 128)),
            )
            sample_rate = float(cleaned.info["sfreq"])
            window_seconds = float(metadata.get("window_seconds", metadata["window_samples"] / sample_rate))
            X, _, starts = windows(data, sample_rate, [], window_seconds, window_seconds)
        except HTTPException:
            raise
        except (ValueError, RuntimeError, OSError, KeyError) as exc:
            raise HTTPException(422, f"Unable to prepare EDF for model input: {exc}") from exc
    if not len(X):
        raise HTTPException(422, "Recording is shorter than one model window.")
    model = get_model(model_path)
    probabilities = model.predict(X, batch_size=32, verbose=0)
    if probabilities.ndim != 2 or probabilities.shape[1] != 2:
        raise HTTPException(503, "The installed model output shape is incompatible with seizure-window scoring.")
    scores = probabilities[:, 1]
    threshold = float(metadata.get("threshold", 0.5))
    step = max(1, int(sample_rate // 8))
    return {
        "model_state": "trained_research_model",
        "model_version": metadata.get("model_version", "unknown"),
        "dataset_name": metadata.get("dataset_name", "unknown"),
        "task_name": metadata.get("task_name", "seizure_window_classification"),
        "sampling_rate": sample_rate,
        "channels": cleaned.ch_names,
        "waveform": data[: min(len(data), int(sample_rate * 30)):step].mean(axis=1).tolist(),
        "timeline": [
            {"start_seconds": round(float(start), 2), "score": round(float(score), 5)}
            for start, score in zip(starts, scores)
        ],
        "summary": {
            "max_score": round(float(scores.max()), 5),
            "windows_at_or_above_research_threshold": int((scores >= threshold).sum()),
            "threshold": threshold,
            "window_count": int(len(scores)),
        },
        "research_only": True,
        "notice": "Experimental EEG window scores are not diagnoses. Do not use them for treatment or emergency decisions.",
    }

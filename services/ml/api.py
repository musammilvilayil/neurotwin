"""Research EEG inference service; outputs are never clinical diagnoses."""
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from tensorflow import keras

from preprocessing import load_edf, preprocess, windows

app = FastAPI(title="NeuroTwin ML Service", version="1.2.1")
ARTIFACT_DIR = Path(os.getenv("MODEL_ARTIFACT_DIR", "artifacts"))
MAX_EDF_BYTES = 50 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 1024 * 1024
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
    if not isinstance(metadata, dict) or metadata.get("model_state") != "research_trained":
        return None, metadata if isinstance(metadata, dict) else None
    return model_path, metadata


def get_model(model_path: Path):
    global _MODEL, _MODEL_KEY
    try:
        key = (str(model_path.resolve()), model_path.stat().st_mtime_ns)
        if _MODEL is None or _MODEL_KEY != key:
            _MODEL = keras.models.load_model(model_path)
            _MODEL_KEY = key
    except (OSError, ValueError, TypeError) as exc:
        raise HTTPException(503, "The installed research model could not be loaded.") from exc
    return _MODEL


def normalise_channel(name: str) -> str:
    value = name.upper().strip().replace("EEG ", "")
    value = value.replace("-REF", "").replace("-LE", "").replace("--", "-")
    aliases = {"T3": "T7", "T4": "T8", "T5": "P7", "T6": "P8"}
    return "-".join(aliases.get(part, part) for part in value.split("-"))


def select_model_channels(raw, required_channels):
    required = {normalise_channel(name) for name in required_channels}
    index = {}
    for name in raw.ch_names:
        normalized = normalise_channel(name)
        index.setdefault(normalized, name)
        for required_name in required:
            suffix = f"{required_name}-"
            if normalized.startswith(suffix) and normalized[len(suffix):].isdigit():
                index.setdefault(required_name, name)
    missing = [name for name in required_channels if normalise_channel(name) not in index]
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "channel_mismatch",
                "message": "The uploaded EDF is missing channels required by this research model.",
                "missing_channels": missing,
                "required_channels": required_channels,
            },
        )
    names = [index[normalise_channel(name)] for name in required_channels]
    return raw.copy().pick_channels(names, ordered=True)


async def save_upload(file: UploadFile, destination: Path):
    """Stream an upload to a temporary file and enforce a hard size limit."""
    total = 0
    with destination.open("wb") as output:
        while True:
            chunk = await file.read(UPLOAD_CHUNK_BYTES)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_EDF_BYTES:
                raise HTTPException(413, "EDF file exceeds the 50 MB upload limit.")
            output.write(chunk)
    if total == 0:
        raise HTTPException(400, "The uploaded EDF file is empty.")


def validate_edf_name(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".edf"):
        raise HTTPException(400, "Only EDF files are accepted.")


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
    validate_edf_name(file)
    with TemporaryDirectory(prefix="neurotwin-edf-") as directory:
        temp_path = Path(directory) / "upload.edf"
        await save_upload(file, temp_path)
        try:
            raw = load_edf(temp_path)
            cleaned, data = preprocess(raw)
        except HTTPException:
            raise
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
    validate_edf_name(file)
    model_path, metadata = artifacts()
    if not model_path:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "model_not_ready",
                "message": "No trained research artifact is installed. Prepare data, train, and evaluate the model first.",
            },
        )

    required_channels = metadata.get("channels")
    if (
        not isinstance(required_channels, list)
        or not required_channels
        or not all(isinstance(name, str) and name.strip() for name in required_channels)
        or len(set(normalise_channel(name) for name in required_channels)) != len(required_channels)
    ):
        raise HTTPException(503, "Model metadata has no valid, unique channel specification.")

    try:
        sample_rate = float(metadata.get("sampling_rate", 128))
        if not np.isfinite(sample_rate) or sample_rate <= 0:
            raise ValueError("Invalid sampling rate in model metadata.")
        raw_window_seconds = metadata.get("window_seconds")
        if raw_window_seconds is None:
            window_samples = metadata.get("window_samples")
            if window_samples is None:
                raise ValueError("Model metadata is missing window_seconds/window_samples.")
            raw_window_seconds = float(window_samples) / sample_rate
        window_seconds = float(raw_window_seconds)
        if not np.isfinite(window_seconds) or window_seconds <= 0:
            raise ValueError("Invalid window duration in model metadata.")
        threshold = float(metadata.get("threshold", 0.5))
        if not np.isfinite(threshold) or not 0 <= threshold <= 1:
            raise ValueError("Invalid classification threshold in model metadata.")
    except (TypeError, ValueError, ZeroDivisionError) as exc:
        raise HTTPException(503, f"Invalid model metadata: {exc}") from exc

    with TemporaryDirectory(prefix="neurotwin-edf-") as directory:
        temp_path = Path(directory) / "upload.edf"
        await save_upload(file, temp_path)
        try:
            raw = load_edf(temp_path)
            selected = select_model_channels(raw, required_channels)
            cleaned, data = preprocess(selected, resample_hz=sample_rate)
            actual_sample_rate = float(cleaned.info["sfreq"])
            X, _, starts = windows(data, actual_sample_rate, [], window_seconds, window_seconds)
        except HTTPException:
            raise
        except (ValueError, RuntimeError, OSError, KeyError) as exc:
            raise HTTPException(422, f"Unable to prepare EDF for model input: {exc}") from exc

    if not len(X):
        raise HTTPException(422, "Recording is shorter than one model window.")

    model = get_model(model_path)
    input_shape = getattr(model, "input_shape", None)
    if isinstance(input_shape, tuple) and len(input_shape) == 3:
        expected_steps, expected_channels = input_shape[1], input_shape[2]
        if expected_steps is not None and int(expected_steps) != X.shape[1]:
            raise HTTPException(503, "EDF window dimensions do not match the installed model.")
        if expected_channels is not None and int(expected_channels) != X.shape[2]:
            raise HTTPException(503, "EDF channel dimensions do not match the installed model.")

    try:
        probabilities = np.asarray(model.predict(X, batch_size=32, verbose=0))
    except (ValueError, RuntimeError, OSError) as exc:
        raise HTTPException(503, "Research model inference failed for this EDF.") from exc
    if (
        probabilities.ndim != 2
        or probabilities.shape != (len(X), 2)
        or not np.isfinite(probabilities).all()
        or np.any(probabilities < 0)
        or np.any(probabilities > 1)
        or not np.allclose(probabilities.sum(axis=1), 1.0, atol=1e-3)
    ):
        raise HTTPException(503, "The installed model returned invalid class probabilities.")

    scores = probabilities[:, 1]
    step = max(1, int(actual_sample_rate // 8))
    return {
        "model_state": "trained_research_model",
        "model_version": metadata.get("model_version", "unknown"),
        "dataset_name": metadata.get("dataset_name", "unknown"),
        "task_name": metadata.get("task_name", "seizure_window_classification"),
        "sampling_rate": actual_sample_rate,
        "channels": cleaned.ch_names,
        "waveform": data[: min(len(data), int(actual_sample_rate * 30)):step].mean(axis=1).tolist(),
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

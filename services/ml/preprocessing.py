from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Sequence

import mne
import numpy as np


EEG_CHANNEL_HINTS = [
    "Fp1", "Fp2", "F7", "F3", "Fz", "F4", "F8",
    "T7", "C3", "Cz", "C4", "T8",
    "P7", "P3", "Pz", "P4", "P8",
    "O1", "O2", "Oz", "A1", "A2",
]


def load_edf(path: str | Path):
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(file_path)
    if file_path.suffix.lower() == ".edf":
        return mne.io.read_raw_edf(file_path, preload=True, verbose=False)
    if file_path.suffix.lower() == ".bdf":
        return mne.io.read_raw_bdf(file_path, preload=True, verbose=False)
    if file_path.suffix.lower() in {".fif", ".fif.gz"}:
        return mne.io.read_raw_fif(file_path, preload=True, verbose=False)
    raise ValueError(f"Unsupported EEG format: {file_path.suffix!r}.")


def validate_channels(raw: mne.io.BaseRaw, required: Sequence[str] | None = None) -> List[str]:
    ch_types = raw.get_channel_types()
    eeg_names = [name for name, ch_type in zip(raw.info["ch_names"], ch_types) if ch_type == "eeg"]
    if not eeg_names:
        raise ValueError("The input signal contains no EEG channels.")
    if required is not None:
        missing = [name for name in required if name not in eeg_names]
        if missing:
            raise ValueError(f"Missing required channels: {missing}")
    return eeg_names


def bandpass_and_notch(raw: mne.io.BaseRaw, low_hz: float = 0.5, high_hz: float = 40.0, notch_hz: Sequence[int] | None = None) -> mne.io.BaseRaw:
    filtered = raw.copy().pick_types(eeg=True)
    filtered.filter(l_freq=low_hz, h_freq=high_hz, fir_design="firwin", verbose=False)
    noise_freqs = list(notch_hz) if notch_hz else []
    if not noise_freqs:
        sample_rate = float(filtered.info["sfreq"])
        if sample_rate >= 50:
            noise_freqs.append(50.0)
        if sample_rate >= 60:
            noise_freqs.append(60.0)
    if noise_freqs:
        filtered.notch_filter(freqs=sorted(set(noise_freqs)), picks="eeg", filter_length="auto", verbose=False)
    return filtered


def resample_if_justified(raw: mne.io.BaseRaw, target_hz: float = 128.0) -> mne.io.BaseRaw:
    current_hz = float(raw.info["sfreq"])
    if target_hz is not None and current_hz > target_hz:
        return raw.copy().resample(target_hz, verbose=False)
    return raw


def preprocess(raw, low_hz: float = 0.5, high_hz: float = 40.0, resample_hz: float = 128.0):
    cleaned = raw.copy().pick_types(eeg=True)
    cleaned.filter(low_hz, high_hz, verbose=False)
    if resample_hz and cleaned.info["sfreq"] != resample_hz:
        cleaned.resample(resample_hz, verbose=False)
    data = cleaned.get_data().T
    scale = np.std(data, axis=0, keepdims=True) + 1e-8
    data = (data - np.mean(data, axis=0, keepdims=True)) / scale
    return cleaned, data.astype("float32")


def load_raw(path: str | Path) -> mne.io.BaseRaw:
    return load_edf(path)


def make_windows(signal: np.ndarray, window_size: int, step_size: int | None = None) -> np.ndarray:
    if signal.ndim != 2:
        raise ValueError("Signal must be shaped (samples, channels).")
    if window_size <= 0:
        raise ValueError("window_size must be positive.")
    step = step_size or window_size
    if step <= 0:
        raise ValueError("step_size must be positive.")
    windows = []
    for start in range(0, signal.shape[0] - window_size + 1, step):
        windows.append(signal[start : start + window_size, :])
    if not windows:
        raise ValueError("Window generation produced no windows; the signal is too short.")
    return np.stack(windows, axis=0)


def normalize_per_channel(windowed: np.ndarray) -> np.ndarray:
    mean = windowed.mean(axis=1, keepdims=True)
    std = windowed.std(axis=1, keepdims=True)
    std = np.where(std < 1e-8, 1.0, std)
    return ((windowed - mean) / std).astype(np.float32)


def extract_subject_and_experiment(file_path: str | Path) -> Dict[str, str | None]:
    path = Path(file_path)
    name = path.name.lower()
    subject_match = re.search(r"(?:subject|sub|participant)[_-]?(?:id)?[_-]?([0-9]+)", name)
    if subject_match is None:
        subject_match = re.search(r"(?:^|[_\-])(\d{2,})[._-]?(?:eeg|edf|bdf|fif)", name)

    experiment_match = re.search(r"(?:experiment|exp|session)[_-]?([0-9a-z]+)", name)
    if experiment_match is None:
        experiment_match = re.search(r"(?:t0|t1|t2|run[0-9]+)", name)

    experiment_value = None
    if experiment_match is not None:
        if experiment_match.lastindex:
            experiment_value = experiment_match.group(1)
        else:
            experiment_value = experiment_match.group(0)

    return {
        "subject_id": subject_match.group(1) if subject_match else None,
        "experiment_id": experiment_value,
        "dataset_name": path.parent.name,
        "filename": path.name,
    }


def map_run_number_to_label(value: str | int | None) -> str:
    if value is None:
        return "unknown"
    token = str(value).strip().upper()
    if token in {"REST", "T0", "BASELINE", "BASELINE_RUN"}:
        return "rest"
    if token.startswith("T") and token[1:].isdigit():
        return f"run_{int(token[1:])}"
    if token.startswith("RUN") and token[3:].isdigit():
        return f"run_{int(token[3:])}"
    if token.isdigit():
        return f"run_{int(token)}"
    if "REST" in token:
        return "rest"
    return token.lower().replace(" ", "_")


run_number_to_label = map_run_number_to_label


def preprocess_eeg_record(
    path: str | Path,
    low_hz: float = 0.5,
    high_hz: float = 40.0,
    target_hz: float = 128.0,
    window_size: int = 512,
    step_size: int | None = None,
    required_channels: Sequence[str] | None = None,
    notch_hz: Sequence[int] | None = None,
) -> Dict[str, Any]:
    raw = load_raw(path)
    channels = validate_channels(raw, required_channels or EEG_CHANNEL_HINTS)
    filtered = bandpass_and_notch(raw, low_hz=low_hz, high_hz=high_hz, notch_hz=notch_hz)
    filtered = resample_if_justified(filtered, target_hz=target_hz)
    signal = filtered.get_data(picks=channels).T
    windows = make_windows(signal, window_size=window_size, step_size=step_size)
    normalized = normalize_per_channel(windows)
    metadata = extract_subject_and_experiment(path)
    metadata["sample_rate"] = float(filtered.info["sfreq"])
    metadata["channels"] = channels
    metadata["window_count"] = int(normalized.shape[0])
    metadata["window_size_samples"] = int(window_size)
    return {"raw": filtered, "data": normalized.astype(np.float32), "channels": channels, "metadata": metadata}


def parse_physionet_dataset(root_dir: str | Path, dataset_type: str = "auditory") -> Dict[str, Any]:
    dataset_root = Path(root_dir)
    if not dataset_root.exists():
        raise FileNotFoundError(f"Dataset directory not found: {dataset_root}")
    eeg_files = [path for path in sorted(dataset_root.rglob("*")) if path.is_file() and path.suffix.lower() in {".edf", ".bdf", ".fif", ".fif.gz"}]
    records = []
    for path in eeg_files:
        info = extract_subject_and_experiment(path)
        info["dataset_type"] = dataset_type
        info["path"] = str(path)
        records.append(info)
    return {"dataset_type": dataset_type, "dataset_root": str(dataset_root), "record_count": len(records), "records": records, "files": [str(path) for path in eeg_files]}


def prepare_motor_imagery_dataset(root_dir: str | Path) -> Dict[str, Any]:
    dataset = parse_physionet_dataset(root_dir, dataset_type="motor_imagery")
    prepared = {"dataset_name": "motor_imagery", "runs": []}
    for record in dataset["records"]:
        raw_name = (record.get("filename") or "").lower()
        if "rest" in raw_name:
            label = "rest"
        elif "imagery" in raw_name or "mi" in raw_name:
            label = "motor_imagery"
        elif "execution" in raw_name or "me" in raw_name:
            label = "motor_execution"
        else:
            label = map_run_number_to_label(record.get("experiment_id"))
        prepared["runs"].append({**record, "task_label": label})
    return prepared


def subject_wise_split(subject_ids: Sequence[str], test_size: float = 0.2, val_size: float = 0.2, random_state: int = 42) -> Dict[str, List[str]]:
    if not subject_ids:
        return {"train": [], "validation": [], "test": []}

    unique_subjects = list(dict.fromkeys(str(subject_id) for subject_id in subject_ids))
    rng = np.random.default_rng(random_state)
    shuffled = unique_subjects.copy()
    rng.shuffle(shuffled)

    n_total = len(shuffled)
    test_count = max(1, int(round(n_total * test_size))) if n_total > 1 else 0
    validation_count = max(1, int(round(n_total * val_size))) if n_total > 1 else 0

    if test_count + validation_count >= n_total:
        test_count = max(1, n_total // 3)
        validation_count = max(1, (n_total - test_count) // 2)

    remaining = n_total - test_count
    validation_count = min(validation_count, max(1, remaining - 1))
    train_count = n_total - test_count - validation_count
    _ = train_count

    test_subjects = shuffled[:test_count]
    validation_subjects = shuffled[test_count : test_count + validation_count]
    train_subjects = shuffled[test_count + validation_count :]
    return {"train": train_subjects, "validation": validation_subjects, "test": test_subjects}


def split_subjectwise_windows(subject_ids: Sequence[str], test_size: float = 0.2, val_size: float = 0.2, random_state: int = 42) -> Dict[str, np.ndarray]:
    split_subjects = subject_wise_split(subject_ids, test_size=test_size, val_size=val_size, random_state=random_state)
    split_lookup = {subject: "train" for subject in split_subjects["train"]}
    split_lookup.update({subject: "validation" for subject in split_subjects["validation"]})
    split_lookup.update({subject: "test" for subject in split_subjects["test"]})

    splits = {"train": [], "validation": [], "test": []}
    for index, subject_id in enumerate(subject_ids):
        splits[split_lookup.get(str(subject_id), "train")].append(index)
    return {name: np.asarray(indices, dtype=int) for name, indices in splits.items()}


def build_dataset_summary(dataset_name: str, task_name: str, status: str = "research_only") -> Dict[str, Any]:
    summary = {
        "dataset_name": dataset_name,
        "task_name": task_name,
        "model_state": status,
        "research_only": True,
        "notice": "Research only / not diagnostic.",
    }
    if "auditory" in dataset_name.lower():
        summary["digital_twin_logic"] = "participant baseline and experiment-level signal deviation"
        summary["trend_description"] = "Compare each participant's baseline EEG profile against experiment-level deviations while withholding clinical interpretation."
    elif "motor" in dataset_name.lower() or "imagery" in dataset_name.lower():
        summary["digital_twin_logic"] = "longitudinal rest vs imagery probability trend"
        summary["trend_description"] = "Track rest, execution, and imagery class probabilities over time without claiming patient health status."
    else:
        summary["digital_twin_logic"] = "research-state trend tracking"
        summary["trend_description"] = "Track model confidence and label probabilities in a research-only longitudinal view."
    return summary


def export_json(data: Dict[str, Any], path: str | Path) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, sort_keys=True)

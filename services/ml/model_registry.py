"""Model availability registry. Never substitutes predictions for absent artifacts."""
import json
from pathlib import Path

MODEL_SPECS = {
    "seizure": {"label": "Seizure detection", "artifact": "model.keras", "metadata": "metadata.json", "input": "EDF EEG", "stage": "research"},
    "sleep": {"label": "Sleep staging", "artifact": "sleep/model.joblib", "metadata": "sleep/metadata.json", "input": "Sleep EEG with validated channel montage", "stage": "planned"},
    "alzheimers": {"label": "Alzheimer's EEG research", "artifact": "alzheimers/model.bin", "metadata": "alzheimers/metadata.json", "input": "Dataset-compatible EEG", "stage": "experimental"},
    "parkinsons": {"label": "Parkinson's EEG research", "artifact": "parkinsons/model.bin", "metadata": "parkinsons/metadata.json", "input": "Dataset-compatible EEG", "stage": "experimental"},
    "depression": {"label": "Depression EEG research", "artifact": "depression/model.bin", "metadata": "depression/metadata.json", "input": "Dataset-compatible EEG", "stage": "experimental"},
    "schizophrenia": {"label": "Schizophrenia EEG research", "artifact": "schizophrenia/model.bin", "metadata": "schizophrenia/metadata.json", "input": "Dataset-compatible EEG", "stage": "experimental"},
}

def list_models(artifact_dir):
    """An artifact alone is not sufficient: only implemented and validated adapters are ready."""
    root = Path(artifact_dir)
    result = []
    for key, spec in MODEL_SPECS.items():
        model = root / spec["artifact"]
        metadata = root / spec["metadata"]
        installed = model.is_file() and metadata.is_file()
        valid_metadata = False
        if installed:
            try:
                details = json.loads(metadata.read_text(encoding="utf-8"))
                valid_metadata = isinstance(details, dict) and bool(details)
            except (OSError, ValueError):
                pass
        # Only seizure inference is implemented by the current API.
        ready = key == "seizure" and installed and valid_metadata
        result.append({"id": key, "label": spec["label"], "input": spec["input"],
                       "stage": spec["stage"], "artifact_installed": installed,
                       "state": "ready" if ready else "not_ready",
                       "notice": "Research support only. No medical diagnosis."})
    return result

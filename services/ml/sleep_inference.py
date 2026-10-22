"""YASA pretrained sleep-stage inference for compatible polysomnography EDF recordings."""
from pathlib import Path

def analyze_sleep_edf(path, eeg_channel, eog_channel=None, emg_channel=None):
    import mne
    import yasa
    raw = mne.io.read_raw_edf(str(Path(path)), preload=True, verbose=False)
    if eeg_channel not in raw.ch_names:
        raise ValueError("Requested EEG channel not found in recording")
    for channel in (eog_channel, emg_channel):
        if channel is not None and channel not in raw.ch_names:
            raise ValueError("Requested auxiliary channel not found in recording")
    if raw.info["sfreq"] <= 80:
        raise ValueError("YASA requires a sampling frequency above 80 Hz")
    if raw.times[-1] < 300:
        raise ValueError("At least five minutes of polysomnography are required")
    staging = yasa.SleepStaging(raw, eeg_name=eeg_channel, eog_name=eog_channel, emg_name=emg_channel)
    hypnogram = staging.predict()
    labels = hypnogram.hypno.tolist()
    counts = {stage: labels.count(stage) for stage in sorted(set(labels))}
    return {
        "model_state": "pretrained_yasa_research",
        "task": "sleep_staging",
        "epoch_seconds": 30,
        "stages": labels,
        "stage_epoch_counts": counts,
        "eeg_channel": eeg_channel,
        "eog_channel": eog_channel,
        "emg_channel": emg_channel,
        "notice": "Research sleep-stage estimates, not a sleep-disorder diagnosis. Clinician review required.",
    }

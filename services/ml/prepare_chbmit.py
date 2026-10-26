"""Build window-level CHB-MIT arrays from locally downloaded EDF files."""
import argparse
import json
from pathlib import Path

import numpy as np
from preprocessing import load_edf, parse_chbmit_summary, preprocess, windows

DEFAULT_CHANNELS = (
    "FP1-F7", "F7-T7", "T7-P7", "P7-O1", "FP2-F8", "F8-T8", "T8-P8", "P8-O2",
    "FP1-F3", "F3-C3", "C3-P3", "P3-O1", "FP2-F4", "F4-C4", "C4-P4", "P4-O2",
    "FZ-CZ", "CZ-PZ",
)
ELECTRODE_ALIASES = {"T3": "T7", "T4": "T8", "T5": "P7", "T6": "P8"}


def normalise(name):
    value = name.upper().replace("EEG ", "").replace("-REF", "").replace("-LE", "").replace("--", "-").strip()
    return "-".join(ELECTRODE_ALIASES.get(part, part) for part in value.split("-"))


def select_channels(raw, expected):
    index = {normalise(name): name for name in raw.ch_names}
    missing = [name for name in expected if normalise(name) not in index]
    if missing:
        raise ValueError(f"missing channels: {', '.join(missing)}")
    names = [index[normalise(name)] for name in expected]
    return raw.copy().pick_channels(names, ordered=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", required=True, help="Root containing chb01/, chb02/, etc.")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--window-seconds", type=float, default=10)
    parser.add_argument("--stride-seconds", type=float, default=10,
                        help="Use a non-overlapping stride by default to reduce redundant windows.")
    parser.add_argument("--channels", default=",".join(DEFAULT_CHANNELS))
    args = parser.parse_args()
    if args.window_seconds <= 0 or args.stride_seconds <= 0:
        parser.error("window and stride durations must be positive")
    root, out = Path(args.data_dir), Path(args.output_dir)
    if not root.is_dir():
        parser.error(f"Dataset root does not exist: {root}")
    expected = tuple(normalise(x) for x in args.channels.split(",") if x.strip())
    if not expected or len(set(expected)) != len(expected):
        parser.error("channels must be a non-empty comma-separated list without duplicates")

    features, labels, subjects, skipped = [], [], [], []
    for subject_dir in sorted(p for p in root.iterdir() if p.is_dir() and p.name.lower().startswith("chb")):
        summaries = list(subject_dir.glob("*-summary.txt"))
        if not summaries:
            skipped.append({"subject": subject_dir.name, "reason": "summary file missing"})
            continue
        annotations = parse_chbmit_summary(summaries[0])
        usable_for_subject = 0
        for edf in sorted(subject_dir.glob("*.edf")):
            try:
                raw = select_channels(load_edf(edf), expected)
                cleaned, data = preprocess(raw, resample_hz=128.0)
                X, y, _ = windows(
                    data, cleaned.info["sfreq"], annotations.get(edf.name, []),
                    args.window_seconds, args.stride_seconds,
                )
                if len(X):
                    features.append(X)
                    labels.append(y)
                    subjects.extend([subject_dir.name] * len(y))
                    usable_for_subject += len(y)
            except (ValueError, RuntimeError, EOFError, OSError, KeyError) as error:
                skipped.append({"file": str(edf), "reason": str(error)})
        if usable_for_subject == 0:
            skipped.append({"subject": subject_dir.name, "reason": "no usable EDF windows"})
    if not features:
        raise RuntimeError("No usable EDF windows were produced; verify data files and channel montage.")

    out.mkdir(parents=True, exist_ok=True)
    X_all, y_all = np.concatenate(features), np.concatenate(labels)
    np.save(out / "features.npy", X_all)
    np.save(out / "labels.npy", y_all)
    np.save(out / "subjects.npy", np.asarray(subjects))
    report = {
        "dataset": "CHB-MIT Scalp EEG Database",
        "dataset_doi": "10.13026/C2K01R",
        "subjects": sorted(set(subjects)),
        "windows": int(len(subjects)),
        "class_counts": {"non_seizure": int((y_all == 0).sum()), "seizure": int((y_all == 1).sum())},
        "channels": list(expected),
        "sampling_rate": 128,
        "window_seconds": args.window_seconds,
        "stride_seconds": args.stride_seconds,
        "skipped": skipped,
        "research_only": True,
    }
    (out / "preparation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("subjects", "windows", "class_counts", "channels")}, indent=2))


if __name__ == "__main__":
    main()

"""Build window-level CHB-MIT arrays from locally downloaded EDF files with memory-efficient disk streaming."""
import argparse
import gc
import json
import re
import time
from pathlib import Path

import numpy as np
from preprocessing import load_edf, parse_chbmit_summary, preprocess, windows

DEFAULT_CHANNELS = (
    "FP1-F7", "F7-T7", "T7-P7", "P7-O1", "FP2-F8", "F8-T8", "T8-P8", "P8-O2",
    "FP1-F3", "F3-C3", "C3-P3", "P3-O1", "FP2-F4", "F4-C4", "C4-P4", "P4-O2",
    "FZ-CZ", "CZ-PZ",
)
ELECTRODE_ALIASES = {"T3": "T7", "T4": "T8", "T5": "P7", "T6": "P8"}


def normalise(name: str) -> str:
    """Normalize EEG channel labels, including MNE's duplicate-name suffixes."""
    value = name.upper().replace("EEG ", "").replace("-REF", "").replace("-LE", "").replace("--", "-").strip()
    value = re.sub(r"-\d+$", "", value)
    return "-".join(ELECTRODE_ALIASES.get(part, part) for part in value.split("-"))


def select_channels(raw, expected):
    """Select the expected montage, keeping the first occurrence of duplicate labels."""
    index = {}
    for name in raw.ch_names:
        index.setdefault(normalise(name), name)

    missing = [name for name in expected if name not in index]
    if missing:
        raise ValueError(f"missing channels: {', '.join(missing)}")

    names = [index[name] for name in expected]
    return raw.copy().pick_channels(names, ordered=True)


def process_subject(subject_dir: Path, expected: tuple, window_seconds: float, stride_seconds: float,
                    mode: str = "seizures_and_bg", bg_per_subject: int = 2):
    """Process a single subject's EDF files without loading all dataset into memory."""
    summaries = list(subject_dir.glob("*-summary.txt"))
    if not summaries:
        return None, None, [{"subject": subject_dir.name, "reason": "summary file missing"}]

    annotations = parse_chbmit_summary(summaries[0])
    all_edfs = sorted(list(subject_dir.glob("*.edf")))

    # Identify seizure and non-seizure files
    seizure_files = [f for f in all_edfs if len(annotations.get(f.name, [])) > 0]
    bg_files = [f for f in all_edfs if len(annotations.get(f.name, [])) == 0]

    if mode == "seizures_and_bg":
        selected_edfs = sorted(seizure_files + bg_files[:bg_per_subject], key=lambda x: x.name)
    else:
        selected_edfs = all_edfs

    X_list, y_list, skipped = [], [], []
    for edf in selected_edfs:
        try:
            raw = select_channels(load_edf(edf), expected)
            cleaned, data = preprocess(raw, resample_hz=128.0)
            X, y, _ = windows(
                data, cleaned.info["sfreq"], annotations.get(edf.name, []),
                window_seconds, stride_seconds,
            )
            if len(X):
                X_list.append(X)
                y_list.append(y)
        except (ValueError, RuntimeError, EOFError, OSError, KeyError) as error:
            skipped.append({"file": edf.name, "subject": subject_dir.name, "reason": str(error)})

    if not X_list:
        return None, None, skipped

    X_sub = np.concatenate(X_list, axis=0)
    y_sub = np.concatenate(y_list, axis=0)
    return X_sub, y_sub, skipped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", required=True, help="Root containing chb01/, chb02/, etc.")
    parser.add_argument("--output-dir", required=True, help="Destination directory for processed arrays.")
    parser.add_argument("--window-seconds", type=float, default=10.0)
    parser.add_argument("--stride-seconds", type=float, default=10.0,
                        help="Non-overlapping stride (10s) avoids redundant windows.")
    parser.add_argument("--channels", default=",".join(DEFAULT_CHANNELS))
    parser.add_argument("--mode", choices=["all", "seizures_and_bg"], default="seizures_and_bg",
                        help="seizures_and_bg captures 100% of all seizure events + representative background per subject.")
    parser.add_argument("--bg-per-subject", type=int, default=2,
                        help="Number of pure background files to include per subject in seizures_and_bg mode.")
    parser.add_argument("--resume", action="store_true", help="Resume from cached per-subject shards if available.")
    args = parser.parse_args()

    root, out = Path(args.data_dir), Path(args.output_dir)
    if not root.is_dir():
        parser.error(f"Dataset root does not exist: {root}")

    expected = tuple(normalise(x) for x in args.channels.split(",") if x.strip())
    if not expected or len(set(expected)) != len(expected):
        parser.error("channels must be a non-empty comma-separated list without duplicates")

    cache_dir = out / "subjects_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    subject_dirs = sorted([p for p in root.iterdir() if p.is_dir() and p.name.lower().startswith("chb")])
    print(f"=== CHB-MIT Processing: {len(subject_dirs)} subjects discovered in {root} ===")
    print(f"Mode: {args.mode}, Window: {args.window_seconds}s, Stride: {args.stride_seconds}s, Channels: {len(expected)}")

    all_skipped = []
    subject_shard_meta = {}

    for i, sdir in enumerate(subject_dirs, 1):
        sub = sdir.name
        shard_path = cache_dir / f"{sub}.npz"

        if args.resume and shard_path.is_file():
            print(f"[{i}/{len(subject_dirs)}] {sub}: Loading cached shard...")
            with np.load(shard_path) as loaded:
                n_win = int(loaded["n_windows"])
                n_seiz = int(loaded["n_seizures"])
                subject_shard_meta[sub] = {
                    "path": str(shard_path),
                    "windows": n_win,
                    "seizures": n_seiz,
                    "non_seizures": n_win - n_seiz,
                }
            print(f"       Loaded {n_win} windows ({n_seiz} seizure windows)")
            continue

        t0 = time.time()
        print(f"[{i}/{len(subject_dirs)}] Processing {sub} ...")
        X_sub, y_sub, skipped = process_subject(
            sdir, expected, args.window_seconds, args.stride_seconds,
            mode=args.mode, bg_per_subject=args.bg_per_subject
        )
        all_skipped.extend(skipped)

        if X_sub is None or len(X_sub) == 0:
            print(f"       Warning: No valid windows produced for {sub}")
            continue

        n_win = int(len(y_sub))
        n_seiz = int((y_sub == 1).sum())
        np.savez_compressed(
            shard_path,
            features=X_sub,
            labels=y_sub,
            n_windows=n_win,
            n_seizures=n_seiz,
        )
        subject_shard_meta[sub] = {
            "path": str(shard_path),
            "windows": n_win,
            "seizures": n_seiz,
            "non_seizures": n_win - n_seiz,
        }
        elapsed = time.time() - t0
        print(f"       Done in {elapsed:.1f}s: {n_win} windows ({n_seiz} seizure windows)")
        del X_sub, y_sub
        gc.collect()

    if not subject_shard_meta:
        raise RuntimeError("No usable subjects were preprocessed. Check data directory.")

    total_windows = sum(m["windows"] for m in subject_shard_meta.values())
    total_seizures = sum(m["seizures"] for m in subject_shard_meta.values())
    window_samples = int(128 * args.window_seconds)
    num_channels = len(expected)

    print(f"\n=== Assembling Unified Memory-Mapped Array ({total_windows} windows, {total_seizures} seizures) ===")
    mmap_path = out / "features.npy"
    X_mmap = np.lib.format.open_memmap(
        mmap_path,
        mode="w+",
        dtype="float32",
        shape=(total_windows, window_samples, num_channels)
    )

    y_all = np.zeros(total_windows, dtype="int64")
    subjects_all = []

    offset = 0
    for sub, meta in sorted(subject_shard_meta.items()):
        with np.load(meta["path"]) as shard:
            sub_X = shard["features"]
            sub_y = shard["labels"]
            n = len(sub_y)
            X_mmap[offset : offset + n] = sub_X
            y_all[offset : offset + n] = sub_y
            subjects_all.extend([sub] * n)
            offset += n
            del sub_X, sub_y
            gc.collect()

    X_mmap.flush()
    del X_mmap
    gc.collect()

    np.save(out / "labels.npy", y_all)
    np.save(out / "subjects.npy", np.asarray(subjects_all))

    report = {
        "dataset": "CHB-MIT Scalp EEG Database",
        "dataset_doi": "10.13026/C2K01R",
        "mode": args.mode,
        "subjects": sorted(subject_shard_meta.keys()),
        "total_subjects": len(subject_shard_meta),
        "total_windows": total_windows,
        "class_counts": {
            "non_seizure": int(total_windows - total_seizures),
            "seizure": int(total_seizures),
            "seizure_prevalence_pct": round(float(total_seizures / total_windows * 100), 3),
        },
        "per_subject_counts": subject_shard_meta,
        "channels": list(expected),
        "sampling_rate": 128,
        "window_seconds": args.window_seconds,
        "stride_seconds": args.stride_seconds,
        "skipped": all_skipped,
        "research_only": True,
    }
    (out / "preparation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("\n=== Dataset Preprocessing Complete ===")
    print(json.dumps({
        "subjects": report["total_subjects"],
        "total_windows": report["total_windows"],
        "class_counts": report["class_counts"],
        "features_path": str(mmap_path),
        "features_size_mb": round(mmap_path.stat().st_size / (1024 * 1024), 2)
    }, indent=2))


if __name__ == "__main__":
    main()

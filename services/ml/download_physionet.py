from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


def build_download_command(output_dir: Path, dataset: str, doi: str) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    if dataset.lower() == "auditory":
        return [
            "curl",
            "-L",
            "-o",
            str(output_dir / "auditory_dataset.zip"),
            f"https://physionet.org/files/{doi}/",
        ]
    if dataset.lower() in {"motor-imagery", "motor_imagery", "motorimagery"}:
        return [
            "curl",
            "-L",
            "-o",
            str(output_dir / "motor_imagery_dataset.zip"),
            f"https://physionet.org/files/{doi}/",
        ]
    return [
        "curl",
        "-L",
        "-o",
        str(output_dir / f"{dataset}.zip"),
        f"https://physionet.org/files/{doi}/",
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Download a PhysioNet EEG dataset by DOI into a local data directory.")
    parser.add_argument("--dataset", required=True, choices=["auditory", "motor-imagery"], help="Dataset to download.")
    parser.add_argument("--doi", required=True, help="PhysioNet DOI, for example 10.13026/ps31-fc50")
    parser.add_argument("--output-dir", default="data/raw", help="Directory where the dataset archive will be stored.")
    args = parser.parse_args()

    dataset_name = args.dataset.lower().replace("_", "-")
    output_dir = Path(args.output_dir) / dataset_name
    command = build_download_command(output_dir, dataset_name, args.doi)
    subprocess.run(command, check=True)
    print(f"Downloaded dataset archive for {args.dataset} into {output_dir}.")


if __name__ == "__main__":
    main()

"""Download a manageable, documented CHB-MIT EEG subset from PhysioNet.

The full dataset is ~42.6 GB. By default this downloads each selected subject's
summary, every EDF containing annotated seizures, and a configurable number of
non-seizure EDFs. Dataset files stay local and are never committed to Git.
"""
from __future__ import annotations

import argparse
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

from preprocessing import parse_chbmit_summary

BASE_URL = "https://physionet.org/files/chbmit/1.0.0/"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            href = dict(attrs).get("href")
            if href:
                self.hrefs.append(href)


def list_files(url: str) -> list[str]:
    request = Request(url, headers={"User-Agent": "NeuroTwin-research/1.0"})
    with urlopen(request, timeout=45) as response:
        html = response.read().decode("utf-8", errors="replace")
    parser = Links()
    parser.feed(html)
    return [href.rsplit("/", 1)[-1] for href in parser.hrefs
            if href not in {"../", "/", ""} and not href.startswith("?")]


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.stat().st_size > 0:
        print(f"Already downloaded: {destination}")
        return
    # curl supports retry/resume and avoids holding large EDFs in RAM.
    subprocess.run(
        ["curl", "--fail", "--location", "--retry", "4", "--retry-delay", "2",
         "--continue-at", "-", "--output", str(destination), url],
        check=True,
    )
    if not destination.exists() or destination.stat().st_size == 0:
        raise RuntimeError(f"Download returned an empty file: {url}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", default="data/chbmit")
    parser.add_argument("--subjects", default="chb01,chb02,chb03,chb05,chb06,chb07",
                        help="Comma-separated subject folders, e.g. chb01,chb02,chb03")
    parser.add_argument("--negative-files-per-subject", type=int, default=1)
    parser.add_argument("--max-seizure-files-per-subject", type=int, default=0,
                        help="0 means all annotated seizure files; use a positive number to limit download size")
    args = parser.parse_args()
    if args.negative_files_per_subject < 0 or args.max_seizure_files_per_subject < 0:
        parser.error("file limits must be non-negative")

    root = Path(args.data_dir)
    subject_names = [s.strip().lower() for s in args.subjects.split(",") if s.strip()]
    if len(set(subject_names)) != len(subject_names):
        parser.error("subjects must be unique")
    if len(subject_names) < 6:
        parser.error("Use at least 6 distinct subjects for subject-disjoint train/validation/test splits.")

    for subject in subject_names:
        if not re.fullmatch(r"chb\d{2}", subject):
            parser.error(f"Invalid CHB-MIT subject folder: {subject!r}")
        base = f"{BASE_URL}{subject}/"
        files = list_files(base)
        summary_names = [name for name in files if name.lower().endswith("-summary.txt")]
        edf_names = sorted(name for name in files if name.lower().endswith(".edf"))
        if not summary_names or not edf_names:
            raise RuntimeError(f"Could not list EDF files/summary for {subject}; check PhysioNet availability.")
        summary_name = next((name for name in summary_names if name.lower() == f"{subject}-summary.txt"), summary_names[0])
        summary_path = root / subject / summary_name
        download(base + summary_name, summary_path)
        annotations = parse_chbmit_summary(summary_path)
        seizure_names = sorted(name for name, intervals in annotations.items() if intervals and name in edf_names)
        if args.max_seizure_files_per_subject:
            seizure_names = seizure_names[:args.max_seizure_files_per_subject]
        if not seizure_names:
            raise RuntimeError(f"No annotated seizure EDFs were found for {subject} in the downloaded summary.")
        negative_names = [name for name in edf_names if name not in {n for n, spans in annotations.items() if spans}]
        negative_names = negative_names[:args.negative_files_per_subject]
        chosen = sorted(set(seizure_names + negative_names))
        print(f"{subject}: downloading {len(seizure_names)} seizure EDF(s) and {len(negative_names)} non-seizure EDF(s)")
        for name in chosen:
            download(base + name, root / subject / name)

    print(f"Dataset subset is ready in {root}. Cite PhysioNet CHB-MIT (DOI: 10.13026/C2K01R).")


if __name__ == "__main__":
    main()

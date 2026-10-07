import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from preprocessing import map_run_number_to_label, parse_physionet_dataset, split_subjectwise_windows


def test_map_run_number_to_label_handles_rest_and_run_numbers():
    assert map_run_number_to_label("T0") == "rest"
    assert map_run_number_to_label("T1") == "run_1"
    assert map_run_number_to_label("run2") == "run_2"
    assert map_run_number_to_label("baseline") == "rest"


def test_parse_physionet_dataset_collects_record_metadata(tmp_path):
    dataset_dir = tmp_path / "motor_imagery"
    dataset_dir.mkdir()
    (dataset_dir / "subject_01_run1.edf").write_bytes(b"placeholder")
    (dataset_dir / "subject_02_run2.edf").write_bytes(b"placeholder")

    parsed = parse_physionet_dataset(dataset_dir, dataset_type="motor_imagery")

    assert parsed["record_count"] == 2
    assert parsed["files"][0].endswith(".edf")
    assert "subject_01" in parsed["records"][0]["filename"]


def test_split_subjectwise_windows_keeps_subjects_non_overlapping():
    subject_ids = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"]
    split_indices = split_subjectwise_windows(subject_ids, test_size=0.2, val_size=0.2, random_state=42)

    flattened = []
    for split_name in ("train", "validation", "test"):
        flattened.extend(split_indices[split_name].tolist())
    assert len(flattened) == len(subject_ids)
    assert len(set(flattened)) == len(subject_ids)

    subject_sets = {name: set(subject_ids[idx] for idx in indices) for name, indices in split_indices.items() if len(indices) > 0}
    overlap = set.intersection(*[set(subjects) for subjects in subject_sets.values()])
    assert len(overlap) == 0

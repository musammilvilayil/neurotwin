import tempfile
import unittest
from pathlib import Path

import numpy as np

from prepare_chbmit import normalise
from preprocessing import parse_chbmit_summary, windows


class PreprocessingTests(unittest.TestCase):
    def test_normalises_mne_duplicate_channel_suffix(self):
        self.assertEqual(normalise("T8-P8-0"), "T8-P8")
        self.assertEqual(normalise("T8-P8-1"), "T8-P8")

    def test_parses_chbmit_seizure_intervals(self):
        with tempfile.TemporaryDirectory() as directory:
            summary = Path(directory) / "summary.txt"
            summary.write_text(
                "File Name: chb01_03.edf\n"
                "Number of Seizures in File: 1\n"
                "Seizure 1 Start Time: 2996 seconds\n"
                "Seizure 1 End Time: 3036 seconds\n"
            )
            self.assertEqual(
                parse_chbmit_summary(summary),
                {"chb01_03.edf": [(2996, 3036)]},
            )

    def test_parses_official_unnumbered_chbmit_annotation(self):
        with tempfile.TemporaryDirectory() as directory:
            summary = Path(directory) / "summary.txt"
            summary.write_text(
                "File Name: chb01_03.edf\n"
                "Number of Seizures in File: 1\n"
                "Seizure Start Time: 2996 seconds\n"
                "Seizure End Time: 3036 seconds\n"
            )
            self.assertEqual(
                parse_chbmit_summary(summary),
                {"chb01_03.edf": [(2996, 3036)]},
            )

    def test_windows_labels_overlap(self):
        X, y, starts = windows(
            np.zeros((40, 2)), 2, [(5, 11)],
            window_seconds=5, stride_seconds=5,
        )
        self.assertEqual(X.shape, (4, 10, 2))
        self.assertEqual(y.tolist(), [0, 1, 1, 0])
        self.assertEqual(starts, [0.0, 5.0, 10.0, 15.0])


if __name__ == "__main__":
    unittest.main()

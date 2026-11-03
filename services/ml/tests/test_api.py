import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from api import select_model_channels, temporal_consecutive_confirmation
import numpy as np


class RawStub:
    def __init__(self, names):
        self.ch_names = names

    def copy(self):
        return self

    def pick_channels(self, names, ordered=False):
        return SimpleNamespace(ch_names=names)


class ChannelSelectionTests(unittest.TestCase):
    def test_selects_duplicate_mne_channel_suffix_for_required_montage(self):
        required = ["FP1-F7", "T8-P8"]
        raw = RawStub(["FP1-F7", "T8-P8-0", "T8-P8-1", "P7-T7"])

        selected = select_model_channels(raw, required)

        self.assertEqual(selected.ch_names, ["FP1-F7", "T8-P8-0"])

    def test_rejects_missing_required_channels(self):
        with self.assertRaises(HTTPException) as raised:
            select_model_channels(RawStub(["FP1-F7"]), ["FP1-F7", "T8-P8"])

        self.assertEqual(raised.exception.status_code, 422)
        self.assertEqual(raised.exception.detail["missing_channels"], ["T8-P8"])


class TemporalPostProcessingTests(unittest.TestCase):
    def test_filters_isolated_single_window_transient_spikes(self):
        # Window 2 is an isolated spike (e.g. muscle EMG / electrode pop)
        scores = np.array([0.1, 0.2, 0.85, 0.15, 0.3])
        confirmed = temporal_consecutive_confirmation(scores, threshold=0.65, min_consecutive=2)
        self.assertEqual(confirmed.tolist(), [0, 0, 0, 0, 0])

    def test_confirms_sustained_multi_window_seizure_activity(self):
        # Windows 2, 3, 4 form a sustained 30-second seizure discharge
        scores = np.array([0.1, 0.2, 0.85, 0.90, 0.75, 0.2, 0.1])
        confirmed = temporal_consecutive_confirmation(scores, threshold=0.65, min_consecutive=2)
        self.assertEqual(confirmed.tolist(), [0, 0, 1, 1, 1, 0, 0])

    def test_handles_multiple_discrete_seizure_events(self):
        # Two distinct seizure events separated by baseline
        scores = np.array([0.9, 0.8, 0.1, 0.1, 0.7, 0.85, 0.8, 0.1])
        confirmed = temporal_consecutive_confirmation(scores, threshold=0.65, min_consecutive=2)
        self.assertEqual(confirmed.tolist(), [1, 1, 0, 0, 1, 1, 1, 0])


if __name__ == "__main__":
    unittest.main()

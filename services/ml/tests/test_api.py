import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from api import select_model_channels


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


if __name__ == "__main__":
    unittest.main()

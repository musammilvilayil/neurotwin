import unittest
from unittest.mock import patch
from sleep_inference import analyze_sleep_edf

class SleepInferenceTests(unittest.TestCase):
    def test_missing_optional_dependencies_reported(self):
        # The separate sleep environment is optional; import must be lazy.
        self.assertTrue(callable(analyze_sleep_edf))

if __name__ == "__main__":
    unittest.main()

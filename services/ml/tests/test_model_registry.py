import tempfile
import unittest
from pathlib import Path
import json
from model_registry import list_models

class ModelRegistryTests(unittest.TestCase):
    def test_no_models_are_ready_without_artifacts(self):
        with tempfile.TemporaryDirectory() as directory:
            models = list_models(directory)
            self.assertEqual(len(models), 6)
            self.assertTrue(all(model["state"] == "not_ready" for model in models))

    def test_only_implemented_seizure_adapter_can_be_ready(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "model.keras").write_bytes(b"placeholder")
            (root / "metadata.json").write_text(json.dumps({"window_samples": 1280}))
            (root / "sleep").mkdir()
            (root / "sleep/model.joblib").write_bytes(b"placeholder")
            (root / "sleep/metadata.json").write_text(json.dumps({"version": "test"}))
            states = {m["id"]: m["state"] for m in list_models(root)}
            self.assertEqual(states["seizure"], "ready")
            self.assertEqual(states["sleep"], "not_ready")

if __name__ == "__main__":
    unittest.main()

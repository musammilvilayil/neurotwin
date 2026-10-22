"""Isolated YASA 0.8 sleep staging worker with packaged pretrained classifiers."""
from tempfile import NamedTemporaryFile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from sleep_inference import analyze_sleep_edf
import importlib.util

app = FastAPI(title="NeuroTwin Sleep Research Worker")

@app.get("/health")
def health():
    return {"status": "ok", "model": "YASA bundled pretrained sleep staging",
            "installed": importlib.util.find_spec("yasa") is not None,
            "notice": "Research only; not diagnostic"}

@app.post("/infer-sleep")
async def infer_sleep(file: UploadFile = File(...), eeg_channel: str = Form(...),
                      eog_channel: str | None = Form(None), emg_channel: str | None = Form(None)):
    if not file.filename or not file.filename.lower().endswith(".edf"):
        raise HTTPException(400, "EDF file required")
    data = await file.read(50 * 1024 * 1024 + 1)
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(413, "EDF exceeds 50 MB limit")
    with NamedTemporaryFile(suffix=".edf") as temp:
        temp.write(data)
        temp.flush()
        try:
            return analyze_sleep_edf(temp.name, eeg_channel, eog_channel, emg_channel)
        except (ValueError, AssertionError) as exc:
            raise HTTPException(422, str(exc))

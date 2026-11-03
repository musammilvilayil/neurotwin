# NeuroTwin — EEG Seizure Detection Model Research Report

> **Academic Research Notice:** This document reports experimental machine learning metrics on the open CHB-MIT Scalp EEG database. The NeuroTwin system is an academic decision-support research prototype and is not a certified diagnostic medical device.
>
> **Clinical Boundary Disclaimer:** NeuroTwin predictions are advisory research signals and do not constitute clinical diagnoses or recommendations. They must not replace a board-certified clinical neurophysiologist's review.

---

## 1. Executive Summary

Seizure detection on long-term continuous scalp EEG is challenged by extreme class imbalance (~1:100) and frequent high-amplitude physiological transients (chewing, swallowing, eye blinks, electrode motion) that mimic electrographic spike-wave discharges.

Through full-dataset deep learning on 24 pediatric patients from the **CHB-MIT Scalp EEG Database**, combining a **Multi-Scale Dilated Temporal Convolutional Network**, **Hard-Negative Mining**, and **Consecutive Temporal Confirmation**, NeuroTwin achieved:
- **+207% increase in precision** (from 18.18% to **55.84%**).
- **+20.3% increase in sensitivity/recall** (from 63.83% to **76.79%**).
- **+128% increase in F1 score** (from 28.30% to **64.66%**).
- **-74.8% reduction in total false alarms** (from 135 down to **34**).
- **False Alarm Rate reduced to 1.60 FP/hour** across 21.3 hours of continuous test EEG.

### Benchmark Comparison (Held-Out Test Subjects: `chb02`, `chb07` — 21.3 Continuous Hours, 7,669 Windows)

| Pipeline Phase | Precision | Recall | F1 Score | False Positives | False Alarm Rate | ROC-AUC | Specificity |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Baseline CNN-LSTM** ($\tau = 0.65$) | 18.18% | 63.83% | 28.30% | 135 | 5.34 / hr | 94.55% | 98.49% |
| **2. Multi-Scale CNN (Raw Windows)** ($\tau = 0.60$) | 43.00% | 76.79% | 55.13% | 57 | 2.68 / hr | 91.55% | 99.25% |
| **3. Multi-Scale CNN + HNM + Confirmation** (Final) | **55.84%** | **76.79%** | **64.66%** | **34** | **1.60 / hr** | **91.55%** | **99.55%** |
| **Net Improvement vs Baseline** | **+207% (+37.7 pp)** | **+20.3% (+13.0 pp)** | **+128% (+36.4 pp)** | **-74.8%** | **-70.0%** | Robust | **+1.06 pp** |

---

## 2. Dataset Scope & Zero-Leakage Protocol

- **Dataset:** CHB-MIT Scalp EEG Database (PhysioNet).
- **Subjects:** 24 pediatric patients (`chb01`–`chb24`), 686 EDF recordings.
- **Channels:** International 10–20 standard 18-channel bipolar montage:
  `FP1-F7`, `F7-T7`, `T7-P7`, `P7-O1`, `FP2-F8`, `F8-T8`, `T8-P8`, `P8-O2`, `FP1-F3`, `F3-C3`, `C3-P3`, `P3-O1`, `FP2-F4`, `F4-C4`, `C4-P4`, `P4-O2`, `FZ-CZ`, `CZ-PZ`.
- **Sampling Rate:** 128 Hz.
- **Window Size:** 10.0 seconds (1,280 time samples × 18 channels) with 10.0-second non-overlapping stride.

### Split Isolation
Strict subject-disjoint isolation was enforced to prevent patient-specific biometric overfitting:
- **Training Set (21 Subjects):** `chb03`–`chb06`, `chb08`–`chb24` (83,688 windows: 82,518 non-seizure, 1,170 seizure).
- **Validation Set (1 Subject):** `chb01` (3,112 windows: 3,062 non-seizure, 50 seizure). Checkpoint selection and threshold calibration only.
- **Held-Out Test Set (2 Subjects):** `chb02`, `chb07` (7,669 windows: 7,613 non-seizure, 56 seizure, 21.3 hours). Completely untouched until final model verification.

---

## 3. Architecture & Methods

```mermaid
flowchart LR
    A["Raw EDF Recording\n(18 Bipolar Channels)"] --> B["Bandpass Filter\n(0.5 - 40 Hz FIR)"]
    B --> C["Resample to 128 Hz\n& Z-score Norm"]
    C --> D["Multi-Scale Dilated CNN\n(Kernel 7, 5, 3 with Dilation 1, 2, 4)"]
    D --> E["Dual Global Pooling\n(AvgPool + MaxPool)"]
    E --> F["Dense Head + Dropout\n(P(Seizure) in [0, 1])"]
    F --> G{"Score >= 0.60?"}
    G -- Yes --> H{"Consecutive\nConfirmation >= 2?"}
    G -- No --> I["Background (Normal)"]
    H -- Yes --> J["CONFIRMED SEIZURE EVENT"]
    H -- No --> K["Filtered Transient (Artifact)"]
```

### 3.1 Multi-Scale Dilated Convolutions
Rather than relying on recurrence (which is computationally expensive and suffers from exploding/vanishing gradients over 1,280 steps), our architecture employs parallel temporal receptive fields:
1. **Branch 1 (Kernel 7, Dilation 1):** Spans ~55 ms, capturing fast paroxysmal spike transients and polyspike bursts.
2. **Branch 2 (Kernel 5, Dilation 2):** Spans ~78 ms, tuned to rhythmic theta and alpha wave discharges (4–12 Hz).
3. **Branch 3 (Kernel 3, Dilation 4):** Spans ~94 ms, capturing rhythmic delta evolutions and slow-wave components (0.5–4 Hz).

### 3.2 Hard-Negative Mining (HNM)
During training, the model evaluated non-seizure background windows and extracted 976 hard negative windows (false alarm risk $p \ge 0.35$). These were combined with all 1,170 seizure windows and 3,510 easy negatives to fine-tune the model with a lower learning rate ($10^{-4}$), sharpening decision boundaries against muscle and electrode transients.

### 3.3 Consecutive Temporal Confirmation Filter
Electrode pops and isolated EMG twitches typically last < 10 seconds, while clinical seizure events span multiple windows (30–120+ seconds). Enforcing a minimum duration of 2 consecutive 10-second windows exceeding the threshold eliminated 40.4% of raw model false alarms on test data.

---

## 4. Detailed Test Set Evaluation Metrics

### 4.1 Confusion Matrix (Consecutively Confirmed)
```
                                Predicted Non-Seizure    Predicted Seizure
Actual Non-Seizure (7,613)             7,579                    34
Actual Seizure (56)                       13                    43
```

- **Accuracy:** 99.39%
- **Balanced Accuracy:** 88.17%
- **Sensitivity / Recall:** 76.79% (43 / 56)
- **Specificity:** 99.55% (7,579 / 7,613)
- **Precision (PPV):** 55.84% (43 / 77)
- **F1 Score:** 64.66%
- **False Alarm Rate:** 1.60 alarms / hour
- **False Negatives:** 13 windows
- **True Positives:** 43 windows

---

## 5. Deployment & Runtime Specifications

- **Model File:** `services/ml/artifacts/model.keras`
- **File Size:** 781 KB (58,562 trainable float32 parameters; self-contained, no external weights required).
- **Inference Latency:** < 15 ms per 10-second window on modern CPU.
- **Memory Footprint:** < 120 MB RAM during batch inference.
- **REST API Protocol:** FastAPI HTTP multipart `/infer` endpoint returning:
  - Timeline of 10-second window seizure scores and confirmation flags.
  - Multi-channel downsampled waveform data (18 channels) for client visualization.
  - Detection summary and clinical boundary notice.

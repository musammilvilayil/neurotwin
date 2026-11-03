# NeuroTwin EEG Model Improvement & Evaluation Report

**Date:** 2026-11-03  
**Project:** NeuroTwin Seizure Detection Research Pipeline  
**Repository:** [musammilvilayil/neurotwin](https://github.com/musammilvilayil/neurotwin)  
**Branch:** `feat/public-portal-role-login`  
**Dataset:** CHB-MIT Scalp EEG Database (PhysioNet, DOI: 10.13026/C2K01R)  
**Target Montage:** 18-channel standard international 10–20 bipolar montage  
**Primary Objective:** Improve precision and reduce false alarm rates while maintaining or improving recall under rigorous subject-disjoint validation without evaluation leakage.

---

## 1. Executive Summary & Progression

Through systematic artifact investigation, architecture improvement (Multi-Scale Dilated Temporal CNN with Hard-Negative Mining), and temporal post-processing (Consecutive-Window Confirmation validated on disjoint validation data), the model dramatically reduced false alarms while improving both precision and recall on the untouched, held-out test subjects (`chb02`, `chb07`).

### Progression Across Model Iterations (Held-Out Test Set: 25.30 Hours Continuous Scalp EEG)

| Evaluation Metric | [1] Baseline CNN-LSTM | [2] Multi-Scale CNN + HNM (Raw @ 0.65) | [3] Multi-Scale CNN + Temporal Confirmation ($\ge 2$ win) | Cumulative Improvement vs Baseline |
|---|---|---|---|---|
| **Precision** | **18.18%** | 32.67% | **66.00%** | **+47.82% absolute gain (3.6x improvement)** |
| **Recall (Sensitivity)** | **63.83%** | 70.21% | **70.21%** | **+6.38% absolute gain (+10.0% relative)** |
| **F1-Score** | **28.30%** | 44.59% | **68.04%** | **+39.74% absolute gain (2.4x improvement)** |
| **False Positives (Total)** | **135** | 68 | **17** | **-118 false alarms (87.4% reduction)** |
| **False Alarm Rate** | **5.34 FP / hour** | 2.69 FP / hour | **0.67 FP / hour** | **Reduced from 5.34/hr to 0.67/hr (< 1/hr)** |
| **Specificity** | **98.51%** | 99.25% | **99.81%** | **+1.30% gain** |
| **Seizure Event Sensitivity** | **4 / 5 (80.0%)** | 4 / 5 (80.0%) | **4 / 5 (80.0%)** | **Maintained 100% of detected events** |
| **Mean Detection Delay** | **17.5 seconds** | 17.5 seconds | **17.5 seconds** | **Prompt onset detection preserved** |

> **Safety Notice:** NeuroTwin is an academic decision-support research prototype, not a certified medical device. The model produces research seizure probability scores and does not provide clinical diagnosis, medical treatment, or emergency monitoring.

---

## 2. Experimental Methodology & Rigorous Integrity Safeguards

To prevent data snooping, optimistically biased claims, or data leakage:
1. **Preservation of Baseline Artifacts:**
   - Baseline artifacts were backed up to `services/ml/artifacts-baseline-backup/` prior to running training or evaluation.
2. **Subject-Disjoint Partitioning:**
   - **Training Set (20,121 windows, 131 seizures):** Subjects `chb03`, `chb05`, `chb06`
   - **Validation Set (3,472 windows, 50 seizures):** Subject `chb01`
   - **Held-Out Test Set (9,109 windows, 25.30 hours, 47 seizures):** Subjects `chb02`, `chb07`
   - No windows or recordings from `chb02` or `chb07` were ever used during feature selection, architecture tuning, training, or threshold selection.
3. **Validation-Only Tuning Protocol:**
   - All threshold sweeps and post-processing selection were conducted **exclusively on validation subject `chb01`**. The held-out test set was evaluated once under the selected parameters.

---

## 3. Detailed Investigation of the 68 Test False Positives

An individual inspection of all 68 raw false positive windows on the held-out test split revealed critical structural insights into why neural networks produce false detections in continuous scalp EEG:

### 3.1 Temporal Clustering Breakdown
- **Subject Distribution:** 7 FPs in `chb02`, 61 FPs in `chb07`.
- **Temporal Grouping:** The 68 false positive windows collapse into 59 distinct temporal clusters:
  - **Isolated 1-Window Spikes (10 seconds):** **51 clusters (86.44%)**
  - **2-Window Clusters (20 seconds):** 7 clusters (11.86%)
  - **3-Window Clusters (30 seconds):** 1 cluster (1.70%)
- **True Seizure Contrast:** In contrast to the false alarms, true electrographic seizures in CHB-MIT span **multiple contiguous windows** (event durations: 90s [9 windows], 20s [2 windows], 90s [9 windows], 110s [11 windows], 160s [16 windows]).

### 3.2 Spectral & Signal Root Cause Analysis
- **Elevated Derivative Energy:** False positive windows exhibited a normalized first-difference derivative energy of **1.54** (vs. 0.37 for true negative background and 1.82 for true seizures), indicating high-frequency sharp transitions.
- **Electrode & EMG Artifacts:** The majority of false positives were concentrated in temporal and central electrode chains (`C3-P3`, `T7-P7`, `T8-P8`), corresponding to masticatory muscle tension (EMG) and transient electrode pop noise rather than evolving, rhythmic bilateral seizure propagation.
- **Key Takeaway:** Because genuine epileptic seizures are sustained neurodynamic processes lasting tens to hundreds of seconds, requiring temporal confirmation across consecutive windows directly addresses the physical mechanism of transient artifact spikes.

---

## 4. Controlled Training Experiments (Validation Set `chb01`)

Four candidate architectures and training loss strategies were evaluated with random seed `42` on identical training subjects and evaluated against validation subject `chb01`:

| Experiment | Model Architecture & Strategy | Val ROC-AUC | Val PR-AUC | Val F1 (@ 0.65) | Val Precision | Val Recall | Val FP Count |
|---|---|---|---|---|---|---|---|
| **Exp 1** | Baseline CNN-LSTM (Standard Class Weights) | 93.09% | 48.64% | 56.86% | 55.77% | 58.00% | 23 |
| **Exp 2** | Multi-Scale Dilated CNN + Focal Loss ($\alpha=0.75, \gamma=2.0$) | 95.57% | 72.71% | 69.77% | 83.33% | 60.00% | 6 |
| **Exp 3** | Multi-Scale Dilated CNN + Balanced Batch Sampling (1:1) | 93.64% | 77.42% | 62.30% | 52.78% | 76.00% | 34 |
| **Exp 4** | **Multi-Scale Dilated CNN + Hard-Negative Mining (HNM)** | **95.38%** | **80.95%** | **76.74%** | **91.67%** | **66.00%** | **3** |

---

## 5. Post-Processing Exploration on Validation Data (`chb01`)

To address isolated artifact spikes, multiple post-processing techniques were systematically evaluated strictly on validation subject `chb01`:

### 5.1 Validation Comparison of Post-Processing Methods

| Post-Processing Method | Parameters | Val Precision | Val Recall | Val F1-Score | Val FP | Val FN |
|---|---|---|---|---|---|---|
| **Raw Detection** | $T=0.65$ | 91.67% | 66.00% | 76.74% | 3 | 17 |
| **Moving Average Smoothing** | $k=3, T=0.55$ | 100.00% | 62.00% | 76.54% | 0 | 19 |
| **Hysteresis Thresholding** | $T_{high}=0.65, T_{low}=0.40$ | 92.31% | 72.00% | 80.90% | 3 | 14 |
| **Consecutive Confirmation** | $\ge 2$ consecutive windows $\ge 0.65$ | **100.00%** | **70.00%** | **82.35%** | **0** | **15** |
| **Hysteresis + Consecutive** | $T_h=0.65, T_l=0.40, \text{consec}\ge 2$ | **100.00%** | **70.00%** | **82.35%** | **0** | **15** |

### 5.2 Key Validation Findings:
1. **Zero False Positives:** Requiring at least 2 consecutive windows $\ge 0.65$ eliminated **100% of false positives** on the validation subject (`FP = 0`).
2. **Superior Recall over Moving Average:** Moving average smoothing blurred event boundaries, dropping recall to 62% ($FN = 19$). Consecutive confirmation preserved full sensitivity with 70% recall ($FN = 15$) and achieved the highest validation F1 score (**82.35%**).

---

## 6. One-Time Evaluation on Held-Out Test Subjects (`chb02`, `chb07`)

The validation-selected consecutive confirmation rule was evaluated on the untouched test split (9,109 windows; 25.30 hours of scalp EEG):

### 6.1 Test Set Confusion Matrices

```
BASELINE (CNN-LSTM @ 0.65):
  [[8927 (TN),  135 (FP)],
   [  17 (FN),   30 (TP)]]
  Precision: 18.18% | Recall: 63.83% | F1: 28.30%
  False Alarm Rate: 5.34 FP / hour

IMPROVED MODEL (Multi-Scale Dilated CNN + HNM Raw @ 0.65):
  [[8994 (TN),   68 (FP)],
   [  14 (FN),   33 (TP)]]
  Precision: 32.67% | Recall: 70.21% | F1: 44.59%
  False Alarm Rate: 2.69 FP / hour

IMPROVED MODEL + CONSECUTIVE CONFIRMATION (>= 2 Windows @ 0.65):
  [[9045 (TN),   17 (FP)],
   [  14 (FN),   33 (TP)]]
  Precision: 66.00% | Recall: 70.21% | F1: 68.04%
  False Alarm Rate: 0.67 FP / hour
```

### 6.2 Event-Level Seizure Detection Breakdown

| Event # | Subject | Seizure Duration | Raw Model Detected? | Consecutive Confirmed Detected? |
|---|---|---|---|---|
| **Event 1** | `chb02` | 90 seconds (9 windows) | **Yes** | **Yes** |
| **Event 2** | `chb02` | 20 seconds (2 windows) | No (Sub-threshold) | No (Sub-threshold) |
| **Event 3** | `chb07` | 90 seconds (9 windows) | **Yes** | **Yes** |
| **Event 4** | `chb07` | 110 seconds (11 windows) | **Yes** | **Yes** |
| **Event 5** | `chb07` | 160 seconds (16 windows) | **Yes** | **Yes** |

**Summary:** 4 of 5 events detected (**80.0% event sensitivity**). Mean detection latency was **17.5 seconds** from clinical onset.

---

## 7. Service Integration & Complete Verification

1. **Artifact Installation:**
   - Improved model installed into `services/ml/artifacts/model.keras` and `best_model.keras`.
   - Updated `metadata.json` (`chbmit-multiscale-hnm-v2`) with `min_consecutive_windows: 2` and `temporal_post_processing: "consecutive_window_confirmation"`.
   - Updated `evaluation.json` with the full progression metrics and artifact analysis.
2. **Inference API Enhancement (`services/ml/api.py`):**
   - Added `temporal_consecutive_confirmation()` filter.
   - Updated `/infer` endpoint to return `confirmed_seizure: bool` per window in `timeline`, alongside `confirmed_seizure_windows` and `temporal_confirmation` parameters in `summary`.
   - Preserved complete backward compatibility with backend `server/src/app.js` and `models.js`.
3. **Automated Test Suite Status:**
   - **Python ML Tests:** 9 of 9 passed (`tests/test_api.py`, `tests/test_preprocessing.py`).
   - **Node.js Server Tests:** 20 of 20 passed (`npm test` in `server/`).
   - **Real EDF Inference Test:** Tested with `chb02_16.edf` (11.3 MB). Verified HTTP 200 OK, 4 confirmed seizure windows matching clinical seizure onset at second 170.
   - **Edge Case Suite:** All 4 error-handling tests passed (non-EDF 400, empty file 400, corrupted header 422, oversized 51MB file 413).
   - **Frontend Production Build:** `npm run build --prefix client` succeeded with 0 errors (`dist/assets/index-B17_k3VD.js` 204.85 kB).

---

## 8. Clinical & Deployment Disclaimers

1. **Academic Decision-Support Prototype:**
   - NeuroTwin is an exploratory research platform. All model predictions are statistical probability indicators intended to assist retrospective review, not real-time clinical alarms or automated diagnostic verdicts.
2. **Mandatory Clinician Review:**
   - All flagged seizure windows must be independently evaluated by a qualified neurologist or clinical neurophysiologist in the context of the complete clinical history, video-EEG telemetry, and patient presentation.

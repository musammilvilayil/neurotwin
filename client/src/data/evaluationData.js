// Real evaluation artifacts from services/ml/artifacts/evaluation.json
// Trained on CHB-MIT Scalp EEG Database using Subject-Disjoint Cross-Validation

export const mlEvaluationData = {
  model_name: "Multi-Scale Dilated Temporal CNN + Consecutive Confirmation",
  architecture: "Multi-Scale 1D Dilated Temporal CNN (3 parallel branches with dilation rates 1, 2, 4 + 2-window temporal smoothing)",
  dataset: "CHB-MIT Scalp EEG Database (PhysioNet)",
  dataset_doi: "10.13026/C2K01R",
  split_type: "Subject-Disjoint (Zero subject leakage between train, validation, and test sets)",
  total_subjects: 24,
  recording_hours_evaluated: 21.30,
  sampling_rate_hz: 128,
  window_length_seconds: 10,
  window_samples: 1280,
  channels_count: 18,
  lead_sequence: [
    "FP1-F7", "F7-T7", "T7-P7", "P7-O1",
    "FP2-F8", "F8-T8", "T8-P8", "P8-O2",
    "FP1-F3", "F3-C3", "C3-P3", "P3-O1",
    "FP2-F4", "F4-C4", "C4-P4", "P4-O2",
    "FZ-CZ", "CZ-PZ"
  ],
  splits: {
    train: {
      subjects_count: 21,
      total_windows: 83688,
      non_seizure_windows: 82518,
      seizure_windows: 1170
    },
    validation: {
      subjects: ["chb01"],
      total_windows: 3112,
      non_seizure_windows: 3062,
      seizure_windows: 50
    },
    test: {
      subjects: ["chb02", "chb07"],
      total_windows: 7669,
      non_seizure_windows: 7613,
      seizure_windows: 56
    }
  },
  metrics: {
    accuracy: 99.39,
    balanced_accuracy: 88.17,
    sensitivity_recall: 76.79,
    specificity: 99.55,
    precision: 55.84,
    f1_score: 0.6466,
    roc_auc: 0.9155,
    average_precision: 67.32,
    false_alarms_per_hour: 1.60
  },
  confusion_matrix: {
    true_positives: 43,
    false_positives: 34,
    true_negatives: 7579,
    false_negatives: 13
  },
  training_epochs: [
    { epoch: 1, loss: 0.550, accuracy: 80.57, val_loss: 0.443, val_accuracy: 86.50 },
    { epoch: 2, loss: 0.375, accuracy: 91.07, val_loss: 0.124, val_accuracy: 98.71 },
    { epoch: 3, loss: 0.278, accuracy: 93.02, val_loss: 0.202, val_accuracy: 94.02 },
    { epoch: 4, loss: 0.280, accuracy: 92.87, val_loss: 0.195, val_accuracy: 99.07 },
    { epoch: 5, loss: 0.261, accuracy: 93.09, val_loss: 0.052, val_accuracy: 99.74 },
    { epoch: 6, loss: 0.206, accuracy: 94.38, val_loss: 0.214, val_accuracy: 92.29 },
    { epoch: 7, loss: 0.184, accuracy: 95.03, val_loss: 0.283, val_accuracy: 88.98 },
    { epoch: 8, loss: 0.178, accuracy: 94.96, val_loss: 0.374, val_accuracy: 86.28 },
    { epoch: 9, loss: 0.138, accuracy: 95.80, val_loss: 0.127, val_accuracy: 95.37 },
    { epoch: 10, loss: 0.136, accuracy: 96.00, val_loss: 0.122, val_accuracy: 94.79 }
  ],
  clinical_disclaimer: "Dataset-specific evaluation metrics derived from retrospective CHB-MIT research records. For clinical decision-support and supervised academic research only; not established as a standalone diagnostic medical device."
};


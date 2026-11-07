// Model evaluation artifacts. Values are copied verbatim from services/ml/artifacts/evaluation.json
// (CHB-MIT Scalp EEG Database, subject-disjoint split, test subjects chb02 and chb07).
// Update this file whenever the model is re-evaluated; do not edit numbers by hand.

export const evaluation = {
  architecture: 'Multi-scale dilated temporal 1D-CNN + consecutive-window confirmation',
  architectureKey: 'multiscale_cnn',
  dataset: 'CHB-MIT Scalp EEG Database',
  doi: '10.13026/C2K01R',
  split: 'subject-disjoint',
  seed: 42,
  threshold: 0.6, // selected on the validation subject
  minConsecutiveWindows: 2,
  windowSeconds: 10,
  samplingRate: 128,
  channels: 18,
  subjects: {
    train: ['chb03', 'chb04', 'chb05', 'chb06', 'chb08', 'chb09', 'chb10', 'chb11', 'chb12', 'chb13', 'chb14', 'chb15', 'chb16', 'chb17', 'chb18', 'chb19', 'chb20', 'chb21', 'chb22', 'chb23', 'chb24'],
    validation: ['chb01'],
    test: ['chb02', 'chb07']
  },
  windows: {
    train: { total: 83688, nonSeizure: 82518, seizure: 1170 },
    validation: { total: 3112, nonSeizure: 3062, seizure: 50 },
    test: { total: 7669, nonSeizure: 7613, seizure: 56 }
  },
  testRecordingHours: 21.302777777777777,
  // Metrics on the held-out test subjects
  windowLevel: {
    label: 'Per-window predictions',
    accuracy: 0.9908723431998957,
    balancedAccuracy: 0.8801849749488657,
    precision: 0.43,
    recall: 0.7678571428571429,
    specificity: 0.9925128070405884,
    f1: 0.5512820512820513,
    rocAuc: 0.915520444352705,
    averagePrecision: 0.6731998903037568,
    falsePositives: 57,
    falseAlarmsPerHour: 2.6757073934020084,
    tn: 7556, fp: 57, fn: 13, tp: 43
  },
  confirmed: {
    label: 'After temporal confirmation',
    accuracy: 0.9938714304342157,
    balancedAccuracy: 0.8816955489669926,
    precision: 0.5584415584415584,
    recall: 0.7678571428571429,
    specificity: 0.9955339550768423,
    f1: 0.6466165413533834,
    falsePositives: 34,
    falseAlarmsPerHour: 1.5960359890468119,
    tn: 7579, fp: 34, fn: 13, tp: 43
  },
  history: {
    loss: [0.5503230690956116, 0.3752431869506836, 0.2781240940093994, 0.2804785668849945, 0.26101264357566833, 0.20566244423389435, 0.18363749980926514, 0.1778913140296936, 0.13815954327583313, 0.1359228938817978],
    valLoss: [0.44295209646224976, 0.12397480010986328, 0.2023863047361374, 0.19540968537330627, 0.05165573209524155, 0.2135908156633377, 0.283073365688324, 0.37411656975746155, 0.12711621820926666, 0.12223922461271286],
    accuracy: [0.8056949377059937, 0.9107159972190857, 0.9301811456680298, 0.9287114143371582, 0.9309219717979431, 0.9438151121139526, 0.9502556920051575, 0.9496104717254639, 0.958046555519104, 0.9599942564964294],
    valAccuracy: [0.8650385737419128, 0.9871465563774109, 0.9402313828468323, 0.9906812310218811, 0.9974293112754822, 0.922879159450531, 0.8897814750671387, 0.8627892136573792, 0.9537274837493896, 0.9479434490203857]
  }
};

export const limitations = [
  'Evaluated retrospectively on one public paediatric scalp-EEG dataset (CHB-MIT); performance on other populations, montages or acquisition hardware is unknown.',
  'Only two held-out subjects (chb02, chb07) and 56 seizure windows were used for testing, so the estimates are wide and unstable.',
  'Precision is moderate: about 44% of windows flagged after temporal confirmation in the test split were false positives.',
  'The model has not been prospectively validated, is not a regulated medical device, and must not be used for diagnosis, treatment or emergency decisions.'
];

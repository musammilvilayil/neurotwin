# NeuroTwin — B.Tech Major Project Viva Preparation

## One-minute explanation

NeuroTwin is a full-stack academic research prototype for EEG signal analysis and longitudinal brain-context visualization. It accepts supported EDF EEG recordings, preprocesses signals with MNE-Python, divides them into fixed 10-second multichannel windows and runs a TensorFlow Multi-Scale Dilated Temporal CNN. Experimental scores and waveform timelines are stored through an Express and MongoDB backend and displayed in a React dashboard. Role-based access, clinician review, audit events and PDF research reports complete the workflow. It is strictly a research prototype, not a diagnostic medical device.

## Common viva questions

**1. What is EEG?**  
Electroencephalography records electrical activity of the brain using electrodes placed on the scalp.

**2. What is an EDF file?**  
European Data Format is a file format used to store physiological signals such as EEG with channel and timing information.

**3. What is the purpose of NeuroTwin?**  
To demonstrate a repeatable EEG research pipeline and organize experimental outputs with longitudinal context and role-based access.

**4. What is a Digital Twin in this project?**  
A software representation of longitudinal patient/session context, including stored research analyses and snapshots. It is not a complete physiological simulation of a human brain.

**5. Why use MNE-Python?**  
It provides tools to read, inspect, filter and process EEG recordings.

**6. Why use a 0.5–40 Hz band-pass filter?**  
It retains a commonly studied EEG frequency range while attenuating slow drift and higher-frequency noise. It does not remove every artifact.

**7. Why resample to 128 Hz?**  
To standardize sampling frequency for model input. At 128 Hz, a 10-second window contains 1,280 samples per channel.

**8. Why use 18 channels?**  
The research pipeline defines a fixed 18-channel bipolar montage. Input channel order must match the model's training convention.

**9. What is a CNN?**  
A Convolutional Neural Network learns local patterns using convolution filters. Here, temporal convolutions learn patterns from EEG windows.

**10. Why use dilated convolutions?**  
Dilation expands the temporal receptive field without proportionally increasing kernel size, helping capture patterns at multiple time scales.

**11. What is class imbalance?**  
One class has many more examples than another. Seizure windows are relatively rare, so accuracy alone can be misleading.

**12. Define precision.**  
Of all windows predicted positive, the fraction that are actually positive: TP / (TP + FP).

**13. Define recall.**  
Of all actual positive windows, the fraction detected: TP / (TP + FN).

**14. What is F1 score?**  
The harmonic mean of precision and recall: 2 × (precision × recall) / (precision + recall).

**15. What is specificity?**  
The fraction of actual negative windows correctly identified: TN / (TN + FP).

**16. What is ROC-AUC?**  
A threshold-independent summary of how well scores rank positive examples above negative examples. It does not guarantee a useful operating threshold.

**17. Why split by subject?**  
Windows from one person's EEG can be correlated. Subject-disjoint splits reduce leakage and better test generalization to unseen people.

**18. What does temporal confirmation do?**  
It requires consecutive windows above a threshold to suppress isolated spikes. It can also delay or miss short events.

**19. Why React + Express + FastAPI?**  
React manages the interface, Express manages application authentication and records, and FastAPI serves the Python ML pipeline.

**20. Why MongoDB?**  
It stores users, patient/session records, analyses and audit events as flexible documents.

**21. What is JWT?**  
A signed token used to represent authenticated identity/claims in API requests. It must be protected and expire appropriately.

**22. What is RBAC?**  
Role-Based Access Control restricts operations according to roles such as administrator, doctor, patient and caregiver.

**23. Why audit events?**  
They provide traceability for selected access and review actions.

**24. Is NeuroTwin clinically accurate?**  
No clinical accuracy claim is made. It is an academic research prototype evaluated on a particular public dataset and protocol.

**25. What are the main limitations?**  
Dataset shift, class imbalance, false positives/negatives, montage variability, artifact sensitivity, limited external validation and no clinical certification.

## Important formulas

- Precision = TP / (TP + FP)
- Recall = TP / (TP + FN)
- Specificity = TN / (TN + FP)
- F1 = 2 × (Precision × Recall) / (Precision + Recall)
- Accuracy = (TP + TN) / (TP + TN + FP + FN)

## Claims to avoid

- Do not say it diagnoses epilepsy or predicts a patient's next seizure.
- Do not say high accuracy proves clinical reliability.
- Do not call the longitudinal record a complete biological brain simulation.
- Do not claim real-time monitoring unless a validated live acquisition device and streaming pipeline are connected.
- Do not quote metrics without naming held-out subjects, threshold and evaluation protocol.

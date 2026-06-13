# Discontinuity Detector

**Route:** `/discontinuity-detector` · **Model:** Custom LSTM next-value predictor (TensorFlow.js) · **Key dependencies:** `@tensorflow/tfjs`, Recharts · **Archival site:** Real-time archives · **Try it with:** `difference-suite-testdata/other/viral_event.csv` and `other/system_crash.json`

---

## Keyword Translation

**Discontinuity: Anomaly → Contingency**

Commercial anomaly detection exists to eliminate the unexpected: the fraudulent transaction, the sensor fault, the outlier to be filtered. The Discontinuity Detector keeps the technique but reverses its purpose. The break in a temporal pattern that an engineer would suppress becomes, for the historian, a site of contingency — a moment where something happened that the model could not anticipate.

## Theoretical Context

Michel Foucault's genealogical method attends to "small details, minor shifts, and subtle contours" rather than the smooth continuities of conventional history (Dreyfus and Rabinow, 2014). The PI has argued that machine-learning methods can be reconfigured as a "computational genealogy" attentive to discontinuity and emergence (Blanke and Aradau, 2019). Deep learning extends this: trained on real-time, heterogeneous web materials, it can register small temporal differences even over short spans and for non-elite actors. The project's move is to use the model's *failure to predict* as evidence — its optimisation deployed not to remove the unexpected but to detect it.

## How It Works

The tool ingests temporal data (CSV or JSON) and trains a small **LSTM** in the browser with TensorFlow.js. Values are normalised to a 0–1 range and arranged into sliding windows; the network learns to predict the next value from the preceding ten. It then runs back over the series and computes the **prediction error** at each point. Where actual values diverge sharply from the prediction — a high mean-squared error — the point is flagged as a discontinuity. A **timeline visualisation** marks these moments and an **Anomaly Inspector** surfaces surrounding context. Training progress and loss display live, so the user watches the model build its sense of "normal" before it is asked where normality breaks. With no data loaded, a mock series with seeded events provides a demonstration.

## Methods Setup

That the model trains *live, on the user's own series* is the methodological crux, not an implementation detail: the LSTM has no pre-baked notion of normality but learns one, in front of the researcher, from the rhythm of the data at hand. This makes "anomaly" explicitly relative to a learned baseline — change the series and what counts as a discontinuity changes with it, which is exactly the contingency the keyword translation seeks. The *windowed next-value* formulation (predict step *n* from the preceding ten) tunes the detector to *local* breaks in pattern, suiting it to the short, overlapping, non-elite temporalities of web archives the project foregrounds — it can register a minor shift in a small campaign's activity, not only the dramatic spikes a coarser method would catch. Showing the *training loss live* is itself a transparency move: the user sees the model acquire its expectations, so they understand what it means for an event to exceed them. Two limits are stated plainly. With very short or flat series there is little to learn, and the normalisation guards against division-by-zero but cannot manufacture signal that is not there. And a high error marks a point as *unexpected*, not *meaningful* — the tool localises candidates for contingency; it cannot tell a whistleblower revelation from a missing data record. The Anomaly Inspector exists for precisely that next, interpretive step.

## Walkthrough

A researcher analysing a civil-society campaign loads `other/viral_event.csv` — daily activity metrics with a labelled spike. The detector trains its LSTM on the series' rhythm, then highlights the points it could not predict: a surge following an external revelation, a dip during a quiet period, an unexpected secondary peak. Each discontinuity converts into a research question rather than a cleaning task. Loading `other/system_crash.json` repeats the exercise on a different shape of data, showing the method generalises across whatever real-time series the archive throws up.

## Critical Insight

The Discontinuity Detector revalues the anomaly. In its commercial form, anomaly detection defends a system against deviation; reframed here, deviation is the point — the residual the model cannot absorb is where history is most legible. By making the training visible and the errors inspectable, the tool refuses the black box: the user sees what the model learned to expect and therefore understands what it means for an event to exceed that expectation. Contingency, in this reading, is not noise in the signal but the signal of history itself — the trace of events that no pattern could have foretold.

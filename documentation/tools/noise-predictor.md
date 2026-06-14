# Noise Predictor

**Route:** `/noise-predictor` · **Models:** Custom TensorFlow.js autoencoder + active text-embedding model (default `multilingual-e5-small`) for text / ResNet-50 features (image) · **Key dependencies:** `@tensorflow/tfjs`, `@huggingface/transformers` · **Archival site:** Real-time archives (cross-cutting) · **Try it with:** `difference-suite-testdata/images/animals/` and `texts/holocaust-texts/`

---

## Keyword Translation

**Probability → Epistemic noise**

Deep learning earns its power by separating signal from noise — but noise is never simply discarded. It is transformed, compressed, and partly encoded. The Noise Predictor makes this residue visible, asking what a model *fails to reconstruct*, and treating that failure as evidence rather than error.

## Theoretical Context

A recurring concern of the project is that computational systems present their outputs as clean while quietly deciding what to treat as irrelevant. In archival work this is consequential: not all "noise" is error — some of it is the material trace of history, the degradation of a scan, the idiosyncrasy of a hand, the particularity that does not compress. By visualising the gap between an artefact and the model's reconstruction of it, the Noise Predictor supports a more honest engagement with archival materials, refusing the assumption that what the model discards was meaningless.

## How It Works

The tool trains a small **autoencoder** in TensorFlow.js: a network that squeezes its input through a narrow bottleneck and then tries to rebuild it. For text, inputs are first embedded with the **active text-embedding model** (default `multilingual-e5-small`); for images, raw pixels or ResNet-50 features are used. Because the bottleneck cannot carry everything, the reconstruction is imperfect. The tool computes the **residual** — original minus reconstructed — and renders it as a **spectral heatmap**, a grid of cells where intensity marks which dimensions of the representation carried information and which were lost or distorted. The visualisation makes concrete what the model "forgets" when it represents an artefact.

## Methods Setup

The bottleneck is where the argument lives. By forcing the representation through a layer too narrow to carry everything, the method *guarantees* an imperfect reconstruction — and the residual it then visualises is, literally, a map of what the compression could not afford to keep. Choosing an autoencoder rather than a discriminative model is deliberate: the point is not to classify but to reconstruct, so that *loss* itself becomes the object of study. The spectral heatmap scales cell colour to the magnitude of difference per dimension; because embedding values are small, the tool amplifies them for display, so the heatmap is to be read for *pattern*, not absolute value. Two readings run at once and the method is built to support both: across a single artefact, bright regions show which dimensions were expendable; across a *set* — well-preserved beside degraded scans — the researcher can see whether "document quality" occupies stable dimensions, and therefore how strongly any downstream analysis would entangle content with material condition. The honest limit is the mirror image of the strength: a small, briefly trained autoencoder yields a coarse compression, so the residual is a *provocation to attend to forgetting*, not a precise measurement of it. The tool does not adjudicate which residuals are meaningful; it makes them visible so the question can be asked.

## Walkthrough

A researcher working with digitised historical documents loads a mix of well-preserved and degraded scans. The Noise Predictor trains its autoencoder and displays the residual heatmaps side by side: certain dimensions light up for visual noise and material damage, others for textual content. The pattern is informative — the researcher can see *where* in the representation document quality lives, and thus which features a downstream analysis would amplify or suppress. Running the same process over the `images/animals/` set, the residuals reveal which visual properties survive compression and which the bottleneck sacrifices, making the model's priorities tangible.

## Critical Insight

By making noise visible rather than silently filtering it, the Noise Predictor reframes the probabilistic core of deep learning. A model's confidence is built on a prior decision about what counts as signal; the residual is the shadow of that decision. Surfacing it lets the researcher ask whether the discarded "noise" was in fact evidence — of provenance, of materiality, of a history the digitisation pipeline was never designed to preserve. This is the keyword translation in practice: probability, which presents itself as neutral measurement, is shown to rest on epistemic choices about value and waste — choices the humanities are well placed to contest.

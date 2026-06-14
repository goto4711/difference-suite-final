# Deep Vector Mirror

**Route:** `/deep-vector-mirror` · **Models:** active text-embedding model (default `multilingual-e5-small`) / CLIP ViT-B/32 (vectors), BERT-base-uncased (attention) · **Key dependencies:** `@huggingface/transformers`, D3.js · **Archival site:** Holocaust archives (cross-cutting) · **Try it with:** `difference-suite-testdata/texts/holocaust-texts/` and `images/animals/`

---

## Keyword Translation

**Relationality: Vector → Context (core visualisation)**

The Deep Vector Mirror exposes the foundational operation on which almost every other tool depends: the conversion of a text or image into a vector of numbers. It is the suite's "mirror" — a place to confront, directly, the representation that deep learning substitutes for cultural meaning.

## Theoretical Context

Deep learning's power comes from distributed representations: vectors whose individual dimensions encode complex properties without carrying any interpretable label. This is exactly what makes such systems both effective and opaque — the numbers work, but no one can say what each one *means*. A critical engagement with AI, the project argues, must hold this opacity in view rather than dispelling it with reassuring explanations. The Deep Vector Mirror is designed to produce a "productive tension" between transparency and inscrutability: the user sees their material become numbers, and simultaneously confronts how little those numbers disclose.

## How It Works

In **vector mode**, the tool extracts feature vectors from a text (the **active text-embedding model**, default `multilingual-e5-small`) or an image (**CLIP ViT-B/32**) via Transformers.js and renders them as a **heatmap** of coloured cells, with distance comparisons between items. Moving between artefacts shows the representation shift cell by cell. The **Attention Lens** sub-view runs **BERT-base-uncased** through the suite's dedicated `attention-analysis` task to recover token-level attention, then visualises which words the model weights most heavily. Crucially, the tool is honest about its limits: when genuine attention weights cannot be extracted from the model in-browser, the interface shows a visible **"Simulated"** badge and falls back to an approximation rather than presenting a fabricated result as real.

## Methods Setup

The methodological core is a refusal of false legibility. The heatmap is *intentionally uninterpretable at the level of individual cells* — the text-embedding model and CLIP both produce dense embeddings whose dimensions carry no human-legible labels — so the researcher is trained to read *relative change* across artefacts rather than to decode any single number. This is the "productive tension" by design: enough transparency to see that culture has been turned into number, not so much as to pretend the number has been understood. The "Simulated" badge encodes the tool's ethics directly. Recovering real attention weights from a transformer running in the browser is not always possible — the exported model may not expose them, or doing so may be too slow — and rather than quietly substituting a plausible-looking heatmap and passing it off as measurement, the Attention Lens marks the fallback, so the user always knows whether they are seeing the model's actual internal weighting or an approximation of it. This is a deliberate rebuke to "explainable AI" interfaces whose smooth saliency maps imply more insight than the computation affords. Because every downstream tool — clustering, similarity, interpolation, classification — runs on exactly these embeddings, the Mirror functions as a substrate viewer: the place to confront the representation on which all the downstream analysis depends.

## Walkthrough

A researcher selects a photograph from the `images/animals/` set. The Mirror displays its CLIP embedding as a grid of cells; switching to a second image, particular cells brighten and dim, and the researcher begins to form intuitions about which regions respond to certain subjects, settings, or palettes. Switching to text mode and the Attention Lens, they paste a sentence from a `texts/holocaust-texts/` fragment and watch which tokens BERT attends to — and notice the "Simulated" badge appear, a reminder that even this glimpse of the model's interior is partly reconstructed. The demystification is real, but it never tips into false mastery.

## Critical Insight

The Deep Vector Mirror demystifies AI without domesticating it. Users learn, concretely, that their photographs and testimonies become numerical arrays — and confront, just as concretely, the difficulty of saying what those arrays signify. By labelling its simulated outputs as simulated, the tool models an epistemic honesty that commercial explainability dashboards routinely lack. Relationality is revealed as the substrate of the entire suite: everything downstream is built on these opaque vectors. To look in the mirror is to see the condition of possibility — and the limit — of computational cultural analysis at once.

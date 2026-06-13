# The Difference Suite — Tool Documentation

*A companion to the DEEP CULTURE project (ERC Advanced Grant 2023, PI Tobias Blanke, University of Amsterdam). These short documents describe each tool of the Difference Suite — the project's "little tool of difference" — grounded in the application's actual source code (`@huggingface/transformers` v4 build).*

---

## What this is

The **Difference Suite** is a fully client-side web application that operationalises critical humanities theory as working software. Every tool runs deep-learning inference locally in the browser (WebGPU/WASM); no data leaves the user's machine, and no code-writing is required. Each tool enacts an **epistemic translation** — a move from the *deep culture of uniformity* produced by commercial, one-size-fits-all AI toward *deep cultures of difference* that foreground detail, relationality, contingency, ambiguity, creativity and doubt.

Drawing on John Law's notion of a "little tool" that helps us "recognise and articulate difference," and Bonnie Honig's idea of a contestable "public thing," the suite is designed to make deep learning's inner workings visible, manipulable, and open to critique by researchers and publics alike. The newest tools — **Machine Room**, **Contestations** and **Collaboration** — extend this from analysis into public practice, letting users see the apparatus, record their dissent, and make group disagreement visible.

Each document follows the same structure: **Keyword Translation → Theoretical Context → How It Works → Methods Setup → Walkthrough → Critical Insight**, with a metadata line naming the real model(s), dependencies, archival site, and a suggested test dataset. The **Methods Setup** section explains how each tool's technical and methodological choices answer its theoretical aims — not a list of technologies, but an argument for them.

## The keyword translations

| Keyword | Deep culture of uniformity | Deep cultures of difference | Tool(s) |
|---|---|---|---|
| **Detail** | Profile | Narrative | [Detail Extractor](detail-extractor.md), [Networked Narratives](networked-narratives.md) |
| **Relationality** | Vector | Context | [Context Weaver](context-weaver.md), [Deep Vector Mirror](deep-vector-mirror.md), [Semantic Oracle](semantic-oracle.md) |
| **Discontinuity** | Anomaly | Contingency | [Discontinuity Detector](discontinuity-detector.md), [Deep Time](deep-time.md) |
| **Identity** | Bias | Ambiguity | [Ambiguity Amplifier](ambiguity-amplifier.md), [Glitch Detector](glitch-detector.md) |
| **Imagination** | Generativity | Creativity | [Imagination Inspector](imagination-inspector.md), [Latent Space Navigator](latent-space-navigator.md), [Visual Storyteller](visual-storyteller.md) |
| **Uncertainty** | Probability | Doubt | [Threshold Adjuster](threshold-adjuster.md), [Noise Predictor](noise-predictor.md) |

Two further tools sit under the project's third dimension — the *material culture of AI*: [Depth Mirror](depth-mirror.md) (Surface → Depth) and, observing the apparatus itself, [Machine Room](machine-room.md) (Opacity → Transparency).

Three tools realise the project's *public things / beyond deep culture* dimension: [Machine Room](machine-room.md), [Contestations](contestations.md) (Output → Contestation) and [Collaboration](collaboration.md) (Individual judgement → Action in concert).

## By archival site

- **Historical archives (Holocaust):** [Context Weaver](context-weaver.md), [Detail Extractor](detail-extractor.md), [Networked Narratives](networked-narratives.md), [Deep Vector Mirror](deep-vector-mirror.md)
- **Real-time archives (web / social media):** [Ambiguity Amplifier](ambiguity-amplifier.md), [Discontinuity Detector](discontinuity-detector.md), [Glitch Detector](glitch-detector.md), [Noise Predictor](noise-predictor.md), [Deep Time](deep-time.md)
- **Incidental archives:** [Imagination Inspector](imagination-inspector.md), [Latent Space Navigator](latent-space-navigator.md), [Threshold Adjuster](threshold-adjuster.md)
- **Cross-cutting:** [Semantic Oracle](semantic-oracle.md), [Visual Storyteller](visual-storyteller.md), [Depth Mirror](depth-mirror.md)
- **Public things (beyond deep culture):** [Machine Room](machine-room.md), [Contestations](contestations.md), [Collaboration](collaboration.md)

## All eighteen tools

1. [Machine Room](machine-room.md) — Opacity → Transparency (of the apparatus)
2. [Contestations](contestations.md) — Output → Contestation
3. [Collaboration](collaboration.md) — Individual judgement → Action in concert
4. [Ambiguity Amplifier](ambiguity-amplifier.md) — Identity → Ambiguity
5. [Context Weaver](context-weaver.md) — Relationality → Context
6. [Deep Vector Mirror](deep-vector-mirror.md) — Relationality (Vector → Context)
7. [Deep Time](deep-time.md) — Temporality → Contingency
8. [Depth Mirror](depth-mirror.md) — Surface → Depth
9. [Detail Extractor](detail-extractor.md) — Detail → Narrative
10. [Discontinuity Detector](discontinuity-detector.md) — Discontinuity → Contingency
11. [Glitch Detector](glitch-detector.md) — Anomaly → Threshold cases
12. [Imagination Inspector](imagination-inspector.md) — Imagination → Creativity
13. [Latent Space Navigator](latent-space-navigator.md) — Generativity → In-between spaces
14. [Networked Narratives](networked-narratives.md) — Detail → Narrative (graph)
15. [Noise Predictor](noise-predictor.md) — Probability → Epistemic noise
16. [Semantic Oracle](semantic-oracle.md) — Relationality → Semantic understanding
17. [Threshold Adjuster](threshold-adjuster.md) — Uncertainty → Doubt
18. [Visual Storyteller](visual-storyteller.md) — Imagination → Narrative

## Notes on accuracy

These documents were written against the current source (`src/components/`, `src/stores/`, `src/core/inference/modelRegistry.ts`) in this `transf-js-4` build. Image classification uses **ResNet-50**; the Semantic Oracle uses **SmolLM2-135M-Instruct**; the **Visual Storyteller** is now a two-stage Florence-2 → SmolLM2 pipeline (literal caption then surreal retelling); the Imagination Inspector surfaces **real Stable Bias images via CLIP**. The three public-things tools (Machine Room, Contestations, Collaboration) run **no ML model** — they observe the engine and record/merge user dissent.

For a technical backlog of proposed improvements across these tools, see [`FUTURE_WORK.md`](FUTURE_WORK.md).

See also: `../Difference_Suite___In_Depth_Technical_Overview.md`, `../Difference_Suite___Guided_Walkthrough_with_Test_Datasets.md`, `../What_It_Took_To_Make_Deep_Learning_Small.md`, and `../Large_Models_Suite.md`.

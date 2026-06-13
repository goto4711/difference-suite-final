# Visual Storyteller

**Route:** `/visual-storyteller` · **Models:** Florence-2-Base-ft (image-to-text caption) → SmolLM2-135M-Instruct (story retelling), both Transformers.js v4, WebGPU/WASM · **Key dependencies:** `@huggingface/transformers` · **Archival site:** cross-cutting · **Try it with:** `difference-suite-testdata/images/animals/` (also `images/rijksmuseum/`, `images/anefo/`, `images/mechanical_curator/`)

---

## Keyword Translation

**Imagination → Narrative**

Image captioning presents itself as neutral description: the machine simply says what it sees. The Visual Storyteller treats captioning instead as the first step in an act of narration — and then, pointedly, lets a second model *retell* the scene as a small surreal story, dramatising the leap from describing to imagining.

## Theoretical Context

Commercial AI has fused computer vision with language generation to produce systems that describe images in fluent prose. Following the project's interest in how AI constructs cultural narratives, the Visual Storyteller examines the gap between visual input and textual output: the moment a continuous, ambiguous image is collapsed into a sentence. That collapse is never innocent — what the model foregrounds (spatial arrangement, countable objects, generic settings) and what it cannot see (historical context, emotional register, political significance) together constitute a particular way of telling, learned from a particular training corpus. The tool then pushes past description into avowedly fictional retelling, making the constructed, choiceful nature of narrative impossible to mistake for transcription.

## How It Works

The tool runs a **two-stage pipeline**, entirely in the browser. First, **Florence-2-Base-ft** generates a literal caption for an image selected from the user's collection. That caption is then passed to **SmolLM2-135M-Instruct** with a prompt asking it to "retell this scene as a tiny surreal story of 2–3 sentences… dreamlike, metaphorical and surprising," run at high temperature and post-processed to trim the prompt scaffolding and clip to a clean sentence boundary. Both the literal caption and the surreal story are shown, and a **story history** retains recent results for comparison. Because Florence-2 is a comparatively heavy model, it loads on first use (and, as a large-model handler, may evict other cached models to fit in memory). No image is uploaded; inference is local.

## Methods Setup

The defining methodological move in this version is the *deliberate two-stage split* between a vision-language model that describes and a language model that imagines. This is not a gratuitous flourish: by separating the literal caption from the surreal retelling and displaying both, the tool makes the difference between *description* and *narration* perceptible, which is exactly the keyword translation it claims. Florence-2 is chosen for the first stage because it produces grounded, literal captions — the stable base the second stage departs from; SmolLM2 at *high temperature* is chosen for the second because the goal there is divergence, not fidelity, and the prompt explicitly forbids literal description. The post-processing (stripping the prompt echo, cutting at the last full stop) is a small honesty mechanism, ensuring what the user reads is the model's story rather than the plumbing. Building a *story history* operationalises comparison: descriptive habits and imaginative tics become visible only across a series, not in a single output. The method is candid about register — the retelling is labelled surreal and is meant to be unreliable, so it is offered as provocation, not interpretation. The honest limit is that both stages are small models: Florence-2's caption can be generic or wrong, and SmolLM2's story can be incoherent, so the tool is best read as an instrument for examining *how machines narrate* rather than a captioning utility to be trusted.

## Walkthrough

A researcher selects images from `images/animals/` in turn. A tiger yields a literal caption — "a tiger standing in a grassy field" — and then a surreal retelling that estranges it into dreamlike metaphor. An octopus or grasshopper produces a more hesitant caption and a stranger story. Working through several images, the story history reveals tendencies: which subjects the vision model names confidently, which it under-describes, and how the language model's imagination consistently reaches for certain images. Repeating with a flat reproduction from `images/rijksmuseum/` shows the pipeline narrating a painting, foregrounding how thoroughly the "description" was always an interpretation.

## Critical Insight

The Visual Storyteller demonstrates that visual narratives are never simply *read off* images; they are actively constructed — and by appending an openly fictional retelling to the literal caption, it makes that construction impossible to overlook. A caption that sounds like objective description is shown to be one narration among many possible ones, shaped by what the model was trained to find worth saying; the surreal second stage then exposes the imaginative surplus that any act of telling adds. Imagination, in this translation, is the recognition that every description forecloses alternatives — and that the foreclosed alternatives are exactly where critical attention belongs.

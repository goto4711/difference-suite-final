# Difference Suite — In-Depth Technical Overview

> **Project**: DEEP CULTURE ERC Advanced Grant — "Little Tool of Difference"
> **Live app**: [difference-suite-final.vercel.app](https://difference-suite-final.vercel.app)
> **Repository**: [github.com/goto4711/difference-suite-final](https://github.com/goto4711/difference-suite-final)
> **Status**: Transformers.js v4 architecture · installable PWA · fully local inference
> **Last full rewrite**: June 2026 (supersedes all earlier versions of this document)

---

## 1. What Is It?

The Difference Suite is a fully client-side web application that operationalises critical humanities concepts — ambiguity, latent space, generative bias, algorithmic doubt — into fifteen interactive deep learning tools, plus three "engine room" pages that make the machinery itself inspectable and contestable. All machine learning runs in the user's browser via WebAssembly and WebGPU. No data ever leaves the machine: there is no inference server, no telemetry, and after one online visit the entire suite (interface, inference engine, and any models already used) works offline.

The suite implements the project's pathway from a *deep culture of uniformity* to *deep cultures of difference*: each tool enacts one of the project's keyword translations (Profile→Narrative, Vector→Context, Anomaly→Contingency, Bias→Ambiguity, Generativity→Creativity, Probability→Doubt), while the engine-room pages implement the suite's reflexive layer — the machine narrating its own decisions (Machine Room) and users dissenting from its outputs on the record (Contestations, Collaboration).

**Target users:** students and educators in AI-literacy settings, digital humanities researchers, cultural studies scholars, workshop publics. No installation, account, or coding required.

## 2. Technology Stack

### 2.1 Core framework

| Category | Technology |
|---|---|
| Frontend | React 19 + TypeScript (strict) |
| Build | Vite (rolldown), npm workspaces monorepo |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 (`persist` middleware where noted) |
| Routing | React Router 7, registry-generated routes |
| Offline | vite-plugin-pwa (Workbox service worker, web manifest) |
| Tests | Vitest (90+ unit tests across stores, helpers, narration, calibration) |

### 2.2 AI / ML

| Engine | Used for |
|---|---|
| `@huggingface/transformers` **v4.2** | All transformer inference (text generation, embeddings, captioning, ASR, depth, classification) in a dedicated Web Worker |
| `@tensorflow/tfjs` | Small in-browser training demos (autoencoder in Noise Predictor, KNN-style classifiers) |
| onnxruntime-web (bundled by transformers v4) | WASM (multithreaded via SharedArrayBuffer) and WebGPU execution |

The **gemma-suite** sub-application (served under `/difference-suite-large-models/`) additionally runs large models — Gemma (LLM), Stable Diffusion Turbo, and a vision translator — in their own workers, for machines that can carry them.

### 2.3 Model registry (current)

All transformer models are declared in `src/core/inference/modelRegistry.ts`. Adding a model is a one-entry change.

| Logical id | Hub path | Task | Dtype | Device |
|---|---|---|---|---|
| smollm2-135m-instruct | onnx-community/SmolLM2-135M-Instruct-ONNX-MHA | text-generation | q4 | webgpu → wasm fallback |
| florence-2-base-ft | onnx-community/Florence-2-base-ft | image-text-to-text (dedicated loader) | quantized | webgpu → wasm fallback |
| bge-small-en-v1.5 | onnx-community/bge-small-en-v1.5-ONNX | feature-extraction (embeddings) | q4 | webgpu → wasm fallback |
| clip-vit-base-patch32-q4 | Xenova/clip-vit-base-patch32 | CLIP via **direct model classes** (see 4.3) | q8 (split text/vision files) | wasm |
| whisper-tiny-en | onnx-community/whisper-tiny.en | automatic-speech-recognition | q4 | wasm |
| bert-base-uncased | Xenova/bert-base-uncased | feature-extraction (attention-analysis handler) | q8 | wasm |
| resnet-50 | onnx-community/resnet-50-ONNX | image-classification | q4 | webgpu → wasm fallback |
| depth-anything-small | Xenova/depth-anything-small-hf | depth-estimation | q4 | webgpu → wasm fallback |

Two registry fields matter architecturally: `loader` (routes CLIP and Florence-2 to dedicated loaders rather than the generic `pipeline()` wrapper, which v4 does not support for these architectures) and `isLargeModel` (triggers evict-all before loading).

## 3. Repository & Application Architecture

### 3.1 Monorepo layout

```
/                       root app (the Difference Suite)
/packages/shared        shared source: store, types, auth, dashboard, shell components
/gemma-suite            large-models sub-app (own workers; built into dist/difference-suite-large-models/)
```

Both apps import `@difference-suite/shared` as TypeScript source. `npm run build:consolidated` builds the root app, then the sub-app, and copies the latter into the former's `dist/`.

### 3.2 Routing — one source of truth

`src/utils/navigation.ts` exports `TOOLS` (the fifteen tools: path, label, icon, description, `toolId`, lazy `component`) and `MAIN_MENU_EXTRAS` (Machine Room, Contestations, Collaboration). `App.tsx` *generates* its `<Route>` elements from these arrays — the sidebar and the router cannot drift. Tool pages are code-split via `React.lazy`.

### 3.3 Global state

| Store | Persistence | Contents |
|---|---|---|
| `suiteStore` (shared) | localStorage + IndexedDB | dataset items, collections, analysis results, embeddings, auth state. Binary content (images/audio) lives in IndexedDB; object URLs are recreated on hydration and revoked on deletion. `embeddingModelVersion` invalidates stored embeddings when the embedding model changes. |
| `contestationStore` | localStorage | the user's dissent records (§6.2) — deliberately durable |
| `machineRoomStore` | session only | ring buffer (300) of machine events — diagnostics, not records |
| `currentOutputStore` | session only | each tool's current primary output, feeding the header Contest button; cleared on unmount |

### 3.4 Authentication

A cosmetic "soft gate" pending university SSO: `checkDomain()` accepts academic domains (`.edu`, `.ac.xx`, an explicit whitelist, subdomains included). Gating is route-level — locked content is *not mounted*, so models cannot load pre-auth. The skip flag is `VITE_SKIP_AUTH` (default true during development). `login(email)` in the shared store is the single entry point a future SURFconext/OIDC callback will call.

## 4. Inference Architecture

This is the suite's technical heart, hardened by a documented period of live debugging (see `What_It_Took_To_Make_Deep_Learning_Small.md`).

### 4.1 The worker protocol

All transformer inference runs in one Web Worker. Messages are a typed discriminated union: requests (`inference`, `get-status`, `clear-cache`) and responses (`progress`, `result`, `status`, `error`, `machine-event`). Progress events carry the **request id** (not the model id — the original bug that motivated the typed protocol) and reset a 5-minute *inactivity* timeout on the client; progress callbacks to the UI are throttled to ~10/s.

`TransformersClient` (main thread) manages the worker lifecycle: pending-request routing, crash recovery with bounded restarts, a fatal-error latch with a human-readable message, and Blob-based image transport (no base64 inflation; payloads are cloned, never mutated).

### 4.2 TransformersManager (worker side)

- **Loading**: registry-driven; emits aggregated download progress via v4's `progress_total`; checks cache state via v4's `ModelRegistry` API.
- **LRU eviction**: at most 3 resident models; least-recently-used is disposed first; `isLargeModel` evicts everything else; models mid-load are never evicted.
- **Device policy**: tries the registry's `recommendedDevice`; on WebGPU failure, retries once on WASM and records the *effective* device, which the UI displays.
- **Thread cap**: WASM threads = `min(4, cores − 2)`. ORT's pthread pool spin-waits; uncapped, a stuck model saturates every core and freezes the entire tab.
- **Watchdog**: every handler runs under a 120 s `Promise.race`; on timeout the model is disposed, the LRU slot freed, and the client receives a descriptive error instead of an eternal spinner.
- **Offline**: `env.useWasmCache = true` caches the WASM runtime itself, so inference works offline after first use.

### 4.3 Dedicated loaders

v4's generic `pipeline()` wrapper does not support every architecture. Two models load through direct model classes instead:

- **CLIP** — `CLIPTextModelWithProjection` + `CLIPVisionModelWithProjection` + tokenizer + processor, wrapped in a pseudo-pipeline with the standard `dispose()` contract. (Loading CLIP through `pipeline('feature-extraction')` hangs ORT session creation in v4 — across every dtype and export. The split-file Xenova export is *required* by these classes; the "newer" unified export is incompatible.)
- **Florence-2** — `AutoModelForImageTextToText` (v4 moved it out of Vision2Seq).

### 4.4 Task handlers

Self-registering handlers per task (`text-generation`, `feature-extraction`, `image-to-text`, `attention-analysis`, `multimodal-alignment`, `image-classification`, `depth-estimation`, `speech-recognition`, `zero-shot-ner`). Notable: `attention-analysis` truncates input to 128 tokens (seqLen² safety) and currently computes hidden-state cosine similarity — real attention weights are pending Transformers.js v4 exposing `output_attentions` (a greppable `TODO` marks the swap point, and the UI badge says exactly this).

### 4.5 Machine events

Every decision point in the manager and client emits a `MachineEvent` (load-requested, cache-check, download, dtype-chosen *with the alternatives*, device-chosen, device-fallback *with the original error*, threads-capped, evicted, loaded, inference-start/done, watchdog-timeout, worker-crash/restart, cache-cleared). Emission is fire-and-forget and never logs user content — only shapes, sizes, durations, ids. `machineNarrator.ts` renders each event as one plain-language sentence (≤ 25 words, no unglossed acronyms): *"Removed 'CLIP' from memory to make room. Your browser can only hold 3 models at once."*

## 5. The Fifteen Tools

Each tool page publishes its current output to the header **Contest** button and carries the **"Show the machine's work"** drawer (a fixed bottom status bar listing the session's machine events for that tool).

| # | Tool | Keyword translation | Models | One line |
|---|---|---|---|---|
| 1 | Ambiguity Amplifier | Bias → Ambiguity | ResNet-50 / BGE | Inject noise into images or text and watch classification confidence waver at category borderlines. |
| 2 | Context Weaver | Vector → Context | BGE | Map how a text's meaning shifts across multiple contexts; radial visualisation of embedding relations. |
| 3 | Deep Vector Mirror | Vector → Context | CLIP, BGE, BERT | An image or text becomes a vector: heatmap of the embedding (95th-percentile scaled — CLIP's outlier dimensions no longer black everything out), noise/context injection sliders, attention lens for text. |
| 4 | Deep Time | Discontinuity → Contingency | BERT (sub-views) | Three sub-views (Attention Lens, Diffusion Scrubber, Memory Audit) on how architectures handle time and memory. |
| 5 | Depth Mirror | — (perception study) | Depth Anything | Monocular depth estimation: what the model believes is near and far, and where it is wrong. |
| 6 | Detail Extractor | Detail → Narrative | BGE / CLIP | Embedding-space clustering of a collection; surfaces outliers and fine-grained detail in the archive. |
| 7 | Discontinuity Detector | Anomaly → Contingency | (TFJS) | Time-series anomaly detection reframed as attention to contingency and minor shifts. |
| 8 | Glitch Detector | Anomaly → Contingency | CLIP (image), BGE (text) | Train a "normal" baseline on one collection, then test items against it with a *user-owned* sensitivity threshold. |
| 9 | Imagination Inspector | Generativity → Creativity | CLIP + Stable Bias dataset | Examines generative bias via real SD 1.4 / SD 2 / DALL-E 2 outputs from the `stable-bias/professions` research corpus (CC BY-SA), classified locally by CLIP with **calibrated, disclosed uncertainty**: tags read "CLIP-perceived", narrow margins yield *ambiguous*, hover shows top-2 probabilities. The Void Report shows present, absent **and ambiguous** distributions. Unmatched prompts get an honest empty state, never simulated data. |
| 10 | Latent Space Navigator | Identity → Ambiguity | CLIP / BGE + TFJS | Interpolate between two items in latent space; the region between categories made navigable. |
| 11 | Networked Narratives | Profile → Narrative | compromise NLP + CLIP | Entity graphs from text collections; Visual Synapse links images into the narrative graph. |
| 12 | Noise Predictor | Generativity → Creativity | TFJS autoencoder / BGE | Trains a small autoencoder live on one item; shows Original → Reconstructed → Residual (amplified for visibility). What the bottleneck keeps is "signal"; what it discards is "noise" — and the discard is cultural. |
| 13 | Semantic Oracle | — (local generative intelligence) | SmolLM2-135M | Define/expand/tangent prompts against a fully local LLM; small enough to be interrogated, wrong enough to be instructive. |
| 14 | Threshold Adjuster | Probability → Doubt | BGE | Move the decision threshold yourself and watch classifications flip; doubt as a slider. |
| 15 | Visual Storyteller | Generativity → Creativity | Florence-2 + SmolLM2 | Two-stage pipeline: Florence-2 *sees* (literal caption), SmolLM2 *imagines* (sampled surreal micro-story). Both are displayed — machine perception and machine confabulation side by side. |

## 6. Engine-Room Pages

### 6.1 Machine Room (`/machine-room`)

Three sections. **Now**: resident models as cards — Hub link, footprint, configured vs *effective* device, chosen precision with alternatives, plus per-model "remove from this computer" (worker-mediated cache clearing). **Journal**: the live narrated event feed, filterable by tool and model, with expandable technical detail. **Fragility**: session counters for downloads, fallbacks, evictions, timeouts, crashes — breakdowns presented as pedagogy, not embarrassment.

### 6.2 Contestations (`/contestations`)

A persistent ledger of the user's dissent. Any tool output can be contested from the header button: category (erasure, stereotype, mislabel, disagreement, other), free-text note, optional initials — no accounts. Records carry the contested output summary and the settings that produced it. Export as schema-versioned JSON (the interchange format) or as a self-contained printable HTML evidence packet.

### 6.3 Collaboration (`/collaboration`)

Zero-server group comparison: drag in others' exported packets; each becomes a participant. A **threshold spread** plots every participant's Glitch Detector sensitivity on one axis — the group's disagreement about where "glitch" begins, in one picture. A **tool × participant matrix** shows where friction concentrates. Combined export merges all packets (dedup by id). Imported packets live in memory only: a collaboration is an encounter, not a database.

## 7. Persistence & Offline

- **Data**: text items in localStorage; images/audio blobs in IndexedDB, rehydrated to object URLs; analysis results and embeddings persisted with items.
- **Models**: Transformers.js caches weights and (v4) the WASM runtime in the browser's Cache API — exclusively; the service worker explicitly passes Hugging Face requests through untouched.
- **App shell**: precached by a Workbox service worker (vite-plugin-pwa, autoUpdate). Google Fonts runtime-cached. The gemma-suite sub-app is runtime-cached after first visit.
- **Result**: after one online session, the page, the engine, and every previously used model work with the network off. The suite is installable (manifest + icons).
- **Headers**: COOP/COEP are required for multithreaded WASM (`crossOriginIsolated`) and are set identically in dev (`vite.config.ts`) and production (`vercel.json`); cross-origin resources (fonts) carry `crossorigin` attributes to survive COEP.

## 8. Privacy & Security

No inference server, no analytics, no accounts. The only network traffic is static assets and model downloads from the Hugging Face Hub. Contestation notes are user-authored text rendered as text (no HTML injection) and leave the machine only as user-initiated file downloads. Machine events never contain prompt text or image data.

## 9. Build, Test, Deploy

```bash
npm install                  # workspace root
npm run dev                  # root app, localhost:5173
npm test                     # vitest
npm run build:consolidated   # root + gemma-suite → dist/
```

Deployment is Vercel: `build:consolidated`, COOP/COEP headers on all routes, SPA rewrite for the sub-app path, no-cache headers on service-worker files. CI sanity: `tsc -b` clean, eslint zero errors, vitest green, both apps build.

---

*For the narrative of how this architecture earned its defensive features, see `What_It_Took_To_Make_Deep_Learning_Small.md`. For classroom use, see the Guided Walkthrough.*

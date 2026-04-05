# Copilot Instructions — Difference Suite

> **Project context:** DEEP CULTURE ERC Advanced Grant — "Little Tool of Difference". A digital humanities research tool for cultural studies, Holocaust archive analysis, and AI ethics. All ML inference runs in-browser (WebGPU/WASM); no data ever leaves the user's machine.  
> **Live:** [difference-suite-final.vercel.app](https://difference-suite-final.vercel.app) | **Repo:** [github.com/goto4711/difference-suite-final](https://github.com/goto4711/difference-suite-final)

## Commands

```bash
npm run dev          # Dev server (Vite)
npm run build        # Type-check + production build (tsc -b && vite build)
npm run lint         # ESLint
npm run preview      # Preview production build locally
```

There is no test suite.

---

## Architecture Overview

The Difference Suite is a **fully client-side** React/TypeScript SPA. All ML inference runs in-browser — there is no backend. It is deployed on Vercel.

### Inference Pipeline (the core)

All ML runs through a strict layered architecture:

```
Tool Component
  → transformersClient.run()        [src/core/inference/TransformersClient.ts]
    → postMessage to Web Worker     [src/workers/transformers.worker.ts]
      → TransformersManager         [src/core/inference/TransformersManager.ts]
        → ModelRegistry lookup      [src/core/inference/modelRegistry.ts]
        → TaskHandler dispatch      [src/core/inference/taskHandlers.ts]
          → Handler file            [src/core/inference/handlers/*.ts]
```

**TransformersClient** (singleton) manages the worker lifecycle, request queuing, a 2-minute timeout, and automatic worker restart on crash (max 3 restarts). It also pre-fetches blob/URL assets to data URLs before posting to the worker, since workers can't access main-thread URLs.

**TransformersManager** (singleton, runs inside the worker) manages model loading with **LRU eviction** (max 3 models loaded concurrently). If a model has `isLargeModel: true`, it evicts **all** other models before loading.

**Task handlers** self-register at module load time via `registerHandler()`. The file `src/core/inference/handlers/index.ts` is the barrel that triggers all registrations — it must be imported once (already done in `TransformersManager.ts`).

### Adding a New Model/Task (4-step process)

1. **`src/core/inference/types.ts`** — add new `PipelineTask` string to the union (optional; the type accepts `string & {}` so it's not strictly required)
2. **`src/core/inference/modelRegistry.ts`** — add `ModelConfig` entry
3. **`src/core/inference/handlers/myTask.ts`** — create handler, call `registerHandler({ task, run })`
4. **`src/core/inference/handlers/index.ts`** — add import line

Then call from a component via:
```typescript
import { transformersClient } from '../../../../core/inference/TransformersClient';

const result = await transformersClient.run({
  id: crypto.randomUUID(),
  tool: 'MyTool',
  model: 'my-model-id',
  task: 'my-task',
  payload: { /* handler-specific */ }
});
```

### Two Separate ML Stacks

Some tools bypass the Transformers.js pipeline entirely and use **TensorFlow.js** directly on the main thread:
- `AmbiguityAmplifier`, `GlitchDetector` (image mode) — MobileNet + KNN classifier via `@tensorflow-models/knn-classifier`
- `NoisePredictor` — custom autoencoder built with `tf.layers`
- `LatentSpaceNavigator` — tensor arithmetic on BGE embeddings

These tools do **not** use `transformersClient` and are unaffected by model eviction. TF.js and Transformers.js coexist without conflict.

### Global State

Zustand store at `src/stores/suiteStore.ts` (`useSuiteStore`). Key fields:
- `dataset: DataItem[]` — all loaded items (text, image, audio, timeseries, tabular)
- `activeItem: string | null` — single primary selection (legacy)
- `selectedItems: string[]` — multi-selection array
- `collections: Collection[]` — named groupings of dataset items
- `embeddingModelVersion` — invalidates all `DataItem.embedding` fields when changed

`DataItem.analysisResults` is a `Record<string, any>` keyed by `toolId` — tools persist their per-item results here.

### Auth

Soft gate only. `AuthGuard` wraps all routes and blurs content if not authenticated. Auth is email-domain based (`src/config/authConfig.ts`) — academic domains (`.edu`, `.ac.*`) plus an explicit whitelist. **`SKIP_AUTH = true`** in `AuthGuard.tsx` disables the gate for development/testing.

---

## Key Conventions

### Model Registry
- All models must be ONNX format (Transformers.js v3 requirement)
- `quantization: 'q4'` is the safe default for most models
- Set `isLargeModel: true` for models >400MB or models known to cause OOM when coexisting with others — this triggers full eviction before load
- `recommendedDevice: 'wasm'` for models that don't work well on WebGPU (e.g., Whisper)

### Handler Pattern
Handlers receive a raw `pipeline` (`unknown`) and must cast it. Always handle both array and object pipeline output formats — Transformers.js is inconsistent across model types. Report `onProgress` at meaningful stages; the UI polls this to show loading states.

### Image Assets in Inference
Never pass blob URLs or object URLs directly in an `InferenceRequest` payload — `TransformersClient` pre-fetches them to data URLs automatically, but only for the known field names: `imageUrl`, `imageSource`, `image`, `query` (when `queryType === 'image'`), and `candidates` (when `candidateType === 'image'`). Use these field names in your payload to get automatic resolution.

### `PipelineTask` and `ToolName` types
Both use `string & {}` open union. Adding a new tool or task does **not** require editing `types.ts` — just use the new string. Only add to the union if you want IDE autocomplete on it.

### TF.js in Tools
Tools using TF.js directly must call `await tf.ready()` before any tensor operations and use `tf.tidy()` for memory management. These tools manage their own model lifecycle and do not interact with `TransformersManager`.

### Routing
Each tool has a dedicated route in `App.tsx`. The URL slug is kebab-case. Add new tool routes here. All routes are served from `index.html` via a Vercel SPA rewrite (`vercel.json`).

**Full route table:**

| Route | Tool | Primary model stack |
|---|---|---|
| `/` | Dashboard | — |
| `/ambiguity-amplifier` | Ambiguity Amplifier | TF.js (MobileNet + KNN) + Transformers.js (BGE, text mode) |
| `/context-weaver` | Context Weaver | Transformers.js (BGE embeddings), D3 radial viz |
| `/deep-time` | Deep Time | Pure JS math (no heavy model weights) + Plotly |
| `/deep-vector-mirror` | Deep Vector Mirror | Transformers.js (BGE + CLIP), D3 heatmaps |
| `/detail-extractor` | Detail Extractor | Transformers.js (embeddings), clustering/outlier detection |
| `/discontinuity-detector` | Discontinuity Detector | TF.js (custom anomaly detection) |
| `/glitch-detector` | Glitch Detector | TF.js (MobileNet + KNN) + Transformers.js (BGE, text mode) |
| `/imagination-inspector` | Imagination Inspector | Transformers.js (SmolLM2 + CLIP) |
| `/latent-navigator` | Latent Space Navigator | TF.js (MobileNet, image) + Transformers.js (BGE, text) |
| `/networked-narratives` | Networked Narratives | Compromise.js (NLP) + Transformers.js (CLIP), react-force-graph-2d |
| `/noise-predictor` | Noise Predictor | TF.js (custom autoencoder) + Transformers.js (BGE) |
| `/semantic-oracle` | Semantic Oracle | Transformers.js (SmolLM2-135M) |
| `/threshold-adjuster` | Threshold Adjuster | Client-side scoring only |
| `/visual-storyteller` | Visual Storyteller | Transformers.js (Florence-2) |

---

## Design System

CSS variables (defined in `src/index.css`):

```css
--color-text: #000100;        /* Black */
--color-main: #832161;        /* Deep Magenta */
--color-alt: #ADFC92;         /* Neon Green */
--color-background: #99B2DD;  /* Soft Blue */
/* Font: Lexend */
```

Utility classes used throughout components:

| Class | Use |
|---|---|
| `.deep-panel` | Card/container with border and shadow |
| `.deep-button` | Primary action (neon green) |
| `.deep-button-secondary` | Secondary action (white) |
| `.deep-input` | Form inputs |
| `.nav-item` | Sidebar navigation items |
| `.dc-card` | Tool panel containers |

---

## Test Datasets

Located in `difference-suite-testdata/` at the repo root:

| Folder | Contents | Suitable tools |
|---|---|---|
| `holocaust-texts/` | 10 `.txt` archival documents | Detail Extractor, Context Weaver, Networked Narratives, Noise Predictor, Semantic Oracle |
| `election-tweets-texts/` | 50 tweet `.txt` files | Ambiguity Amplifier, Glitch Detector, Latent Navigator, Threshold Adjuster |
| `food_tweets/` | Tweet-style texts | Glitch Detector (contrast corpus vs. election tweets) |
| `images/` | 11 animal JPEGs | Visual Storyteller, Ambiguity Amplifier, Imagination Inspector, Latent Navigator |
| `visual_synapse_test/` | `golden_key.png` + `mystery_story.txt` | Networked Narratives (Visual Synapse feature) |

---

## ⚠️ Documentation vs. Code Discrepancy

The docs in `documentation/` list older model names that **no longer match the code**. The `modelRegistry.ts` is the source of truth:

| Docs say | Code actually uses |
|---|---|
| `all-MiniLM-L6-v2` | `bge-small-en-v1.5` |
| `LaMini-Flan-T5-783M` | `smollm2-135m-instruct` |
| `vit-gpt2-image-captioning` | `florence-2-base-ft` |

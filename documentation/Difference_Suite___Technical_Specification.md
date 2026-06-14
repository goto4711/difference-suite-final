# Difference Suite — Technical Specification

> **Project:** DEEP CULTURE ERC Advanced Grant — "Little Tool of Difference"
> **Build:** `transf-js-4` · `@huggingface/transformers` v4 · React 19 + TypeScript · client-side / local-first
> **Audience:** maintainers and contributing engineers. This is the implementation reference; for prose introductions see the *In-Depth Technical Overview*, for classroom use the *Guided Walkthrough*, and for the per-tool conceptual docs see `tools/`.
> **Status note:** grounded in the current source as of this writing. Where a value is load-bearing it cites the file/symbol; line numbers drift, so search the symbol.

---

## 1. Scope & invariants

The Difference Suite is a fully client-side React application: **all inference runs in the browser**, no user data leaves the machine, there is no backend. These are hard invariants — any change must preserve them:

1. **Local-first.** The only network traffic is static assets and model/dataset downloads from the Hugging Face Hub (plus the Stable Bias Dataset Viewer API for the Imagination Inspector). No inference server, analytics, or accounts.
2. **Offline-capable.** After one online session the app shell, the inference runtime, and any used model work with the network off.
3. **Single source of truth for the tool list** (`src/utils/navigation.ts`) — routes and sidebar are generated from it.
4. **Registry-driven models** (`src/core/inference/modelRegistry.ts`) — adding/altering a model is a one-entry change.
5. **No leakage in telemetry** — machine events and provenance record shapes/ids/durations, never user content.

## 2. Repository & build

```
/                    root app (the Difference Suite)
/packages/shared     shared TS source: stores, types, auth, dashboard, shell
/gemma-suite         large-models sub-app (own workers; built into dist/difference-suite-large-models/)
```

- **Workspaces / monorepo:** npm workspaces; both apps import `@difference-suite/shared` as TypeScript source.
- **Build tool:** Vite (`npm:rolldown-vite@7`), `@vitejs/plugin-react`.
- **Scripts** (`package.json`): `dev` (Vite, localhost:5173) · `build` (`tsc -b && vite build`) · `build:consolidated` (root → gemma-suite → copy sub-app into `dist/difference-suite-large-models/`) · `test` (`vitest run`) · `lint` (eslint).
- **Headers:** COOP/COEP are required for multithreaded WASM (`crossOriginIsolated`) and set identically in dev (`vite.config.ts`) and prod (`vercel.json`); cross-origin assets carry `crossorigin`.
- **Build-time globals:** `__APP_COMMIT__` / `__APP_VERSION__` are injected via Vite `define` (declared in `src/global.d.ts`, stubbed in `vitest.setup.ts`) and feed contestation provenance.
- **PWA:** vite-plugin-pwa (Workbox, autoUpdate); app shell precached; model weights cached by Transformers.js (Cache API), passed through untouched by the service worker.

## 3. Core technologies

| Concern | Choice |
|---|---|
| UI | React 19 + TypeScript (strict) |
| State | Zustand 5 (`persist` middleware where noted) |
| Routing | React Router 7, registry-generated |
| Styling | Tailwind CSS 4 |
| Transformer inference | `@huggingface/transformers` ^4.2 (Web Worker; ONNX Runtime Web — WASM) |
| In-browser training | `@tensorflow/tfjs` (Noise Predictor autoencoder, Discontinuity LSTM) + `@tensorflow-models/knn-classifier` (Glitch/Ambiguity) |
| Viz | D3, Recharts, react-force-graph-2d, Plotly (Deep Time) |
| Tests | Vitest (150+ unit tests) |

## 4. Routing & navigation

`src/utils/navigation.ts` exports `TOOLS` (the 15 analysis tools) and the three engine-room pages (Machine Room, Contestations, Collaboration). Each entry: `path`, `label`, `icon`, `description`, `toolId`, and a `React.lazy` `component`. `App.tsx` generates `<Route>`s from these arrays, so sidebar and router cannot drift; tool pages are code-split. A route guard (auth, §11) means locked content is *not mounted* — models cannot load pre-auth.

## 5. State management

Four Zustand stores:

| Store | File | Persistence | Contents |
|---|---|---|---|
| `suiteStore` | `packages/shared/src/stores/suiteStore.ts` | localStorage (`persist`) + IndexedDB (`blobStore`) | dataset items, collections, selection, analysis results, embeddings, auth, and the selectable `textEmbeddingModel` / `asrModel` / `embeddingModelVersion` |
| `contestationStore` | `src/stores/contestationStore.ts` | localStorage (`persist`, `STORAGE_VERSION = 2`) | dissent records + the user-editable category list |
| `machineRoomStore` | `src/stores/machineRoomStore.ts` | session only | ring buffer (cap 300) of machine events |
| `currentOutputStore` | `src/stores/currentOutputStore.ts` | session only | the active tool's current output (`toolId`, `outputSummary`, `settings`, `models`) feeding the header Contest button |

Persistence detail: `partialize`/`toPersistedItem` strip `rawFile` and keep binary `content` out of localStorage; binary items live in `blobStore` (IndexedDB) and are rehydrated to object URLs on load, revoked on delete. Switching `textEmbeddingModel` wipes stored `embedding`s (incomparable across models); `setEmbeddingModelVersion` does the same for out-of-band changes.

## 6. Data model

`packages/shared/src/types/index.ts`:

```ts
type DataType = 'image' | 'text' | 'timeseries' | 'tabular' | 'audio';

interface DataItem {
  id: string; name: string; type: DataType;
  collectionId?: string;
  content: string | File;          // text body, or object URL for media
  rawFile?: File;                  // not persisted
  metadata?: { size; lastModified; mimeType; [k: string]: unknown };
  embedding?: number[];            // wiped on embedding-model switch
  analysisResults?: Record<string, unknown>;
}
interface Collection { id; name; created; description?; itemCount? }
```

`SuiteState` (same file) is the store contract: item/collection/selection actions, `updateItemResult(itemId, toolId, result)`, the model-selection setters, and auth.

## 7. Inference subsystem

The technical heart. One Web Worker runs all transformer inference; TF.js training runs on the main thread inside individual tools.

### 7.1 Client ↔ worker protocol
`TransformersClient` (`src/core/inference/TransformersClient.ts`, main thread) ↔ `transformers.worker.ts` ↔ `TransformersManager` (`src/core/inference/TransformersManager.ts`, worker). Messages are a typed discriminated union — requests (`inference`, `status`, `clear-cache`) and responses (`progress`, `result`, `status`, `error`, `machine-event`). The client manages: per-request routing keyed by **request id**, a per-request **inactivity timeout**, UI progress **throttling**, bounded **crash recovery** (`restartCount`), and a fatal-error latch. Image payloads are transported as Blobs (no base64 inflation), cloned never mutated.

### 7.2 Manager policies
- **Loading:** registry-driven; aggregated download progress; cache state checked via v4 APIs (emits `cache-check`).
- **LRU eviction** (`evictIfNecessary`): a bounded number of resident models; least-recently-used disposed first; `isLargeModel` evicts everything else; mid-load models are never evicted.
- **Device policy:** tries `recommendedDevice`, on WebGPU failure retries once on WASM and records the *effective* device. **Currently every model is `wasm`** — WebGPU triggers an uncatchable ORT-init crash in v4, so it is disabled at registry level; the fallback path remains intact.
- **Thread cap:** WASM threads = `Math.max(1, Math.min(4, cores − 2))` — ORT's pthread pool spin-waits; uncapped, a stuck model freezes the tab.
- **Watchdog:** every handler runs under a `120_000 ms` `Promise.race`; on timeout the model is disposed, the slot freed, and the client gets a descriptive error.
- **WASM cache:** `env.useWasmCache = true` caches the runtime for offline use.

### 7.3 Task handlers
Self-registering per task (`src/core/inference/handlers/`, registered via `taskHandlers.ts` `registerHandler`): `text-generation`, `feature-extraction`, `image-to-text`, `image-classification`, `attention-analysis`, `multimodal-alignment`, `depth-estimation`, `automatic-speech-recognition`, `zero-shot-ner`. Notable:
- **`feature-extraction`** applies the e5 `query:` prefix when the requested model id contains `e5` (`applyE5Prefix`, unit-tested), keeps mean pooling + normalize, and has a dedicated CLIP direct-loader branch.
- **`attention-analysis`** truncates to 128 tokens and currently computes hidden-state cosine similarity; real attention weights await v4 `output_attentions` (a `TODO` marks the swap; the UI badge says "Simulated").

### 7.4 Dedicated loaders
v4's generic `pipeline()` does not support every architecture. **CLIP** loads via `CLIPTextModelWithProjection` + `CLIPVisionModelWithProjection` (+ tokenizer/processor) wrapped in a pseudo-pipeline with `dispose()`; the split-file Xenova export is required. **Florence-2** loads via `AutoModelForImageTextToText` (v4 moved it out of Vision2Seq).

### 7.5 Machine events
Every decision point emits a `MachineEvent` (`load-requested`, `cache-check`, `download`, `dtype-chosen`, `device-chosen`, `device-fallback`, `threads-capped`, `evicted`, `loaded`, `inference-start/done`, `watchdog-timeout`, `worker-crash/restart`, `cache-cleared`). `machineNarrator.ts` renders each as one plain-language sentence; emission never includes user content.

## 8. Model registry

`src/core/inference/modelRegistry.ts` — `MODEL_REGISTRY: ModelConfig[]`. Fields: `id`, `name`, `hfPath`, `task`, `quantization`, `recommendedDevice`, `memoryFootprintMB`, `enabled`, `isLargeModel`, optional `loader`.

| id | hfPath | task | dtype | large |
|---|---|---|---|---|
| smollm2-135m-instruct | onnx-community/SmolLM2-135M-Instruct-ONNX-MHA | text-generation | q4 | |
| florence-2-base-ft | onnx-community/Florence-2-base-ft | image-text-to-text (loader) | q8 | ✓ |
| bge-small-en-v1.5 | onnx-community/bge-small-en-v1.5-ONNX | feature-extraction (English) | q4 | |
| **multilingual-e5-small** | Xenova/multilingual-e5-small | feature-extraction (default text embed) | q4 | |
| clip-vit-base-patch32-q4 | Xenova/clip-vit-base-patch32 | CLIP (direct classes) | q8 | |
| whisper-tiny-en | onnx-community/whisper-tiny.en | ASR (English) | q4 | |
| **whisper-base** | onnx-community/whisper-base | ASR (default, multilingual) | q4 | |
| **whisper-small** | onnx-community/whisper-small | ASR (opt-in, multilingual) | q4 | |
| bert-base-uncased | Xenova/bert-base-uncased | feature-extraction (attention) | q8 | |
| resnet-50 | onnx-community/resnet-50-ONNX | image-classification | q4 | |
| depth-anything-small | Xenova/depth-anything-small-hf | depth-estimation | q4 | |

`recommendedDevice` is `wasm` for all entries (see §7.2). **Selectable defaults:** `getModelsForTask(task)` powers the Machine Room selectors; the active text-embedding model defaults to `multilingual-e5-small` and ASR to `whisper-base`, both stored in `suiteStore` and read live by tools.

## 9. Caching & persistence

Three distinct caches, by design:

- **Model weights + WASM runtime:** Transformers.js Cache API (browser Cache Storage). The service worker passes HF requests through untouched. Surfaced as `cache-check`/`cache-cleared` machine events; cleared per-model via `TransformersClient.clearModelCache(modelId)` from the Machine Room.
- **App data (corpus):** `suiteStore` persist → localStorage for metadata/text; binary media in `blobStore` (IndexedDB, `saveBlob`/`getBlob`/`deleteBlob`).
- **Tool data cache:** `src/core/cache/idbCache.ts` — a generic, dependency-free IndexedDB key/value cache with a swappable `RawBackend` (default IndexedDB; `createMemoryBackend()` for tests), versioned entries (version mismatch = miss). Currently used by the Imagination Inspector for Stable Bias rows + images; designed for reuse (e.g. future model-data caching).

## 10. Multilingual subsystem

- **Text embeddings:** default `multilingual-e5-small` (384-dim, ~100 languages) — a drop-in for the prior 384-dim `bge-small-en-v1.5`, so downstream TF.js consumers (Noise Predictor autoencoder, KNN classifiers, projections) are unchanged. Width is derived at runtime (no hardcoded dimension). e5 `query:` prefixing handled in the feature-extraction handler.
- **Speech:** multilingual `whisper-base` (default) with a language selector in `AudioRecorderModal`; `whisper-small` is an opt-in higher-accuracy alternative. `auto` omits the language hint for self-detection.
- **Voice into tools:** Semantic Oracle and Context Weaver embed the recorder and append the transcript.

## 11. Authentication

A cosmetic "soft gate" (`checkDomain()` in `packages/shared/src/config/authConfig.ts`): accepts academic domains (`.edu`, `.ac.xx`, an explicit whitelist, subdomains). Route-level — locked content is not mounted. `VITE_SKIP_AUTH` bypasses during dev. `login(email)` in the shared store is the single entry point for a future SSO/OIDC callback.

## 12. Contestation & collaboration subsystem

### 12.1 Records & categories
`contestationStore.ts`. A `ContestationRecord` holds `id`, `ts`, `toolId`, `route`, `outputSummary`, `category` (a free-form string id), `note`, optional `settings`, optional `author`, and `provenance`. Categories are a **user-editable** list (`CategoryDefinition { id, label, color }`), seeded with five defaults; actions `addCategory`/`renameCategory`/`setCategoryColor`/`removeCategory`/`restoreDefaultCategories`. `removeCategory` returns a tagged result and **blocks** when the category is in use (with a count) or is a default — it never silently reassigns. `categoryStyle.ts` renders chips from each hex (light-tint bg + full-hex text) with a deterministic hash fallback for unknown ids.

### 12.2 Provenance flow
Each tool publishes its output via `useReportCurrentOutput({ toolId, outputSummary, settings, models })` → `currentOutputStore` → `ContestHeaderButton` reads it → `ContestButton` → `add({ provenance: { models } })`. `add()` always stamps `appCommit`/`appVersion` (build globals) and includes `models` **only when the tool declares them** — never substituted from suite defaults, so the field is honest-empty rather than misleading. `models` is captured at publish-time (a reactive snapshot of the active model where relevant).

### 12.3 Packets & interchange
`exportPacket.ts` emits JSON (`difference-suite-contestations@2`, embedding the category definitions + per-record provenance) or printable HTML (with a provenance block). `isContestationPacket` accepts both `@1` and `@2`; `getPacketCategories` returns null for `@1`. `mergeRecords` de-duplicates by id while preserving authorship.

### 12.4 Collaboration
`CollaborationPage.tsx` imports packets into local state, with per-packet remove and **Clear all imports**. `workshopHelpers.ts` (`buildMatrix`, `buildThresholdSpread`, participant derivation) builds a tool×participant matrix grouped by the **union** of categories (`mergedCategories` = local ∪ each packet's embedded defs), colours them dynamically, and marks custom categories distinctly. All file-based; no backend; imports are in-memory only.

## 13. Project save/load

`src/components/project/` (`projectSchema.ts`, `projectExport.ts`, `projectImport.ts`, `ProjectSaveLoadModal.tsx`). One versioned JSON file (`difference-suite-project@1`, validated by `isProjectFile`) capturing: meta (description, includesMedia, counts), suite (collections; dataset stripped of binary content; `textEmbeddingModel`/`asrModel`/`embeddingModelVersion`), optional media (`id → {name, mimeType, dataUrl}`, base64 from `blobStore`, with a metadata-only mode), and contestation (records + categories). Import **clears the session**, then decodes media → `saveBlob` under original ids → rebuilds `DataItem`s with fresh object URLs → applies settings → `setState`s collections/dataset/contestations. Order matters: settings (which wipe embeddings) are applied while the dataset is still empty, before the real dataset is installed. Dashboard-mounted (Save/Open header controls).

## 14. Dataset export

`src/components/dataset/` (`datasheetSchema.ts`, `datasheetBuilder.ts`, `datasheetMarkdown.ts`, `bundleBuilder.ts`, `DatasetExportModal.tsx`). Produces a *Datasheets for Datasets* (Gebru et al.) document — auto-filled fields (counts, embedding presence/dim, time range, source sample, `appCommit`) plus editable qualitative fields — and a bundle (`difference-suite-dataset@1`) of datasheet + item manifest + embeddings + provenance, with the HuggingFace/EU-SSHOC repo layout documented inline. **Privacy invariant:** the JSON manifest is built only from `id`/`name`/`type`/`metadata`/`hasEmbedding`/`embeddingDim` (+ embeddings); it never serialises `rawFile` or file contents. Raw files are **opt-in (off by default)** and, when enabled, stream as separate downloads rather than inflating the JSON (asserted by a `bundleBuilder` test).

## 15. Imagination Inspector data pipeline

`src/components/tools/ImaginationInspector/`. `GeneratorEngine.generateImages` returns a `GenerateOutcome` of kind `matched | unmatched | offline` — there is **no synthetic fallback** (the former SmolLM2 simulation was removed). Real Stable Bias images are fetched from the HF Dataset Viewer API and **cached in `idbCache`** (rows keyed by query URL; images by image URL, stored as data URLs) so a prompt re-runs offline; a network failure with no cache yields `offline`. A seeded, profession-keyed RNG (FNV-1a + Mulberry32) makes "varied" mode deterministic so re-runs hit the cache. Demographics come from CLIP zero-shot (`clipUncertainty` for calibrated "ambiguous" margins); `BiasAnalyzer` produces the present/absent/ambiguous Void Report. An always-visible disclosure states the labels are CLIP's perceptions, not facts.

## 16. Tool inventory

15 analysis tools + 3 engine-room pages (all under `src/components/`). Models below name the *handler* models; text tools use the selectable embedding model (default `multilingual-e5-small`).

| Route | Component | Primary models / engine |
|---|---|---|
| /ambiguity-amplifier | AmbiguityAmplifier | ResNet-50 (img) · embedding + KNN (text) |
| /context-weaver | ContextWeaver | embedding model · D3 |
| /deep-vector-mirror | DeepVectorMirror | embedding / CLIP · BERT (attention) |
| /deep-time | DeepTime | pure-math (Plotly), no model |
| /depth-mirror | DepthMirror | depth-anything-small |
| /detail-extractor | DetailExtractor | embedding model · K-means |
| /discontinuity-detector | DiscontinuityDetector | TF.js LSTM |
| /glitch-detector | GlitchDetector | ResNet-50 / embedding + KNN |
| /imagination-inspector | ImaginationInspector | CLIP + Stable Bias (cached) |
| /latent-navigator | LatentSpaceNavigator | ResNet-50 / embedding + TF.js |
| /networked-narratives | NetworkedNarratives | Compromise NLP + CLIP (Visual Synapse) |
| /noise-predictor | NoisePredictor | TF.js autoencoder + embedding/ResNet |
| /semantic-oracle | SemanticOracle | SmolLM2-135M (+ dictation) |
| /threshold-adjuster | ThresholdAdjuster | none (scores only) |
| /visual-storyteller | VisualStoryteller | Florence-2 → SmolLM2 |
| /machine-room | machineRoom/MachineRoom | none (observes/configures engine) |
| /contestations | contestation/ContestationsPage | none |
| /collaboration | contestation/CollaborationPage | none |

## 17. Privacy & security

No inference server, analytics, or accounts. Only network traffic: static assets, HF model downloads, and the Stable Bias Dataset Viewer API. Contestation notes are user text rendered as text (no HTML injection); they leave the machine only as user-initiated downloads. Machine events and provenance never contain prompt/image content. Dataset export excludes personal files unless opted in.

## 18. Testing

Vitest, 150+ unit tests. Coverage includes: `idbCache` (memory backend), `featureExtraction` (e5 prefixing + width-agnosticism across 128–1024 dims), `contestationStore`, `categoryStyle`, `exportPacket` (`@1`/`@2` round-trip), `workshopHelpers` (union matrix), `projectSchema` + project round-trip, `suiteStore` (embedding-switch wipe), `clipUncertainty`, `machineNarrator`, `authConfig`. CI sanity: `tsc -b` clean, eslint zero errors, vitest green, both apps build.

## 19. Known constraints & current limitations

- **WebGPU disabled** — uncatchable ORT-init crash in v4; all models run on WASM. Re-enabling is a per-entry `recommendedDevice` change once upstream is fixed.
- **Small-model accuracy** — `whisper-base` mis-hears uncommon/archaic words (offer `whisper-small`); SmolLM2-135M is deliberately small and frequently wrong (pedagogically intended).
- **Attention Lens** shows hidden-state similarity, badged "Simulated", until v4 exposes `output_attentions`.

---

*See also: the per-tool conceptual docs in `tools/`, the `In-Depth Technical Overview` (prose), the `Guided Walkthrough` (classroom), and `What_It_Took_To_Make_Deep_Learning_Small.md` (debugging narrative).*

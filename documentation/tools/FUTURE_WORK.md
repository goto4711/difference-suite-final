# Difference Suite — Future Work

*A technical backlog for the Difference Suite (`transf-js-4` build), written to be actionable by a future coding agent. Each work package gives a grounded observation (with file references), concrete tasks, the files likely to change, and acceptance criteria. Line numbers are approximate and may drift — search for the quoted symbols.*

> **✅ Sign-off (maintainer-validated on localhost).** WP-1, WP-2, WP-4, WP-5, WP-8 are delivered, code-reviewed, and **manually verified in-browser** by the maintainer: multilingual embeddings (cross-language clustering) and multilingual ASR (Dutch `whisper-base`, plus the `whisper-small` opt-in); Imagination Inspector offline cache hit + honest cold-offline state; editable contestation categories, remove-in-use block, and the union-aware Collaboration matrix with clear-imports; provenance block + dataset-export privacy invariant; and project save/load round-trip (with media) + metadata-only. Automated suite: **151/151 tests, clean `tsc` + build.** WP-3 already satisfied. **Remaining/open:** WP-6 (configurability tasks 2–4, opportunistic) and WP-7 (in-app transparency). All changes are **local only — not committed or pushed**, per the standing rule; publishing is the maintainer's call.

## Repo conventions (read first)

- **Models** are declared centrally in `src/core/inference/modelRegistry.ts` (`MODEL_REGISTRY: ModelConfig[]`). Adding a model = one registry entry; reference it by `id` in an `InferenceRequest.model`.
- **Inference** is dispatched by task to handlers in `src/core/inference/handlers/` via the registry in `src/core/inference/taskHandlers.ts` (`registerHandler`). Calls go through `transformersClient.run(request, onProgress)` (`src/core/inference/TransformersClient.ts`), which runs in a Web Worker (`src/workers/transformers.worker.ts`).
- **Shared state** is `packages/shared/src/stores/suiteStore.ts` (Zustand, wrapped in `persist`). Per-item tool outputs go through `updateItemResult(itemId, toolId, result)` into `DataItem.analysisResults` (`packages/shared/src/types/index.ts`).
- **Large models** set `isLargeModel: true` in the registry, which triggers LRU eviction of other models; the eviction surfaces in the Machine Room (`src/stores/machineRoomStore.ts`).
- Keep all inference **client-side**; do not introduce server round-trips for user data. Prefer adding a registry entry + handler over inlining model logic in a component.

---

## WP-1 — Multilingual & multimodal reach ✅ **DELIVERED**

> **Status: done (Phase 1 + Phase 2), locally validated.** Shipped: `multilingual-e5-small` (384-dim, drop-in for bge) + `whisper-base` in the registry; embedding model id routed through store-driven state instead of hardcoding; e5 `query: ` prefixing in the feature-extraction handler; runtime model selector in the Machine Room; voice-into-tools for Semantic Oracle and Context Weaver; WP-6 dimensionality fix (embedding width derived at runtime everywhere); multilingual text fixtures + a Dutch ASR fixture (`difference-suite-testdata/texts/multilingual/audio/max_havelaar_nl.wav`). Tests 77/77, build clean. ASR verified end-to-end in the dashboard: a Dutch clip transcribes as Dutch with the number rendered as words, confirming the multilingual path works (small-model accuracy errors on archaic vocabulary are an accepted footprint tradeoff — see "Optional follow-ups"). The remaining items below are **optional follow-ups**, not blockers.
>
> **Optional follow-ups (non-blocking):**
> - **Higher-fidelity ASR option.** `whisper-base` mis-hears uncommon/archaic words (e.g. "makelaar" → "MacLaan"; WER ≈ 0.3 on the 1860s Dutch fixture). For users who need better accuracy, offer `whisper-small` (~2× download) in the existing model selector — integration is unchanged; it's purely a selectable, opt-in heavier model so the default footprint stays small.
> - **e5 gating robustness.** The e5 prefix currently triggers on `request.model.includes('e5')` (tested as a pure `applyE5Prefix`). Promote to an explicit registry field (e.g. `inputPrefix`) so a future model id can't misfire and so non-`query:` prefixing schemes are expressible.
> - **Avoid redundant embedding wipe.** After a runtime embedding-model switch, `setTextEmbeddingModel` wipes embeddings immediately; on the next reload `App.tsx`'s version check does one more harmless wipe. Have `setTextEmbeddingModel` also update `embeddingModelVersion` to skip the redundant pass. Cosmetic.
>
> *Original specification retained below for reference.*

This was the highest-priority work package. The project's archives are intrinsically multilingual (Holocaust collections especially span many languages), so English-only models are a fundamental limitation, not a nice-to-have. Treat this as core to the suite's purpose. It is also achievable within the app's low-footprint constraint — provided **compact** multilingual models are chosen (see below); it does not require the heavyweight generation path rejected in WP-2.

**Observation.** The default models are English-only: `bge-small-en-v1.5`, `whisper-tiny-en`, `bert-base-uncased` (`modelRegistry.ts`). Whisper is wired but only invoked from `src/components/dashboard/modals/AudioRecorderModal.tsx` (`task: 'automatic-speech-recognition'`), not from any tool.

**Model-size constraint.** Keep within the AI-literacy footprint: prefer small multilingual variants over large ones. For embeddings, favour `multilingual-e5-small` (~470 MB, 384-dim, ~100 languages) over `bge-m3` (~2 GB) — the former is a near drop-in for the current 384-dim pipeline and avoids a multi-GB download. For ASR, `whisper-base` (~150 MB) covers many languages at a modest size; avoid `whisper-large`. Benchmark download size and first-load time before adopting; only mark `isLargeModel` if a model genuinely needs LRU eviction, and prefer not to cross that threshold.

**Tasks.**
1. Add a compact multilingual embedding model (recommended: `multilingual-e5-small`) to the registry as `feature-extraction`. Introduce a per-tool or global "embedding model" selector rather than hardcoding `'bge-small-en-v1.5'` in callers (it is hardcoded across `ContextProcessor.js`, `DataProcessor.js`, `LatentTextModelManager`, etc. — grep `'bge-small-en-v1.5'`). Note e5 models expect `query:`/`passage:` input prefixes — handle this in the feature-extraction handler.
2. Add a multilingual ASR model (recommended: `whisper-base`) and a language toggle in `AudioRecorderModal`.
3. Surface voice input inside text tools (Semantic Oracle, Context Weaver) by reusing the recorder modal and feeding the transcript into the tool's text input.

**Files.** `modelRegistry.ts`; `src/core/inference/handlers/featureExtraction.ts` (e5 prefixing); embedding call sites (grep the model id); `AudioRecorderModal.tsx`; text-tool components.

**Acceptance.** A non-English corpus (add fixtures under `difference-suite-testdata/texts/`, e.g. German/Dutch/French) embeds and clusters without falling back to English tokenisation; ASR transcribes a non-English clip; the chosen embedding/ASR model is configurable, not hardcoded; total added download stays within the AI-literacy footprint budget (target: no single new model > ~500 MB).

**Implementation difficulty — medium, and easier than it first looks (if you stay at 384-dim).**

The decisive factor is embedding dimensionality. `multilingual-e5-small` outputs **384 dims, identical to what the real `bge-small-en-v1.5` already produces**, so every dimension-sensitive consumer downstream — the NoisePredictor autoencoder (`createModel(384, …)`), the KNN classifiers, the 2-D projections — keeps working unchanged. This makes the embedding swap a near drop-in rather than a rewrite. Choosing a different-width model (e.g. `bge-m3` at 1024-dim) would be substantially harder.

- **Easy:** ASR → multilingual. Swap `whisper-tiny-en` → `whisper-base` in `modelRegistry.ts` and drop the `.en`; add a language dropdown in `AudioRecorderModal.tsx`. The `speech-recognition` handler is already generic. (~half a day.)
- **Fiddly but mechanical:** the model id `'bge-small-en-v1.5'` is **hardcoded in 6 tool files** (ContextWeaver, DetailExtractor, LatentSpaceNavigator, AmbiguityAmplifier text, GlitchDetector text, DeepVectorMirror — 36 occurrences total), not read from one place. Route it through a single constant/selector or find-and-replace the default. (A few hours, low risk.)
- **Get-it-right detail:** e5 models expect `query:` / `passage:` input **prefixes** for good retrieval quality. Without them embeddings still compute but degrade; add per-model prefixing in `featureExtraction.ts`.
- **Real risk — couples to WP-6.** The code carries inconsistent dimension assumptions: comments and a default say **512** (`DetailExtractor` comment line ~43, `NoisePredictor` `createModel(inputDim = 512)`, GlitchDetector `[N, 512]` comments) although the model is actually **384**. It works today only because callers happen to pass 384. Staying at 384-dim keeps this latent; making the embedding model genuinely configurable for *any* width requires fixing WP-6 first (derive width at runtime). Do the WP-6 audit alongside this if you want true model-agnosticism.

**Effort estimate.**
- *Minimal path* — swap defaults globally to `multilingual-e5-small` + `whisper-base`, add e5 prefixing, add multilingual test fixtures: **~2–4 focused days** for one developer.
- *Polished path* — user-facing embedding/ASR selector, voice-into-tools plumbing, fix the 384/512 inconsistency (WP-6), cross-language QA: **~1–1.5 weeks.**

**De-risk first (cheapest checks):** confirm ONNX weights exist for the chosen models (they do via the `Xenova` / `onnx-community` orgs for e5-small and whisper-base) and that they load under Transformers.js v4. Neither is likely to block.

---

## WP-2 — Imagination Inspector robustness & offline support ✅ **DELIVERED**

> **Status: done, locally validated (incl. in-browser offline gates).** Shipped: a generic, zero-dep IndexedDB cache helper with a swappable backend seam (`src/core/cache/idbCache.ts`, `createMemoryBackend()` for tests, designed for WP-8 model-weight reuse) + unit tests; Stable Bias rows and images cached in IndexedDB (separate DB per cache to dodge the multi-store-same-version gotcha); a deterministic seeded block picker (FNV-1a + Mulberry32 keyed by profession) so varied-mode re-runs hit the cache offline; a new honest `offline` outcome (`GenerateOutcome` is now `matched | unmatched | offline`) shown on fetch failure or empty/drifted rows. The SmolLM2 simulation, `simulated` kind, and `generateImagesLegacy` were **deleted outright** (no opt-in flag), and the now-dead simulation UI in `GenerationGrid.jsx` removed. Tests 85/85, typecheck + build clean. Both manual browser gates passed: re-running a prompt offline serves entirely from IndexedDB with zero `datasets-server.huggingface.co` requests, and a cold offline start shows the honest "archive unavailable" panel with no simulated cards. The optional user-image (`dataset`) source was **not** reintroduced, as planned.

> **Scope decision (do not re-propose).** In-browser text-to-image generation (SD-Turbo / LCM via ONNX-Runtime-Web) was evaluated and **explicitly rejected** for this app. The multi-GB model download and per-image denoising latency are unacceptable for an AI-literacy tool whose value depends on low friction and fast turnaround. Live generation belongs in the separate large-model track (`gemma-suite/`, `documentation/Large_Models_Suite.md`), not in the Difference Suite. This work package therefore targets the **robustness of the existing real-image pipeline**, not generation.

**Observation (updated to current code).** `src/components/tools/ImaginationInspector/utils/GeneratorEngine.ts` fetches the **Stable Bias** corpus over the network (HuggingFace Dataset Viewer API), so the tool is unusable offline and brittle to API changes. Two parts of the original WP-2 are **already handled**: unknown prompts return an honest `unmatched` empty state (with suggestions), and the SmolLM2 simulation now fires *only* on network failure, badged `simulated` (`GenerateOutcome` has `success | unmatched | simulated` kinds). The "use your own images" / Dataset Alignment panel was **deliberately removed** (see the note near the top of `ImaginationInspector.tsx`), so re-adding a `dataset` source is net-new, optional, and probably unnecessary for a literacy app. **The real remaining work is offline caching**, plus one small honesty decision on network failure.

**Tasks.**
1. **(Primary) Offline cache.** Cache fetched Stable Bias rows + their images in IndexedDB so repeat use and poor-connectivity/offline workshops work without re-hitting `datasets-server.huggingface.co`. Key by the exact query (profession slug + adjective + offset/length). Add graceful handling for API failure or schema change. This is the shared IndexedDB helper that WP-8 also wants.
2. **(Small) Network-failure honesty.** Resolve the open in-code question (comment near the `GenerateOutcome` type): on a network failure with no cache hit, prefer a clear **offline message** ("couldn't reach the image archive — you appear to be offline") over the SmolLM2 `simulated` cards. For an AI-literacy tool, fabricated images — even badged — are pedagogically riskier than an honest "can't load." Keep the simulation behind an explicit opt-in, or retire it.
3. **(Optional / likely skip) User-image source.** Only if a clear need emerges, reintroduce a `dataset` source that runs the CLIP demographic + `BiasAnalyzer` pipeline over the user's own images. Deferred by default.

**Files.** `GeneratorEngine.ts`; `ImaginationInspector.tsx` (offline/empty messaging); new IndexedDB cache helper (shared with WP-8).

**Acceptance.** After one online run, the same prompt works fully **offline** from cache; a cold network failure shows an honest offline message rather than silently presenting simulated images as if real; existing `unmatched`/`success` behaviour is unchanged; tests still pass.

---

## WP-3 — Demographic-classification caveat (descoped) ✅ **ALREADY SATISFIED**

> **Descoped for an AI-literacy app, and the remaining piece is already in the code.** The original WP-3 (user-editable demographic axes, intersectional reporting, full uncertainty machinery) is research-grade and more than a literacy tool needs — **not pursued**. The one piece worth keeping — an in-tool caveat — **already exists**: `ImaginationInspector.tsx` renders a disclosure that the demographic readings are made by **CLIP** ("a model trained on web images with documented biases of its own… machine perceptions, not facts about the people depicted"), surfaces an "ambiguous" state where CLIP hesitates, and notes the Stable Bias researchers declined to label faces. No further work required. If WP-7 introduces a shared `MethodNotes` component, this disclosure can optionally be migrated into it for consistency, but that is cosmetic.

---

## WP-4 — Strengthen the contestation layer (was: cross-tool pipelines) ✅ **DELIVERED** (rescoped)

> **Status: done, locally validated.** Editable contestation categories (free-form `string` + persisted user-managed list seeded with the original five, `add`/`rename`/`setColor`/`remove`/`restoreDefaults`; `removeCategory` blocks on in-use with a count and protects defaults — no silent reassignment); dynamic chip colours via `categoryStyle.ts` (`chipStyle` = light tint + full-hex text + translucent border, with deterministic hash fallback for unknown ids); a "Manage categories" panel in the Contestations page; Collaboration gained **Clear all imports** and a union-aware matrix (`mergedCategories` = local ∪ each packet's embedded defs; custom categories marked with a dashed border) plus a legend. The packet `@2` schema embeds the category definitions so foreign categories render faithfully; `@1` still imports. Tests 118/118, build clean. The optional Detail→Networked hand-off remains deferred; the descoped pipeline chains are not pursued.

> **Original rescope rationale (retained):** Pipeline chaining doesn't fit the tools' I/O shapes — The original WP-4 proposed chaining tool outputs (Glitch/Ambiguity scores → Threshold Adjuster; Detail outliers → Networked Narratives; anything → Discontinuity Detector). On inspection this doesn't hold: **no tool emits a time-series**, so Discontinuity Detector has no upstream producer; and **Threshold Adjuster needs a collection-wide score distribution**, which no tool emits (the suite is per-item). The only plausible hand-off is Detail Extractor → Networked Narratives (pass a surfaced outlier text in), which is minor and **deferred**. The genuinely valuable "provenance" idea moves to WP-5. WP-4 is therefore redirected to improving the **contestation/collaboration layer** — the public-things heart of the app — where two concrete gaps exist.

**Observation.** (1) In `CollaborationPage.tsx`, imported packets accumulate in local state (`imported`/`setImported`) with **no way to remove one or clear them** — re-importing only piles on. (2) Contestation categories are a **fixed union** `ContestationCategory` (`erasure | stereotype | mislabel | disagreement | other`) used as typed `Record` keys for colours/labels in `ContestButton`, both contestation pages, and the store. A hard-coded category set is the suite prescribing exactly the kind of imposed classification the project critiques.

**Tasks.**
1. **Collaboration: delete/clear imports.** Add a per-packet remove control (filter `imported` by id) and a "clear all" in `CollaborationPage.tsx`. Self-contained, local-state only.
2. **Editable contestation categories.** Change `category` from a fixed union to a `string`; store a user-managed category list (id, label, colour) in `contestationStore` (persisted), seeded with the current five so nothing breaks. Replace the static `Record<ContestationCategory, …>` colour/label maps with dynamic lookups + a fallback for unknown ids. Let users add/rename/remove categories from the Contestations UI.
3. **Union-aware Collaboration matrix.** Because participants may now use different category sets, `buildMatrix`/the matrix view must group by the **union** of categories across imported packets and assign colours dynamically; mark non-default (custom) categories distinctly. Note the design tension — free categories reduce cross-participant comparability — and resolve it with a shared default set + opt-in custom additions.

**Files.** `src/stores/contestationStore.ts` (category model → string + managed list; loosen `isCategory`), `src/components/contestation/ContestButton.tsx`, `ContestationsPage.tsx`, `CollaborationPage.tsx`, `components/contestation/workshopHelpers.ts` (matrix union). Coordinate the schema change with WP-5 (single packet-version bump).

**Acceptance.** Imported packets can be individually removed and cleared in Collaboration; users can add/rename/remove contestation categories and file a contestation under a custom one; the Collaboration matrix renders the union of categories with stable dynamic colours; default five still work; `@1` packets still import; tests pass.

---

## WP-5 — Reproducibility & scholarly outputs ✅ **DELIVERED** (Task 3 deferred)

> **Status: Tasks 1 + 2 done; Task 3 deferred by design.** Done: (a) per-tool `models` are now captured at publish-time — `useReportCurrentOutput` carries an optional `models` field through `currentOutputStore` → `ContestHeaderButton` → `ContestButton.provenance.models`; each model-backed tool passes the registry id(s) it actually invoked (e.g. Semantic Oracle → `smollm2-135m-instruct`, Imagination Inspector → `clip-vit-base-patch32-q4`, Context Weaver → live `textEmbeddingModel`); Discontinuity / Threshold / Deep Time omit `models` rather than substitute a placeholder. (b) New `src/components/dataset/` module: `datasheetBuilder` auto-fills item counts, embedding stats, time range, active embedding model, appCommit; `datasheetMarkdown` renders a full Datasheets-for-Datasets-style document with all seven Gebru et al. sections plus an embedded HF / EU-SSHOC repo-layout note; `bundleBuilder` emits a `difference-suite-dataset@1` JSON bundle with manifest, embeddings (when present), provenance — and **never** base64-bundles raw files; `DatasetExportModal` wires it into the Dashboard's active-collection header. Raw item files are opt-in and stream as separate per-item downloads to avoid 100s-of-MB JSONs. **Task 3 (deferred):** see Task 3 below.

**Observation.** Contestation packets (`src/stores/contestationStore.ts`, schema `difference-suite-contestations@1`; `src/components/contestation/exportPacket.ts`) record `toolId`, `route`, `outputSummary`, `category`, `note`, `settings?`, `author?` — but **no model id/version, app commit, or dataset snapshot**, so a contestation is not independently reproducible.

**Tasks.**
1. Extend `ContestationRecord` (and bump the packet schema to `@2`, keeping `@1` import compatibility in `isContestationPacket` / `mergeRecords`) with `provenance: { models: string[], modelVersions, appCommit, datasetRef? }`. Populate from `modelRegistry` + build-time `__APP_VERSION__`/git SHA injected via Vite `define`.
2. Add a dataset/embedding export that emits a "datasheet" stub (motivation, composition, collection, preprocessing) alongside the data, targeting the project's HuggingFace / EU-SSHOC "methodological commons" ambitions.
3. Optionally embed the contesting tool's full `analysisResults[toolId]` (not just a text summary) so the contested output can be re-rendered. **Deferred** (2026-06-14): embedding tool analysis blobs into every packet would bloat the JSON and complicate the `@2` schema; the same need is partially served by per-record `provenance.models` + the dataset-export bundle's manifest, so the cost is not currently justified. Revisit if a concrete re-render use case emerges — likely as a sidecar artefact (e.g. an "evidence bundle" per record) rather than inflating every contestation.

**Files.** `contestationStore.ts`, `contestation/exportPacket.ts`, `contestation/workshopHelpers.ts`, `ContestButton.tsx`; `vite.config.ts` (define git SHA); new `datasheet` exporter.

**Acceptance.** A round-trip export→import preserves provenance; `@1` packets still import; an exported dataset ships with a populated datasheet; schema validation rejects malformed `@2` packets with clear errors (mirror existing tests `exportPacket.test.ts`, `workshopHelpers.test.ts`).

---

## WP-6 — Algorithmic configurability & a latent bug 🟡 **PARTIALLY DELIVERED**

> **Status: the latent dimensionality bug (Task 1) is fixed**, completed as part of WP-1 Phase 2 — embedding width is now derived at runtime everywhere (NoisePredictor `createModel` takes `emb.shape[1]`; the SpectralHeatmap grid computes columns from data length; the stale "512 dim" comments are removed), tested across 128/384/512/768/1024-dim vectors. **Tasks 2–4 remain open** (configurable `k`/`windowSize`/`epochs`, k-means++ + seeded clustering, Threshold Adjuster ROC/fairness views, genuine attention extraction). Task 1's acceptance ("no hardcoded embedding width") is met; the rest below is outstanding.

**Observation.** Hardcoded, non-configurable analysis parameters, plus a dimensionality inconsistency.
- Detail Extractor (`DetailExtractor/utils/DataProcessor.js`): `const k = 3` (line ~20); centroid init `data.slice(0, k)` is deterministic-but-arbitrary (first-k, not k-means++); a comment reads "Embeddings are 512 dim" (line ~43) although `bge-small-en-v1.5` outputs **384** dims — verify `projectTo2D` and any fixed-width assumptions are not silently truncating/padding.
- Discontinuity Detector (`DiscontinuityDetector/utils/DeepAnomalyDetector.js`): `windowSize = 10`, `epochs: 50`, `batchSize: 32` fixed; retrains from scratch on every load; requires `windowSize + 5` points.
- Deep Vector Mirror Attention Lens falls back to a `Simulated` badge when real BERT attention is unavailable (`DeepVectorMirror.tsx`).

**Tasks.**
1. ~~Audit and fix the 512/384 assumption; derive embedding width from the model output at runtime rather than a literal.~~ ✅ **Done (WP-1 Phase 2).**
2. Expose `k` (Detail Extractor) and `windowSize`/`epochs` (Discontinuity) as UI controls; add k-means++ init and a fixed RNG seed for reproducible clustering; consider UMAP/t-SNE for `projectTo2D`.
3. Threshold Adjuster: add ROC/PR and per-group threshold (fairness) views.
4. Investigate genuine attention-weight extraction in Transformers.js v4 so the Attention Lens fallback fires less often; if still unavailable, document why in-tool.

**Files.** `DetailExtractor/utils/DataProcessor.js`; `DiscontinuityDetector/utils/DeepAnomalyDetector.js` + `DiscontinuityDetector.tsx`; `ThresholdAdjuster/*`; `DeepVectorMirror.tsx`, `handlers/attentionAnalysis.ts`.

**Acceptance.** No hardcoded embedding width; clustering is reproducible across runs given a seed; users can change `k`/`windowSize`; Threshold Adjuster shows an ROC curve; the 512-dim comment is resolved (fixed or removed with justification).

---

## WP-7 — In-app method transparency

**Observation.** The methodological caveats live only in these docs (`documentation/tools/*.md`); the running app does not surface a tool's limits. The Attention Lens "Simulated" badge and the Imagination Inspector fallback badge are the only honesty cues in the UI.

**Tasks.**
1. Add a reusable `<MethodNotes toolId>` panel in `ToolLayout` that renders a short "how it works / limitations" blurb per tool, sourced from a small structured map (could be generated from the front-matter of the matching `documentation/tools/*.md`).
2. Standardise fallback/simulation badges into one component and apply consistently wherever a result is approximate or mock-derived (Threshold Adjuster mock data, Imagination Inspector simulation, Attention Lens).

**Files.** `src/components/shared/ToolLayout.tsx`; new `MethodNotes` + `ApproximationBadge` components; a `toolNotes` data module.

**Acceptance.** Every tool shows a limitations note; every approximate/mock output carries a consistent badge; the notes content is single-sourced (no copy drift between app and docs).

---

## WP-8 — Persistence, performance, robustness ✅ **DELIVERED**

> **Now fully delivered.** Pre-existing: (1) **model-weight caching** via Transformers.js, narrated by the Machine Room; (2) **per-model clear-cache UI** (`clearModelCache(modelId)` + trash buttons); (3) **blobs out of `localStorage`** — binary items live in IndexedDB `blobStore`, `partialize`/`toPersistedItem` strip `rawFile`. **New (2026-06-14):** portable project save/load — `src/components/project/` adds `projectSchema` (`difference-suite-project@1`), `projectExport`, `projectImport`, and `ProjectSaveLoadModal`; two header buttons on the Dashboard (Save / Open). Media included by default with a "metadata only" toggle and size estimate; import is replace-only with a confirm. Round-trip restores corpus (with media), collections, contestations + categories, and embedding/ASR settings. **Cross-link:** the workshop-handoff use case that originally motivated WP-5 Task C (re-renderable contested outputs) is largely covered by the project file — a facilitator can ship the whole session, not just the contestation packet. Task C remains formally deferred (see WP-5).

**Remaining tasks.**
1. **Project save/load (primary).** Export the whole working session to one portable file and import it back: corpus item metadata + their blobs (from `blobStore`) + collections + contestations + categories + provenance + settings (`textEmbeddingModel`, `asrModel`). Distinct from per-tool contestation packets and the WP-5 dataset bundle. Versioned schema with validation. Round-trip must reproduce the session.
2. **Tests.** Add `blobStore` round-trip tests and project save/load round-trip tests. (Optionally extend toward ML-adjacent utilities — `DeepAnomalyDetector`, `DataProcessor` clustering, `ContextProcessor` — using the seeded determinism from WP-6 where available.)

**Files.** new project save/load module + a Dashboard control; `packages/shared/src/stores/suiteStore.ts` (rehydrate corpus + blobs on import); `blobStore.ts`; `*.test.ts` additions.

**Acceptance.** A project round-trips through export → import and reproduces corpus (incl. media), collections, contestations, categories, and settings; no regression to existing caching/blob handling; `blobStore` + save/load have unit tests; `npm run test` passes; `npm run build` clean.

---

## Cross-cutting notes

- **No heavyweight generative models:** in-browser image generation (Stable Diffusion and similar) is out of scope here — see the scope decision in WP-2. Keep download size and latency low; this is an AI-literacy tool, and anything that adds multi-GB downloads or multi-second per-action waits should go to the `gemma-suite/` large-model track instead.
- **WebGPU gating:** any new large model (e.g. the multilingual models in WP-1) must degrade gracefully to WASM and announce it via the Machine Room; never hard-fail on unsupported browsers.
- **Memory:** Florence-2 and CLIP are already `isLargeModel`; adding multilingual models will intensify eviction churn. Validate the LRU behaviour and surface it clearly.
- **Privacy invariant:** all of the above stays local-first. The only network calls are model/dataset downloads from the HuggingFace CDN and the Stable Bias Dataset Viewer API (WP-2 should cache the latter).
- **Large-model track:** WP-1 (multilingual models) overlaps with the separate `gemma-suite/` workspace and `documentation/Large_Models_Suite.md`; coordinate there. Generative/large-footprint capabilities live in that track, not in this suite.

See [`README.md`](README.md) for the per-tool documentation this backlog refers to.

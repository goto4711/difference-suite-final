# Difference Suite — Future Work

*A technical backlog for the Difference Suite (`transf-js-4` build), written to be actionable by a future coding agent. Each work package gives a grounded observation (with file references), concrete tasks, the files likely to change, and acceptance criteria. Line numbers are approximate and may drift — search for the quoted symbols.*

## Repo conventions (read first)

- **Models** are declared centrally in `src/core/inference/modelRegistry.ts` (`MODEL_REGISTRY: ModelConfig[]`). Adding a model = one registry entry; reference it by `id` in an `InferenceRequest.model`.
- **Inference** is dispatched by task to handlers in `src/core/inference/handlers/` via the registry in `src/core/inference/taskHandlers.ts` (`registerHandler`). Calls go through `transformersClient.run(request, onProgress)` (`src/core/inference/TransformersClient.ts`), which runs in a Web Worker (`src/workers/transformers.worker.ts`).
- **Shared state** is `packages/shared/src/stores/suiteStore.ts` (Zustand, wrapped in `persist`). Per-item tool outputs go through `updateItemResult(itemId, toolId, result)` into `DataItem.analysisResults` (`packages/shared/src/types/index.ts`).
- **Large models** set `isLargeModel: true` in the registry, which triggers LRU eviction of other models; the eviction surfaces in the Machine Room (`src/stores/machineRoomStore.ts`).
- Keep all inference **client-side**; do not introduce server round-trips for user data. Prefer adding a registry entry + handler over inlining model logic in a component.

---

## WP-1 — Multilingual & multimodal reach

**Observation.** The default models are English-only: `bge-small-en-v1.5`, `whisper-tiny-en`, `bert-base-uncased` (`modelRegistry.ts`). This conflicts with the project's multilingual archives (Holocaust collections especially). Whisper is wired but only invoked from `src/components/dashboard/modals/AudioRecorderModal.tsx` (`task: 'automatic-speech-recognition'`), not from any tool.

**Tasks.**
1. Add a multilingual embedding model to the registry (e.g. `bge-m3` or `multilingual-e5-small`) as `feature-extraction`. Introduce a per-tool or global "embedding model" selector rather than hardcoding `'bge-small-en-v1.5'` in callers (it is hardcoded across `ContextProcessor.js`, `DataProcessor.js`, `LatentTextModelManager`, etc. — grep `'bge-small-en-v1.5'`).
2. Add a multilingual ASR model (e.g. `whisper-base`) and a language toggle in `AudioRecorderModal`.
3. Surface voice input inside text tools (Semantic Oracle, Context Weaver) by reusing the recorder modal and feeding the transcript into the tool's text input.

**Files.** `modelRegistry.ts`; embedding call sites (grep the model id); `AudioRecorderModal.tsx`; text-tool components.

**Acceptance.** A non-English corpus (add fixtures under `difference-suite-testdata/texts/`) embeds and clusters without falling back to English tokenisation; ASR transcribes a non-English clip; the chosen embedding/ASR model is configurable, not hardcoded. Watch GPU memory — multilingual models are larger; mark `isLargeModel` if needed.

---

## WP-2 — Real in-browser generation for Imagination Inspector

**Observation.** `src/components/tools/ImaginationInspector/utils/GeneratorEngine.ts` fetches the **Stable Bias** corpus over the network (HuggingFace Dataset Viewer API), is limited to 146 known professions, and the SmolLM2 text fallback is annotated in-code as "unreliable noise." `plan.md` / `documentation/Large_Models_Suite.md` already scope an SD-Turbo / ONNX-Runtime-Web generator; `gemma-suite/` is the separate large-model workspace.

**Tasks.**
1. Add a text-to-image path: integrate SD-Turbo (or LCM) via `onnxruntime-web` with the WebGPU EP, behind a new `task: 'text-to-image'` handler. Gate it on a WebGPU capability check and an explicit user opt-in (multi-GB download).
2. Make image source a strategy: `stable-bias` (current) | `generate` (new) | `dataset` (user images). Keep the network path as a fallback and cache fetched rows in IndexedDB (see WP-8).
3. Allow arbitrary prompts in `generate` mode (removes the 146-profession limit); retire or hard-badge the SmolLM2 simulation.

**Files.** `GeneratorEngine.ts`; new handler in `src/core/inference/handlers/`; `modelRegistry.ts`; `ImaginationInspector.tsx` (source selector UI).

**Acceptance.** With WebGPU present, a free-text prompt generates N images locally and feeds the existing CLIP demographic + `BiasAnalyzer` pipeline unchanged; offline use works from cache; the unreliable text simulation is no longer presented as evidence.

---

## WP-3 — Critical treatment of demographic classification

**Observation.** Demographic tags come from CLIP zero-shot over fixed category lists; `clipUncertainty.ts` (+ `clipUncertainty.test.ts`) already exists in `ImaginationInspector/utils/`. The categories (gender/race/age/setting) and their label sets are blunt and import CLIP's assumptions.

**Tasks.**
1. Externalise the demographic axes and their candidate labels into a user-editable config surfaced in the UI, so researchers can redefine, add, or remove axes rather than accept the defaults.
2. Use `clipUncertainty` to attach a confidence/margin to every tag and render low-confidence tags distinctly (do not collapse to argmax in `BiasAnalyzer.js`).
3. Add an in-tool caveat panel documenting that CLIP categories are imposed, not observed; optionally let a user-defined axis be exported into a Contestation (WP-4/WP-5 link).

**Files.** `ImaginationInspector/utils/clipUncertainty.ts`, `BiasAnalyzer.js`, `categoryDisplay.ts`, `GeneratorEngine.ts`; `ImaginationInspector.tsx`.

**Acceptance.** A user can add a custom axis (e.g. an emic category) and re-run; tags below a confidence threshold are visually marked and excluded from (or separately reported in) the bias tallies; the Void/Absence report distinguishes "absent" from "low-confidence."

---

## WP-4 — Cross-tool pipelines & provenance

**Observation.** Tools operate independently on the shared store. `updateItemResult` / `DataItem.analysisResults` exists (`suiteStore.ts`, `types/index.ts`) but is barely consumed across tools. Threshold Adjuster runs on synthetic `mockData.js` instead of real upstream scores.

**Tasks.**
1. Standardise a result schema written to `analysisResults[toolId]` (e.g. `{ kind, scores?, labels?, embedding?, ts }`) and have tools *read* it: Glitch Detector / Ambiguity Amplifier confidence scores → Threshold Adjuster; Detail Extractor outliers → Networked Narratives seed text.
2. Add a lightweight "send to →" affordance in `ToolLayout` to pass the active item + its result to a compatible tool via route state.
3. Capture machine provenance: when a tool produces a result, snapshot the relevant Machine Room events (`machineRoomStore`) so a result knows whether it came from a WebGPU run or a WASM fallback.

**Files.** `packages/shared/src/stores/suiteStore.ts`, `types/index.ts`; `src/components/shared/ToolLayout.tsx`; `ThresholdAdjuster.tsx` (accept real scores), `mockData.js` (demote to fallback); `machineRoomStore.ts`.

**Acceptance.** Threshold Adjuster can consume real classifier output from another tool; at least one outlier→graph hand-off works; a stored result records the device/fallback context that produced it.

---

## WP-5 — Reproducibility & scholarly outputs

**Observation.** Contestation packets (`src/stores/contestationStore.ts`, schema `difference-suite-contestations@1`; `src/components/contestation/exportPacket.ts`) record `toolId`, `route`, `outputSummary`, `category`, `note`, `settings?`, `author?` — but **no model id/version, app commit, or dataset snapshot**, so a contestation is not independently reproducible.

**Tasks.**
1. Extend `ContestationRecord` (and bump the packet schema to `@2`, keeping `@1` import compatibility in `isContestationPacket` / `mergeRecords`) with `provenance: { models: string[], modelVersions, appCommit, datasetRef? }`. Populate from `modelRegistry` + build-time `__APP_VERSION__`/git SHA injected via Vite `define`.
2. Add a dataset/embedding export that emits a "datasheet" stub (motivation, composition, collection, preprocessing) alongside the data, targeting the project's HuggingFace / EU-SSHOC "methodological commons" ambitions.
3. Optionally embed the contesting tool's full `analysisResults[toolId]` (not just a text summary) so the contested output can be re-rendered.

**Files.** `contestationStore.ts`, `contestation/exportPacket.ts`, `contestation/workshopHelpers.ts`, `ContestButton.tsx`; `vite.config.ts` (define git SHA); new `datasheet` exporter.

**Acceptance.** A round-trip export→import preserves provenance; `@1` packets still import; an exported dataset ships with a populated datasheet; schema validation rejects malformed `@2` packets with clear errors (mirror existing tests `exportPacket.test.ts`, `workshopHelpers.test.ts`).

---

## WP-6 — Algorithmic configurability & a latent bug

**Observation.** Hardcoded, non-configurable analysis parameters, plus a dimensionality inconsistency.
- Detail Extractor (`DetailExtractor/utils/DataProcessor.js`): `const k = 3` (line ~20); centroid init `data.slice(0, k)` is deterministic-but-arbitrary (first-k, not k-means++); a comment reads "Embeddings are 512 dim" (line ~43) although `bge-small-en-v1.5` outputs **384** dims — verify `projectTo2D` and any fixed-width assumptions are not silently truncating/padding.
- Discontinuity Detector (`DiscontinuityDetector/utils/DeepAnomalyDetector.js`): `windowSize = 10`, `epochs: 50`, `batchSize: 32` fixed; retrains from scratch on every load; requires `windowSize + 5` points.
- Deep Vector Mirror Attention Lens falls back to a `Simulated` badge when real BERT attention is unavailable (`DeepVectorMirror.tsx`).

**Tasks.**
1. Audit and fix the 512/384 assumption; derive embedding width from the model output at runtime rather than a literal.
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

## WP-8 — Persistence, performance, robustness

**Observation.** `suiteStore` already uses `persist` (`suiteStore.ts` ~line 144), so corpus/collections survive reloads, and `contestationStore` persists to `localStorage`; `machineRoomStore` is intentionally session-only. Models are re-downloaded/re-initialised per session (no IndexedDB model cache yet — flagged as desirable in `plan.md`). Test coverage is partial (`contestationStore.test.ts`, `exportPacket.test.ts`, `workshopHelpers.test.ts`, `clipUncertainty.test.ts`, `TransformersManager.test.ts`, `handlers/textGeneration.test.ts`).

**Tasks.**
1. Cache model weights in IndexedDB (Transformers.js supports a cache; verify the v4 cache config in `TransformersClient`/worker) so a second visit loads from disk; show cache hits in the Machine Room.
2. Add portable **project export/import** (corpus refs + collections + contestations) as a single file, distinct from per-tool contestation packets.
3. Confirm `persist` `partialize` excludes large blobs/`File` objects from `localStorage` (images are often Blob URLs — verify they are not serialised); migrate bulky corpus state to IndexedDB if needed.
4. Expand tests toward ML-adjacent utilities: `AnomalyDetector`/`DeepAnomalyDetector`, `DataProcessor` clustering, `ContextProcessor` similarity, `BiasAnalyzer`. Add deterministic seeds to make these testable (depends on WP-6).

**Files.** `TransformersClient.ts`, `transformers.worker.ts`; `suiteStore.ts` (`persist` config); new project export/import module; `*.test.ts` additions; `vitest.config.ts`.

**Acceptance.** Second load of a previously used model is materially faster and logged as a cache hit; a project round-trips through export/import; `localStorage` does not bloat with binary data; new unit tests cover the four named utilities and pass under `npm run test`.

---

## Cross-cutting notes

- **WebGPU gating:** WP-2 and any new large model must degrade gracefully to WASM and announce it via the Machine Room; never hard-fail on unsupported browsers.
- **Memory:** Florence-2 and CLIP are already `isLargeModel`; adding SD or multilingual models will intensify eviction churn. Validate the LRU behaviour and surface it clearly.
- **Privacy invariant:** all of the above stays local-first. The only network calls are model/dataset downloads from the HuggingFace CDN and the Stable Bias Dataset Viewer API (WP-2 should cache the latter).
- **Large-model track:** several items (WP-1, WP-2) overlap with the separate `gemma-suite/` workspace and `documentation/Large_Models_Suite.md`; coordinate to avoid duplicating the generation pipeline.

See [`README.md`](README.md) for the per-tool documentation this backlog refers to.

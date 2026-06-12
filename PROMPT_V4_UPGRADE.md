# Standalone Prompt — Upgrade Transformers.js v3.8.1 → v4

Self-contained task; assumes no prior context. Run after the repo's monorepo restructuring and worker-protocol fixes have landed.

---

Upgrade `@huggingface/transformers` from ^3.8.1 to the latest 4.x (4.2.0 or newer) across this repository.

## Context — read first

This is a client-side AI literacy app. ML inference runs in web workers via Transformers.js. The repo was recently restructured (possibly into npm workspaces with a shared package) and the inference layer was recently refactored, so **do not trust file paths from memory — discover the current layout first**:

1. Find every `package.json` declaring `@huggingface/transformers` (root app, `gemma-suite`, and possibly a shared/workspace package).
2. Locate the inference core: a `TransformersManager` (model loading, LRU eviction, progress callbacks), a `TransformersClient` (worker RPC: request routing, inactivity timeout, crash recovery), a model registry (~8 models), task handlers (text-generation, image-to-text, feature-extraction, ASR, attention-analysis, image-classification, depth-estimation, zero-shot NER, multimodal alignment), and the worker entry point.
3. Read the recent git log to understand what the worker-protocol fix changed. **Important:** progress events are now routed by request id with an inactivity-reset timeout. Preserve that behavior — simplify it where v4 allows, don't reimplement it.

## Task

### 1. Dependency bump

- Bump `@huggingface/transformers` to ^4.2.x everywhere it's declared. If the repo uses npm workspaces, keep versions aligned via a single declaration where possible.
- `gemma-suite` pins a **dev build** of `onnxruntime-web` (`1.25.0-dev.20260327-722743c0e2`). v4 bundles its own runtime (new C++ WebGPU backend, >8B-param support), so try removing this pin. Keep it only if the Gemma/SD/vision workers demonstrably break without it, and document why in a comment next to the dependency.
- Build everything (`npm run build:consolidated` or current equivalent) and fix type/API breakages. The codebase uses `pipeline()`, `RawImage`, `AutoProcessor`, `AutoTokenizer`, and `env.allowLocalModels` — these carry over to v4, but verify.

### 2. Adopt v4 features in the inference manager

- **Progress:** v4's `progress_callback` emits a `progress_total` event with aggregated end-to-end loading progress. Replace the manual per-file `progress`/`done` handling with it. Keep emitting progress keyed by the *request id* so the existing client routing and inactivity timeout keep working.
- **Offline cache:** set `env.useWasmCache = true` so the WASM runtime is cached and the app works offline after first load (classroom requirement).
- **Logging:** set `env.logLevel = LogLevel.WARNING` to suppress ONNX Runtime console noise.
- **Cache visibility (nice-to-have):** extend the worker's `get-status` response using `ModelRegistry.is_pipeline_cached()` per registry model, so the UI can distinguish "cached" from "will download". Add `clear_pipeline_cache` behind a new worker message type if trivial; skip if it bloats the diff.

### 3. Validate every registry model

For each model in the registry (SmolLM2-135M-Instruct, Florence-2-base-ft, BGE-small, CLIP ViT-B/32, Whisper-tiny.en, BERT-base-uncased, ResNet-50, Depth-Anything-small):

- Check `ModelRegistry.get_available_dtypes()` against the configured `quantization`; if a configured dtype is no longer available, pick the closest available one and note the change.
- Load the model and run its handler end-to-end in the dev app (real inference, not just instantiation).
- **Attention-analysis (BERT)** is the highest-risk handler — attention tensor outputs are most likely to differ under the rewritten WebGPU runtime. Compare output shape/structure before assuming success.
- **CLIP:** the manager contains a workaround that manually attaches `processor`/`tokenizer` to CLIP pipelines. Test whether v4 makes it unnecessary; remove it if so.
- Where an older `Xenova/*` export has a newer `onnx-community/*` equivalent (v4's re-exported models are significantly faster, ~4x for BERT-class embeddings), **flag it in your summary but do not swap models** — model swaps change tool outputs and need human sign-off.

### 4. gemma-suite

Bump and rebuild. Verify the three workers (gemma, sd, vision) load and produce output. If the SD worker depends on APIs only present in the pinned ORT dev build, keep the pin for `gemma-suite` only and document it.

## Constraints

- No behavior changes beyond what's listed; no model substitutions.
- Work in a branch; commit per step (bump+build, manager features, per-model validation fixes, gemma-suite).
- If a model fails under v4 and the fix isn't obvious, don't downgrade the whole repo — record the failure, pin nothing silently, and surface it in the final summary for a human decision.

## Acceptance

- All workspaces build; `tsc` passes; existing tests (if present) green.
- Every registry model loads and produces output in the dev app; cold-cache load shows a single smooth progress bar (via `progress_total`).
- Reloading the app offline (DevTools → Network → Offline) after a first full load still serves the WASM runtime.
- No dev-build dependency pins remain undocumented.
- Final summary lists: per-model validation results, dtype changes, removed workarounds, flagged model-upgrade opportunities, and any open failures.

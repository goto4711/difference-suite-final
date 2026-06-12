# Standalone Prompt — onnx-community model swaps + offline cache verification

Self-contained task; assumes no prior context. Requires the repo to already be on `@huggingface/transformers` v4.x.

---

This client-side AI literacy app runs ML inference in web workers via Transformers.js v4. Two follow-ups from the v4 migration:

## Context — read first

- Locate the model registry (a `MODEL_REGISTRY` array of ~8 `ModelConfig` entries, likely `src/core/inference/modelRegistry.ts`) and the inference manager (`TransformersManager`).
- Several registry entries still point at legacy `Xenova/*` ONNX exports. v4 has faster `onnx-community/*` re-exports using fused operators (~4x for BERT-class embedding models). Same weights, near-identical outputs, much lower per-inference overhead.
- The Zustand store has `setEmbeddingModelVersion(version)` which wipes all stored embeddings when the version changes — this is the safety mechanism that makes embedding-model swaps safe. Find where the version string is set and confirm the mechanism before swapping anything.

## Task A — Swap BGE first (the hot path), others behind verification

1. **BGE embeddings** (`Xenova/bge-small-en-v1.5`, task `feature-extraction`):
   - Find the v4 re-export on the Hub (search `onnx-community` for `bge-small-en-v1.5`; verify it exists and check available dtypes with `ModelRegistry.get_available_dtypes()` before committing to a `quantization` value). If no official re-export exists, STOP this sub-task and report — do not substitute a different embedding model.
   - Update the registry entry: new `hfPath`, keep the same logical `id`, adjust `quantization` if the old dtype isn't offered.
   - Bump the embedding model version string so `setEmbeddingModelVersion` invalidates stored embeddings on next load. If the version is currently derived from the model id/path, confirm it changes; if it's hardcoded, bump it explicitly.
   - **Equivalence check (required):** write a small throwaway script or Vitest test that embeds ~10 fixed sentences with the old and new model (old path can be temporarily re-added for the test) and asserts that (a) cosine similarity between old and new embeddings of the same sentence is high (> 0.99 typical for re-exports; investigate if < 0.95), and (b) the nearest-neighbour *ordering* across the 10 sentences is identical. Keep the test file but skip it by default (it downloads models); document how to run it.
   - Rough timing comparison (same script, `performance.now()` over N=20 embeds, warm model): record old vs new in the final summary.
2. **ResNet-50, CLIP ViT-B/32, Depth Anything small** — same procedure (find official `onnx-community` re-export, verify dtypes, swap path, keep logical id), but with task-appropriate equivalence checks:
   - ResNet: top-5 labels identical on 3 test images.
   - Depth Anything: output map shape identical, pixelwise correlation high on 1 test image.
   - CLIP: image–text similarity rankings identical on a small fixed set. Note: CLIP has a known workaround in the manager that manually attaches `.processor`/`.tokenizer` — verify it still works with the new export, and that multimodal alignment output is sane.
   - If any model has no official re-export or fails its equivalence check, keep the `Xenova/*` path for that model and record why.
3. Do NOT swap SmolLM2, Florence-2, Whisper, or BERT — they're already `onnx-community/*` or were addressed in the v4 migration.

## Task B — Offline cache verification

`env.useWasmCache = true` is already set. Verify it actually delivers offline operation:

1. If a browser-automation tool is available in your environment (Playwright preferred — `npx playwright install chromium`), write a small e2e script (`scripts/offline-check.mjs` or a Playwright test):
   - Start the dev server (or `vite preview` of a build).
   - Load the app, run one cheap inference (e.g. the BGE embedding path) to populate caches; wait for completion.
   - Set the browser context offline (`context.setOffline(true)`), reload the page, and run the same inference again.
   - Assert the page loads and inference completes offline. Note: WebGPU may not be available headless — force the WASM device for this test if needed, since the WASM runtime files are exactly what `useWasmCache` covers.
2. If browser automation is NOT available, do not fake it: instead add a short "Offline verification" section to the README (load once → DevTools → Network → Offline → reload → run tool), and verify statically that all runtime assets are cache-covered: check that the service of WASM binaries goes through Transformers.js's cache (no other runtime-critical fetches at inference time, e.g. fonts/icons/CDN scripts that would break the UI offline — list any you find).

## Constraints

- Keep logical model `id`s stable — tools reference them.
- One commit per model swap, one for the offline check. Branch off current main.
- No other refactoring.

## Acceptance

- `tsc` passes, existing tests green, both apps build.
- Each swapped model: equivalence check passed (documented numbers in the summary), timing before/after recorded.
- Embedding version bump confirmed to trigger invalidation (existing store test or a new one covers it).
- Offline: either a passing automated check, or the documented manual procedure plus a list of any non-cached runtime-critical assets.
- Final summary: per-model outcome (swapped / kept + why), similarity & timing numbers, offline verification result.

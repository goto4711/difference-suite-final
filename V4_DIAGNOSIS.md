# Live-debugging diagnosis — 2026-06-11 evening session

Findings from instrumented debugging in the actual browser (Claude driving Chrome via extension), plus code fixes already applied.

## What is PROVEN to work

- COOP/COEP headers active: `crossOriginIsolated === true` in dev.
- Worker, protocol, caching, persistence (91 items restored), routing: all healthy.
- **Text generation works end-to-end**: SmolLM2 q4 on WASM produced 24 tokens in 2.5 s via direct client call AND through the Semantic Oracle UI. BGE q4 loaded fine.
- "The oracle model does not load" was stale page state (worker fatal-error latch from earlier crashes persists until reload).

## The actual bug: CLIP hangs the worker, then the tab

Reproduced 4×: a CLIP feature-extraction request completes download progress, emits a final `loading` (99%) event, then never returns. The worker's event loop wedges (even `get-status` times out), and within ~60–90 s the whole tab freezes (renderer unresponsive → eventually crashes). The freeze starves the UI thread — this is what made *everything* look broken.

**Ruled out** (all combinations tested live, all hang identically):

| Variable | Tested | Result |
|---|---|---|
| Export era | `Xenova/clip-vit-base-patch32` AND `onnx-community/clip-vit-base-patch32-ONNX` | both hang |
| Dtype | fp32, q8, q4 | all hang |
| Device | wasm (live), webgpu (per earlier agent note "hangs for CLIP") | both hang |
| Stale code | verified served bundle contains the new registry | current |
| Threads | capped to cores−2 (max 4) | still hangs |

**Not ruled out / prime suspect:** the *loading mechanism*. CLIP is loaded via `pipeline('feature-extraction', …)` — a pipeline that, per the v4 migration notes, "still only handles text" — plus a manual processor-attach workaround in `TransformersManager`. Florence-2 had exactly this class of problem in v4 and was fixed by abandoning the pipeline wrapper for direct model classes (`AutoModelForImageTextToText`). CLIP needs the same treatment (see PROMPT_FIX_CLIP.md).

**Control experiment still missing:** ResNet-50 (`image-classification` pipeline, onnx-community, q4) was about to be tested when the browser connection became unstable. Run it first — if ResNet works, the image-decode path and vision graphs are fine and the pipeline-wrapper theory is ~confirmed; if it also hangs, the problem is broader (image preprocessing in the worker).

## Fixes already applied today (all tsc-clean)

1. `vite.config.ts`: COOP/COEP headers for dev+preview; `index.html`: `crossorigin` on Google Fonts link (also needed in production — check the deployed site's font rendering).
2. `modelRegistry.ts`: CLIP → `onnx-community/clip-vit-base-patch32-ONNX` q4; BERT → q8 (110 MB, real quantized export exists; fp32 claims in old comments were wrong).
3. `TransformersManager.ts`: WASM threads capped at `min(4, cores−2)` — ORT's spin-waiting pthreads were saturating all 8 cores, which is why a stuck worker froze the entire tab.
4. `attentionAnalysis.ts`: input truncated to 128 tokens (was unbounded → seqLen² matrix explosion with long corpus documents; guaranteed text-mode freeze).
5. `DeepVectorMirror.tsx`: image-load promise now has `onerror` + 15 s timeout (was: silent eternal "Calculating…" on stale blob URLs).
6. `TransformersClient.ts`: progress callbacks throttled to ~10/s (was ~150 React re-renders/s during model load).

## Step 0 — ResNet-50 control experiment (PENDING in-browser run)

**Before deploying the CLIP fix, run ResNet-50 through the worker:**
- Task: `image-classification`, model: `resnet-50` (onnx-community/resnet-50-ONNX q4)
- Input: any 224×224 canvas data URL
- **If it returns a classification → image path is fine; CLIP pipeline-wrapper is the bug (proceed).**
- **If it hangs → deeper issue in RawImage/image preprocessing; investigate before deploying.**

Expected: ResNet should work (text models and vision graphs are otherwise fine per prior testing).

## Step 1–4 — CLIP direct-class fix (applied 2026-06-11)

Changes made (see git log for details):

**Step 1 — Dedicated CLIP loader (`loadClipModel`):**
- Reverted registry to `Xenova/clip-vit-base-patch32` with `quantization: 'q8'` (loads `text_model_quantized.onnx` + `vision_model_quantized.onnx` via the `_quantized` dtype suffix). The `onnx-community/clip-vit-base-patch32-ONNX` export provides a unified `model_q4.onnx` which `CLIPTextModelWithProjection`/`CLIPVisionModelWithProjection` cannot use (they expect split `text_model`/`vision_model` files by default).
- Added `loader: 'clip'` field to `ModelConfig`; registry routes via this field instead of sniffing hfPath.
- `loadClipModel()` loads `CLIPTextModelWithProjection` + `CLIPVisionModelWithProjection` + `AutoTokenizer` + `AutoProcessor` directly, wraps them in a pseudo-pipeline with the same `dispose()` contract as other loaders.
- Removed the old "manually attach processor to CLIP pipeline" workaround in `run()`.

**Step 2 — Updated handlers:**
- `featureExtraction.ts`: CLIP branch now uses `pipe.text_model` / `pipe.vision_model` directly. Progress events emitted before each model call so hangs are distinguishable from loads in DevTools.
- `multimodalAlignment.ts`: Same refactor; fallback to old pipeline path removed (was unreachable).

**Step 3 — Watchdog (120 s):**
- `TransformersManager.run()` wraps handler execution in `Promise.race` with a 120 s timeout. On timeout: model is disposed and the LRU slot is freed; client gets a descriptive error instead of an eternal spinner.

**Step 4 — Verification (pending):**
- Run Deep Vector Mirror end-to-end with an image from the corpus.
- Confirm CLIP image/text embeddings complete without tab freeze.
- Confirm `tsc` passes and both apps build.

## Recommended order of operations

1. Run the ResNet control test (Step 0 above) — confirm image path is healthy before testing CLIP.
2. Test CLIP in isolation (DeepVectorMirror → single image → verify vector renders).
3. Retest Deep Vector Mirror end-to-end (uses CLIP + BGE + BERT — the all-in-one stress test).
4. Only then judge the remaining tools.

## Practical notes

- After any hang, fully close the tab. The worker's fatal-error latch and any spinning ORT threads survive soft reloads.
- A frozen-then-crashed tab can destabilize the Claude Chrome extension connection for a minute or two.
- The "1 MODELS (400 MB)" header badge reflects `memoryFootprintMB` registry constants, not real memory.

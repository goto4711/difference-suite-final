# Standalone Prompt — Diagnose and fix model loading failures (Transformers.js v4)

Self-contained debugging task. Work in this repo (the Transformers.js v4 migration). Diagnose before fixing: each hypothesis below has a cheap test — run the test, record the result, and only then change code. Produce a diagnosis log as you go (`DEBUG_LOG.md`): hypothesis → test → observation → action.

## Symptoms (from yesterday's session)

- Under WebGPU, every model failed with `Cannot read properties of undefined (reading 'getBindGroupLayout')` — ORT's WebGPU backend failing to build compute pipelines.
- As a workaround, all registry models were switched to `device: 'wasm'`, and some dtypes were changed to fp32 (CLIP ~500 MB, BERT ~400 MB). Loading then never completed by end of session.
- Relevant recent changes: v4.2.0 migration; `loadPipeline` now always passes `device: config.recommendedDevice`; serial loading gate removed (concurrent model loading restored); 300 s timeout + 30 s heartbeat during loading.

## Hypotheses, in priority order

### H1 — Missing cross-origin isolation in dev (most likely cause of "WASM never completes")

Without COOP/COEP headers, `crossOriginIsolated` is false, SharedArrayBuffer is unavailable, and ORT's WASM backend runs **single-threaded** — a 400–500 MB fp32 model then takes so long it looks hung. `vercel.json` sets these headers in production; check whether the **root app's** `vite.config.ts` has the `server.headers` block (gemma-suite's config has it; the root config historically did not).

Test: confirm presence/absence in `vite.config.ts`. If you have browser automation, load the dev app and evaluate `crossOriginIsolated`; otherwise report it as a manual check.

Fix if absent: add to root `vite.config.ts`:

```ts
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
},
```

Also add the same under `preview.headers`. Caveat: COEP `require-corp` blocks cross-origin subresources that don't send CORP/CORS headers — grep `index.html` and components for external URLs (fonts, CDN scripts, remote images) and flag anything that would now be blocked. HF Hub model downloads send proper CORS headers and are fine.

### H2 — fp32 dtype regression (self-inflicted size/memory blowup)

The original registry used q4/q8. fp32 quadruples download size and WASM memory pressure (browsers commonly cap WASM memory in workers; >2 GB addressable is not guaranteed).

Test: `git diff` / `git log -p` on `modelRegistry.ts` to list every dtype changed during yesterday's debugging.

Fix: restore quantized dtypes, verifying availability per model with `ModelRegistry.get_available_dtypes(hfPath)`. Preference order on WASM: q8, then q4, then fp16 only if WebGPU. Record the chosen dtype per model in the log.

### H3 — WebGPU backend failure (`getBindGroupLayout`)

This is likely environment-specific (browser/driver combo where WebGPU is exposed but compute pipeline creation fails), not necessarily an ORT bug. Don't chase it blindly:

1. Search the onnxruntime and transformers.js GitHub issues for `getBindGroupLayout` with the bundled ORT version (check `node_modules/@huggingface/transformers/package.json` for the exact `onnxruntime-web` version). If it's a known issue with a fixed/pinned version, say so and propose the pin — do not apply a dev-build pin without flagging it.
2. Implement **graceful fallback** regardless of root cause: wrap pipeline creation so that if loading with `device: 'webgpu'` throws, it retries once with `device: 'wasm'` (and a q8-or-lower dtype), logs a single clear warning, and reports the effective device in `getStatus()` so the UI shows what's actually running. This makes the app robust on student machines with broken/absent WebGPU, which will happen in classrooms regardless.
3. Keep `recommendedDevice: 'webgpu'` in the registry — the fallback handles the rest. Do not hard-switch everything to wasm.

### H4 — Network/caching pathology

Test (with browser automation, or as documented manual steps): watch the Network tab filtered to `.onnx` while loading `bge-small-en-v1.5` (smallest model). Check: does the download start, progress, and complete? Status codes? Is it re-downloaded on reload (cache not working)? Programmatically, `ModelRegistry.is_pipeline_cached(...)` before/after a load tells you whether caching persisted.

If models re-download every reload: check whether the browser context blocks Cache API/OPFS (private windows often do), and whether `env.useWasmCache` and model caching are using the expected backend.

### H5 — Concurrency regression

The serial loading gate was removed yesterday. With concurrent loading restored, multiple simultaneous large downloads + the LRU eviction logic (`evictIfNecessary`, `MAX_LOADED_MODELS = 3`, `isLargeModel` evict-all) can interact badly: a model evicted *while still loading*, or three fp32 models loading at once exhausting WASM memory. Read `getOrLoadPipeline` and `evictIfNecessary` carefully: can `disposeModel` run on an entry in `loadingPromises`? If yes, guard it (never evict models that are mid-load; queue the eviction until the load resolves).

## What you cannot test yourself

If no browser automation is available, be explicit about it. Deliver the code fixes for H1/H2/H3.2/H5, plus a short `MANUAL_CHECKS.md` for the human: (1) console → `crossOriginIsolated` must be `true` in dev; (2) `chrome://gpu` → check WebGPU status; (3) Network tab trace of the BGE download; (4) per-tool smoke list. Do not claim runtime verification you didn't perform.

## Constraints

- One commit per hypothesis/fix, in the order above.
- Do not change model `hfPath`s (no model swaps in this task) and do not touch the BERT attention-analysis tool's semantics — that's a separate pending decision.
- `tsc` passes, existing tests green, both apps build after each commit.

## Acceptance

- `DEBUG_LOG.md` with hypothesis → test → observation → action for H1–H5.
- Dev server sends COOP/COEP headers (or documented why not needed).
- Registry dtypes restored to quantized values, validated against `get_available_dtypes`.
- WebGPU→WASM fallback implemented; effective device visible in status; app loads models on a WASM-only environment.
- Eviction cannot dispose a mid-load model.
- `MANUAL_CHECKS.md` for anything requiring a real browser.

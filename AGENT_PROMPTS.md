# Coding Agent Prompts — Difference Suite improvements

Run these in order; each is an independent, PR-sized task. Prompts 1–4 are low-risk fixes. The Transformers.js v4 upgrade lives in `PROMPT_V4_UPGRADE.md` and runs after Prompt 5. Prompt 5 (deduplication) is the big structural change — do it before adding new features. Prompt 6 is ongoing hygiene. After each task: `npm run build` must pass and the dev app must still load models and run a tool end-to-end.

---

## Prompt 0 — Transformers.js v4 upgrade (moved)

Superseded: this is now a standalone prompt in `PROMPT_V4_UPGRADE.md`, rewritten to run **after** Prompt 5 (monorepo restructuring), since the agent executed Prompts 1–5 on v3.8.1 first. Do not run an upgrade from this file.

## Prompt 1 — Fix worker progress routing, timeout, and crash recovery

In this React + Transformers.js app, ML inference runs in a web worker (`src/workers/transformers.worker.ts`), managed by `src/core/inference/TransformersManager.ts` and called from the UI via `src/core/inference/TransformersClient.ts`. There are three related bugs:

1. **Progress routing.** `TransformersManager.loadPipeline()` emits `InferenceProgress` events with `id: config.id` (the model id) or `id: 'loading'`, but `TransformersClient` routes progress messages to pending requests via `pendingRequests.get(data.id)`, where the key is the request UUID. So model download/loading progress never reaches the tool's `onProgress` callback. Fix: thread the request id from `TransformersManager.run()` into `getOrLoadPipeline()` and `loadPipeline()`, and emit progress with `id: <request.id>`; keep the model id in a separate field (e.g. `modelId`). Update the `InferenceProgress` type in `src/core/inference/types.ts` accordingly. Verify the task handlers in `src/core/inference/handlers/` already use `request.id` (they do — don't change them).
2. **Timeout.** `TransformersClient.run()` uses a fixed 120 s timeout (`REQUEST_TIMEOUT_MS`) that includes first-time model download, so large models on slow connections time out while still downloading. Change it to an inactivity timeout: reset the timer every time a progress event arrives for that request. Keep 120 s as the inactivity window.
3. **Crash recovery.** `TransformersClient.resetRestartCount()` is never called, so 3 worker crashes over a whole session permanently kill inference. Call it after every successfully resolved request. Also, when `MAX_RESTARTS` is exceeded, reject all pending requests with a clear error ("Inference engine failed repeatedly — please reload the page") instead of failing silently.

While in these files, define a discriminated-union message protocol type (`WorkerMessage = { type: 'progress' | 'result' | 'error' | 'status', ... }`) shared between worker and client, and remove the `as unknown as WorkerStatus` cast in `getStatus()`.

Acceptance: `npx tsc -b` passes; in the dev app, opening Semantic Oracle on a cold cache shows the "Loading Weights (%)" bar advancing during model download; a request that streams progress for >2 min does not time out.

## Prompt 2 — Memory hygiene: blob URL revocation and payload mutation

Two memory issues in the same app:

1. **Blob URL leaks.** `src/components/shared/DataUploader.tsx` and `src/components/dashboard/Dashboard.tsx` create object URLs with `URL.createObjectURL(file)` for uploaded images and store them in `DataItem.content` (see `src/types/index.ts`, store in `src/stores/suiteStore.ts`). They are never revoked. In the store, revoke object URLs when items are removed: in `removeItem` (revoke that item's URL if `content` is a string starting with `blob:`) and in `clearDataset` (revoke all). Also revoke the transient URL in `src/components/dashboard/modals/AudioRecorderModal.tsx` when the modal closes or re-records.
2. **Payload mutation + base64 inflation.** `TransformersClient.run()` (in `src/core/inference/TransformersClient.ts`) mutates the caller's `request.payload` in place, converting blob URLs to base64 data URLs before posting to the worker. Fix the mutation: build a shallow-cloned payload instead of writing into the caller's object. Then, instead of converting fetched blobs to base64 strings, pass `Blob` objects directly through `postMessage` (structured clone supports Blob) and make the worker side (`TransformersManager.loadRawImage` / relevant handlers in `src/core/inference/handlers/`) accept `string | Blob`. `RawImage.read()` from `@huggingface/transformers` accepts Blobs. Also tighten the `prefetch` heuristic: only treat strings starting with `blob:`, `http`, `/`, or `./` as fetchable — currently any string containing `.` triggers a fetch attempt.

Acceptance: `npx tsc -b` passes; uploading images, running an image tool (e.g. Detail Extractor or Depth Mirror), then deleting items works without errors; no `revokeObjectURL` on URLs still in use (active items keep rendering).

## Prompt 3 — Single source of truth for routes + route-level auth gating

1. **Routes/nav drift.** Routes are defined twice: `src/App.tsx` (React Router `<Route>` list) and `src/utils/navigation.ts` (`TOOLS` array for the sidebar). They have drifted: `/depth-mirror` is routed but missing from `TOOLS`, so it's unreachable from the nav. Refactor: extend each `TOOLS` entry with a `component` field (use `React.lazy` imports for the tool components), and generate the `<Route>` elements in `App.tsx` by mapping over `TOOLS`. Add the missing Depth Mirror entry (icon + one-line description consistent with the others). Keep the `/` Dashboard route and the `*` fallback explicit. Wrap lazy routes in a `<Suspense>` with a simple centered loading state.
2. **Auth gating.** `src/components/auth/AuthGuard.tsx` currently has a hardcoded `const SKIP_AUTH = true` and "gates" by CSS-blurring the children while leaving them mounted. This app will later integrate university SSO, so: move the skip flag to config — read `import.meta.env.VITE_SKIP_AUTH` (default `'true'` for now) via a new export in `src/config/authConfig.ts`; change `AuthGuard` to conditionally render — when access is denied, render the lock panel INSTEAD of children (don't mount the tools, so models can't load pre-auth). Keep the existing visual style of the lock panel. Don't implement real auth; `login(email)` in `src/stores/suiteStore.ts` stays the single entry point.
3. While in `authConfig.ts`: make `checkDomain` match subdomains (`domain === d || domain.endsWith('.' + d)`), and remove the incorrect inline comment claiming the regex doesn't cover `.ac.kr` (it does).
4. Remove the stale "Temporarily commented out - need dependency fixes" comments in `App.tsx`.

Acceptance: `npx tsc -b` passes; all 15 tool routes + dashboard load; Depth Mirror appears in the sidebar; setting `VITE_SKIP_AUTH=false` in `.env.local` shows the lock panel with no tool content mounted (check the DOM); `student.uva.nl` passes `checkDomain`.

## Prompt 4 — Persist store state across refreshes

The Zustand store (`src/stores/suiteStore.ts`) holds the dataset, collections, selection, analysis results, and login state — all lost on page refresh, which is painful in classroom use. Add persistence:

1. Use `zustand/middleware` `persist` with `localStorage` for the lightweight state: `collections`, `isAuthenticated`, `userEmail`, and text-type items in `dataset` (their `content` is a plain string).
2. Image/audio items have `content` as blob URLs and `rawFile`/`File` objects, which don't survive serialization. Persist them in IndexedDB: store the underlying `Blob` keyed by item id (a ~50-line helper module `src/utils/blobStore.ts` using raw IndexedDB is fine — no new dependency). On store hydration, load the blobs, recreate object URLs, and merge those items back into `dataset`. On `removeItem`/`clearDataset`, also delete from IndexedDB.
3. Persist `embedding` and `analysisResults` along with each item, plus `embeddingModelVersion`.
4. Use a `partialize` so transient state (`activeItem`, `selectedItems`, `isProcessing`) is not persisted.
5. Wrap hydration in version/migration support (`version: 1`) so future schema changes don't crash on stale data, and guard all IndexedDB access in try/catch so persistence failures degrade gracefully to in-memory mode.

Acceptance: `npx tsc -b` passes; upload a text item and an image, run one analysis, refresh — items, collections, the analysis result, and the image preview all survive; deleting an item then refreshing doesn't resurrect it.

## Prompt 5 — Eliminate duplication between root app and gemma-suite (structural)

This repo contains two Vite/React apps: the root app (`/src`) and `gemma-suite/` (a separate npm project, built into `dist/difference-suite-large-models/` by the root `build:consolidated` script and served under that path via `vercel.json`). 27 files are copy-pasted between `src/` and `gemma-suite/src/` (dashboard components, shared components, store, auth, types, config) and some have already drifted (`stores/suiteStore.ts`, `components/dashboard/modals/AudioRecorderModal.tsx`).

Convert the repo to npm workspaces with a shared package:

1. Create `packages/shared/` containing the duplicated modules: `types/`, `stores/suiteStore.ts`, `config/authConfig.ts`, `components/auth/`, `components/dashboard/`, `components/shared/`, `utils/navigation.ts` (nav stays root-specific if gemma-suite's differs — check first). For each file pair that differs, diff them and reconcile: keep the superset of functionality, parameterize genuine differences via props/config rather than forks. Show me the diffs for `suiteStore.ts` and `AudioRecorderModal.tsx` and your reconciliation choice before merging them.
2. Root `package.json` becomes the workspace root (`"workspaces": ["packages/shared", ".", "gemma-suite"]` or restructure into `apps/` if cleaner — your call, but keep the Vercel build working). Both apps import from `@difference-suite/shared`.
3. The shared package ships TypeScript source (no build step); both apps' tsconfig/Vite resolve it directly.
4. Update `build:consolidated` and verify `vercel.json` (`buildCommand`, `outputDirectory`, COOP/COEP headers, the `/difference-suite-large-models/` rewrite) still works. gemma-suite keeps `base: '/difference-suite-large-models/'`.
5. Also add the COOP/COEP `server.headers` block from `gemma-suite/vite.config.ts` to the root `vite.config.ts` for dev/prod parity.
6. Delete the now-duplicated files from both `src/` trees.

Constraints: no behavior changes beyond the reconciliations you flag; both apps must build (`npm run build:consolidated`) and run in dev. This is a large change — work incrementally (move one module group at a time, building after each) and commit per group.

## Prompt 6 — Hygiene: types, lint, DeepTime, tests

Ongoing quality pass; split into commits per item.

1. **Lint signal.** `npx eslint .` reports ~194 errors, almost all `@typescript-eslint/no-explicit-any` in the inference layer. Define proper types for the worker protocol and pipeline objects in `src/core/inference/types.ts` (a minimal `CallablePipeline` interface covering how handlers invoke pipelines is enough) and eliminate `any` from `src/core/inference/**` and `src/workers/**`. For remaining third-party `any`s, use `unknown` + narrowing. Downgrade `no-explicit-any` to `warn` in `eslint.config.js` and get **errors** to zero. Fix the real `react-hooks/exhaustive-deps` warnings (don't blanket-disable; where a dep is intentionally omitted, wrap the callback in `useCallback`/`useRef` properly).
2. **DeepTime.** `src/components/tools/DeepTime/DeepTime.tsx` is 1,156 lines under `// @ts-nocheck`. Split it into: `data.ts` (constants, example texts, default events), `simulation.ts` (pure computation), `plots.ts` (Plotly rendering helpers), and the component. Remove `@ts-nocheck` and fix the resulting type errors. No behavior changes.
3. **Tests.** Add Vitest (`npm i -D vitest`, `"test": "vitest run"`). Write tests for: `checkDomain` (whitelist, regex domains, subdomains, garbage input); `TransformersManager` LRU eviction (mock `pipeline()`; assert max-3 limit, LRU choice, large-model evict-all, no double-loading on concurrent requests); store actions (selection toggling, `deleteCollection` moving items to root, `setEmbeddingModelVersion` invalidating embeddings); text-generation handler output parsing (array vs object `generated_text`). Mock `@huggingface/transformers` — no model downloads in tests.
4. **Logging.** Add `src/utils/log.ts` with a `debug()` that no-ops unless `import.meta.env.DEV`; replace the ~42 `console.log` calls in `src/` with it (keep `console.error`/`warn`).

Acceptance: `npx tsc -b` passes, `npx eslint .` has 0 errors, `npm test` green.

# Difference Suite — Code Review

Scope: root app (`src/`, 14 Transformers.js tools) and `gemma-suite/` (Gemma/SD/vision sub-app). Auth is known to be cosmetic and excluded except where it affects future SSO integration. TypeScript builds clean (`tsc -b` passes). ESLint reports 194 errors / 13 warnings.

## 1. Bugs worth fixing

**1.1 Model-download progress never reaches the UI (real bug).**
`TransformersManager.loadPipeline()` emits progress events with `id: config.id` (e.g. `'smollm2-135m-instruct'`) or `id: 'loading'`. The worker forwards them verbatim, but `TransformersClient` routes progress by *request* id (`pendingRequests.get(data.id)`), which is a UUID. Result: download/loading progress is silently dropped, and progress bars like SemanticOracle's "Loading Weights (…%)" only ever see the handler-stage events. Fix: thread `request.id` through `getOrLoadPipeline`/`loadPipeline` and emit progress with the request id (keep the model id in a separate field).

**1.2 The 2-minute request timeout includes first-time model download.**
`TransformersClient.run()` starts a fixed 120 s timer. On a slow connection, Florence-2 (~1.2 GB footprint) will time out while the download is still progressing. Once 1.1 is fixed, reset the timeout whenever a progress event arrives ("no progress for N seconds" rather than "total time > N").

**1.3 Worker crash recovery never recovers.**
`resetRestartCount()` is never called anywhere, so after 3 crashes over a whole session the client is permanently dead with no user-visible error. Call it on every successful `run()`, and surface a "reload the page" message when the fatal branch is hit.

**1.4 Blob URLs are never revoked.**
`DataUploader` and `Dashboard` create object URLs for every image; `removeItem` / `clearDataset` never call `URL.revokeObjectURL`. In a workshop session where students upload many images, this leaks memory. Revoke in the store actions (or switch to storing `File`/`Blob` and rendering via short-lived URLs).

**1.5 `TransformersClient.run()` mutates the caller's payload.**
The prefetch step overwrites `payload.imageUrl` etc. in place, converting blob URLs to base64 data URLs. Two issues: side effects on the caller's object, and base64 inflates memory ~33% plus serialization cost. `postMessage` structured-clones `Blob`/`ArrayBuffer` natively — send blobs directly and let the worker `RawImage.read(blob)`.

**1.6 Stale/incorrect comments.**
`App.tsx` still says "Temporarily commented out - need dependency fixes" above active imports. `authConfig.ts` line 36 questions whether the regex matches `.ac.kr` — it does (`[a-z]{2}`). `toggleSelection`'s comment promises "toggle off if clicked again" in single-select mode, but the code always selects. Small, but misleading comments cost real time later.

## 2. Architecture and maintainability

**2.1 Heavy duplication between root and gemma-suite (highest-leverage item).**
27 files are copy-pasted between `src/` and `gemma-suite/src/` (entire dashboard, shared components, store, auth, types). Several have already drifted (`suiteStore.ts`, `AudioRecorderModal.tsx` differ). Any bug fix now needs to be applied twice and verified twice. Options, in order of preference:

1. npm workspaces monorepo with a `packages/shared` for store/types/dashboard/shared components; both apps depend on it.
2. Merge gemma-suite into the root app as a lazy-loaded route group (`React.lazy`), keeping the heavy workers code-split. The current iframe-style split via `build:consolidated` + Vercel rewrite exists mainly to isolate big models, which code-splitting also achieves.

**2.2 Two sources of truth for routes.**
Routes live in `App.tsx`; the nav lives in `utils/navigation.ts` (`TOOLS`). They have already drifted: `/depth-mirror` is routed but absent from `TOOLS` (unreachable from the sidebar). Derive routes from `TOOLS` (add a `component` field) so adding a tool is a one-line change — which is what the model registry already does well for models.

**2.3 `DeepTime.tsx`: 1,156 lines under `// @ts-nocheck`.**
The largest file in the codebase has TypeScript switched off entirely. Split it (constants/data, simulation logic, Plotly rendering, component) and remove the nocheck; this is where runtime surprises will hide.

**2.4 Mixed JS/JSX in a strict-TS project.**
~20 files under `src/components/tools/**` are `.js`/`.jsx` (`DataProcessor.js`, `ModelManager.js`, `BiasAnalyzer.js`, …). With `allowJs` they're bundled but escape strict checking, so the "strict" config protects the easy code and skips the numeric/ML logic that needs it most. Migrate opportunistically — whenever a file is touched, rename it and type its exports.

**2.5 Lint signal is drowned out.**
194 errors are almost all `no-explicit-any`, which means real issues (unused vars, hooks violations) are invisible in the noise. Either type the inference layer properly (the `pipeline` instances are the main offenders — a thin typed interface for "callable pipeline" would remove dozens), or downgrade `no-explicit-any` to `warn` and enforce zero *errors* in CI. The `react-hooks/exhaustive-deps` warnings include genuinely missing deps (e.g. analyzers not re-running when `activeItem` changes).

**2.6 No tests.**
There is meaningful pure logic that is cheap to test with Vitest: `checkDomain`, LRU eviction in `TransformersManager`, store actions (selection logic, collection deletion moving items to root, embedding invalidation), and handler output parsing (`generated_text` array/object shapes). Even ~15 tests would protect the worker protocol, which is the part most likely to break silently (see 1.1).

**2.7 No persistence.**
Dataset, collections, analysis results, and login state all vanish on refresh — painful in teaching settings. Suggest `zustand/persist` for metadata + login, and IndexedDB (or OPFS, which you already detect in `getStatus`) for file contents and embeddings. Even persisting only text items and collection structure would help.

**2.8 TFJS tools run on the main thread.**
NoisePredictor, AmbiguityAmplifier, LatentSpaceNavigator, DiscontinuityDetector use `@tensorflow/tfjs` directly in components while Transformers.js work is properly worker-isolated. Training loops will jank the UI on weaker student laptops. Long-term: same worker pattern; short-term: `await tf.nextFrame()` inside loops. Also note you ship two ML runtimes (TFJS + ONNX/Transformers.js) — worth checking whether the TFJS tools could be expressed on the existing stack.

**2.9 Logging.**
42 `console.log` calls in production code. A two-line `debug()` wrapper gated on `import.meta.env.DEV` keeps the workshop console clean while preserving diagnostics in dev.

## 3. Smaller points

- **Dev-server headers:** gemma-suite's `vite.config.ts` sets COOP/COEP for SharedArrayBuffer; the root config doesn't. If any root tool ends up using threaded WASM, `npm run dev` will behave differently from the Vercel deployment (which sets the headers globally). Add the same `server.headers` to the root config for parity.
- **Accessibility:** modals (`LoginModal`, upload/webcam/audio) have no focus trap, no Escape-to-close, and icon buttons lack `aria-label`. For a university tool, this will come up in accessibility review; `react-aria` or a small dialog primitive covers it.
- **`getStatus()` resolves through the `result`/`status` dual path** in the client with an `as unknown as WorkerStatus` cast — works, but a discriminated union message protocol (typed `WorkerMessage`) would remove the casts and make 1.1-style routing bugs type errors.
- **`prefetch` heuristic** treats any string containing `.` as a fetchable URL (`val.includes('.')`) — a text payload like `"v1.2"` would trigger a fetch attempt. Harmless (it catches), but tighten to explicit `blob:`/`http`/`/` prefixes.
- **README/docs:** the technical overview is good; consider adding a short CONTRIBUTING note covering the duplication rule ("which copy is canonical?") until 2.1 is resolved.

## 4. Notes for the university SSO integration

Not a critique of the current stub — just things that will make the swap cheap:

- Gate at the route level, not visually. `AuthGuard` currently blurs content with CSS while the DOM stays mounted; replace with a redirect/conditional render so the SSO version doesn't load tools (and models!) pre-auth.
- Centralize the switch. `SKIP_AUTH` lives inside `AuthGuard.tsx`; move it to `authConfig.ts` (or `import.meta.env.VITE_SKIP_AUTH`) so both apps and any future guard read one flag.
- Keep `login(email)` as the single entry point in the store — the OIDC/SURFconext callback can call the same action with the token-derived identity, and nothing else changes.
- `checkDomain` uses exact whitelist matching, so `student.uva.nl` or `mail.uct.ac.za` fail. Use suffix matching (`domain === d || domain.endsWith('.' + d)`). With SSO this whole file likely disappears, so only fix it if the soft gate ships anywhere real.
- Login state isn't persisted, so every refresh re-prompts; fold into 2.7.

## 5. Suggested priority

1. Fix progress routing + timeout (1.1, 1.2) — visible UX wins, small diffs.
2. Decide on the duplication strategy (2.1) before more drift accumulates.
3. Add persistence (2.7) — biggest classroom-experience win.
4. Route/nav single source of truth (2.2) and blob URL cleanup (1.4).
5. Incremental: tests for the worker protocol and store, JS→TS migration, lint cleanup, DeepTime split.

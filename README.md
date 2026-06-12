# Difference Suite — Deep Culture

Client-side AI-literacy toolkit. All ML inference runs locally in the browser
(Transformers.js v4 + onnxruntime-web). Deployed at
[difference-suite-final.vercel.app](https://difference-suite-final.vercel.app).

## Development

```bash
npm install
npm run dev              # root app on http://localhost:5173
npm run build            # build root app only
npm run build:consolidated   # build root + gemma-suite, merged into dist/
npm run preview          # serve dist/ locally (PWA active here, not in dev)
npm test                 # vitest
npm run lint
```

## Offline behavior

The app is a PWA. After the first online visit, the **app shell is guaranteed
offline** via a Workbox-generated service worker (configured in
`vite.config.ts`):

- **Precached on install** (~7–8 MB, hashed and content-addressed): every
  built JS/CSS chunk for the root app, `index.html`, the web manifest, the
  Lexend font glue, and the favicon/icons. From the second visit onward the
  shell loads and routes work with the network entirely off.
- **Cached on first use, per tool** — and this is the part students need to
  know:
  - **ML model weights and tokenizers** (BGE, CLIP, Gemma, Stable Diffusion,
    etc.) are fetched from Hugging Face on demand and stored in the
    `transformers-cache` Cache Storage bucket by Transformers.js itself.
    The service worker passes these through (`NetworkOnly`) so they aren't
    double-cached.
  - **The ONNX Runtime WASM binaries** (~23 MB, multithreaded build) are
    cached the first time any tool boots (`env.useWasmCache = true`).
  - **The `gemma-suite` sub-app** under `/difference-suite-large-models/` is
    built separately and copied in post-build, so it can't be in the precache
    manifest. A `StaleWhileRevalidate` runtime route makes it offline-capable
    after the first visit.

> **Instruction for students on flaky Wi-Fi:** open each tool you plan to use
> **once while online**. The first run downloads the model weights and the
> WASM runtime into the browser cache. After that, the tool will work fully
> offline — including hard-reload — for as long as the browser keeps that
> cache.

## Cross-origin isolation

The app requires `crossOriginIsolated === true` (COOP `same-origin` + COEP
`credentialless`) for multithreaded WASM. These headers are set by both the
Vite dev server (`vite.config.ts`) and Vercel (`vercel.json`). When the
service worker serves a precached navigation response, the COOP/COEP headers
ride along on the stored response — verify after deploys with:

```
DevTools → Application → Service Workers (confirm SW is active)
DevTools console:  crossOriginIsolated   // → true
DevTools Network → Offline → reload → check both still hold
```

If isolation is ever lost under SW control, the symptom is silent: inference
falls back to single-threaded WASM and large models appear to hang. Don't
ship without checking.

## Update propagation

`registerType: 'autoUpdate'` with `skipWaiting` + `clientsClaim`: a new
deploy takes effect on the **next** full reload, never mid-session. The
service worker file itself (`sw.js`, `registerSW.js`, `workbox-*.js`) and the
manifest are served with `Cache-Control: max-age=0, must-revalidate` from
Vercel (see `vercel.json`) so the browser always checks for a fresh SW.

# Standalone Prompt — Service worker: guaranteed offline app shell (PWA)

Self-contained task. Context: this is a client-side AI-literacy app (React + Vite, npm workspaces, deployed on Vercel at difference-suite-final.vercel.app). All ML inference runs locally; Transformers.js v4 already caches model weights and WASM binaries in the Cache API (`transformers-cache`, via `env.useWasmCache`). Offline reload currently works only when the HTTP cache happens to cooperate — add a service worker so the app shell is *guaranteed* offline after first visit. Audience: university students on flaky Wi-Fi.

## Approach

Use `vite-plugin-pwa` (Workbox) in the **root app**. Do not write a hand-rolled service worker.

```bash
npm i -D vite-plugin-pwa
```

### 1. Plugin config (root `vite.config.ts`)

- `registerType: 'autoUpdate'` (classroom users should never see an update prompt).
- `devOptions: { enabled: false }` — keep the SW out of dev mode entirely.
- Precache the app shell: built JS/CSS/HTML, favicon/icons, and small `public/` assets. Set `globPatterns` accordingly and raise `maximumFileSizeToCacheInBytes` only if a legitimate shell asset needs it.
- Web app manifest: name "Difference Suite — Deep Culture", short_name "Difference Suite", theme/background colors matching the app's palette, `display: 'standalone'`. Generate 192px and 512px icons from `public/deep-culture-logo.png` (script it with sharp or do it once and commit the PNGs).

### 2. Things that MUST NOT be cached by the service worker

- **Hugging Face model downloads** (`huggingface.co`, `cdn-lfs*.huggingface.co`, `*.hf.co`): Transformers.js manages its own Cache API storage for these multi-hundred-MB files. The SW must pass them through untouched — add explicit `NetworkOnly` runtime handling or ensure no runtime route matches them. Double-caching 200 MB models would blow storage quotas.
- Don't precache anything in `dist/difference-suite-large-models/` — see §4.

### 3. Runtime caching rules

- **Google Fonts**: standard Workbox recipe — `StaleWhileRevalidate` for `fonts.googleapis.com` (stylesheets), `CacheFirst` with long expiry for `fonts.gstatic.com` (font files). Note both are loaded with `crossorigin` because the site is cross-origin isolated; verify the cached responses still satisfy COEP (they're CORS responses, so they should).
- **SPA navigation**: `navigateFallback: '/index.html'` so deep links like `/semantic-oracle` work offline. Add a `navigateFallbackDenylist` for `^/difference-suite-large-models` (see §4).

### 4. The gemma-suite sub-app (important build-order constraint)

`npm run build:consolidated` builds the root app FIRST (which is when vite-plugin-pwa generates the precache manifest) and only afterwards copies `gemma-suite/dist` into `dist/difference-suite-large-models/`. Therefore the sub-app can never be in the precache manifest. Handle it with a runtime route instead: `StaleWhileRevalidate` for same-origin requests matching `^/difference-suite-large-models/` (so it becomes offline-capable after first visit), and keep it out of `navigateFallback`. Do not restructure the build for this task.

### 5. Cross-origin isolation — the critical regression risk

The app requires COOP/COEP headers (`crossOriginIsolated === true`) for multithreaded WASM. When the service worker serves a cached navigation response, the headers come from the *stored response*, which Vercel originally stamped — this normally survives, but it is the one thing that silently kills inference if it breaks. Verification is therefore mandatory, not optional:

- After `npm run build && npx vite preview`, with the SW controlling the page (check DevTools → Application → Service Workers), evaluate `crossOriginIsolated` in the console — must be `true`.
- Then DevTools → Network → Offline → reload → `crossOriginIsolated` must STILL be `true`, and a previously-used tool (Semantic Oracle) must still run.
- If isolation is lost under SW control, fix before shipping: either ensure Workbox `NavigationRoute` serves the precached `index.html` (whose stored response carries the headers), or as a fallback use the `coi-serviceworker` header-injection pattern inside the generated SW. Document which path was needed.

### 6. Registration & update hygiene

- `vite-plugin-pwa` auto-injects registration with `registerType: 'autoUpdate'`; ensure registration only happens in production builds.
- Add a `clientsClaim`/`skipWaiting` configuration consistent with autoUpdate so a new deploy takes effect on next reload, not mid-session.
- In `vercel.json`, confirm the SW file (`/sw.js` or as named) is served with `Cache-Control: no-cache` (Vercel usually handles this; verify with `curl -I`) so updates propagate.

## Acceptance

- Fresh profile (or cleared storage) → visit preview → run Semantic Oracle once → go Offline → hard reload: app shell loads (no browser error page), navigation to another route works, the Oracle still generates, `crossOriginIsolated` is `true` throughout.
- Online again: a new build deploy is picked up after one reload (no stuck stale shell).
- HF model requests appear in the Network tab as normal network fetches (not served by the SW cache) on first download.
- Lighthouse PWA check passes installability (manifest + icons + SW).
- `tsc` clean, both apps build, no eslint regressions. One commit for plugin+config, one for icons/manifest, one for docs note in README ("Offline behavior" section explaining: shell precached, models cached on first use per tool — instruct students to open each tool once while online).

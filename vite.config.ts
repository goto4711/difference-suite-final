import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const COOP_COEP = {
  // Required for SharedArrayBuffer (multithreaded WASM in onnxruntime-web).
  // Without these, crossOriginIsolated is false and WASM inference runs
  // single-threaded — large models appear to hang.
  // 'credentialless' (not 'require-corp') lets credential-free cross-origin
  // resources (e.g. HuggingFace CDN images) load without a Cross-Origin-Resource-Policy
  // header, while still satisfying crossOriginIsolated = true.
  // Matches the production headers set in vercel.json.
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Keep the SW completely out of dev — it interferes with HMR and COOP/COEP
      // headers come from Vite middleware, not a stored response.
      devOptions: { enabled: false },
      includeAssets: [
        'vite.svg',
        'deep-culture-logo.png',
      ],
      manifest: {
        name: 'Difference Suite — Deep Culture',
        short_name: 'Difference Suite',
        description:
          'Client-side AI-literacy toolkit. All inference runs locally in the browser.',
        theme_color: '#832161',
        background_color: '#99B2DD',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache only the root app shell. The gemma-suite sub-app is copied into
        // dist/difference-suite-large-models/ AFTER this build runs (see
        // `npm run build:consolidated`), so it can never be in the precache manifest.
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff,woff2}'],
        // Skip large sub-app assets that get copied in post-build, plus the
        // archetype photos in public/images (~600–900 KB each, not shell).
        globIgnores: [
          '**/difference-suite-large-models/**',
          '**/images/*_archetype.png',
        ],
        // Raised above the 2 MiB default so the DeepTime tool chunk (~4.6 MB) and
        // any future similarly-sized hashed shell chunks land in the precache.
        // Stays well under the ORT WASM blob (23 MB, not in globPatterns) — that
        // one is managed by Transformers.js's own 'transformers-cache' instead.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        clientsClaim: true,
        skipWaiting: true,
        // SPA deep-link support — navigation requests fall back to the precached shell.
        // Denylist the sub-app so its own deep links keep going to the network.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/difference-suite-large-models/,
          // Workbox treats anything ending in a file extension as a non-navigation
          // anyway, but list common asset prefixes for clarity.
          /^\/api\//,
        ],
        runtimeCaching: [
          // Google Fonts stylesheets — small, can change → revalidate in background.
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          // Google Fonts files — versioned, immutable → long-lived cache.
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // HuggingFace model + tokenizer downloads — MUST pass through.
          // Transformers.js manages its own Cache API storage ('transformers-cache')
          // for these multi-hundred-MB files. Double-caching here would blow
          // storage quotas and serve stale weights.
          {
            urlPattern: ({ url }) =>
              url.hostname === 'huggingface.co' ||
              url.hostname.endsWith('.huggingface.co') ||
              url.hostname.endsWith('.hf.co'),
            handler: 'NetworkOnly',
          },
          // gemma-suite sub-app — copied into dist/difference-suite-large-models/
          // AFTER this build, so it can't be precached. Cache its shell at runtime
          // once a student opens it: offline-capable from the second visit on.
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith('/difference-suite-large-models/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'gemma-suite-shell',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@difference-suite/shared': path.resolve(__dirname, 'packages/shared/src'),
    },
    // Force a single resolved copy of these packages. The shared workspace
    // package imports react-router-dom but resolves it relative to its own
    // file location; mismatched copies break Router context (useLocation
    // looks for its own version's Provider).
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  server: {
    headers: { ...COOP_COEP },
  },
  preview: {
    headers: { ...COOP_COEP },
  },
})

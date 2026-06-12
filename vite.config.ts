import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@difference-suite/shared': path.resolve(__dirname, 'packages/shared/src'),
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer (multithreaded WASM in onnxruntime-web).
      // Without these, crossOriginIsolated is false and WASM inference runs
      // single-threaded — large models appear to hang.
      // 'credentialless' (not 'require-corp') lets credential-free cross-origin
      // resources (e.g. HuggingFace CDN images) load without a Cross-Origin-Resource-Policy
      // header, while still satisfying crossOriginIsolated = true.
      // Matches the production headers set in vercel.json.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
})

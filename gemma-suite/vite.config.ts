import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/difference-suite-large-models/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@difference-suite/shared': path.resolve(__dirname, '../packages/shared/src'),
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'onnxruntime-web'],
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer (WASM threading) used by onnxruntime-web
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})

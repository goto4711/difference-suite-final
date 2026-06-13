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
    // Force a single resolved copy of these packages even though imports
    // come from both the workspace root and the gemma-suite. Mismatched
    // react-router-dom copies break Router context: shared/Sidebar's
    // useLocation() looks for the Provider its own copy installed, and
    // can't find the one the app-side <Router> set.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
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

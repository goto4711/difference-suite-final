# Manual Verification Steps for Model Loading

Due to the nature of Cross-Origin Isolation (COOP/COEP) and WebGPU, some aspects of the fix must be verified manually in a real browser context.

## 1. Cross-Origin Isolation
1. Run `npm run preview` to test the production build.
2. Open the browser console and type `crossOriginIsolated`.
3. **Verify:** It must return `true`.
4. Check the Network tab for Google Fonts requests (`fonts.googleapis.com`).
5. **Verify:** CSS files should load with `Sec-Fetch-Mode: cors` and `crossorigin` attribute in the initiator.

## 2. WebGPU Fallback
1. Open Chrome and ensure WebGPU is enabled in `chrome://gpu`.
2. Load a model that prefers WebGPU (e.g., SmolLM2).
3. Check the console for any `getBindGroupLayout` errors.
4. **Verify:** If an error occurs, you should see a warning: `[TransformersManager] WebGPU load failed for ..., falling back to WASM`.
5. Check the UI "Worker Status" (if available) to see the `effectiveDevice`. It should be `wasm` if fallback triggered, otherwise `webgpu`.

## 3. Cache Persistence
1. Load a model (e.g., BGE).
2. Monitor the Network tab. You should see `.onnx` files being downloaded.
3. Reload the page.
4. Load the same model again.
5. **Verify:** No new `.onnx` files should be downloaded from the network (they should come from OPFS/Cache storage).

## 4. Concurrent Loading & Eviction
1. Trigger loading of 3 small models sequentially.
2. While the 3rd is still loading, trigger a 4th model.
3. **Verify:** The LRU model that is NOT currently loading should be evicted. The model that is mid-load must remain in memory.

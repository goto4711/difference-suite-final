import { transformersManager } from '../core/inference/TransformersManager';
import type { InferenceRequest, InferenceProgress } from '../core/inference/types';

/**
 * Transformers Web Worker.
 *
 * Runs all ML inference off the main thread to keep the UI responsive.
 * Effectively a thin wrapper around TransformersManager.
 */

self.addEventListener('message', async (event) => {
  const data = event.data;
  
  if (data.type === 'get-status') {
    self.postMessage({ type: 'status', data: { id: data.id, status: transformersManager.getStatus() } });
    return;
  }

  const request = data as InferenceRequest;
  
  if (!request || !request.id) return;

  try {
    // 1. Progress handler
    const onProgress = (p: InferenceProgress) => {
      self.postMessage({ type: 'progress', data: p });
    };

    // 2. Run inference
    const result = await transformersManager.run(request, onProgress);

    // 3. Return success
    self.postMessage({ type: 'result', data: result });
  } catch (err: any) {
    // 4. Return error
    self.postMessage({
      type: 'error',
      data: {
        id: request.id,
        error: err.message || 'Unknown inference error',
      },
    });
  }
});

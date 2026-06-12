import { transformersManager } from '../core/inference/TransformersManager';
import type {
  InferenceProgress,
  InferenceRequest,
  WorkerMessage,
  WorkerRequestMessage,
  WorkerStatusRequestMessage,
  WorkerClearCacheRequestMessage,
} from '../core/inference/types';

/**
 * Transformers Web Worker.
 *
 * Runs all ML inference off the main thread to keep the UI responsive.
 * Effectively a thin wrapper around TransformersManager.
 */
function isStatusRequestMessage(data: WorkerRequestMessage): data is WorkerStatusRequestMessage {
  return 'type' in data && data.type === 'get-status';
}

function isClearCacheRequestMessage(data: WorkerRequestMessage): data is WorkerClearCacheRequestMessage {
  return 'type' in data && data.type === 'clear-cache';
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequestMessage>) => {
  const data = event.data;

  if (isStatusRequestMessage(data)) {
    const statusMessage: WorkerMessage = {
      type: 'status',
      data: { id: data.id, status: await transformersManager.getStatus() },
    };
    self.postMessage(statusMessage);
    return;
  }

  if (isClearCacheRequestMessage(data)) {
    try {
      const result = await transformersManager.clearModelCache(data.modelId);
      const resultMessage: WorkerMessage = { type: 'result', data: { id: data.id, output: result } };
      self.postMessage(resultMessage);
    } catch (err: unknown) {
      const errorMessage: WorkerMessage = {
        type: 'error',
        data: { id: data.id, error: err instanceof Error ? err.message : 'Clear cache failed' },
      };
      self.postMessage(errorMessage);
    }
    return;
  }

  const request: InferenceRequest = data;

  if (!request || !request.id) return;

  try {
    // 1. Progress handler
    const onProgress = (p: InferenceProgress) => {
      const progressMessage: WorkerMessage = { type: 'progress', data: p };
      self.postMessage(progressMessage);
    };

    // 2. Run inference
    const result = await transformersManager.run(request, onProgress);

    // 3. Return success
    const resultMessage: WorkerMessage = { type: 'result', data: result };
    self.postMessage(resultMessage);
  } catch (err: unknown) {
    // 4. Return error
    const errorMessage: WorkerMessage = {
      type: 'error',
      data: {
        id: request.id,
        error: err instanceof Error ? err.message : 'Unknown inference error',
      },
    };
    self.postMessage(errorMessage);
  }
});

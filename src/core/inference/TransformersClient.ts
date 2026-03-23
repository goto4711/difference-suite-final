import type {
  InferenceRequest,
  InferenceResult,
  InferenceProgress,
  WorkerStatus,
} from './types';

const MAX_RESTARTS = 3;
const REQUEST_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Client for interacting with the Transformers Web Worker.
 *
 * Manages the worker lifecycle, request queuing, timeouts, and crash recovery.
 * Provides a simple Promise-based API for tool components.
 */
export class TransformersClient {
  private static instance: TransformersClient;

  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (res: InferenceResult) => void;
      reject: (err: Error) => void;
      onProgress?: (p: InferenceProgress) => void;
      timeout: number;
    }
  >();

  private restartCount = 0;

  private constructor() {
    this.initWorker();
  }

  public static getInstance(): TransformersClient {
    if (!TransformersClient.instance) {
      TransformersClient.instance = new TransformersClient();
    }
    return TransformersClient.instance;
  }

  private initWorker() {
    if (this.worker) {
      this.worker.terminate();
    }

    // Vite will automatically handle the worker bundling
    this.worker = new Worker(
      new URL('../../workers/transformers.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'progress': {
          const req = this.pendingRequests.get(data.id);
          if (req?.onProgress) req.onProgress(data);
          break;
        }

        case 'result': {
          const req = this.pendingRequests.get(data.id);
          if (req) {
            clearTimeout(req.timeout);
            req.resolve(data);
            this.pendingRequests.delete(data.id);
          }
          break;
        }

        case 'status': {
          const req = this.pendingRequests.get(data.id);
          if (req) {
            clearTimeout(req.timeout);
            req.resolve(data.status); // pass the specific status payload directly back
            this.pendingRequests.delete(data.id);
          }
          break;
        }

        case 'error': {
          const req = this.pendingRequests.get(data.id);
          if (req) {
            clearTimeout(req.timeout);
            req.reject(new Error(data.error));
            this.pendingRequests.delete(data.id);
          }
          break;
        }
      }
    };

    this.worker.onerror = (error) => {
      console.error('[TransformersClient] Worker encountered an error:', error);
      this.handleWorkerCrash();
    };
  }

  private handleWorkerCrash() {
    if (this.restartCount < MAX_RESTARTS) {
      this.restartCount++;
      console.warn(
        `[TransformersClient] Worker crashed. Restarting (${this.restartCount}/${MAX_RESTARTS})...`,
      );
      this.initWorker();
      
      // Notify all pending requests that they failed due to crash
      for (const [id, req] of Array.from(this.pendingRequests.entries())) {
        clearTimeout(req.timeout);
        req.reject(new Error('Worker crashed during inference. Please retry.'));
        this.pendingRequests.delete(id);
      }
    } else {
      console.error('[TransformersClient] Fatal: Worker crashed too many times.');
    }
  }

  /**
   * Run inference for the given request.
   */
  public async run(
    request: InferenceRequest,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    if (!this.worker) {
      throw new Error('Inference worker not initialized');
    }

    // Helper to normalize and pre-fetch local assets to avoid worker-side decoding issues
    const prefetch = async (val: any) => {
        if (typeof val === 'string' && val.length > 0 && !val.startsWith('data:')) {
            // If it's a Blob URL or a regular URL, we want to pre-resolve it for the worker
            if (val.startsWith('blob:') || val.includes('.') || val.startsWith('/') || val.startsWith('http')) {
                try {
                    const response = await fetch(val);
                    if (response.ok) {
                        const blob = await response.blob();
                        return await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                    }
                } catch (e) {
                    console.warn(`[TransformersClient] Failed to pre-fetch asset: ${val}`, e);
                }
            }
        }
        return val;
    };

    // Deep pre-fetch payload assets
    const payload = request.payload as any;
    if (payload) {
        if (payload.imageUrl) payload.imageUrl = await prefetch(payload.imageUrl);
        if (payload.imageSource) payload.imageSource = await prefetch(payload.imageSource);
        if (payload.image) payload.image = await prefetch(payload.image); // Some tools use 'image'
        if (payload.query && payload.queryType === 'image') {
            payload.query = await prefetch(payload.query);
        }
        if (Array.isArray(payload.candidates) && payload.candidateType === 'image') {
            payload.candidates = await Promise.all(payload.candidates.map(prefetch));
        }
    }

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Inference request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`));
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        onProgress,
        timeout,
      });

      this.worker!.postMessage(request);
    });
  }

  /**
   * Request memory and loaded-model info from the worker.
   */
  public async getStatus(): Promise<WorkerStatus> {
    if (!this.worker) {
      throw new Error('Inference worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Status request timed out'));
      }, 5000);

      this.pendingRequests.set(id, {
        resolve: (res) => resolve(res as unknown as WorkerStatus),
        reject,
        timeout,
      });

      this.worker!.postMessage({ type: 'get-status', id });
    });
  }

  /**
   * Reset the restart count (call this on successful inference or manual reset).
   */
  public resetRestartCount() {
    this.restartCount = 0;
  }
}

export const transformersClient = TransformersClient.getInstance();

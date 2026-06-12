import type {
  InferenceRequest,
  InferenceResult,
  InferenceProgress,
  MachineEvent,
  WorkerStatus,
  WorkerMessage,
  WorkerRequestMessage,
} from './types';
import { useMachineRoomStore } from '../../stores/machineRoomStore';

const newEventId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fallthrough
  }
  return `me_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const pushClientEvent = (event: MachineEvent) => {
  try {
    useMachineRoomStore.getState().pushEvent(event);
  } catch {
    // never throw from emission
  }
};

const MAX_RESTARTS = 3;
// 5 minutes: ORT session initialisation after a cache hit is CPU-bound and silent (no download
// progress events). BERT fp32 can take 2-3 min on slow hardware. The heartbeat in
// TransformersManager fires every 30 s to keep the timer alive, but 300 s is the hard ceiling.
const REQUEST_TIMEOUT_MS = 300_000;

type PendingInferenceRequest = {
  kind: 'inference';
  resolve: (res: InferenceResult) => void;
  reject: (err: Error) => void;
  onProgress?: (p: InferenceProgress) => void;
  timeout: number;
};

type PendingStatusRequest = {
  kind: 'status';
  resolve: (status: WorkerStatus) => void;
  reject: (err: Error) => void;
  timeout: number;
};

type PendingRequest = PendingInferenceRequest | PendingStatusRequest;

/**
 * Client for interacting with the Transformers Web Worker.
 *
 * Manages the worker lifecycle, request queuing, timeouts, and crash recovery.
 * Provides a simple Promise-based API for tool components.
 */
export class TransformersClient {
  private static instance: TransformersClient;

  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();

  private restartCount = 0;
  /** Per-request timestamp of the last progress event forwarded to the UI (throttling). */
  private lastProgressForwardAt = new Map<string, number>();
  private fatalError: Error | null = null;

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

    this.fatalError = null;

    // Vite will automatically handle the worker bundling
    this.worker = new Worker(
      new URL('../../workers/transformers.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      switch (message.type) {
        case 'progress': {
          const req = this.pendingRequests.get(message.data.id);
          if (req?.kind === 'inference') {
            this.resetInactivityTimeout();
            // Throttle UI progress callbacks to ~10/s. Model loading emits
            // hundreds of events per second, and forwarding each one triggers a
            // React re-render per event (observed: ~150 renders/s render storm).
            const now = Date.now();
            const last = this.lastProgressForwardAt.get(message.data.id) ?? 0;
            const isTerminal = (message.data.progress ?? 0) >= 1;
            if (isTerminal || now - last >= 100) {
              this.lastProgressForwardAt.set(message.data.id, now);
              req.onProgress?.(message.data);
            }
          }
          break;
        }

        case 'result': {
          const req = this.pendingRequests.get(message.data.id);
          if (req?.kind === 'inference') {
            clearTimeout(req.timeout);
            req.resolve(message.data);
            this.pendingRequests.delete(message.data.id);
            this.lastProgressForwardAt.delete(message.data.id);
            this.resetRestartCount();
          }
          break;
        }

        case 'status': {
          const req = this.pendingRequests.get(message.data.id);
          if (req?.kind === 'status') {
            clearTimeout(req.timeout);
            req.resolve(message.data.status);
            this.pendingRequests.delete(message.data.id);
            this.lastProgressForwardAt.delete(message.data.id);
            this.resetRestartCount();
          }
          break;
        }

        case 'error': {
          const req = this.pendingRequests.get(message.data.id);
          if (req) {
            clearTimeout(req.timeout);
            req.reject(new Error(message.data.error));
            this.pendingRequests.delete(message.data.id);
            this.lastProgressForwardAt.delete(message.data.id);
          }
          break;
        }

        case 'machine-event': {
          pushClientEvent(message.data);
          break;
        }
      }
    };

    this.worker.onerror = (error) => {
      console.error('[TransformersClient] Worker encountered an error:', error);
      this.handleWorkerCrash();
    };
  }

  private getWorker(): Worker {
    if (this.fatalError) {
      throw this.fatalError;
    }

    if (!this.worker) {
      throw new Error('Inference worker not initialized');
    }

    return this.worker;
  }

  private createInferenceTimeout(requestId: string): number {
    return window.setTimeout(() => {
      const req = this.pendingRequests.get(requestId);
      if (!req || req.kind !== 'inference') {
        return;
      }

      this.pendingRequests.delete(requestId);
      this.lastProgressForwardAt.delete(requestId);
      req.reject(
        new Error(
          `Inference request timed out after ${REQUEST_TIMEOUT_MS / 1000}s of inactivity`,
        ),
      );
    }, REQUEST_TIMEOUT_MS);
  }

  private createStatusTimeout(requestId: string): number {
    return window.setTimeout(() => {
      const req = this.pendingRequests.get(requestId);
      if (!req || req.kind !== 'status') {
        return;
      }

      this.pendingRequests.delete(requestId);
      this.lastProgressForwardAt.delete(requestId);
      req.reject(new Error('Status request timed out'));
    }, 5000);
  }

  private resetInactivityTimeout() {
    // Reset ALL pending inference timers, not just the one that sent progress.
    // Concurrent model loads share the same worker event loop: if the worker is alive
    // and making progress on any request (download chunks, heartbeat pings), none of
    // the others should time out due to inactivity.
    for (const [id, req] of this.pendingRequests) {
      if (req.kind !== 'inference') continue;
      clearTimeout(req.timeout);
      req.timeout = this.createInferenceTimeout(id);
    }
  }

  private rejectAllPendingRequests(error: Error) {
    for (const [id, req] of Array.from(this.pendingRequests.entries())) {
      clearTimeout(req.timeout);
      req.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  private handleWorkerCrash() {
    pushClientEvent({
      id: newEventId(),
      ts: Date.now(),
      kind: 'worker-crash',
      summary: '',
      detail: { restartCount: this.restartCount, maxRestarts: MAX_RESTARTS },
    });
    if (this.restartCount < MAX_RESTARTS) {
      this.restartCount++;
      console.warn(
        `[TransformersClient] Worker crashed. Restarting (${this.restartCount}/${MAX_RESTARTS})...`,
      );
      this.rejectAllPendingRequests(
        new Error('Worker crashed during inference. Please retry.'),
      );
      this.initWorker();
      pushClientEvent({
        id: newEventId(),
        ts: Date.now(),
        kind: 'worker-restart',
        summary: '',
        detail: { restartCount: this.restartCount, maxRestarts: MAX_RESTARTS },
      });
    } else {
      console.error('[TransformersClient] Fatal: Worker crashed too many times.');
      this.fatalError = new Error(
        'Inference engine failed repeatedly — please reload the page',
      );
      this.rejectAllPendingRequests(this.fatalError);
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }
  }

  /**
   * Run inference for the given request.
   */
  public async run(
    request: InferenceRequest,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const worker = this.getWorker();

    // Helper to normalize and pre-fetch local assets to avoid worker-side decoding issues
    const prefetch = async (val: unknown) => {
        if (typeof val === 'string' && val.length > 0 && !val.startsWith('data:')) {
            // If it's a Blob URL or a regular URL, we want to pre-resolve it for the worker
            if (val.startsWith('blob:') || val.startsWith('http') || val.startsWith('/') || val.startsWith('./')) {
                try {
                    const response = await fetch(val);
                    if (response.ok) {
                        return await response.blob();
                    }
                } catch (e) {
                    console.warn(`[TransformersClient] Failed to pre-fetch asset: ${val}`, e);
                }
            }
        }
        return val;
    };

    const payload =
      request.payload && typeof request.payload === 'object' && !Array.isArray(request.payload)
        ? { ...(request.payload as Record<string, unknown>) }
        : request.payload;

    // Deep pre-fetch payload assets
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const clonedPayload = payload as Record<string, unknown>;

        if (clonedPayload.imageUrl) clonedPayload.imageUrl = await prefetch(clonedPayload.imageUrl);
        if (clonedPayload.imageSource) clonedPayload.imageSource = await prefetch(clonedPayload.imageSource);
        if (clonedPayload.image) clonedPayload.image = await prefetch(clonedPayload.image); // Some tools use 'image'
        if (clonedPayload.query && clonedPayload.queryType === 'image') {
            clonedPayload.query = await prefetch(clonedPayload.query);
        }
        if (Array.isArray(clonedPayload.candidates) && clonedPayload.candidateType === 'image') {
            clonedPayload.candidates = await Promise.all(clonedPayload.candidates.map(prefetch));
        }
    }

    const requestToSend: InferenceRequest = {
      ...request,
      payload,
    };

    return new Promise((resolve, reject) => {
      const timeout = this.createInferenceTimeout(request.id);

      this.pendingRequests.set(request.id, {
        kind: 'inference',
        resolve,
        reject,
        onProgress,
        timeout,
      });

      worker.postMessage(requestToSend satisfies WorkerRequestMessage);
    });
  }

  /**
   * Request memory and loaded-model info from the worker.
   */
  public async getStatus(): Promise<WorkerStatus> {
    const worker = this.getWorker();

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timeout = this.createStatusTimeout(id);

      this.pendingRequests.set(id, {
        kind: 'status',
        resolve,
        reject,
        timeout,
      });

      const statusRequest: WorkerRequestMessage = { type: 'get-status', id };
      worker.postMessage(statusRequest);
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

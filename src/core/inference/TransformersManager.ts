import { pipeline, env, LogLevel, ModelRegistry, RawImage, AutoProcessor, AutoTokenizer, AutoModelForImageTextToText, CLIPTextModelWithProjection, CLIPVisionModelWithProjection } from '@huggingface/transformers';
import type {
  CallablePipeline,
  InferenceRequest,
  InferenceResult,
  InferenceProgress,
  ModelConfig,
  WorkerStatus,
  Device,
  MachineEvent,
  MachineEventKind,
} from './types';
import { getHandler } from './taskHandlers';
import { getModelConfig, MODEL_REGISTRY } from './modelRegistry';
import { debug } from '../../utils/log';
import './handlers'; // Triggers self-registration of all handlers

// ── Configuration ──────────────────────────────────────────────
env.allowLocalModels = false;
env.useWasmCache = true;
env.logLevel = LogLevel.WARNING;

let threadCapInfo: { cores: number; threads: number } | null = null;

// Cap WASM threads below core count. ORT's pthread pool spin-waits aggressively;
// using all cores can starve the main thread (tab freeze) and has been observed
// to deadlock on some quantized models. Leave headroom for the UI thread.
try {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const wasmBackend = (env.backends as { onnx?: { wasm?: { numThreads?: number } } })?.onnx?.wasm;
  if (wasmBackend) {
    const threads = Math.max(1, Math.min(4, cores - 2));
    wasmBackend.numThreads = threads;
    threadCapInfo = { cores, threads };
  }
} catch {
  // Non-fatal: fall back to ORT defaults.
}

const MAX_LOADED_MODELS = 3;

type MachineEventEmitter = (event: MachineEvent) => void;

/**
 * Best-effort description of an inference output for the decision journal.
 * Never logs content — only shapes (e.g. "384 numbers", "array of 5").
 */
const describeOutputShape = (output: unknown): string | undefined => {
  try {
    if (output == null) return undefined;
    if (typeof output === 'object') {
      const maybeTensor = output as { dims?: unknown; data?: ArrayLike<unknown> };
      if (Array.isArray(maybeTensor.dims) && maybeTensor.dims.length > 0) {
        return `tensor ${maybeTensor.dims.join('×')}`;
      }
      if (Array.isArray(output)) {
        return `array of ${output.length}`;
      }
      if (typeof maybeTensor.data?.length === 'number') {
        return `${maybeTensor.data.length} numbers`;
      }
    }
    if (typeof output === 'string') return `text (${output.length} chars)`;
    if (typeof output === 'number') return 'one number';
  } catch {
    // fall through
  }
  return undefined;
};

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

/**
 * Singleton manager for ML model lifecycle and inference.
 * Implements LRU (Least Recently Used) eviction to prevent OOM.
 */
export class TransformersManager {
  private static instance: TransformersManager;

  /** Map of logicalId -> loaded pipeline instance */
  private pipelines = new Map<string, CallablePipeline>();
  /** Map of logicalId -> last used timestamp */
  private lastUsedAt = new Map<string, number>();
  /** Map of logicalId -> loading promise (prevents double-loading) */
  private loadingPromises = new Map<string, Promise<CallablePipeline>>();
  /** Map of logicalId -> device actually used (wasm vs webgpu) */
  private effectiveDevices = new Map<string, Device>();
  /** Map of logicalId -> when load was first requested */
  private loadStartAt = new Map<string, number>();

  private machineEventEmitter: MachineEventEmitter | null = null;
  private threadCapAnnounced = false;

  private constructor() {}

  public static getInstance(): TransformersManager {
    if (!TransformersManager.instance) {
      TransformersManager.instance = new TransformersManager();
    }
    return TransformersManager.instance;
  }

  /**
   * Register a fire-and-forget machine-event sink. The worker wires this to
   * `self.postMessage` so events reach the main-thread store.
   */
  public setMachineEventEmitter(emitter: MachineEventEmitter | null): void {
    this.machineEventEmitter = emitter;
  }

  /**
   * Fire-and-forget event emission. Summary text is filled in by the narrator
   * on the consumer side; here we only carry the kind and the technical detail.
   * Wrapped in try/catch — a logging bug must not break a tool.
   */
  private emit(
    kind: MachineEventKind,
    opts: { toolId?: string; modelId?: string; detail?: Record<string, string | number | boolean> } = {},
  ): void {
    try {
      if (!this.machineEventEmitter) return;
      // First lifecycle event of the session also carries the thread-cap note.
      if (!this.threadCapAnnounced && threadCapInfo) {
        this.threadCapAnnounced = true;
        const { cores, threads } = threadCapInfo;
        try {
          this.machineEventEmitter({
            id: newEventId(),
            ts: Date.now(),
            kind: 'threads-capped',
            summary: '',
            detail: { cores, threads },
          });
        } catch {
          // ignore
        }
      }
      this.machineEventEmitter({
        id: newEventId(),
        ts: Date.now(),
        kind,
        summary: '',
        toolId: opts.toolId,
        modelId: opts.modelId,
        detail: opts.detail,
      });
    } catch {
      // never throw from emission
    }
  }

  /**
   * Main entry point for inference.
   * Dispatches to the appropriate task-handler.
   */
  public async run(
    request: InferenceRequest,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const config = getModelConfig(request.model);
    const toolId = typeof request.tool === 'string' ? request.tool : undefined;

    this.emit('load-requested', {
      toolId,
      modelId: config.id,
      detail: { task: String(config.task), modelName: config.name, hfPath: config.hfPath },
    });

    // 1. Ensure model is loaded (with LRU eviction)
    const pipe = await this.getOrLoadPipeline(request.id, config, onProgress, toolId);

    // 2. Update LRU timestamp
    this.lastUsedAt.set(config.id, Date.now());

    const inferenceStartedAt = Date.now();
    this.emit('inference-start', {
      toolId,
      modelId: config.id,
      detail: { task: String(request.task) },
    });

    // 3. Dispatch to handler with watchdog: a wedged ORT session freezes the worker event
    // loop indefinitely. Reject after 120 s so the client surfaces an error instead of
    // spinning forever, and free the LRU slot so the next request can try again.
    const HANDLER_TIMEOUT_MS = 120_000;
    const handler = getHandler(request.task);
    const handlerPromise = handler.run(request, pipe, onProgress);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Model execution wedged: ${config.id} — session did not return within ${HANDLER_TIMEOUT_MS / 1000} s`)),
        HANDLER_TIMEOUT_MS,
      )
    );

    try {
      const result = await Promise.race([handlerPromise, timeoutPromise]);
      const durationMs = Date.now() - inferenceStartedAt;
      const outputShape = describeOutputShape(result?.output);
      this.emit('inference-done', {
        toolId,
        modelId: config.id,
        detail: { durationMs, ...(outputShape ? { outputShape } : {}) },
      });
      return result;
    } catch (err) {
      const durationMs = Date.now() - inferenceStartedAt;
      if (err instanceof Error && err.message.includes('wedged')) {
        console.error(`[TransformersManager] Watchdog fired for ${config.id}. Disposing session.`);
        this.emit('watchdog-timeout', {
          toolId,
          modelId: config.id,
          detail: { durationMs, timeoutSeconds: HANDLER_TIMEOUT_MS / 1000 },
        });
        this.disposeModel(config.id);
      }
      throw err;
    }
  }

  /**
   * Get an existing pipeline or load a new one.
   * Handles concurrency and LRU eviction. Multiple models load concurrently —
   * the heartbeat + 300s inactivity timeout in TransformersClient handles the case
   * where ORT session initialisation temporarily blocks the worker event loop.
   */
  private async getOrLoadPipeline(
    requestId: string,
    config: ModelConfig,
    onProgress?: (p: InferenceProgress) => void,
    toolId?: string,
  ): Promise<CallablePipeline> {
    // Already loaded — return immediately.
    if (this.pipelines.has(config.id)) {
      const existingPipeline = this.pipelines.get(config.id);
      if (existingPipeline) {
        return existingPipeline;
      }
    }

    // Already loading — share the in-flight promise.
    const existingPromise = this.loadingPromises.get(config.id);
    if (existingPromise) {
      return existingPromise;
    }

    this.evictIfNecessary(config, toolId);
    this.loadStartAt.set(config.id, Date.now());
    const loadPromise = this.loadPipeline(requestId, config, onProgress, toolId);
    this.loadingPromises.set(config.id, loadPromise);

    try {
      const pipe = await loadPromise;
      this.pipelines.set(config.id, pipe);
      this.lastUsedAt.set(config.id, Date.now());
      const durationMs = Date.now() - (this.loadStartAt.get(config.id) ?? Date.now());
      this.emit('loaded', {
        toolId,
        modelId: config.id,
        detail: {
          durationMs,
          effectiveDevice: String(this.effectiveDevices.get(config.id) ?? config.recommendedDevice),
        },
      });
      return pipe;
    } finally {
      this.loadingPromises.delete(config.id);
      this.loadStartAt.delete(config.id);
    }
  }

  /**
   * Internal loader wrapping the library call.
   */
  private async loadPipeline(
    requestId: string,
    config: ModelConfig,
    onProgress?: (p: InferenceProgress) => void,
    toolId?: string,
  ): Promise<CallablePipeline> {
    debug(`[TransformersManager] Loading ${config.id} (${config.hfPath})...`);

    onProgress?.({
      id: requestId,
      modelId: config.id,
      stage: 'initializing',
      progress: 0,
      message: `Preparing ${config.name}...`,
    });

    // Cache probe and dtype-availability lookup — emit both, then proceed regardless.
    // Wrapped in try/catch: failures here must not abort the load.
    let cached = false;
    let availableDtypes: string[] | undefined;
    try {
      cached = await ModelRegistry.is_pipeline_cached(config.task, config.hfPath).catch(() => false);
    } catch {
      // ignore
    }
    try {
      availableDtypes = await ModelRegistry.get_available_dtypes(config.hfPath).catch(() => undefined);
    } catch {
      // ignore
    }
    this.emit('cache-check', {
      toolId,
      modelId: config.id,
      detail: { cached, hfPath: config.hfPath },
    });
    if (!cached) {
      this.emit('download', {
        toolId,
        modelId: config.id,
        detail: {
          hfPath: config.hfPath,
          ...(config.memoryFootprintMB ? { approxSizeMB: config.memoryFootprintMB } : {}),
        },
      });
    }
    this.emit('dtype-chosen', {
      toolId,
      modelId: config.id,
      detail: {
        chosen: String(config.quantization),
        ...(availableDtypes && availableDtypes.length > 0
          ? { available: availableDtypes.join(', ') }
          : {}),
      },
    });
    this.emit('device-chosen', {
      toolId,
      modelId: config.id,
      detail: { preferred: String(config.recommendedDevice) },
    });

    // image-text-to-text models (e.g. Florence-2) moved out of AutoModelForVision2Seq in v4
    // and must be loaded directly via AutoModelForImageTextToText.
    if (config.task === 'image-text-to-text') {
      return this.loadImageTextToTextModel(requestId, config, onProgress, toolId);
    }

    // CLIP: pipeline('feature-extraction') hangs ORT session creation in v4 for multimodal
    // models. Load text and vision encoders separately via their dedicated classes.
    if (config.loader === 'clip') {
      return this.loadClipModel(requestId, config, onProgress, toolId);
    }

    // Heartbeat: fire a synthetic progress every 30 s while the model loads.
    // ORT session initialisation (after all files are fetched) is CPU-bound and emits no
    // download-progress events. Without this, the client-side inactivity timer fires on slow
    // hardware before the model is ready.
    const heartbeat = onProgress
      ? setInterval(() => {
          onProgress({ id: requestId, modelId: config.id, stage: 'loading', progress: 0.5,
            message: `Loading ${config.name}...` });
        }, 30_000)
      : undefined;

    try {
      const preferredDevice = config.recommendedDevice;
      const preferredDtype = (config.quantization && config.quantization !== 'fp32') ? config.quantization : undefined;

      let pipe: unknown;
      let effectiveDevice: Device = preferredDevice;

      try {
        console.log(`[TransformersManager] Attempting to load ${config.id} on ${preferredDevice}...`);
        pipe = await pipeline(config.task as Parameters<typeof pipeline>[0], config.hfPath, {
          progress_callback: (info: unknown) => {
            if (typeof info !== 'object' || info === null || !('status' in info)) return;
            const status = (info as { status: string }).status;
            if (status === 'progress_total' && 'progress' in info && typeof (info as { progress: number }).progress === 'number') {
              onProgress?.({
                id: requestId,
                modelId: config.id,
                stage: 'downloading',
                progress: (info as { progress: number }).progress / 100,
                message: `Downloading ${config.name}...`,
              });
            } else if (status === 'ready') {
              onProgress?.({
                id: requestId,
                modelId: config.id,
                stage: 'loading',
                progress: 0.99,
                message: `Loading ${config.name} into memory...`,
              });
            }
          },
          ...(preferredDevice !== 'auto' ? { device: preferredDevice } : {}),
          ...(preferredDtype ? { dtype: preferredDtype } : {}),
        });
        console.log(`[TransformersManager] Primary load successful for ${config.id}`);
      } catch (err) {
        if (preferredDevice === 'webgpu') {
          console.warn(`[TransformersManager] WebGPU load failed for ${config.id}, falling back to WASM:`, err);
          effectiveDevice = 'wasm';
          // WASM doesn't support fp16 well, downgrade to q8 if needed
          const fallbackDtype = preferredDtype === 'fp16' ? 'q8' : preferredDtype;
          this.emit('device-fallback', {
            toolId,
            modelId: config.id,
            detail: {
              from: 'webgpu',
              to: 'wasm',
              ...(fallbackDtype ? { fallbackDtype } : {}),
              error: err instanceof Error ? err.message : String(err),
            },
          });

          console.log(`[TransformersManager] Attempting fallback for ${config.id} on WASM with dtype ${fallbackDtype}...`);
          pipe = await pipeline(config.task as Parameters<typeof pipeline>[0], config.hfPath, {
            ...(fallbackDtype ? { dtype: fallbackDtype } : {}),
            device: 'wasm',
          });
          console.log(`[TransformersManager] Fallback load successful for ${config.id}`);
        } else {
          console.error(`[TransformersManager] Primary load failed and no fallback available for ${config.id}:`, err);
          throw err;
        }
      }

      this.effectiveDevices.set(config.id, effectiveDevice);
      debug(`[TransformersManager] Successfully loaded ${config.id} on ${effectiveDevice}`);
      return pipe as CallablePipeline;
    } catch (err) {
      console.error(`[TransformersManager] Failed to load ${config.id}:`, err);
      throw err;
    } finally {
      clearInterval(heartbeat);
    }
  }

  /**
   * Loader for image-text-to-text models (Florence-2 family).
   * In v4, florence2 is registered under AutoModelForImageTextToText, not AutoModelForVision2Seq,
   * so pipeline('image-to-text') fails. We load model + processor directly and wrap them.
   */
  private async loadImageTextToTextModel(
    requestId: string,
    config: ModelConfig,
    onProgress?: (p: InferenceProgress) => void,
    toolId?: string,
  ): Promise<CallablePipeline> {
    const progressCb = (info: unknown) => {
      if (typeof info !== 'object' || info === null || !('status' in info)) return;
      const status = (info as { status: string }).status;
      if (status === 'progress_total' && 'progress' in info && typeof (info as { progress: number }).progress === 'number') {
        onProgress?.({ id: requestId, modelId: config.id, stage: 'downloading',
          progress: (info as { progress: number }).progress / 100, message: `Downloading ${config.name}...` });
      } else if (status === 'ready') {
        onProgress?.({ id: requestId, modelId: config.id, stage: 'loading',
          progress: 0.99, message: `Loading ${config.name} into memory...` });
      }
    };

    const heartbeat = onProgress
      ? setInterval(() => {
          onProgress({ id: requestId, modelId: config.id, stage: 'loading', progress: 0.5,
            message: `Loading ${config.name}...` });
        }, 30_000)
      : undefined;

    try {
      const preferredDevice = config.recommendedDevice;
      const preferredDtype = (config.quantization && config.quantization !== 'fp32') ? config.quantization : undefined;

      let model: unknown;
      let effectiveDevice: Device = preferredDevice;

      try {
        console.log(`[TransformersManager] Attempting to load ${config.id} (Florence-2) on ${preferredDevice}...`);
        model = await AutoModelForImageTextToText.from_pretrained(config.hfPath, {
          progress_callback: progressCb,
          ...(preferredDevice !== 'auto' ? { device: preferredDevice } : {}),
          ...(preferredDtype ? { dtype: preferredDtype } : {}),
        });
        console.log(`[TransformersManager] Primary load successful for ${config.id} (Florence-2)`);
      } catch (err) {
        if (preferredDevice === 'webgpu') {
          console.warn(`[TransformersManager] WebGPU load failed for ${config.id} (Florence-2), falling back to WASM:`, err);
          effectiveDevice = 'wasm';
          const fallbackDtype = preferredDtype === 'fp16' ? 'q8' : preferredDtype;
          this.emit('device-fallback', {
            toolId,
            modelId: config.id,
            detail: {
              from: 'webgpu',
              to: 'wasm',
              ...(fallbackDtype ? { fallbackDtype } : {}),
              error: err instanceof Error ? err.message : String(err),
            },
          });
          console.log(`[TransformersManager] Attempting fallback for ${config.id} (Florence-2) on WASM with dtype ${fallbackDtype}...`);
          model = await AutoModelForImageTextToText.from_pretrained(config.hfPath, {
            ...(fallbackDtype ? { dtype: fallbackDtype } : {}),
            device: 'wasm',
          });
          console.log(`[TransformersManager] Fallback load successful for ${config.id} (Florence-2)`);
        } else {
          console.error(`[TransformersManager] Primary load failed and no fallback available for ${config.id} (Florence-2):`, err);
          throw err;
        }
      }

      const processor = await AutoProcessor.from_pretrained(config.hfPath);
      this.effectiveDevices.set(config.id, effectiveDevice);

      // Callable wrapper with the same interface as an image-to-text pipeline:
      //   (imageSource, { prompt?, max_new_tokens?, ... }) => [{ generated_text: string }]
      // Florence2Processor._call signature: (images, text?, kwargs?) — images first, text second.
      const callable = async (
        imageSource: unknown,
        options: Record<string, unknown> = {},
      ): Promise<{ generated_text: string }[]> => {
        const image = await RawImage.read(imageSource as string | Blob);
        const prompt = (options.prompt as string) ?? '<CAPTION>';

        const inputs = await (processor as unknown as (
          img: unknown,
          text: unknown,
        ) => Promise<Record<string, unknown>>)(image, prompt);

        const generatedIds = await (model as unknown as {
          generate: (inputs: Record<string, unknown>) => Promise<unknown>;
        }).generate({ ...inputs, max_new_tokens: (options.max_new_tokens as number) ?? 100 });

        const texts = (processor as unknown as {
          post_process_generation: (
            text: string, task: string, imageSize: [number, number]
          ) => Record<string, string>;
          batch_decode: (ids: unknown, opts?: Record<string, unknown>) => string[];
        }).batch_decode(generatedIds, { skip_special_tokens: false });

        return texts.map((raw: string) => {
          const result = (processor as unknown as {
            post_process_generation: (
              text: string, task: string, imageSize: [number, number]
            ) => Record<string, string>;
          }).post_process_generation(raw, prompt, [image.height, image.width]);
          return { generated_text: result[prompt] ?? raw };
        });
      };

      callable.model = { config: { model_type: 'florence2' } };
      callable.dispose = async () => {
        const m = model as unknown as { dispose?: () => Promise<void> | void };
        if (typeof m.dispose === 'function') await m.dispose();
      };

      debug(`[TransformersManager] Successfully loaded ${config.id} (image-text-to-text) on ${effectiveDevice}`);
      return callable as unknown as CallablePipeline;
    } catch (err) {
      console.error(`[TransformersManager] Failed to load ${config.id}:`, err);
      throw err;
    } finally {
      clearInterval(heartbeat);
    }
  }

  /**
   * Loader for CLIP models.
   * In v4, pipeline('feature-extraction') hangs ORT session creation for multimodal CLIP
   * models. Loading the text and vision encoders directly via their dedicated classes
   * avoids the problematic unified-graph pipeline path.
   *
   * Returns a pseudo-pipeline: { tokenizer, processor, text_model, vision_model, dispose() }.
   * Handlers detect this by checking pipe.text_model !== undefined.
   */
  private async loadClipModel(
    requestId: string,
    config: ModelConfig,
    onProgress?: (p: InferenceProgress) => void,
    toolId?: string,
  ): Promise<CallablePipeline> {
    const progressCb = (info: unknown) => {
      if (typeof info !== 'object' || info === null || !('status' in info)) return;
      const status = (info as { status: string }).status;
      if (status === 'progress_total' && 'progress' in info && typeof (info as { progress: number }).progress === 'number') {
        onProgress?.({ id: requestId, modelId: config.id, stage: 'downloading',
          progress: (info as { progress: number }).progress / 100, message: `Downloading ${config.name}...` });
      } else if (status === 'ready') {
        onProgress?.({ id: requestId, modelId: config.id, stage: 'loading',
          progress: 0.99, message: `Loading ${config.name} into memory...` });
      }
    };

    const heartbeat = onProgress
      ? setInterval(() => {
          onProgress({ id: requestId, modelId: config.id, stage: 'loading', progress: 0.5,
            message: `Loading ${config.name}...` });
        }, 30_000)
      : undefined;

    try {
      const preferredDevice = config.recommendedDevice;
      const preferredDtype = (config.quantization && config.quantization !== 'fp32') ? config.quantization : undefined;

      let textModel: unknown;
      let visionModel: unknown;
      let effectiveDevice: Device = preferredDevice;

      const loadOpts = (device: Device) => ({
        progress_callback: progressCb,
        ...(device !== 'auto' ? { device } : {}),
        ...(preferredDtype ? { dtype: preferredDtype } : {}),
      });

      try {
        console.log(`[TransformersManager] Loading ${config.id} (CLIP) on ${preferredDevice}...`);
        [textModel, visionModel] = await Promise.all([
          CLIPTextModelWithProjection.from_pretrained(config.hfPath, loadOpts(preferredDevice)),
          CLIPVisionModelWithProjection.from_pretrained(config.hfPath, loadOpts(preferredDevice)),
        ]);
        console.log(`[TransformersManager] Primary load successful for ${config.id} (CLIP)`);
      } catch (err) {
        if (preferredDevice === 'webgpu') {
          console.warn(`[TransformersManager] WebGPU failed for ${config.id} (CLIP), falling back to WASM:`, err);
          effectiveDevice = 'wasm';
          const fallbackDtype = preferredDtype === 'fp16' ? 'q8' : preferredDtype;
          this.emit('device-fallback', {
            toolId,
            modelId: config.id,
            detail: {
              from: 'webgpu',
              to: 'wasm',
              ...(fallbackDtype ? { fallbackDtype } : {}),
              error: err instanceof Error ? err.message : String(err),
            },
          });
          const fallbackOpts = {
            progress_callback: progressCb,
            device: 'wasm' as const,
            ...(fallbackDtype ? { dtype: fallbackDtype } : {}),
          };
          [textModel, visionModel] = await Promise.all([
            CLIPTextModelWithProjection.from_pretrained(config.hfPath, fallbackOpts),
            CLIPVisionModelWithProjection.from_pretrained(config.hfPath, fallbackOpts),
          ]);
          console.log(`[TransformersManager] Fallback load successful for ${config.id} (CLIP)`);
        } else {
          throw err;
        }
      }

      const [tokenizer, processor] = await Promise.all([
        AutoTokenizer.from_pretrained(config.hfPath),
        AutoProcessor.from_pretrained(config.hfPath),
      ]);

      this.effectiveDevices.set(config.id, effectiveDevice);

      const callable = async (_input: unknown, _options?: unknown): Promise<unknown> => {
        throw new Error(`CLIP pseudo-pipeline: use featureExtraction or multimodalAlignment handler (model: ${config.id})`);
      };

      callable.tokenizer = tokenizer as unknown as import('./types').TokenizerLike;
      callable.processor = processor as unknown as import('./types').ProcessorLike;
      callable.text_model = textModel;
      callable.vision_model = visionModel;
      callable.model = { config: { model_type: 'clip' } };
      callable.dispose = async () => {
        const t = textModel as unknown as { dispose?: () => Promise<void> | void };
        const v = visionModel as unknown as { dispose?: () => Promise<void> | void };
        if (typeof t.dispose === 'function') await t.dispose();
        if (typeof v.dispose === 'function') await v.dispose();
      };

      debug(`[TransformersManager] Successfully loaded ${config.id} (CLIP) on ${effectiveDevice}`);
      return callable as unknown as CallablePipeline;
    } catch (err) {
      console.error(`[TransformersManager] Failed to load ${config.id} (CLIP):`, err);
      throw err;
    } finally {
      clearInterval(heartbeat);
    }
  }

  /**
   * Evicts models if memory pressure is high or limit reached.
   */
  private evictIfNecessary(newModel: ModelConfig, toolId?: string): void {
    // Strategy 1: If it's a "large" model, clear EVERYTHING else to be safe
    if (newModel.isLargeModel) {
      console.warn(`[TransformersManager] Large model ${newModel.id} requested. Evicting all other models.`);
      const victims = Array.from(this.pipelines.keys()).filter(id => !this.loadingPromises.has(id));
      for (const id of victims) {
        const ageMs = Date.now() - (this.lastUsedAt.get(id) ?? Date.now());
        this.emit('evicted', {
          toolId,
          modelId: id,
          detail: { reason: 'large-model', incoming: newModel.id, ageMs, maxLoaded: MAX_LOADED_MODELS },
        });
      }
      this.disposeAllExcept([]);
      return;
    }

    // Strategy 2: If we're over the instance limit, evict the least recently used.
    // IMPORTANT: Skip models currently in loadingPromises to avoid disposing something mid-load.
    if (this.pipelines.size >= MAX_LOADED_MODELS) {
      const evictableModels = Array.from(this.pipelines.keys())
        .filter(id => !this.loadingPromises.has(id));

      if (evictableModels.length > 0) {
        const sorted = evictableModels
          .map(id => [id, this.lastUsedAt.get(id) || 0] as [string, number])
          .sort(([, a], [, b]) => a - b);

        const [lruId] = sorted[0];
        const ageMs = Date.now() - (this.lastUsedAt.get(lruId) ?? Date.now());
        debug(`[TransformersManager] Limit reached. Evicting LRU model: ${lruId}`);
        this.emit('evicted', {
          toolId,
          modelId: lruId,
          detail: { reason: 'lru', incoming: newModel.id, ageMs, maxLoaded: MAX_LOADED_MODELS },
        });
        this.disposeModel(lruId);
      }
    }
  }

  /**
   * Fully dispose of a model and free its memory.
   */
  public disposeModel(id: string): void {
    const pipe = this.pipelines.get(id);
    if (pipe && typeof pipe.dispose === 'function') {
      pipe.dispose();
    }
    this.pipelines.delete(id);
    this.lastUsedAt.delete(id);
    this.effectiveDevices.delete(id);
    debug(`[TransformersManager] Disposed ${id}`);
  }

  /**
   * Clear all loaded models except specified ones.
   */
  public disposeAllExcept(keepIds: string[]): void {
    for (const id of this.pipelines.keys()) {
      // IMPORTANT: Skip models currently in loadingPromises.
      if (!keepIds.includes(id) && !this.loadingPromises.has(id)) {
        this.disposeModel(id);
      }
    }
  }

  /**
   * Helper to convert blob/url to RawImage (needed for many handlers).
   */
  public async loadRawImage(src: string | Blob): Promise<RawImage> {
    return await RawImage.read(src);
  }

  /**
   * Returns current worker state, loaded models, and per-registry cache status.
   */
  public async getStatus(): Promise<WorkerStatus> {
    const loadedModels = Array.from(this.pipelines.keys()).map(id => {
      const config = getModelConfig(id);
      return {
        id,
        name: config.name,
        device: config.recommendedDevice,
        effectiveDevice: this.effectiveDevices.get(id),
        memoryFootprintMB: config.memoryFootprintMB,
        lastUsedAt: this.lastUsedAt.get(id) || 0,
      };
    });

    const loadedIds = new Set(this.pipelines.keys());
    const loadingModels = Array.from(this.loadingPromises.keys())
      .filter(id => !loadedIds.has(id))
      .map(id => {
        const config = getModelConfig(id);
        return {
          id,
          name: config.name,
          device: config.recommendedDevice,
          effectiveDevice: this.effectiveDevices.get(id),
          memoryFootprintMB: config.memoryFootprintMB,
        };
      });

    const registryStatus = await Promise.all(
      MODEL_REGISTRY.filter(m => m.enabled).map(async m => ({
        id: m.id,
        name: m.name,
        task: m.task,
        hfPath: m.hfPath,
        cached: await ModelRegistry.is_pipeline_cached(m.task, m.hfPath).catch(() => false),
      }))
    );

    return {
      device: 'auto',
      webgpuAvailable: typeof navigator !== 'undefined' && 'gpu' in navigator,
      storage: {
        opfsAvailable: typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory,
      },
      loadedModels,
      loadingModels,
      registryStatus,
    };
  }

  /**
   * Evict a model from memory and clear its cached files.
   */
  public async clearModelCache(id: string): Promise<{ filesDeleted: number }> {
    const config = getModelConfig(id);
    this.disposeModel(id);
    const result = await ModelRegistry.clear_pipeline_cache(config.task, config.hfPath);
    this.emit('cache-cleared', {
      modelId: id,
      detail: { filesDeleted: result.filesDeleted, hfPath: config.hfPath },
    });
    return { filesDeleted: result.filesDeleted };
  }
}

export const transformersManager = TransformersManager.getInstance();

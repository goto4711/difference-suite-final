import { pipeline, env, RawImage, AutoProcessor, AutoTokenizer } from '@huggingface/transformers';
import type {
  InferenceRequest,
  InferenceResult,
  InferenceProgress,
  ModelConfig,
  WorkerStatus,
} from './types';
import { getHandler } from './taskHandlers';
import { getModelConfig } from './modelRegistry';
import './handlers'; // Triggers self-registration of all handlers

// ── Configuration ──────────────────────────────────────────────
env.allowLocalModels = false;

const MAX_LOADED_MODELS = 3;

/**
 * Singleton manager for ML model lifecycle and inference.
 * Implements LRU (Least Recently Used) eviction to prevent OOM.
 */
export class TransformersManager {
  private static instance: TransformersManager;

  /** Map of logicalId -> loaded pipeline instance */
  private pipelines = new Map<string, any>();
  /** Map of logicalId -> last used timestamp */
  private lastUsedAt = new Map<string, number>();
  /** Map of logicalId -> loading promise (prevents double-loading) */
  private loadingPromises = new Map<string, Promise<any>>();

  private constructor() {}

  public static getInstance(): TransformersManager {
    if (!TransformersManager.instance) {
      TransformersManager.instance = new TransformersManager();
    }
    return TransformersManager.instance;
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
    
    // 1. Ensure model is loaded (with LRU eviction)
    const pipe = await this.getOrLoadPipeline(config, onProgress);
    
    // 2. Update LRU timestamp
    this.lastUsedAt.set(config.id, Date.now());

    // 3. Ensure processor/tokenizer are available for CLIP-like multimodal models
    // Some pipelines (like feature-extraction) might not load both by default
    if (config.hfPath.includes('clip') && pipe && !pipe.processor) {
        try {
            console.log(`[TransformersManager] Manually loading processor for ${config.id}...`);
            pipe.processor = await AutoProcessor.from_pretrained(config.hfPath);
            if (!pipe.tokenizer) {
                pipe.tokenizer = await AutoTokenizer.from_pretrained(config.hfPath);
            }
        } catch (e) {
            console.warn(`[TransformersManager] Failed to manually load processor/tokenizer:`, e);
        }
    }

    // 4. Dispatch to handler
    const handler = getHandler(request.task);
    return handler.run(request, pipe, onProgress);
  }

  /**
   * Get an existing pipeline or load a new one.
   * Handles concurrency and LRU eviction.
   */
  private async getOrLoadPipeline(
    config: ModelConfig,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<any> {
    // Already loaded?
    if (this.pipelines.has(config.id)) {
      return this.pipelines.get(config.id);
    }

    // Currently loading?
    const existingPromise = this.loadingPromises.get(config.id);
    if (existingPromise) {
      return existingPromise;
    }

    // New load required. Check if we need to evict others.
    this.evictIfNecessary(config);

    const loadPromise = this.loadPipeline(config, onProgress);
    this.loadingPromises.set(config.id, loadPromise);

    try {
      const pipe = await loadPromise;
      this.pipelines.set(config.id, pipe);
      this.lastUsedAt.set(config.id, Date.now());
      return pipe;
    } finally {
      this.loadingPromises.delete(config.id);
    }
  }

  /**
   * Internal loader wrapping the library call.
   */
  private async loadPipeline(
    config: ModelConfig,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<any> {
    console.log(`[TransformersManager] Loading ${config.id} (${config.hfPath})...`);
    
    onProgress?.({
      id: 'loading',
      stage: 'initializing',
      progress: 0,
      message: `Preparing ${config.name}...`,
    });

    try {
      const pipe = await pipeline(config.task as any, config.hfPath, {
        progress_callback: (info: any) => {
          if (info.status === 'progress') {
            onProgress?.({
              id: config.id,
              stage: 'downloading',
              progress: info.progress / 100,
              message: `Downloading ${config.name}...`,
            });
          } else if (info.status === 'done') {
            onProgress?.({
              id: config.id,
              stage: 'loading',
              progress: 0.9,
              message: `Loading ${config.name} into memory...`,
            });
          }
        },
        // Native quantization parameters for Transformers.js v3
        ...(config.recommendedDevice === 'webgpu' ? { device: 'webgpu' } : {}),
        ...(config.quantization ? { dtype: config.quantization } : {}),
      });

      console.log(`[TransformersManager] Successfully loaded ${config.id}`);
      return pipe;
    } catch (err) {
      console.error(`[TransformersManager] Failed to load ${config.id}:`, err);
      throw err;
    }
  }

  /**
   * Evicts models if memory pressure is high or limit reached.
   */
  private evictIfNecessary(newModel: ModelConfig): void {
    // Strategy 1: If it's a "large" model, clear EVERYTHING else to be safe
    if (newModel.isLargeModel) {
      console.warn(`[TransformersManager] Large model ${newModel.id} requested. Evicting all other models.`);
      this.disposeAllExcept([]);
      return;
    }

    // Strategy 2: If we're over the instance limit, evict the least recently used
    if (this.pipelines.size >= MAX_LOADED_MODELS) {
      const sorted = Array.from(this.lastUsedAt.entries())
        .sort(([, a], [, b]) => a - b);
      
      const [lruId] = sorted[0];
      console.log(`[TransformersManager] Limit reached. Evicting LRU model: ${lruId}`);
      this.disposeModel(lruId);
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
    console.log(`[TransformersManager] Disposed ${id}`);
  }

  /**
   * Clear all loaded models except specified ones.
   */
  public disposeAllExcept(keepIds: string[]): void {
    for (const id of this.pipelines.keys()) {
      if (!keepIds.includes(id)) {
        this.disposeModel(id);
      }
    }
  }

  /**
   * Helper to convert blob/url to RawImage (needed for many handlers).
   */
  public async loadRawImage(src: string | Blob): Promise<RawImage> {
    return await RawImage.read(src as any);
  }

  /**
   * Returns current worker state and loaded models
   */
  public getStatus(): WorkerStatus {
    const loadedModels = Array.from(this.pipelines.keys()).map(id => {
      const config = getModelConfig(id);
      return {
        id,
        name: config.name,
        device: config.recommendedDevice,
        memoryFootprintMB: config.memoryFootprintMB,
        lastUsedAt: this.lastUsedAt.get(id) || 0
      };
    });

    return {
      device: 'auto',
      webgpuAvailable: !!(navigator as any).gpu,
      storage: {
        opfsAvailable: typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory,
      },
      loadedModels,
    };
  }
}

export const transformersManager = TransformersManager.getInstance();

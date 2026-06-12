// ── Device ──────────────────────────────────────────────────────
export type Device = 'auto' | 'webgpu' | 'wasm';

// ── Open string types ──────────────────────────────────────────
// These use the `string & {}` pattern so that known values get
// autocomplete, but any new string is accepted without editing
// this file. To add a new tool or task, just use the new string
// in your code — no core type changes needed.

/** Known tool names (extend by simply using a new string). */
export type ToolName =
  | 'SemanticOracle'
  | 'VisualStoryteller'
  | 'ContextWeaver'
  | 'NetworkedNarratives'
  | 'DetailExtractor'
  | 'DepthMirror'
  | 'AttentionLens'
  | 'AudioTranscriber'
  | (string & {}); // allows any new tool without editing this file

/** Known pipeline tasks (extend by simply using a new string). */
export type PipelineTask =
  | 'text-generation'
  | 'image-to-text'
  | 'image-text-to-text'
  | 'feature-extraction'
  | 'image-classification'
  | 'zero-shot-classification'
  | 'zero-shot-ner'
  | 'depth-estimation'
  | 'automatic-speech-recognition'
  | (string & {}); // allows any new task without editing this file

// ── Core request/response types ────────────────────────────────

export interface InferenceRequest {
  id: string;
  tool: ToolName;
  model: string;
  task: PipelineTask;
  payload: unknown; // per-tool schemas defined separately
}

export interface InferenceProgress {
  id: string;
  modelId?: string;
  stage:
    | 'initializing'
    | 'downloading'
    | 'loading'
    | 'tokenizing'
    | 'running'
    | 'postprocessing';
  progress?: number; // 0–1
  message?: string;
}

export interface InferenceResult {
  id: string;
  output: unknown;
}

// ── Model configuration ────────────────────────────────────────

export interface ModelConfig {
  id: string;
  /** Human-readable display name */
  name: string;
  /** HuggingFace Hub model path (e.g. 'onnx-community/SmolLM2-135M-Instruct') */
  hfPath: string;
  task: PipelineTask;
  quantization: 'q4' | 'q4f16' | 'q8' | 'fp16' | 'fp32';
  format: 'onnx';
  recommendedDevice: Device;
  /** Approximate peak memory in MB when loaded */
  memoryFootprintMB: number;
  enabled: boolean;
  /** If true, this is a large model — triggers LRU eviction of other models before loading */
  isLargeModel?: boolean;
  /**
   * When set, bypasses pipeline() and uses a dedicated loader instead.
   * 'clip': loads CLIPTextModelWithProjection + CLIPVisionModelWithProjection directly.
   */
  loader?: 'clip';
}

// ── Worker status ──────────────────────────────────────────────

export interface WorkerStatus {
  device: Device;
  webgpuAvailable: boolean;
  storage: {
    opfsAvailable: boolean;
    estimatedCacheSizeMB?: number;
  };
  loadedModels: Array<{
    id: string;
    name: string;
    device: Device;
    effectiveDevice?: Device;
    memoryFootprintMB?: number;
    lastUsedAt: number;
  }>;
  loadingModels: Array<{
    id: string;
    name: string;
    device: Device;
    effectiveDevice?: Device;
    memoryFootprintMB?: number;
  }>;
  registryStatus: Array<{
    id: string;
    name: string;
    task: string;
    hfPath: string;
    cached: boolean;
  }>;
}

export interface TokenIdsLike {
  data: ArrayLike<number | bigint>;
}

export interface TokenizerOutput extends Record<string, unknown> {
  input_ids?: TokenIdsLike;
}

export interface TokenizerLike {
  (input: string | string[], options?: Record<string, unknown>): TokenizerOutput | Promise<TokenizerOutput>;
  decode(tokens: number[]): string;
}

export interface ProcessorLike {
  (input: unknown, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface TensorLike<T = unknown> {
  data?: ArrayLike<number>;
  dims?: number[];
  tolist(): T;
}

export interface ModelLike {
  config?: {
    model_type?: string;
  };
  get_image_features?: (input: Record<string, unknown>) => Promise<unknown>;
  get_text_features?: (input: Record<string, unknown>) => Promise<unknown>;
  vision_model?: (input: Record<string, unknown>) => Promise<unknown>;
  text_model?: (input: Record<string, unknown>) => Promise<unknown>;
}

export type CallablePipeline = ((
  input: unknown,
  options?: Record<string, unknown> | string[],
) => Promise<unknown>) & {
  dispose?: () => void | Promise<void>;
  processor?: ProcessorLike;
  tokenizer?: TokenizerLike;
  image_processor?: ProcessorLike;
  model?: ModelLike;
  /** CLIP direct loader: CLIPTextModelWithProjection instance */
  text_model?: unknown;
  /** CLIP direct loader: CLIPVisionModelWithProjection instance */
  vision_model?: unknown;
};

export interface WorkerProgressMessage {
  type: 'progress';
  data: InferenceProgress;
}

export interface WorkerResultMessage {
  type: 'result';
  data: InferenceResult;
}

export interface WorkerErrorMessage {
  type: 'error';
  data: {
    id: string;
    error: string;
  };
}

export interface WorkerStatusMessage {
  type: 'status';
  data: {
    id: string;
    status: WorkerStatus;
  };
}

export type WorkerMessage =
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage
  | WorkerStatusMessage;

export interface WorkerStatusRequestMessage {
  type: 'get-status';
  id: string;
}

export interface WorkerClearCacheRequestMessage {
  type: 'clear-cache';
  id: string;
  modelId: string;
}

export type WorkerRequestMessage = InferenceRequest | WorkerStatusRequestMessage | WorkerClearCacheRequestMessage;

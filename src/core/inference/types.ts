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
    memoryFootprintMB?: number;
    lastUsedAt: number; // timestamp for LRU eviction
  }>;
}

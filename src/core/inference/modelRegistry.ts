import type { ModelConfig } from './types';

// Bump this string whenever the default embedding model path or quantization changes.
// setEmbeddingModelVersion(EMBEDDING_MODEL_VERSION) wipes stored item.embedding values
// so cached embeddings from a previous model are not silently used with a new one.
export const EMBEDDING_MODEL_VERSION = 'Xenova/multilingual-e5-small@q4';

// Default text-embedding model used at first load. After Phase 2 the active
// embedding model lives in the persisted suiteStore (`textEmbeddingModel`).
// Tools read the live id at call time via useSuiteStore.getState(); this
// constant only exists so the initial Zustand state can default to it.
export const DEFAULT_TEXT_EMBEDDING_MODEL = 'multilingual-e5-small';
export const DEFAULT_ASR_MODEL = 'whisper-base';

/**
 * Central model registry.
 *
 * To add a new model:
 *   1. Add an entry to this array.
 *   2. Use the `id` in your tool's InferenceRequest.model field.
 *   3. No other files need to change.
 *
 * All models must be in ONNX format for Transformers.js v4 compatibility.
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'smollm2-135m-instruct',
    name: 'SmolLM2-135M-Instruct',
    hfPath: 'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA',
    task: 'text-generation',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'wasm', // WebGPU crashes Worker at ORT init level (uncatchable); wasm only
    memoryFootprintMB: 400,
    enabled: true,
    isLargeModel: false,
  },
  {
    id: 'florence-2-base-ft',
    name: 'Florence-2-Base-ft',
    hfPath: 'onnx-community/Florence-2-base-ft',
    task: 'image-text-to-text', // v4: florence2 moved to AutoModelForImageTextToText; 'image-to-text' (AutoModelForVision2Seq) no longer includes it
    quantization: 'q8',
    format: 'onnx',
    recommendedDevice: 'wasm', // WebGPU crashes Worker at ORT init level (uncatchable); wasm only
    memoryFootprintMB: 1200,
    enabled: true,
    isLargeModel: true, // triggers LRU eviction of all other models
  },
  {
    id: 'bge-small-en-v1.5',
    name: 'BGE Small EN v1.5',
    hfPath: 'onnx-community/bge-small-en-v1.5-ONNX', // swapped from Xenova; ~2x faster fused ops
    task: 'feature-extraction',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'wasm', // WebGPU crashes Worker at ORT init level (uncatchable); wasm only
    memoryFootprintMB: 300,
    enabled: true,
    isLargeModel: false,
  },
  {
    // Multilingual drop-in for bge-small-en-v1.5. 384-dim output matches bge's width,
    // so KNN classifiers, autoencoders, and 2-D projections downstream keep working.
    // ONNX q4 weights live at Xenova/multilingual-e5-small/onnx/model_q4.onnx (~399 MB).
    // Inputs need a 'query: ' or 'passage: ' prefix — handled in featureExtraction.ts.
    id: 'multilingual-e5-small',
    name: 'Multilingual E5 Small',
    hfPath: 'Xenova/multilingual-e5-small',
    task: 'feature-extraction',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'wasm', // WebGPU crashes Worker at ORT init level (uncatchable); wasm only
    memoryFootprintMB: 420,
    enabled: true,
    isLargeModel: false,
  },
  {
    id: 'clip-vit-base-patch32-q4',
    name: 'CLIP ViT-B/32',
    // Xenova/clip-vit-base-patch32 provides split text_model.onnx / vision_model.onnx files,
    // which is what CLIPTextModelWithProjection / CLIPVisionModelWithProjection expect (they
    // default to model_file_name 'text_model' / 'vision_model' respectively).
    // onnx-community/clip-vit-base-patch32-ONNX only has a unified model_q4.onnx and cannot
    // be used with the split classes. dtype 'q8' → text_model_quantized.onnx (64 MB) +
    // vision_model_quantized.onnx (89 MB).
    hfPath: 'Xenova/clip-vit-base-patch32',
    task: 'feature-extraction',
    quantization: 'q8',
    format: 'onnx',
    recommendedDevice: 'wasm',
    memoryFootprintMB: 160,
    enabled: true,
    isLargeModel: false,
    loader: 'clip',
  },
  {
    id: 'whisper-tiny-en',
    name: 'Whisper Tiny EN',
    hfPath: 'onnx-community/whisper-tiny.en',
    task: 'automatic-speech-recognition',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'wasm', // WebGPU crashes Worker at ORT init level (uncatchable); wasm only
    memoryFootprintMB: 150,
    enabled: true,
    isLargeModel: false,
  },
  {
    // Multilingual ASR. encoder + decoder + decoder_with_past q4 weights total ~263 MB
    // at onnx-community/whisper-base/onnx/. Covers ~100 languages — language can be
    // passed through the inference payload, omit for auto-detect.
    id: 'whisper-base',
    name: 'Whisper Base (Multilingual)',
    hfPath: 'onnx-community/whisper-base',
    task: 'automatic-speech-recognition',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'wasm', // WebGPU crashes Worker at ORT init level (uncatchable); wasm only
    memoryFootprintMB: 280,
    enabled: true,
    isLargeModel: false,
  },
  {
    // Higher-accuracy multilingual ASR. Roughly 2× the download/footprint of
    // whisper-base; selectable opt-in for users who hit accuracy ceilings on
    // archaic vocabulary or unusual accents. Default ASR stays whisper-base.
    id: 'whisper-small',
    name: 'Whisper Small (Multilingual, higher accuracy)',
    hfPath: 'onnx-community/whisper-small',
    task: 'automatic-speech-recognition',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'wasm',
    memoryFootprintMB: 470,
    enabled: true,
    isLargeModel: false,
  },
  {
    id: 'bert-base-uncased',
    name: 'BERT Base Uncased',
    hfPath: 'Xenova/bert-base-uncased',
    task: 'feature-extraction', // loaded as feature-extraction so pipeline() accepts it; handler bypasses _call and reads .model/.tokenizer directly
    quantization: 'q8', // model_quantized.onnx (110 MB) exists on the Hub; fp32 (438 MB) caused WASM memory pressure
    format: 'onnx',
    recommendedDevice: 'wasm',
    memoryFootprintMB: 120,
    enabled: true,
    isLargeModel: false,
  },
  {
    id: 'resnet-50',
    name: 'ResNet-50',
    hfPath: 'onnx-community/resnet-50-ONNX', // swapped from Xenova; fused ops re-export
    task: 'image-classification',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'wasm', // WebGPU crashes Worker at ORT init level (uncatchable); wasm only
    memoryFootprintMB: 100,
    enabled: true,
    isLargeModel: false,
  },
  {
    id: 'depth-anything-small',
    name: 'Depth Anything (Small)',
    hfPath: 'Xenova/depth-anything-small-hf',
    task: 'depth-estimation',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'wasm', // WebGPU crashes Worker at ORT init level (uncatchable); wasm only
    memoryFootprintMB: 200,
    enabled: true,
    isLargeModel: false,
  },
];

/**
 * Look up a model config by its logical ID.
 * @throws Error if the model ID is not found.
 */
export function getModelConfig(id: string): ModelConfig {
  const config = MODEL_REGISTRY.find((m) => m.id === id);
  if (!config) {
    throw new Error(`Model not found in registry: "${id}"`);
  }
  return config;
}

/**
 * Get all enabled models for a given pipeline task.
 */
export function getModelsForTask(task: string): ModelConfig[] {
  return MODEL_REGISTRY.filter((m) => m.enabled && m.task === task);
}

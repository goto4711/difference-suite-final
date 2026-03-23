import type { ModelConfig } from './types';

/**
 * Central model registry.
 *
 * To add a new model:
 *   1. Add an entry to this array.
 *   2. Use the `id` in your tool's InferenceRequest.model field.
 *   3. No other files need to change.
 *
 * All models must be in ONNX format for Transformers.js v3 compatibility.
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'smollm2-135m-instruct',
    name: 'SmolLM2-135M-Instruct',
    hfPath: 'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA',
    task: 'text-generation',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'webgpu',
    memoryFootprintMB: 400,
    enabled: true,
    isLargeModel: false,
  },
  {
    id: 'florence-2-base-ft',
    name: 'Florence-2-Base-ft',
    hfPath: 'onnx-community/Florence-2-base-ft',
    task: 'image-to-text',
    quantization: 'q8',
    format: 'onnx',
    recommendedDevice: 'webgpu',
    memoryFootprintMB: 1200,
    enabled: true,
    isLargeModel: true, // triggers LRU eviction of all other models
  },
  {
    id: 'bge-small-en-v1.5',
    name: 'BGE Small EN v1.5',
    hfPath: 'Xenova/bge-small-en-v1.5',
    task: 'feature-extraction',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'webgpu',
    memoryFootprintMB: 300,
    enabled: true,
    isLargeModel: false,
  },
  {
    id: 'clip-vit-base-patch32-q4',
    name: 'CLIP ViT-B/32 (Compressed)',
    hfPath: 'Xenova/clip-vit-base-patch32',
    task: 'feature-extraction',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'webgpu',
    memoryFootprintMB: 400,
    enabled: true,
    isLargeModel: true,
  },
  {
    id: 'whisper-tiny-en',
    name: 'Whisper Tiny EN',
    hfPath: 'onnx-community/whisper-tiny.en',
    task: 'automatic-speech-recognition',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'wasm',
    memoryFootprintMB: 150,
    enabled: true,
    isLargeModel: false,
  },
  {
    id: 'bert-base-uncased',
    name: 'BERT Base Uncased',
    hfPath: 'Xenova/bert-base-uncased',
    task: 'attention-analysis',
    quantization: 'fp32',
    format: 'onnx',
    recommendedDevice: 'webgpu',
    memoryFootprintMB: 400,
    enabled: true,
    isLargeModel: false,
  },
  {
    id: 'resnet-50',
    name: 'ResNet-50',
    hfPath: 'Xenova/resnet-50',
    task: 'image-classification',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'webgpu',
    memoryFootprintMB: 100,
    enabled: true,
    isLargeModel: false,
  },


  {
    id: 'depth-anything-small',
    name: 'Depth Anything (Small)',
    hfPath: 'Xenova/depth-anything-small-hf',
    task: 'depth-estimation',
    quantization: 'q4', // or q8 depending on availability, q4 is safe
    format: 'onnx',
    recommendedDevice: 'webgpu',
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

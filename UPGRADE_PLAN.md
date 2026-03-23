# Difference Suite: Upgrade & Optimization Plan (Agent Version)

**Goal:** Modernize the Difference Suite to use WebGPU‑accelerated Transformers.js v3, offload inference to a web worker, refresh models, add advanced AI tools, and improve UX for model management and progress.

**Important:** All models used with Transformers.js v3 must be in **ONNX format**. Verify ONNX availability on Hugging Face Hub before adding any model. If a model lacks ONNX artifacts, export it using `optimum-cli export onnx` or find a community ONNX conversion.

---

## Phase 1 – Maintenance & Cleanup

### 1.1 Codebase Snapshot & Dual-Stack Prep

**Tasks**

1. Create a branch for the modernization work (e.g. `feat/transformers-v3-webgpu`).
2. Ensure current TF.js and Transformers.js logic are encapsulated so both can temporarily co‑exist.

**Acceptance**

- App builds and runs on the new branch with no functional changes.
- Run `npm run build` — zero errors.

---

### 1.2 Define a Stable Inference API (Before Any Refactor)

**Goal:** Establish an internal interface so UI and tools don't depend on specific model libraries.

**File to create:** `src/core/inference/types.ts`

**Tasks**

1. Create directory `src/core/inference/` if it doesn't exist.
2. Create `src/core/inference/types.ts` with the following contents:

   ```ts
   export type Device = 'auto' | 'webgpu' | 'wasm';

   // ── Open string types ────────────────────────────────────────
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
     | 'zero-shot-classification'
     | 'zero-shot-ner'
     | 'depth-estimation'
     | 'automatic-speech-recognition'
     | (string & {}); // allows any new task without editing this file

   // ── Core types ────────────────────────────────────────────────

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
   ```

3. Add type aliases for `InferenceRequest['tool']` and `InferenceRequest['task']` as needed by tool components.

**Acceptance**

- File exists at `src/core/inference/types.ts`.
- All types compile without errors: `npx tsc --noEmit`.
- No tool component directly imports from `@xenova/transformers` or `@tensorflow/*` for type definitions.

---

### 1.3 Extensibility Infrastructure (Task-Handler Registry)

**Goal:** Ensure that adding a new model or a new tool in the future requires **only additive changes** — no editing of core switch/case blocks or union types.

**Files to create:**
- `src/core/inference/taskHandlers.ts`

**Tasks**

1. Create a task-handler registry in `src/core/inference/taskHandlers.ts`:

   ```ts
   import type { InferenceRequest, InferenceResult, InferenceProgress, PipelineTask } from './types';

   /**
    * A TaskHandler encapsulates all logic for one pipeline task type.
    * TransformersManager dispatches to the matching handler instead of
    * using a growing switch/case.
    */
   export interface TaskHandler {
     /** The pipeline task this handler covers (e.g. 'text-generation'). */
     task: PipelineTask;

     /**
      * Run inference for the given request.
      * @param request  The inference request (model, payload, etc.)
      * @param pipeline The loaded Transformers.js pipeline instance.
      * @param onProgress Optional progress callback.
      * @returns The inference result.
      */
     run(
       request: InferenceRequest,
       pipeline: any,
       onProgress?: (p: InferenceProgress) => void,
     ): Promise<InferenceResult>;
   }

   /** Global handler registry. Handlers self-register by calling registerHandler(). */
   const handlers = new Map<PipelineTask, TaskHandler>();

   /** Register a handler for a pipeline task. Call once per handler at import time. */
   export function registerHandler(handler: TaskHandler): void {
     if (handlers.has(handler.task)) {
       console.warn(`[TaskHandlers] Overwriting handler for task: ${handler.task}`);
     }
     handlers.set(handler.task, handler);
   }

   /** Get the handler for a task. Throws if none registered. */
   export function getHandler(task: PipelineTask): TaskHandler {
     const handler = handlers.get(task);
     if (!handler) {
       throw new Error(
         `No handler registered for task "${task}". ` +
         `Register one via registerHandler() in src/core/inference/handlers/.`
       );
     }
     return handler;
   }

   /** List all registered task types (useful for debugging / Model Status UI). */
   export function getRegisteredTasks(): PipelineTask[] {
     return Array.from(handlers.keys());
   }
   ```

2. Create a handler directory: `src/core/inference/handlers/`.
   Each handler file self-registers. Example for text generation:

   **File:** `src/core/inference/handlers/textGeneration.ts`

   ```ts
   import { registerHandler } from '../taskHandlers';
   import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

   registerHandler({
     task: 'text-generation',
     async run(request, pipeline, onProgress) {
       const { prompt, options } = request.payload as {
         prompt: string;
         options?: Record<string, unknown>;
       };

       onProgress?.({ id: request.id, stage: 'running', progress: 0.5 });

       const result = await pipeline(prompt, {
         max_new_tokens: 128,
         temperature: 0.7,
         do_sample: true,
         ...options,
       });

       const text = Array.isArray(result)
         ? result[0].generated_text
         : result.generated_text;

       return { id: request.id, output: text };
     },
   });
   ```

3. Create a barrel import at `src/core/inference/handlers/index.ts` that imports all handler files:

   ```ts
   // Import each handler so it self-registers.
   // To add a new handler, create a file and add an import here.
   import './textGeneration';
   import './imageToText';
   import './featureExtraction';
   import './speechRecognition';
   // ... add new handlers here
   ```

4. In `TransformersManager`, import the barrel and use `getHandler()` instead of a switch/case:

   ```ts
   import '../handlers'; // triggers self-registration of all handlers
   import { getHandler } from './taskHandlers';

   async run(request: InferenceRequest, onProgress?: ...) {
     const config = getModelConfig(request.model);
     const pipe = await this.loadOrGetPipeline(config);
     const handler = getHandler(request.task);
     return handler.run(request, pipe, onProgress);
   }
   ```

**Acceptance**

- `TransformersManager.run()` has no switch/case or if/else for task types.
- Adding a new task type requires: (a) creating a handler file, (b) importing it in `handlers/index.ts`. No other files change.
- `getRegisteredTasks()` returns all registered tasks.

---

### 1.4 Extension Checklists

These checklists document the exact steps to extend the suite in the future. They should also be added to a `CONTRIBUTING.md` file in the project root after Phase 2 is complete.

#### How to Add a New Model

1. **Find or export an ONNX model** on Hugging Face Hub.
2. **Add one entry** to `MODEL_REGISTRY` in `src/core/inference/modelRegistry.ts`:
   - Set `id` (logical ID used by tools), `hfPath` (Hub path), `task`, `quantization`, `memoryFootprintMB`.
   - Set `isLargeModel: true` if ≥ 800 MB.
3. **Use the new ID** in any tool's `InferenceRequest.model` field.
4. **No other files need to change** — the registry + handler system handles the rest.

#### How to Add a New Tool

1. **Create a component** in `src/components/tools/YourTool/YourTool.tsx`.
2. **Use `client.run()`** with your chosen `tool` name (any string — the type system accepts it).
3. **Add a route** in `src/App.tsx`.
4. **Add a nav entry** in `src/utils/navigation.ts`.
5. If your tool needs a new pipeline task (e.g. `'image-segmentation'`):
   a. Create a handler file in `src/core/inference/handlers/imageSegmentation.ts`.
   b. Import it in `src/core/inference/handlers/index.ts`.
   c. Add the model to `MODEL_REGISTRY`.

#### How to Swap the Inference Framework

1. Only `TransformersManager.ts` and the handler files in `src/core/inference/handlers/` call the framework directly.
2. Replace framework imports and pipeline calls in those files.
3. No tool components need to change — they only interact via `TransformersClient`.

---

## Phase 2 – Core Infrastructure Upgrade

### 2.1 Implement `TransformersManager` with Model LRU Eviction

**File to create:** `src/core/inference/TransformersManager.ts`

This replaces the current `src/utils/TransformersManager.ts`. The old file should be kept temporarily until all tools are migrated (§2.4).

**Tasks**

1. Implement a class exposing this public API:

   ```ts
   import type { Device, InferenceRequest, InferenceProgress, InferenceResult, ModelConfig } from './types';

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
       lastUsedAt: number; // timestamp for LRU
     }>;
   }

   export class TransformersManager {
     private static readonly MAX_LOADED_MODELS = 3;
     private static readonly MAX_MEMORY_MB = 2048; // evict if total exceeds this

     constructor(options?: { device?: Device }) {}

     init(device: Device): Promise<void>;

     run(
       request: InferenceRequest,
       onProgress?: (p: InferenceProgress) => void
     ): Promise<InferenceResult>;

     /** Unload the least-recently-used model to free memory */
     private evictLRU(): Promise<void>;

     /** Unload a specific model by registry ID */
     unloadModel(modelId: string): Promise<void>;

     getStatus(): Promise<WorkerStatus>;
     clearCache(): Promise<void>;
   }
   ```

2. **LRU eviction logic:** Before loading any model, check:
   - If `loadedModels.length >= MAX_LOADED_MODELS`, evict the model with the oldest `lastUsedAt`.
   - If a model has `isLargeModel: true` in the registry, evict *all* other loaded models first (to avoid OOM on 8 GB machines).
   - Update `lastUsedAt` on every `run()` call.

3. Internally, still run on the main thread for now but:
   - Use the shared `InferenceRequest`, `InferenceProgress`, and `InferenceResult` types from `./types`.
   - Use a pluggable backend (so §2.3 can swap in Transformers.js v3).

**Acceptance**

- All existing tools invoke `TransformersManager.run()` instead of directly calling any model APIs.
- Loading a 4th model evicts the least-recently-used model (verify via `getStatus().loadedModels`).
- Loading a model with `isLargeModel: true` first evicts all other models.

---

### 2.2 Vite Configuration for Web Workers

**File to modify:** `vite.config.ts`

**Tasks**

1. Update `vite.config.ts` to support web workers with ES module format:

   ```ts
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     worker: {
       format: 'es',
     },
     optimizeDeps: {
       exclude: ['@huggingface/transformers'],
     },
   });
   ```

2. Verify the worker can be imported with Vite's `?worker` suffix or via `new Worker(new URL('./path.ts', import.meta.url), { type: 'module' })`.

**Acceptance**

- `npm run dev` starts without errors.
- `npm run build` completes without errors.
- A minimal test worker (e.g. one that posts `{ type: 'READY' }`) can be spawned and responds.

---

### 2.3 Web Worker Offloading

**Files to create:**
- `src/workers/transformers.worker.ts`
- `src/core/inference/TransformersClient.ts`

**Tasks**

1. Create `src/workers/transformers.worker.ts` with these message types:

   ```ts
   import type { Device, InferenceRequest, InferenceProgress, InferenceResult } from '../core/inference/types';
   import type { WorkerStatus } from '../core/inference/TransformersManager';

   export type WorkerRequest =
     | { type: 'INIT'; device: Device }
     | { type: 'RUN_INFERENCE'; request: InferenceRequest }
     | { type: 'CLEAR_CACHE' }
     | { type: 'GET_STATUS' }
     | { type: 'UNLOAD_MODEL'; modelId: string };

   export type WorkerResponse =
     | { type: 'READY' }
     | { type: 'PROGRESS'; data: InferenceProgress }
     | { type: 'RESULT'; data: InferenceResult }
     | { type: 'STATUS'; data: WorkerStatus }
     | { type: 'ERROR'; error: string; requestId?: string };
   ```

2. In the worker:
   - Instantiate an internal `TransformersManager`.
   - On `INIT`, call `manager.init(device)` and post `READY`.
   - On `RUN_INFERENCE`, call `manager.run()` and:
     - Stream `PROGRESS` events while running.
     - Post `RESULT` when done.
     - Catch errors and post `ERROR` with the `requestId`.
   - On `CLEAR_CACHE`, wipe OPFS/IndexedDB model cache and respond.
   - On `GET_STATUS`, respond with `STATUS`.
   - On `UNLOAD_MODEL`, call `manager.unloadModel(modelId)`.

3. Create `src/core/inference/TransformersClient.ts` on the main thread:

   ```ts
   export class TransformersClient {
     private worker: Worker;
     private pendingRequests: Map<string, {
       resolve: (result: InferenceResult) => void;
       reject: (error: Error) => void;
       onProgress?: (p: InferenceProgress) => void;
     }>;
     private restartAttempts: number = 0;
     private static readonly MAX_RESTART_ATTEMPTS = 3;
     private static readonly REQUEST_TIMEOUT_MS = 120_000; // 2 minutes

     constructor() {
       this.pendingRequests = new Map();
       this.spawnWorker();
     }

     private spawnWorker(): void {
       this.worker = new Worker(
         new URL('../workers/transformers.worker.ts', import.meta.url),
         { type: 'module' }
       );
       this.worker.onmessage = this.handleMessage.bind(this);
       this.worker.onerror = this.handleWorkerCrash.bind(this);
     }

     /**
      * If the worker crashes (e.g. OOM), reject all pending requests
      * and attempt to restart the worker up to MAX_RESTART_ATTEMPTS.
      */
     private handleWorkerCrash(event: ErrorEvent): void {
       console.error('[TransformersClient] Worker crashed:', event.message);

       // Reject all pending requests
       for (const [id, pending] of this.pendingRequests) {
         pending.reject(new Error(`Worker crashed: ${event.message}`));
       }
       this.pendingRequests.clear();

       // Attempt restart
       if (this.restartAttempts < TransformersClient.MAX_RESTART_ATTEMPTS) {
         this.restartAttempts++;
         console.warn(`[TransformersClient] Restarting worker (attempt ${this.restartAttempts})...`);
         this.spawnWorker();
         this.worker.postMessage({ type: 'INIT', device: 'auto' });
       } else {
         console.error('[TransformersClient] Max restart attempts reached. Worker is down.');
       }
     }

     /**
      * Run inference with a timeout guard.
      * If the request takes longer than REQUEST_TIMEOUT_MS, reject with a timeout error.
      */
     async run(
       request: InferenceRequest,
       onProgress?: (p: InferenceProgress) => void
     ): Promise<InferenceResult> {
       return new Promise((resolve, reject) => {
         this.pendingRequests.set(request.id, { resolve, reject, onProgress });

         // Timeout guard
         const timer = setTimeout(() => {
           if (this.pendingRequests.has(request.id)) {
             this.pendingRequests.delete(request.id);
             reject(new Error(`Inference request ${request.id} timed out after ${TransformersClient.REQUEST_TIMEOUT_MS}ms`));
           }
         }, TransformersClient.REQUEST_TIMEOUT_MS);

         // Store timer reference for cleanup
         const entry = this.pendingRequests.get(request.id)!;
         const originalResolve = entry.resolve;
         entry.resolve = (result) => { clearTimeout(timer); originalResolve(result); };
         const originalReject = entry.reject;
         entry.reject = (error) => { clearTimeout(timer); originalReject(error); };

         this.worker.postMessage({ type: 'RUN_INFERENCE', request });
       });
     }

     private handleMessage(event: MessageEvent): void { /* dispatch by event.data.type */ }
     async init(device: Device): Promise<void> { /* post INIT, wait for READY */ }
     async getStatus(): Promise<WorkerStatus> { /* post GET_STATUS, wait for STATUS */ }
     async clearCache(): Promise<void> { /* post CLEAR_CACHE, wait for response */ }

     /** Reset restart counter after a successful operation */
     private resetRestartCounter(): void { this.restartAttempts = 0; }
   }
   ```

**Acceptance**

- All inference is executed in the worker.
- The UI never locks during model loading or inference.
- If the worker crashes, pending requests are rejected with an error and the worker restarts (up to 3 times).
- Requests that exceed 2 minutes are rejected with a timeout error.

---

### 2.4 Migrate Existing Tools to New API

**Files to modify:**
- `src/components/tools/SemanticOracle/SemanticOracle.tsx` — replace `transformersManager.generateText(...)` with `client.run({ tool: 'SemanticOracle', ... })`
- `src/components/tools/VisualStoryteller/VisualStoryteller.tsx` — replace `transformersManager.captionImage(...)` with `client.run({ tool: 'VisualStoryteller', ... })`
- `src/components/tools/ContextWeaver/ContextWeaver.tsx` — replace `transformersManager.getEmbeddings(...)` / `getEmbeddingsBatch(...)` calls
- `src/components/tools/NetworkedNarratives/NetworkedNarratives.tsx` — replace `transformersManager.getMultimodalAlignmentBatch(...)` calls
- `src/components/tools/DetailExtractor/DetailExtractor.tsx` — replace any direct `transformersManager` usage
- Any other tool in `src/components/tools/` that imports from `src/utils/TransformersManager`

**Tasks**

1. For each tool listed above:
   a. Replace `import { transformersManager } from '../../../utils/TransformersManager'` with an import of the `TransformersClient` singleton.
   b. Replace direct method calls (e.g. `transformersManager.generateText(prompt, model, options, onProgress)`) with `client.run({ id: crypto.randomUUID(), tool: 'ToolName', model: 'model-id', task: 'task-type', payload: { ... } }, onProgress)`.
   c. Handle the `InferenceResult.output` field — cast/extract the output shape expected by each tool.

2. After all tools are migrated, delete `src/utils/TransformersManager.ts`.

**Acceptance**

- `grep -r "from.*utils/TransformersManager" src/` returns zero results.
- All tools function as before (manual test: load data, run each tool).

---

### 2.5 Upgrade to Transformers.js v3 with WebGPU & Fallback

**Tasks**

1. Install Transformers.js v3:
   ```bash
   npm uninstall @xenova/transformers
   npm install @huggingface/transformers
   ```

2. In `TransformersManager` (inside the worker), update all imports:
   ```ts
   // Before:
   import { pipeline, env, RawImage } from '@xenova/transformers';
   // After:
   import { pipeline, env, RawImage } from '@huggingface/transformers';
   ```

3. Detect capabilities and configure device:
   ```ts
   const webgpuAvailable = typeof (navigator as any).gpu !== 'undefined';
   const opfsAvailable = 'storage' in navigator && 'getDirectory' in (navigator as any).storage;

   const device: Device = webgpuAvailable ? 'webgpu' : 'wasm';
   const pipelineInstance = await pipeline(task, model, { device });
   ```

4. Implement graceful fallback:
   - Wrap `pipeline()` call in try/catch.
   - If WebGPU initialization fails, log a warning, fall back to `device: 'wasm'`, and update `WorkerStatus.device`.

**Acceptance**

- `grep -r "@xenova/transformers" src/` returns zero results.
- `package.json` lists `@huggingface/transformers` instead of `@xenova/transformers`.
- On WebGPU‑capable browsers (Chrome 113+), `WorkerStatus.device === 'webgpu'`.
- On others, inference still works via WASM fallback.

---

### 2.6 Worker Protocol Tests

**File to create:** `src/core/inference/__tests__/TransformersClient.test.ts`

**Tasks**

1. Install Vitest if not already present:
   ```bash
   npm install -D vitest
   ```
   Add to `package.json` scripts:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```

2. Create a mock worker (`src/core/inference/__tests__/mockWorker.ts`) that:
   - Responds to `INIT` with `READY`.
   - Responds to `RUN_INFERENCE` with a `RESULT` containing dummy output.
   - Responds to `GET_STATUS` with a valid `WorkerStatus`.
   - Can be configured to simulate errors and crashes.

3. Write tests for `TransformersClient`:
   - `it('initializes and receives READY')` — post `INIT`, expect `READY` response.
   - `it('runs inference and returns result')` — post `RUN_INFERENCE`, expect `RESULT`.
   - `it('delivers progress callbacks')` — verify `onProgress` is called with `PROGRESS` messages.
   - `it('rejects on timeout')` — configure mock to never respond, verify timeout error.
   - `it('rejects pending requests on worker crash')` — terminate mock worker, verify rejection.
   - `it('restarts worker after crash up to MAX_RESTART_ATTEMPTS')` — crash the worker 3 times, verify restart attempts.

**Acceptance**

- `npm test` passes all tests.
- Tests cover: init, inference, progress, timeout, crash recovery, restart limit.

---

## Phase 3 – Intelligence Refresh (Model Swaps)

### 3.1 Model Registry

**File to create:** `src/core/inference/modelRegistry.ts`

**Tasks**

1. Create the registry file with all models in **ONNX format**:

   ```ts
   import type { ModelConfig } from './types';

   export const MODEL_REGISTRY: ModelConfig[] = [
     {
       id: 'smollm2-135m-instruct',
       name: 'SmolLM2-135M-Instruct',
       hfPath: 'onnx-community/SmolLM2-135M-Instruct',
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
       name: 'CLIP ViT-B/32 (Q4)',
       hfPath: 'Xenova/clip-vit-base-patch32',
       task: 'feature-extraction',
       quantization: 'q4',
       format: 'onnx',
       recommendedDevice: 'webgpu',
       memoryFootprintMB: 250,
       enabled: true,
       isLargeModel: false,
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
       name: 'BERT Base Uncased (Attention)',
       hfPath: 'Xenova/bert-base-uncased',
       task: 'feature-extraction',
       quantization: 'fp32',
       format: 'onnx',
       recommendedDevice: 'wasm',
       memoryFootprintMB: 440,
       enabled: true,
       isLargeModel: false,
     },
   ];

   /** Look up a model config by its logical ID. Throws if not found. */
   export function getModelConfig(id: string): ModelConfig {
     const config = MODEL_REGISTRY.find(m => m.id === id);
     if (!config) throw new Error(`Model not found in registry: ${id}`);
     return config;
   }

   /** Get all enabled models for a given task. */
   export function getModelsForTask(task: ModelConfig['task']): ModelConfig[] {
     return MODEL_REGISTRY.filter(m => m.enabled && m.task === task);
   }
   ```

2. In `TransformersManager`, use `getModelConfig()` to:
   - Resolve logical model IDs to concrete HF Hub paths.
   - Check `isLargeModel` to decide whether to evict all other models.
   - Read `recommendedDevice` and `quantization` to select the right pipeline options.

**Acceptance**

- Tools specify logical IDs (e.g. `'smollm2-135m-instruct'`) and do not hard‑code HF URLs or formats.
- `getModelConfig('whisper-tiny-en')` and `getModelConfig('bert-base-uncased')` return valid configs.

---

### 3.2 Semantic Oracle: LaMini → SmolLM2-135M-Instruct

**File to modify:** `src/components/tools/SemanticOracle/SemanticOracle.tsx`

**Tasks**

1. Update the tool's inference call to use the new model via registry ID:

   ```ts
   const result = await client.run({
     id: crypto.randomUUID(),
     tool: 'SemanticOracle',
     model: 'smollm2-135m-instruct',
     task: 'text-generation',
     payload: {
       prompt: fullPrompt,
       options: { max_new_tokens: 200, temperature: 0.7, do_sample: true },
     },
   }, (p) => setProgress(p.progress ?? 0));
   ```

2. SmolLM2 uses a chat template. Implement a prompt adapter in `TransformersManager.run()` that wraps the raw prompt:
   ```ts
   if (config.id === 'smollm2-135m-instruct') {
     formattedPrompt = `<|im_start|>user\n${payload.prompt}<|im_end|>\n<|im_start|>assistant\n`;
   }
   ```

3. Update the subtitle in the SemanticOracle UI header from `"LaMini-Flan-T5"` to `"SmolLM2-135M"`.

**Acceptance**

- `grep -r "LaMini" src/` returns zero results.
- Semantic Oracle generates coherent responses with SmolLM2.

---

### 3.3 Visual Storyteller: vit-gpt2 → Florence-2-base-ft

**File to modify:** `src/components/tools/VisualStoryteller/VisualStoryteller.tsx`

**Tasks**

1. Update the tool to use Florence-2:

   ```ts
   const result = await client.run({
     id: crypto.randomUUID(),
     tool: 'VisualStoryteller',
     model: 'florence-2-base-ft',
     task: 'image-to-text',
     payload: {
       imageSource: selectedImage,
       mode: captionMode, // 'caption' | 'caption+ocr'
     },
   }, (p) => setProgressStatus(p.message ?? 'Processing...'));
   ```

2. Implement a backend prompt handler in `TransformersManager` for Florence-2:
   - Caption mode: `"Generate a detailed caption describing the scene."`
   - OCR mode: `"Read all visible text and describe its context."`

3. Add a simple toggle to the VisualStoryteller sidebar UI: a two-button group for `"Caption"` vs `"Caption + OCR"` mode. Store the mode in component state as `captionMode`.

**Acceptance**

- `grep -r "vit-gpt2" src/` returns zero results.
- Florence-2 generates accurate, detailed captions.
- OCR mode surfaces visible text from test images.
- Note: Florence-2 has `isLargeModel: true` — verify that loading it evicts all other models.

---

### 3.4 Context Weaver: all-MiniLM → bge-small-en-v1.5

**File to modify:** `src/components/tools/ContextWeaver/ContextWeaver.tsx`

**Tasks**

1. Replace embedding model with `'bge-small-en-v1.5'` in the inference request.
2. Invalidate stored embeddings: if embeddings are saved per-item in `DataItem.embedding`, clear them when the model changes. Add a `embeddingModelVersion` field to the Zustand store in `src/stores/suiteStore.ts`:
   ```ts
   embeddingModelVersion: string; // e.g. 'bge-small-en-v1.5-v1'
   ```
   On model change, iterate `dataset` and set `embedding: undefined` for all items.

**Acceptance**

- Semantic search/clustering uses BGE embeddings.
- `grep -r "all-MiniLM" src/` returns zero results.

---

### 3.5 Networked Narratives: CLIP → Quantized CLIP

**File to modify:** `src/components/tools/NetworkedNarratives/NetworkedNarratives.tsx`

**Tasks**

1. Replace CLIP model with `'clip-vit-base-patch32-q4'` in the inference request.
2. Review any hardcoded similarity thresholds. Log scores for a sample of test images and adjust thresholds if needed.

**Acceptance**

- Memory usage is reduced compared to the unquantized CLIP.
- Tool behavior remains acceptable after threshold tuning.

---

### 3.6 Whisper: Add to Registry & Migrate

**File to modify:** `src/core/inference/TransformersManager.ts` (the new one)

The existing `TransformersManager.transcribeAudio()` method uses `Xenova/whisper-tiny.en`. This must be brought into the new registry-backed system.

**Tasks**

1. The `whisper-tiny-en` entry is already in the `MODEL_REGISTRY` (see §3.1). In `TransformersManager.run()`, add a handler for `task: 'automatic-speech-recognition'`:
   ```ts
   case 'automatic-speech-recognition': {
     const { audioData } = payload as { audioData: Float32Array };
     const result = await asr_pipeline(audioData);
     return { id: request.id, output: result.text.trim() };
   }
   ```

2. Update any tool that calls `transformersManager.transcribeAudio()` to use `client.run({ tool: 'AudioTranscriber', model: 'whisper-tiny-en', task: 'automatic-speech-recognition', payload: { audioData } })`.

3. Remove `@tensorflow-models/speech-commands` from `package.json` and delete any code that uses it.

**Acceptance**

- `grep -r "speech-commands" src/` returns zero results.
- `grep -r "@tensorflow-models" package.json` returns zero results.
- Audio transcription still works via the worker.

---

### 3.7 Attention Lens: Decide & Migrate

**Files to consider:**
- `src/utils/TransformersManager.ts` — the `analyzeText()` method (lines 294–390)
- Tools that use attention analysis (e.g. `AmbiguityAmplifier`, `GlitchDetector`, or any tool calling `analyzeText`)

**Current problem:** `analyzeText()` has a simulated attention fallback (lines 352–374 of the old `TransformersManager.ts`) that generates fake attention patterns because `@xenova/transformers` v2 often doesn't return real attention weights.

**Tasks**

1. Determine which tools call `analyzeText()`:
   ```bash
   grep -r "analyzeText\|analyseText\|attention" src/components/tools/ --include="*.tsx" --include="*.ts" -l
   ```

2. **Option A — Keep with Real Attention:** In Transformers.js v3, ONNX models can export attention if the ONNX export includes them. Test whether `Xenova/bert-base-uncased` returns real attention via:
   ```ts
   const model = await AutoModel.from_pretrained('Xenova/bert-base-uncased', {
     output_attentions: true,
   });
   ```
   If real attention is available, refactor `analyzeText()` into the new `TransformersManager.run()` with tool `'AttentionLens'`.

3. **Option B — Drop Simulated Fallback:** If real attention is not reliably available, remove the simulated fallback and show a clear "Attention data not available for this model" message in the UI instead of fake data.

4. Add the `bert-base-uncased` entry to the registry (already included in §3.1).

5. Remove the old `analyzeText()` method from `src/utils/TransformersManager.ts` once migrated.

**Acceptance**

- No simulated/fake attention data is shown to users.
- If real attention is available, the attention visualization works correctly.
- If not, a clear message is shown instead of fake data.

---

## Phase 4 – Advanced Capabilities (Deferred after Phase 3 is complete)

### 4.0 Dependency Pruning Gate

> **Note:** This was previously §1.3. It is deliberately placed here because it can only be executed after *all* tool migrations in Phase 3 are complete.

**Tasks**

1. Verify no code imports from `@xenova/transformers`:
   ```bash
   grep -r "@xenova/transformers" src/ --include="*.ts" --include="*.tsx"
   ```
2. Verify no code imports from `@tensorflow/*`:
   ```bash
   grep -r "@tensorflow" src/ --include="*.ts" --include="*.tsx"
   ```
3. Remove all TF.js packages from `package.json`:
   ```bash
   npm uninstall @tensorflow/tfjs @tensorflow-models/mobilenet @tensorflow-models/knn-classifier @tensorflow-models/speech-commands @tensorflow-models/universal-sentence-encoder
   ```
4. Remove `@xenova/transformers`:
   ```bash
   npm uninstall @xenova/transformers
   ```
5. Delete `src/utils/TransformersManager.ts` if it still exists.
6. Run `npm run build` to verify no broken imports.

**Acceptance**

- `package.json` contains no `@tensorflow` or `@xenova` entries.
- `npm run build` succeeds.
- All tools still function.

---

### 4.1 Zero-Shot NER with GLiNER2

**Tasks**

1. Add GLiNER2 to the model registry in `src/core/inference/modelRegistry.ts`:

   ```ts
   {
     id: 'gliner2-zero-shot-ner',
     name: 'GLiNER2 Zero-Shot NER',
     hfPath: 'onnx-community/gliner_medium-v2.1',
     task: 'zero-shot-ner',
     quantization: 'q4',
     format: 'onnx',
     recommendedDevice: 'webgpu',
     memoryFootprintMB: 400,
     enabled: true,
     isLargeModel: false,
   }
   ```

2. Define a specific payload type in `src/core/inference/types.ts`:

   ```ts
   export interface GlinerRequestPayload {
     text: string;
     entityTypes: { name: string; description?: string }[];
   }
   ```

3. Update Networked Narratives and Detail Extractor tools:
   - Frontend: allow user to edit `entityTypes` (tag‑style input: type a label, press Enter to add, click × to remove).
   - Backend: send `InferenceRequest` with `task: 'zero-shot-ner'` and the above payload.

**Acceptance**

- Users can specify arbitrary entity types at runtime.
- GLiNER2 returns entities grouped by type without any retraining.

---

### 4.2 Depth Perception – Depth Anything (Small)

**Tasks**

1. Add Depth Anything model to registry in `src/core/inference/modelRegistry.ts`:

   ```ts
   {
     id: 'depth-anything-small',
     name: 'Depth Anything (Small)',
     hfPath: 'onnx-community/depth-anything-v2-small',
     task: 'depth-estimation',
     quantization: 'q4',
     format: 'onnx',
     recommendedDevice: 'webgpu',
     memoryFootprintMB: 500,
     enabled: true,
     isLargeModel: false,
   }
   ```

2. Create new tool component `src/components/tools/DepthMirror/DepthMirror.tsx`:
   - Input: image from dataset.
   - Output: depth map rendered on a `<canvas>`.
   - Visual UI:
     - Split view: original image (left) vs depth map (right).
     - Heatmap palette selector (dropdown: `'inferno'`, `'viridis'`, `'magma'`, `'grayscale'`).
     - Opacity slider for overlay mode (0–100%).

3. Register the route in `src/App.tsx`:
   ```tsx
   import DepthMirror from './components/tools/DepthMirror/DepthMirror';
   // ...
   <Route path="/depth-mirror" element={<DepthMirror />} />
   ```

4. Add the tool entry to the navigation config in `src/utils/navigation.ts`.

**Acceptance**

- Depth maps render interactively from user images.
- Tool UI allows visual exploration of perceived 3D structure.
- Tool appears in the sidebar navigation.

---

### 4.3 4-bit Quantization Usage

**Tasks**

1. Ensure all large models in `MODEL_REGISTRY` have 4‑bit or 8‑bit quantized variants.
2. At initialization, choose defaults based on environment:
   - If `WorkerStatus.device === 'webgpu'` and memory footprint fits, use the quantized WebGPU‑friendly models.
3. Expose quantization info in Model Status UI (Phase 5).

**Acceptance**

- Suite runs on 8 GB RAM machines without frequent OOM or crashes.
- `getStatus().loadedModels` shows memory footprint per model.
- Users can see which models are quantized.

---

## Phase 5 – UI/UX Refinement

### 5.1 Model Management UI ("Model Status" Dashboard)

**Files to create/modify:**
- `src/stores/transformersSlice.ts` (new Zustand slice)
- `src/components/shared/ModelStatusPanel.tsx` (new component)

**Tasks**

1. Create a Zustand store slice in `src/stores/transformersSlice.ts`:

   ```ts
   import { create } from 'zustand';
   import type { WorkerStatus, InferenceProgress } from '../core/inference/types';

   interface TransformersState {
     status: WorkerStatus | null;
     requests: Record<string, {
       state: 'idle' | 'loading' | 'running' | 'error' | 'done';
       progress?: InferenceProgress;
       error?: string;
     }>;
     setStatus: (status: WorkerStatus) => void;
     updateRequest: (id: string, update: Partial<TransformersState['requests'][string]>) => void;
   }

   export const useTransformersStore = create<TransformersState>((set) => ({
     status: null,
     requests: {},
     setStatus: (status) => set({ status }),
     updateRequest: (id, update) => set((state) => ({
       requests: { ...state.requests, [id]: { ...state.requests[id], ...update } },
     })),
   }));
   ```

2. In `TransformersClient`, periodically call `getStatus()` (every 10 seconds) and push to the store via `useTransformersStore.getState().setStatus(status)`.

3. Build `src/components/shared/ModelStatusPanel.tsx`:
   - Show: WebGPU status badge, loaded models list (name, device, memory), approximate cache size.
   - Actions: "Clear model cache" button → calls `client.clearCache()`.
   - Render this panel in the Dashboard or as a collapsible section in the sidebar.

**Acceptance**

- Users can see which models are active and how much resource they use.
- "Clear cache" works and is reflected in the status panel.

---

### 5.2 Real-time Progress UI in `ToolLayout`

**File to modify:** `src/components/shared/ToolLayout.tsx`

**Tasks**

1. In `TransformersClient.run()`, register a per-request progress callback that:
   - Updates `requests[requestId].progress` in the Zustand store.
   - Sets `state` appropriately (`'loading'`, `'running'`, etc.).

2. In `ToolLayout`, subscribe to the active request's state:
   - Map `stage` values to human-readable messages:
     - `initializing` → "Preparing model…"
     - `downloading` → "Downloading weights…"
     - `loading` → "Loading into memory…"
     - `tokenizing` → "Tokenizing input…"
     - `running` → "Running inference…"
     - `postprocessing` → "Formatting output…"
   - Show:
     - A primary progress bar based on `progress` (0–100%).
     - The current stage label.

**Acceptance**

- Tools display granular progress (not just a spinner).
- Progress updates without blocking the UI.

---

## Recommended Execution Order for the Agent

| Step | Phase | What to do | Depends on |
|------|-------|------------|------------|
| 1 | 1.1 | Create branch, verify build | — |
| 2 | 1.2 | Create `src/core/inference/types.ts` (open string types) | Step 1 |
| 3 | 1.3 | Create task-handler registry + handler directory | Step 2 |
| 4 | 2.1 | Create new `TransformersManager` with LRU eviction (uses `getHandler()`) | Step 3 |
| 5 | 2.2 | Update `vite.config.ts` for workers | Step 1 |
| 6 | 2.3 | Create worker + `TransformersClient` with crash recovery | Steps 4, 5 |
| 7 | 2.4 | Migrate all tools to new API | Step 6 |
| 8 | 2.5 | Swap `@xenova/transformers` → `@huggingface/transformers` | Step 7 |
| 9 | 2.6 | Add worker protocol tests | Step 6 |
| 10 | 3.1 | Create model registry | Step 2 |
| 11 | 3.2–3.7 | Model swaps, one tool at a time | Steps 8, 10 |
| 12 | 4.0 | Dependency pruning (remove TF.js + @xenova) | Step 11 |
| 13 | 4.1–4.3 | GLiNER2, Depth Anything, quantization config | Step 12 |
| 14 | 5.1–5.2 | Model Status UI + progress UI | Step 13 |
| 15 | 1.4 | Write `CONTRIBUTING.md` with extension checklists | Step 12 |
# Extending the Difference Suite

The Difference Suite has been upgraded to utilize **Transformers.js v3** natively running inside a dedicated Web Worker to ensure UI responsiveness. 
If you want to add a new AI capability or machine learning model, follow these steps:

## Add a New Model

1. **Register the Pipeline Task**
   If the model requires a new Hugging Face pipeline task (e.g. `object-detection`), add it to the `PipelineTask` type in `src/core/inference/types.ts`.

2. **Register the Model Configuration**
   Add your model to the central `MODEL_REGISTRY` in `src/core/inference/modelRegistry.ts`.
   Ensure you pass the correct `task` and `quantization` (usually `'q4'`) for optimal performance.

```typescript
  {
    id: 'my-new-model',
    name: 'My New Model',
    hfPath: 'Xenova/my-model-hf',
    task: 'object-detection',
    quantization: 'q4',
    format: 'onnx',
    recommendedDevice: 'webgpu',
    memoryFootprintMB: 150,
    enabled: true,
  }
```

## Write a Task Handler

Create a new handler in `src/core/inference/handlers/myTask.ts`:

```typescript
import { registerHandler } from '../taskHandlers';
import type { InferenceRequest, InferenceResult } from '../types';

registerHandler({
  task: 'object-detection',
  async run(request: InferenceRequest, pipeline: any, onProgress): Promise<InferenceResult> {
    const { image } = request.payload as { image: string };
    
    // You can report mid-inference progress natively to the UI
    onProgress?.({ id: request.id, stage: 'running', progress: 0.5, message: 'Detecting physical boundaries...' });
    
    const result = await pipeline(image);
    
    return { id: request.id, output: result };
  },
});
```

Don't forget to import this new file inside `src/core/inference/handlers/index.ts` to execute the macro registration upon application boot.

## Call it from the UI

Use the `transformersClient.run()` method from any React component. You no longer need to worry about the model loading status, it is fetched via `TransformersManager` using LRU eviction on demand.

```typescript
import { transformersClient } from '../../core/inference/TransformersClient';

const result = await transformersClient.run({
    id: crypto.randomUUID(),
    tool: 'MyTool',
    model: 'my-new-model',      // The ID you defined in modelRegistry.ts
    task: 'object-detection',   // The task handler you registered
    payload: { image: dataUrl } // Custom payload data structure
});

console.log(result.output);
```

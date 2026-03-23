import { registerHandler } from '../taskHandlers';
import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

registerHandler({
  task: 'image-classification',
  async run(request: InferenceRequest, pipeline: any, onProgress?: (p: InferenceProgress) => void): Promise<InferenceResult> {
    const { image, topK = 5 } = request.payload as {
      image: string; // URL or Data URL
      topK?: number;
    };

    onProgress?.({ id: request.id, stage: 'running', progress: 0.5, message: 'Classifying image...' });

    const result = await pipeline(image, { top_k: topK });

    return { id: request.id, output: result };
  },
});

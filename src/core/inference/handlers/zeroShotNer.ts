import { registerHandler } from '../taskHandlers';
import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

registerHandler({
  task: 'zero-shot-ner',
  async run(request: InferenceRequest, pipeline: any, onProgress?: (p: InferenceProgress) => void): Promise<InferenceResult> {
    const { text, labels } = request.payload as {
      text: string;
      labels: string[];
    };

    onProgress?.({ id: request.id, stage: 'running', progress: 0.5, message: 'Extracting entities...' });

    // GLiNER pipeline expects the text and the list of labels
    const result = await pipeline(text, labels);

    return { id: request.id, output: result };
  },
});

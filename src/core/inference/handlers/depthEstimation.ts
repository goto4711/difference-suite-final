import { registerHandler } from '../taskHandlers';
import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

registerHandler({
  task: 'depth-estimation',
  async run(request: InferenceRequest, pipeline: any, onProgress?: (p: InferenceProgress) => void): Promise<InferenceResult> {
    const { image } = request.payload as {
      image: string; // Data URL or Image URL
    };

    onProgress?.({ id: request.id, stage: 'running', progress: 0.5, message: 'Estimating physical depth...' });

    const result = await pipeline(image);

    // Transformers.js depth-estimation returns { depth: RawImage }
    // We send back the serializable raw pixel data to construct an ImageData on the main thread
    return {
      id: request.id,
      output: {
        width: result.depth.width,
        height: result.depth.height,
        channels: result.depth.channels,
        data: result.depth.data, // Uint8Array grayscale
      }
    };
  },
});

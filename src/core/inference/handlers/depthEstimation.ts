import { registerHandler } from '../taskHandlers';
import type { CallablePipeline, InferenceRequest, InferenceResult, InferenceProgress } from '../types';

interface DepthEstimationOutput {
  depth: {
    width: number;
    height: number;
    channels: number;
    data: Uint8Array;
  };
}

registerHandler({
  task: 'depth-estimation',
  async run(request: InferenceRequest, pipeline: CallablePipeline, onProgress?: (p: InferenceProgress) => void): Promise<InferenceResult> {
    const { image } = request.payload as {
      image: string | Blob;
    };

    onProgress?.({ id: request.id, stage: 'running', progress: 0.5, message: 'Estimating physical depth...' });

    const result = await pipeline(image) as DepthEstimationOutput;

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

import { registerHandler } from '../taskHandlers';
import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

/**
 * Handler for text-generation models (e.g. SmolLM2-135M-Instruct).
 */
registerHandler({
  task: 'text-generation',

  async run(
    request: InferenceRequest,
    pipeline: unknown,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const { prompt, options } = request.payload as {
      prompt: string;
      options?: Record<string, unknown>;
    };

    onProgress?.({
      id: request.id,
      stage: 'running',
      progress: 0.5,
      message: 'Generating text…',
    });

    const pipe = pipeline as (
      text: string,
      opts?: Record<string, unknown>,
    ) => Promise<unknown>;

    const result = await pipe(prompt, {
      max_new_tokens: 128,
      temperature: 0.7,
      do_sample: true,
      repetition_penalty: 1.2,
      ...options,
    });

    // Pipeline returns [{ generated_text: "..." }] or { generated_text: "..." }
    let text: string;
    if (Array.isArray(result)) {
      text = (result[0] as { generated_text: string }).generated_text;
    } else {
      text = (result as { generated_text: string }).generated_text;
    }

    onProgress?.({
      id: request.id,
      stage: 'postprocessing',
      progress: 1,
      message: 'Done',
    });

    return { id: request.id, output: text };
  },
});

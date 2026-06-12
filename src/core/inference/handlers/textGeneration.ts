import { registerHandler } from '../taskHandlers';
import type { CallablePipeline, InferenceRequest, InferenceResult, InferenceProgress } from '../types';

export function parseTextGenerationOutput(result: unknown): string {
  const output = Array.isArray(result) ? result[0] : result;

  if (
    typeof output === 'object' &&
    output !== null &&
    'generated_text' in output &&
    typeof output.generated_text === 'string'
  ) {
    return output.generated_text;
  }

  throw new Error('Text generation returned an unexpected format');
}

/**
 * Handler for text-generation models (e.g. SmolLM2-135M-Instruct).
 */
registerHandler({
  task: 'text-generation',

  async run(
    request: InferenceRequest,
    pipeline: CallablePipeline,
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

    const result = await pipeline(prompt, {
      max_new_tokens: 128,
      temperature: 0.7,
      do_sample: true,
      repetition_penalty: 1.2,
      ...options,
    });

    // Pipeline returns [{ generated_text: "..." }] or { generated_text: "..." }
    const text = parseTextGenerationOutput(result);

    onProgress?.({
      id: request.id,
      stage: 'postprocessing',
      progress: 1,
      message: 'Done',
    });

    return { id: request.id, output: text };
  },
});

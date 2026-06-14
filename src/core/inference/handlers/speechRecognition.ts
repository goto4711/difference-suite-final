import { registerHandler } from '../taskHandlers';
import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

/**
 * Handler for automatic-speech-recognition models (e.g. Whisper).
 */
registerHandler({
  task: 'automatic-speech-recognition',

  async run(
    request: InferenceRequest,
    pipeline: unknown,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const payload = request.payload as {
      /** Raw PCM audio samples (mono, 16 kHz Float32Array). Either key accepted. */
      audio?: Float32Array;
      audioData?: Float32Array;
      /** Whisper language hint, e.g. 'english', 'german'. Omit for auto-detect. */
      language?: string;
    };
    const audio = payload.audio ?? payload.audioData;
    if (!audio) {
      throw new Error('speech-recognition: missing audio payload (expected `audio` Float32Array).');
    }

    onProgress?.({
      id: request.id,
      stage: 'running',
      progress: 0.3,
      message: 'Transcribing audio…',
    });

    const pipe = pipeline as (
      audio: Float32Array,
      opts?: Record<string, unknown>,
    ) => Promise<{ text: string } | Array<{ text: string }>>;

    const pipeOptions: Record<string, unknown> = {};
    if (payload.language) pipeOptions.language = payload.language;

    const result = await pipe(audio, pipeOptions);

    const text = Array.isArray(result)
      ? result[0].text.trim()
      : result.text.trim();

    onProgress?.({
      id: request.id,
      stage: 'postprocessing',
      progress: 1,
      message: 'Done',
    });

    return { id: request.id, output: text };
  },
});

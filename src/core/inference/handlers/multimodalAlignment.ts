import { registerHandler } from '../taskHandlers';
import { RawImage } from '@huggingface/transformers';
import type { CallablePipeline, InferenceRequest, InferenceResult, InferenceProgress } from '../types';

const asNumericArray = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry));
  }

  if (typeof value === 'object' && value !== null && 'data' in value && Array.isArray(value.data)) {
    return value.data.map((entry) => Number(entry));
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    value.data &&
    typeof value.data === 'object' &&
    'length' in value.data
  ) {
    return Array.from(value.data as ArrayLike<number>);
  }

  return [];
};

type DirectModelFn = (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;
type DirectTokenizerFn = (text: string | string[], opts: Record<string, unknown>) => Promise<Record<string, unknown>>;
type DirectProcessorFn = (image: unknown) => Promise<Record<string, unknown>>;

/**
 * Handler for multimodal alignment (CLIP).
 * Computes similarity between a query (text or image) and a set of candidates (images or text).
 */
registerHandler({
  task: 'multimodal-alignment',

  async run(
    request: InferenceRequest,
    pipeline: CallablePipeline,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const { query, candidates, queryType, candidateType } = request.payload as {
      query: string | Blob;
      candidates: Array<string | Blob>;
      queryType: 'text' | 'image';
      candidateType: 'text' | 'image';
    };

    onProgress?.({
      id: request.id,
      stage: 'running',
      progress: 0.1,
      message: 'Initializing CLIP alignment...',
    });

    const pipe = pipeline;

    // ── CLIP direct-loader path ────────────────────────────────────────────────
    const isDirectCLIP = pipe.text_model !== undefined && pipe.vision_model !== undefined;

    if (!isDirectCLIP && !pipe.model) {
      throw new Error('Multimodal alignment requires a CLIP-compatible model');
    }

    const getEmbedding = async (input: string | Blob, type: 'text' | 'image'): Promise<number[]> => {
      if (isDirectCLIP) {
        const textModelFn = pipe.text_model as unknown as DirectModelFn;
        const visionModelFn = pipe.vision_model as unknown as DirectModelFn;
        const tokenizerFn = pipe.tokenizer as unknown as DirectTokenizerFn;
        const processorFn = pipe.processor as unknown as DirectProcessorFn;

        if (type === 'image') {
          const image = await RawImage.read(input as string | Blob);
          const imageInputs = await processorFn(image);
          const out = await visionModelFn(imageInputs);
          return asNumericArray(out.image_embeds ?? out.pooler_output ?? out.last_hidden_state);
        } else {
          const textInputs = await tokenizerFn(input as string, { padding: true, truncation: true });
          const out = await textModelFn(textInputs);
          return asNumericArray(out.text_embeds ?? out.pooler_output ?? out.last_hidden_state);
        }
      }

      // Legacy pipeline path (fallback for non-direct-loaded CLIP)
      const model = pipe.model!;
      const processor = pipe.processor || pipe.image_processor;
      const tokenizer = pipe.tokenizer || pipe.processor;

      const runModelSafe = async (inputs: Record<string, unknown>, modality: 'image' | 'text'): Promise<unknown> => {
        const methodName = modality === 'image' ? 'get_image_features' : 'get_text_features';
        try {
          if (typeof model[methodName as keyof typeof model] === 'function') {
            return await (model[methodName as keyof typeof model] as (i: Record<string, unknown>) => Promise<unknown>)(inputs);
          }
          const subModel = modality === 'image' ? model.vision_model : model.text_model;
          if (subModel) {
            const res = asObject(await (subModel as (i: Record<string, unknown>) => Promise<unknown>)(inputs));
            return res.pooler_output ?? res.last_hidden_state ?? res;
          }
          const res = asObject(await pipeline(inputs));
          return modality === 'image'
            ? (res.image_embeds ?? res.pooler_output ?? res)
            : (res.text_embeds ?? res.pooler_output ?? res);
        } catch (error: unknown) {
          if (error instanceof Error && error.message.includes('Missing')) {
            if (modality === 'image' && typeof tokenizer === 'function') {
              const dummy_text = await (tokenizer as DirectTokenizerFn)([''], { padding: true, truncation: true });
              return await runModelSafe({ ...inputs, ...dummy_text }, modality);
            } else if (modality === 'text' && typeof processor === 'function') {
              const dummy_image = new RawImage(new Uint8ClampedArray(224 * 224 * 3).fill(0), 224, 224, 3);
              const dummy_image_inputs = await (processor as DirectProcessorFn)(dummy_image);
              return await runModelSafe({ ...inputs, ...dummy_image_inputs }, modality);
            }
          }
          throw error;
        }
      };

      if (type === 'image') {
        if (typeof processor !== 'function') throw new Error('Missing processor');
        const image = await RawImage.read(input as string | Blob);
        const image_inputs = await (processor as DirectProcessorFn)(image);
        const output = await runModelSafe(image_inputs, 'image');
        const normalizedOutput = asObject(output);
        return asNumericArray(normalizedOutput.data ?? normalizedOutput.logits ?? output);
      } else {
        if (typeof tokenizer !== 'function') throw new Error('Missing tokenizer');
        const text_inputs = await (tokenizer as DirectTokenizerFn)(input as string, { padding: true, truncation: true });
        const output = await runModelSafe(text_inputs, 'text');
        const normalizedOutput = asObject(output);
        return asNumericArray(normalizedOutput.data ?? normalizedOutput.logits ?? output);
      }
    };

    // 1. Embed query
    onProgress?.({ id: request.id, stage: 'running', progress: 0.2, message: 'Embedding query...' });
    const queryEmb = await getEmbedding(query, queryType);

    const results: Array<{ url: string | Blob; score: number }> = [];

    // 2. Embed candidates and compute cosine similarity
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      onProgress?.({
        id: request.id,
        stage: 'running',
        progress: 0.2 + (0.7 * (i / candidates.length)),
        message: `Matching candidate ${i + 1}/${candidates.length}...`,
      });

      try {
        const candidateEmb = await getEmbedding(candidate, candidateType);

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let n = 0; n < queryEmb.length; n++) {
          dotProduct += queryEmb[n] * candidateEmb[n];
          normA += queryEmb[n] * queryEmb[n];
          normB += candidateEmb[n] * candidateEmb[n];
        }

        results.push({
          url: candidate,
          score: dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1),
        });
      } catch (err) {
        console.warn(`CLIP alignment failed for candidate:`, err);
      }
    }

    results.sort((a, b) => b.score - a.score);

    onProgress?.({ id: request.id, stage: 'postprocessing', progress: 1, message: 'Alignment complete' });

    return { id: request.id, output: results };
  },
});

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

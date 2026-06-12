import { registerHandler } from '../taskHandlers';
import { RawImage } from '@huggingface/transformers';
import type {
  CallablePipeline,
  InferenceRequest,
  InferenceProgress,
  InferenceResult,
  TensorLike,
} from '../types';

const isTensorLike = (value: unknown): value is TensorLike<unknown> =>
  typeof value === 'object' && value !== null && 'tolist' in value && typeof value.tolist === 'function';

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

type DirectModelFn = (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;
type DirectTokenizerFn = (text: string | string[], opts: Record<string, unknown>) => Promise<Record<string, unknown>>;
type DirectProcessorFn = (image: unknown) => Promise<Record<string, unknown>>;

/**
 * Handler for feature-extraction models (embeddings, CLIP, attention).
 */
registerHandler({
  task: 'feature-extraction',

  async run(
    request: InferenceRequest,
    pipeline: CallablePipeline,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const payload = request.payload as {
      text?: string;
      texts?: string[];
      imageUrl?: string | Blob;
      image?: string | Blob;
      pooling?: 'mean' | 'cls' | 'none';
      normalize?: boolean;
    };

    onProgress?.({
      id: request.id,
      stage: 'running',
      progress: 0.2,
      message: 'Extracting features…',
    });

    const pipe = pipeline;

    // ── CLIP direct-loader path ────────────────────────────────────────────────
    // When loaded via loadClipModel(), pipe.text_model and pipe.vision_model are
    // CLIPTextModelWithProjection / CLIPVisionModelWithProjection instances.
    if (pipe.text_model !== undefined && pipe.vision_model !== undefined) {
      const textModelFn = pipe.text_model as unknown as DirectModelFn;
      const visionModelFn = pipe.vision_model as unknown as DirectModelFn;
      const tokenizerFn = pipe.tokenizer as unknown as DirectTokenizerFn;
      const processorFn = pipe.processor as unknown as DirectProcessorFn;

      const imageSource = payload.imageUrl || payload.image;
      let output: unknown;

      if (imageSource) {
        onProgress?.({ id: request.id, stage: 'running', progress: 0.4, message: 'Loading image…' });
        const image = await RawImage.read(imageSource as string | Blob);
        const imageInputs = await processorFn(image);
        onProgress?.({ id: request.id, stage: 'running', progress: 0.6, message: 'Running vision model…' });
        const visionOut = await visionModelFn(imageInputs);
        output = visionOut.image_embeds ?? visionOut.pooler_output ?? visionOut.last_hidden_state;
      } else {
        const text = payload.texts ?? payload.text ?? '';
        onProgress?.({ id: request.id, stage: 'running', progress: 0.6, message: 'Running text model…' });
        const textInputs = await tokenizerFn(text as string | string[], { padding: true, truncation: true });
        const textOut = await textModelFn(textInputs);
        output = textOut.text_embeds ?? textOut.pooler_output ?? textOut.last_hidden_state;
      }

      const outputList = isTensorLike(output) ? output.tolist() : output;
      const finalOutput = Array.isArray(payload.texts) || !Array.isArray(outputList)
        ? outputList
        : (outputList as unknown[])[0];

      onProgress?.({ id: request.id, stage: 'postprocessing', progress: 1, message: 'Done' });
      return { id: request.id, output: finalOutput };
    }

    // ── Legacy CLIP pipeline path (kept as fallback) ───────────────────────────
    if (pipe.model?.config?.model_type === 'clip') {
      const model = pipe.model;
      const tokenizer = pipe.tokenizer || pipe.processor;
      const processor = pipe.processor || pipe.image_processor;
      let output: unknown;

      const runModelSafe = async (inputs: Record<string, unknown>, modality: 'image' | 'text') => {
        const methodName = modality === 'image' ? 'get_image_features' : 'get_text_features';
        try {
          if (model && typeof model[methodName as keyof typeof model] === 'function') {
            return await (model[methodName as keyof typeof model] as (i: Record<string, unknown>) => Promise<unknown>)(inputs);
          }
          const subModel = modality === 'image' ? model.vision_model : model.text_model;
          if (subModel) {
            const subRes = asObject(await (subModel as (i: Record<string, unknown>) => Promise<unknown>)(inputs));
            return subRes.pooler_output ?? subRes.last_hidden_state ?? subRes;
          }
          const mainRes = asObject(await pipe(inputs));
          return modality === 'image'
            ? (mainRes.image_embeds ?? mainRes.pooler_output ?? mainRes)
            : (mainRes.text_embeds ?? mainRes.pooler_output ?? mainRes);
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

      const imageSource = payload.imageUrl || payload.image;
      if (imageSource) {
        const image = await RawImage.read(imageSource as string | Blob);
        if (typeof processor !== 'function') throw new Error('Missing image processor');
        const image_inputs = await (processor as DirectProcessorFn)(image);
        output = await runModelSafe(image_inputs, 'image');
      } else {
        const text = payload.texts ?? payload.text ?? '';
        if (typeof tokenizer !== 'function') throw new Error('Missing tokenizer');
        const text_inputs = await (tokenizer as DirectTokenizerFn)(text as string | string[], { padding: true, truncation: true });
        output = await runModelSafe(text_inputs, 'text');
      }

      const outputList = isTensorLike(output) ? output.tolist() : output;
      const finalOutput = Array.isArray(payload.texts) || !Array.isArray(outputList)
        ? outputList
        : (outputList as unknown[])[0];

      return { id: request.id, output: finalOutput };
    }

    // ── Standard single-modal models (BERT, BGE, etc.) ────────────────────────
    const input = payload.texts ?? payload.text ?? '';
    const pipelineOptions = {
      pooling: payload.pooling ?? 'mean',
      normalize: payload.normalize ?? true,
    };
    const result = await pipe(input, pipelineOptions);

    const outputList = isTensorLike(result) ? result.tolist() : result;
    const finalOutput = Array.isArray(payload.texts) || !Array.isArray(outputList)
      ? outputList
      : (outputList as unknown[])[0];

    onProgress?.({
      id: request.id,
      stage: 'postprocessing',
      progress: 1,
      message: 'Done',
    });

    return { id: request.id, output: finalOutput };
  },
});

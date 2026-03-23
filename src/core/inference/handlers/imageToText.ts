import { registerHandler } from '../taskHandlers';
import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

/**
 * Handler for image-to-text models (e.g. Florence-2, vit-gpt2).
 */
registerHandler({
  task: 'image-to-text',

  async run(
    request: InferenceRequest,
    pipeline: any,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const { imageSource, mode } = request.payload as {
      imageSource: string;
      mode?: 'caption' | 'caption+ocr';
    };

    onProgress?.({
      id: request.id,
      stage: 'running',
      progress: 0.3,
      message: 'Analyzing image…',
    });

    // Detect if it's a Florence-2 model by looking at its configuration
    const isFlorence = !!pipeline.model?.config?.model_type?.includes('florence') ||
                      request.model.includes('florence');

    // Florence-2 expects a prompt. Mapping modes to specific Florence-2 task tokens.
    let prompt = '';
    if (isFlorence) {
      if (mode === 'caption+ocr') {
        prompt = '<DETAILED_CAPTION>'; // Florence-2 specific task token
      } else {
        prompt = '<CAPTION>'; // Default captioning
      }
    }

    // Call the pipeline
    // For Florence-2, some pipeline versions expect (image, { prompt }) 
    // while others handle the prompt as part of the text input.
    const result = await pipeline(imageSource, {
      ...(isFlorence ? { prompt } : {}),
      max_new_tokens: 100,
      do_sample: true,
      temperature: 0.9,
      top_k: 50,
    });

    // Result format: [{ generated_text: "..." }]
    let caption: string;
    if (Array.isArray(result) && result.length > 0) {
      caption = (result[0] as { generated_text: string }).generated_text;
      
      // Florence-2 often prefixes with the prompt/task token, so we clean it up
      if (isFlorence && prompt && caption.startsWith(prompt)) {
        caption = caption.replace(prompt, '').trim();
      }
    } else {
      caption = 'No caption generated';
    }

    onProgress?.({
      id: request.id,
      stage: 'postprocessing',
      progress: 1,
      message: 'Done',
    });

    return { id: request.id, output: { caption, mode: mode ?? 'caption' } };
  },
});

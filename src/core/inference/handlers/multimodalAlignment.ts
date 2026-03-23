import { registerHandler } from '../taskHandlers';
import { RawImage } from '@huggingface/transformers';
import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

/**
 * Handler for multimodal alignment (CLIP).
 * Computes similarity between a query (text or image) and a set of candidates (images or text).
 */
registerHandler({
  task: 'multimodal-alignment',

  async run(
    request: InferenceRequest,
    pipeline: any,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const { query, candidates, queryType, candidateType } = request.payload as {
      query: string | Uint8Array;
      candidates: Array<string | Uint8Array>;
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
    const model = pipe.model;
    const processor = pipe.processor || pipe.image_processor;
    const tokenizer = pipe.tokenizer || pipe.processor;

    const runModelSafe = async (inputs: any, modality: 'image' | 'text') => {
        const methodName = modality === 'image' ? 'get_image_features' : 'get_text_features';
        
        try {
            if (typeof model[methodName] === 'function') {
                return await model[methodName](inputs);
            }
            
            const subModel = modality === 'image' ? model.vision_model : model.text_model;
            if (subModel) {
                const res = await subModel(inputs);
                return res.pooler_output || res.last_hidden_state || res;
            }

            const res = await model(inputs);
            return modality === 'image' 
                ? (res.image_embeds || res.pooler_output || res) 
                : (res.text_embeds || res.pooler_output || res);
        } catch (e: any) {
            if (e.message?.includes('Missing')) {
                if (modality === 'image' && typeof tokenizer === 'function') {
                    const dummy_text = await tokenizer([''], { padding: true, truncation: true });
                    return await runModelSafe({ ...inputs, ...dummy_text }, modality);
                } else if (modality === 'text' && typeof processor === 'function') {
                    const dummy_image = new RawImage(new Uint8ClampedArray(224 * 224 * 3).fill(0), 224, 224, 3);
                    const dummy_image_inputs = await processor(dummy_image);
                    return await runModelSafe({ ...inputs, ...dummy_image_inputs }, modality);
                }
            }
            throw e;
        }
    };

    // Helper to get embedding specifically for CLIP bypass
    const getEmbedding = async (input: any, type: 'text' | 'image') => {
        let output: any;
        if (type === 'image') {
            if (typeof processor !== 'function') throw new Error('Missing processor');
            const image = await RawImage.read(input as any);
            const image_inputs = await processor(image);
            output = await runModelSafe(image_inputs, 'image');
        } else {
            if (typeof tokenizer !== 'function') throw new Error('Missing tokenizer');
            const text_inputs = await tokenizer(input as string, { padding: true, truncation: true });
            output = await runModelSafe(text_inputs, 'text');
        }
        return (output.data ?? output.logits ?? output);
    };

    // 1. Get query embedding
    onProgress?.({
      id: request.id,
      stage: 'running',
      progress: 0.2,
      message: 'Embedding query...',
    });
    const queryEmb = await getEmbedding(query, queryType);

    const results: { url: any; score: number }[] = [];

    // 2. Embed candidates and compute similarity
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

        // Cosine similarity (already normalized on most CLIP models, but we don't assume)
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let n = 0; n < queryEmb.length; n++) {
          dotProduct += queryEmb[n] * candidateEmb[n];
          normA += queryEmb[n] * queryEmb[n];
          normB += candidateEmb[n] * candidateEmb[n];
        }
        
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
        
        results.push({
          url: candidate,
          score: similarity,
        });
      } catch (err) {
        console.warn(`CLIP failed for candidate:`, err);
      }
    }

    // 3. Sort by score
    results.sort((a, b) => b.score - a.score);

    onProgress?.({
      id: request.id,
      stage: 'postprocessing',
      progress: 1,
      message: 'Alignment complete',
    });

    return { id: request.id, output: results };
  },
});

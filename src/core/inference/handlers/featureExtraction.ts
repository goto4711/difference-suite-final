import { registerHandler } from '../taskHandlers';
import { RawImage } from '@huggingface/transformers';
import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

/**
 * Handler for feature-extraction models (embeddings, CLIP, attention).
 */
registerHandler({
  task: 'feature-extraction',

  async run(
    request: InferenceRequest,
    pipeline: any,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const payload = request.payload as {
      text?: string;
      texts?: string[];
      imageUrl?: string | Uint8Array;
      image?: string | Uint8Array; // Added support for 'image' key
      pooling?: 'mean' | 'cls' | 'none';
      normalize?: boolean;
    };

    onProgress?.({
      id: request.id,
      stage: 'running',
      progress: 0.3,
      message: 'Extracting features…',
    });

    const pipe = pipeline;
    
    // Check if it's a CLIP model which needs modality-specific logic
    if (pipe.model?.config?.model_type === 'clip') {
        const model = pipe.model;
        const tokenizer = pipe.tokenizer || pipe.processor;
        const processor = pipe.processor || pipe.image_processor;
        let output: any;

        const runModelSafe = async (inputs: any, modality: 'image' | 'text') => {
            const methodName = modality === 'image' ? 'get_image_features' : 'get_text_features';
            
            try {
                let res: any;
                if (typeof model[methodName] === 'function') {
                    res = await model[methodName](inputs);
                } else {
                    // Fallback to sub-models if available
                    const subModel = modality === 'image' ? model.vision_model : model.text_model;
                    if (subModel) {
                        const subRes = await subModel(inputs);
                        res = subRes.pooler_output || subRes.last_hidden_state || subRes;
                    } else {
                        // Final fallback: call model directly
                        const mainRes = await model(inputs);
                        res = modality === 'image' 
                            ? (mainRes.image_embeds || mainRes.pooler_output || mainRes) 
                            : (mainRes.text_embeds || mainRes.pooler_output || mainRes);
                    }
                }
                
                return res;
            } catch (e: any) {
                // If it fails due to missing inputs, try again with dummy inputs
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

        const imageSource = payload.imageUrl || payload.image;
        if (imageSource) {
            const image = await RawImage.read(imageSource as any);
            if (typeof processor !== 'function') throw new Error('Missing image processor');
            const image_inputs = await processor(image);
            output = await runModelSafe(image_inputs, 'image');
        } else {
            const text = payload.texts ?? payload.text ?? '';
            if (typeof tokenizer !== 'function') throw new Error('Missing tokenizer');
            const text_inputs = await tokenizer(text, { padding: true, truncation: true });
            output = await runModelSafe(text_inputs, 'text');
        }
        
        // Extract data from tensor
        const outputList = output.tolist();
        // If input was a batch (array of strings), return the full list [N, D]
        // If input was a single string, return just the flat vector [D]
        const finalOutput = Array.isArray(payload.texts) ? outputList : outputList[0];
        
        return { id: request.id, output: finalOutput };
    }

    // Standard single-modal models (BERT, BGE, etc.)
    const input = payload.texts ?? payload.text ?? '';
    const pipelineOptions = {
        pooling: payload.pooling ?? 'mean',
        normalize: payload.normalize ?? true,
    };
    const result = await pipe(input, pipelineOptions);
    
    // result is a Tensor. tolist() returns a nested JS array [N, D]
    const outputList = result.tolist();
    
    // If input was a batch (array of strings), return the full list [N, D]
    // If input was a single string, return just the flat vector [D]
    const finalOutput = Array.isArray(payload.texts) ? outputList : outputList[0];

    onProgress?.({
      id: request.id,
      stage: 'postprocessing',
      progress: 1,
      message: 'Done',
    });

    return { id: request.id, output: finalOutput };
  },
});

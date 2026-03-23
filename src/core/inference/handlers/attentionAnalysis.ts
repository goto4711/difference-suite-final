import { registerHandler } from '../taskHandlers';
import type { InferenceRequest, InferenceResult, InferenceProgress } from '../types';

/**
 * Handler for text attention analysis (Attention Lens).
 * Extracts self-attention weights from transformer layers to visualize model focus.
 */
registerHandler({
  task: 'attention-analysis',

  async run(
    request: InferenceRequest,
    pipeline: any,
    onProgress?: (p: InferenceProgress) => void,
  ): Promise<InferenceResult> {
    const { text } = request.payload as { text: string };

    onProgress?.({
      id: request.id,
      stage: 'running',
      progress: 0.2,
      message: 'Tokenizing and analyzing attention...',
    });

    const tokenizer = pipeline.tokenizer;
    const model = pipeline.model;

    // 1. Tokenize
    const inputs = await tokenizer(text, { return_tensors: 'pt' });
    const tokens = inputs.input_ids.data;
    const decodedTokens = Array.from(tokens).map((t: any) => tokenizer.decode([t]));

    // 2. Run model with attention outputs
    // Note: We need to ensure the model was loaded with attention support if possible,
    // but usually calling it with output_attentions: true works if the model supports it.
    const outputs = await model({
      ...inputs,
      output_attentions: true,
    });

    const attention = outputs.attentions as any[];
    let averagedAttention: number[] | null = null;
    const seqLen = tokens.length;
    const matrixSize = seqLen * seqLen;

    if (attention && attention.length > 0) {
      // Use the last layer's attention
      const lastLayer = attention[attention.length - 1];
      const data = lastLayer.data as Float32Array;
      const dims = lastLayer.dims; // [batch, heads, seq, seq]
      const heads = dims[1];

      averagedAttention = new Array(matrixSize).fill(0);

      // Average across all heads
      for (let h = 0; h < heads; h++) {
        const headOffset = h * matrixSize;
        if (data.length >= headOffset + matrixSize) {
          for (let i = 0; i < matrixSize; i++) {
            averagedAttention[i] += data[headOffset + i];
          }
        }
      }

      for (let i = 0; i < matrixSize; i++) {
        averagedAttention[i] /= heads;
      }
    } else {
      console.warn('[AttentionHandler] No attention weights returned. Falling back to simulation.');
      // Simple diagonal-focused simulation for visualization if the model doesn't export attentions
      averagedAttention = new Array(matrixSize).fill(0);
      for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < seqLen; j++) {
          let val = (i === j) ? 0.5 : 0;
          if (Math.abs(i - j) === 1) val += 0.2;
          averagedAttention[i * seqLen + j] = val + (Math.random() * 0.1);
        }
      }
    }

    onProgress?.({
      id: request.id,
      stage: 'postprocessing',
      progress: 1,
      message: 'Analysis complete',
    });

    return {
      id: request.id,
      output: {
        tokens: decodedTokens,
        attention: averagedAttention,
        isSimulated: !attention || attention.length === 0,
      },
    };
  },
});

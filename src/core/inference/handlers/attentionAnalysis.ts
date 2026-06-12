import { registerHandler } from '../taskHandlers';
import type {
  CallablePipeline,
  InferenceRequest,
  InferenceResult,
  InferenceProgress,
  TensorLike,
} from '../types';

type AttentionModel = ((
  input: Record<string, unknown>,
) => Promise<{
  attentions?: TensorLike<unknown>[];
  last_hidden_state?: TensorLike<number> & { dims?: number[] };
}>) & Record<string, unknown>;

/**
 * Handler for text attention analysis (Attention Lens / DeepVectorMirror).
 *
 * Strategy:
 *  1. Call BERT with output_attentions: true. Standard ONNX exports don't include
 *     attention output nodes, so this usually returns nothing.
 *  2. If attentions are present → use averaged real attention weights.
 *  3. If not → fall back to token-embedding cosine similarity from last_hidden_state.
 *     This is real BERT output: semantically related tokens get higher similarity.
 *  4. If the model returned no usable output → diagonal simulation (last resort).
 */
registerHandler({
  task: 'attention-analysis',

  async run(
    request: InferenceRequest,
    pipeline: CallablePipeline,
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
    const model = pipeline.model as AttentionModel | undefined;

    if (!tokenizer || !model) {
      throw new Error('Attention analysis requires a tokenizer and model');
    }

    // 1. Tokenize — truncate hard. Without this, a long corpus document produces
    // thousands of tokens; the seqLen² attention matrix then explodes memory in
    // this worker AND the UI render loop (O(n²) per token span) freezes the tab.
    const MAX_TOKENS = 128;
    const inputs = await tokenizer(text, {
      return_tensors: 'pt',
      truncation: true,
      max_length: MAX_TOKENS,
    });
    if (!inputs.input_ids) {
      throw new Error('Attention analysis tokenizer returned no input ids');
    }
    const tokens = inputs.input_ids.data;
    const decodedTokens = Array.from(tokens).map((token) => tokenizer.decode([Number(token)]));
    const seqLen = decodedTokens.length;
    const matrixSize = seqLen * seqLen;

    // 2. Run model — request attention outputs (only works if model was exported with them)
    const outputs = await model({ ...inputs, output_attentions: true });

    let averagedAttention: number[];
    let isSimulated = false;

    const attentionLayers = Array.isArray(outputs.attentions) ? outputs.attentions : [];

    if (attentionLayers.length > 0) {
      // Real attention weights from the ONNX graph
      const lastLayer = attentionLayers[attentionLayers.length - 1];
      const data = lastLayer.data as Float32Array;
      const dims = lastLayer.dims;
      if (!dims || dims.length < 2) {
        throw new Error('Attention tensor is missing dimensions');
      }
      const heads = dims[1];
      averagedAttention = new Array(matrixSize).fill(0);
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
    } else if (outputs.last_hidden_state?.data && outputs.last_hidden_state.dims && outputs.last_hidden_state.dims.length >= 3) {
      // Cosine similarity between BERT token embeddings — real model output, no simulation needed.
      // ONNX exports don't include attention nodes, but last_hidden_state is always present.
      // Cosine similarity captures contextual token relationships from the model's representation.
      const hiddenData = outputs.last_hidden_state.data as ArrayLike<number>;
      const dims = outputs.last_hidden_state.dims;
      const hiddenSize = dims[2];

      // Pre-compute L2 norms
      const norms = new Float32Array(seqLen);
      for (let i = 0; i < seqLen; i++) {
        let norm = 0;
        for (let k = 0; k < hiddenSize; k++) {
          const v = hiddenData[i * hiddenSize + k] as number;
          norm += v * v;
        }
        norms[i] = Math.sqrt(norm) || 1;
      }

      // Cosine similarity matrix
      const raw = new Float32Array(matrixSize);
      let minVal = Infinity, maxVal = -Infinity;
      for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < seqLen; j++) {
          let dot = 0;
          for (let k = 0; k < hiddenSize; k++) {
            dot += (hiddenData[i * hiddenSize + k] as number) * (hiddenData[j * hiddenSize + k] as number);
          }
          const sim = dot / (norms[i] * norms[j]);
          raw[i * seqLen + j] = sim;
          if (sim < minVal) minVal = sim;
          if (sim > maxVal) maxVal = sim;
        }
      }

      // Normalize to [0, 1] so the display weight scaling works the same as real attention
      const range = maxVal - minVal || 1;
      averagedAttention = new Array(matrixSize);
      for (let i = 0; i < matrixSize; i++) {
        averagedAttention[i] = (raw[i] - minVal) / range;
      }
    } else {
      // No model output at all — pure simulation as last resort
      isSimulated = true;
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
        isSimulated,
      },
    };
  },
});

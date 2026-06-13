import { env, pipeline } from '@huggingface/transformers';

// Set up env for Transformers.js web worker
env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1; // Used as fallback if webgpu fails
}

type ProgressInfo = {
    status?: string;
    file?: string;
    loaded?: number;
    total?: number;
    progress?: number;
};

interface WorkerRequest {
    action: 'LOAD_MODEL' | 'GENERATE' | 'UNLOAD';
    payload?: {
        messages?: unknown;
        max_new_tokens?: number;
        temperature?: number;
    };
    msgId: number;
}

interface GemmaPipeline {
    (
        input: string,
        options: {
            max_new_tokens: number;
            temperature: number;
            do_sample: boolean;
            top_p?: number;
            repetition_penalty?: number;
        },
    ): Promise<unknown>;
    dispose?: () => Promise<void>;
}

let gemmaPipeline: GemmaPipeline | null = null;

// The model ID on Hugging Face
const MODEL_ID = 'onnx-community/gemma-4-E2B-it-ONNX';

interface ChatMessage {
    role: string;
    content: unknown;
}

const stringifyContent = (content: unknown): string => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        // Multimodal arrays not supported by this text-only export — fall
        // back to concatenating any text parts.
        return content
            .map((part) => {
                if (typeof part === 'string') return part;
                if (part && typeof part === 'object' && 'text' in part) {
                    return String((part as { text: unknown }).text ?? '');
                }
                return '';
            })
            .join(' ');
    }
    return String(content ?? '');
};

/**
 * Apply Gemma's chat template manually. The onnx-community/gemma-4-E2B-it
 * tokenizer config does not ship a chat_template, so calling the pipeline
 * with a messages array fails with "tokenizer.chat_template is not set".
 * Format the conversation into the canonical Gemma turn structure (with
 * the required <bos> token at the start) and append the open model turn
 * so generation continues from there.
 */
function buildGemmaPrompt(messages: ChatMessage[]): string {
    let prompt = '<bos>';
    for (const msg of messages) {
        const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
        prompt += `<start_of_turn>${role}\n${stringifyContent(msg.content).trim()}<end_of_turn>\n`;
    }
    prompt += '<start_of_turn>model\n';
    return prompt;
}

function extractReply(rawOutput: unknown, prompt: string): string {
    let text: string;
    if (Array.isArray(rawOutput) && rawOutput[0] && typeof (rawOutput[0] as { generated_text?: unknown }).generated_text === 'string') {
        text = (rawOutput[0] as { generated_text: string }).generated_text;
    } else if (typeof rawOutput === 'string') {
        text = rawOutput;
    } else {
        text = JSON.stringify(rawOutput);
    }
    // The tokenizer may insert <bos> automatically; strip it from the output
    // regardless of whether our prompt included it.
    if (text.startsWith(prompt)) {
        text = text.slice(prompt.length);
    } else {
        // Fall back: find the last "<start_of_turn>model" marker in the output
        // and take everything after the following newline. This survives any
        // small mismatch between our prompt string and the decoded full text.
        const marker = '<start_of_turn>model';
        const lastModel = text.lastIndexOf(marker);
        if (lastModel !== -1) {
            const afterMarker = text.slice(lastModel + marker.length);
            const nl = afterMarker.indexOf('\n');
            text = nl !== -1 ? afterMarker.slice(nl + 1) : afterMarker;
        }
    }
    // Stop at the first turn boundary or eos.
    const stops = ['<end_of_turn>', '<eos>', '<start_of_turn>'];
    for (const stop of stops) {
        const i = text.indexOf(stop);
        if (i !== -1 && i < text.length) text = text.slice(0, i);
    }
    return text.trim();
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    const { action, payload, msgId } = e.data;
    
    try {
        if (action === 'LOAD_MODEL') {
            if (!gemmaPipeline) {
                // Initialize the pipeline
                // Send progress updates back to the main thread
                self.postMessage({
                    msgId,
                    status: 'loading',
                    progress: 0,
                    message: 'Initializing Gemma 4 (2B)...'
                });
                
                gemmaPipeline = (await pipeline('text-generation', MODEL_ID, {
                    device: 'webgpu',
                    dtype: 'q4f16',
                    progress_callback: (info: ProgressInfo) => {
                        self.postMessage({
                            msgId,
                            status: 'loading',
                            progress: info
                        });
                    }
                })) as unknown as GemmaPipeline;
            }
            self.postMessage({ msgId, status: 'success', data: 'Model loaded' });
            return;
        }

        if (action === 'GENERATE') {
            if (!gemmaPipeline) throw new Error('Model not loaded. Call LOAD_MODEL first.');
            if (!payload) throw new Error('Missing generation payload');

            const { messages, max_new_tokens = 512, temperature = 0.7 } = payload;
            if (!Array.isArray(messages)) throw new Error('messages must be an array');

            const prompt = buildGemmaPrompt(messages as ChatMessage[]);
            const raw = await gemmaPipeline(prompt, {
                max_new_tokens,
                temperature,
                do_sample: true,
                top_p: 0.95,
                // Crucial for the INT4 export: without a small repetition
                // penalty the model loops on control tokens like <start_of_turn>.
                repetition_penalty: 1.15,
            });
            const reply = extractReply(raw, prompt);

            // Match the shape the existing callers expect: an array with one
            // generated_text string. The consumer code in SemanticOraclePro /
            // ImaginationInspectorPro / VisualStorytellerPro all handle
            // `typeof gen === 'string'`.
            self.postMessage({
                msgId,
                status: 'success',
                data: [{ generated_text: reply }],
            });
            return;
        }

        if (action === 'UNLOAD') {
            if (gemmaPipeline?.dispose) {
                await gemmaPipeline.dispose();
                gemmaPipeline = null;
            }
            self.postMessage({ msgId, status: 'success' });
            return;
        }

    } catch (error: unknown) {
        self.postMessage({ 
            msgId, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error occurred in Gemma 4 worker' 
        });
    }
};

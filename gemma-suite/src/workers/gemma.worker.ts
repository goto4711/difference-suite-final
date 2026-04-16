import { env, pipeline } from '@huggingface/transformers';

// Set up env for Transformers.js web worker
env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1; // Used as fallback if webgpu fails
}

let gemmaPipeline: any = null;

// The model ID on Hugging Face
const MODEL_ID = 'onnx-community/gemma-4-E2B-it-ONNX';

self.onmessage = async (e: MessageEvent) => {
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
                
                gemmaPipeline = await pipeline('text-generation', MODEL_ID, {
                    device: 'webgpu',
                    dtype: 'q4f16',
                    progress_callback: (info: any) => {
                        self.postMessage({
                            msgId,
                            status: 'loading',
                            progress: info
                        });
                    }
                });
            }
            self.postMessage({ msgId, status: 'success', data: 'Model loaded' });
            return;
        }

        if (action === 'GENERATE') {
            if (!gemmaPipeline) throw new Error('Model not loaded. Call LOAD_MODEL first.');
            
            const { messages, max_new_tokens = 512, temperature = 0.7 } = payload;
            
            // For VQA, messages should contain an array of content: [{ type: "text", text: "..."}, { type: "image", image: "[Base64DataURL]" }]
            // Hugging Face handles multimodal prompt parsing
            const result = await gemmaPipeline(messages, {
                max_new_tokens,
                temperature,
                do_sample: true,
            });
            
            self.postMessage({ msgId, status: 'success', data: result });
            return;
        }

        if (action === 'UNLOAD') {
            if (gemmaPipeline) {
                await gemmaPipeline.dispose();
                gemmaPipeline = null;
            }
            self.postMessage({ msgId, status: 'success' });
            return;
        }

    } catch (error: any) {
        self.postMessage({ 
            msgId, 
            status: 'error', 
            error: error.message || 'Unknown error occurred in Gemma 4 worker' 
        });
    }
};

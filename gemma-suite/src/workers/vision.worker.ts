import { env, pipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
}

let visionPipeline: any = null;

const MODEL_ID = 'Xenova/vit-gpt2-image-captioning';

self.onmessage = async (e: MessageEvent) => {
    const { action, payload, msgId } = e.data;
    
    try {
        if (action === 'LOAD_MODEL') {
            if (!visionPipeline) {
                self.postMessage({
                    msgId,
                    status: 'loading',
                    progress: 0,
                    message: 'Initializing Vision Translator...'
                });
                
                visionPipeline = await pipeline('image-to-text', MODEL_ID, {
                    device: 'wasm', // Strict WASM fallback
                    dtype: 'fp32',  // Strict FP32 (no quantization) to completely avoid DequantizeLinear bugs
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
            if (!visionPipeline) throw new Error('Vision Model not loaded');
            
            const { imageStr } = payload;
            
            // Generate caption from image base64 data URL
            const result = await visionPipeline(imageStr);
            
            // Typically returns [{ generated_text: "a dog in a park" }]
            let caption = '';
            if (Array.isArray(result) && result[0]?.generated_text) {
                caption = result[0].generated_text;
            } else if (typeof result === 'string') {
                caption = result;
            } else {
                caption = JSON.stringify(result);
            }
            
            self.postMessage({ msgId, status: 'success', data: caption });
            return;
        }

        if (action === 'UNLOAD') {
            if (visionPipeline) {
                await visionPipeline.dispose();
                visionPipeline = null;
            }
            self.postMessage({ msgId, status: 'success' });
            return;
        }

    } catch (error: any) {
        console.error('Vision Worker Error:', error);
        self.postMessage({ 
            msgId, 
            status: 'error', 
            error: error.message || 'Unknown error occurred in Vision Translator' 
        });
    }
};

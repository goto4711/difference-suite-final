import { env, pipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
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
        imageStr?: string;
    };
    msgId: number;
}

interface VisionPipeline {
    (image: string): Promise<unknown>;
    dispose?: () => Promise<void>;
}

let visionPipeline: VisionPipeline | null = null;

const MODEL_ID = 'Xenova/vit-gpt2-image-captioning';

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
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
                
                visionPipeline = (await pipeline('image-to-text', MODEL_ID, {
                    device: 'wasm', // Strict WASM fallback
                    dtype: 'fp32',  // Strict FP32 (no quantization) to completely avoid DequantizeLinear bugs
                    progress_callback: (info: ProgressInfo) => {
                        self.postMessage({
                            msgId,
                            status: 'loading',
                            progress: info
                        });
                    }
                })) as unknown as VisionPipeline;
            }
            self.postMessage({ msgId, status: 'success', data: 'Model loaded' });
            return;
        }

        if (action === 'GENERATE') {
            if (!visionPipeline) throw new Error('Vision Model not loaded');
            if (!payload?.imageStr) throw new Error('Missing image input');
            
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
            if (visionPipeline?.dispose) {
                await visionPipeline.dispose();
                visionPipeline = null;
            }
            self.postMessage({ msgId, status: 'success' });
            return;
        }

    } catch (error: unknown) {
        console.error('Vision Worker Error:', error);
        self.postMessage({ 
            msgId, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error occurred in Vision Translator' 
        });
    }
};

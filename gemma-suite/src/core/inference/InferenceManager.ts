import { debug } from '../../utils/log';

type ProgressPayload = {
    status?: string;
    file?: string;
    loaded?: number;
    total?: number;
    progress?: number;
};

type ActiveModel = 'gemma' | 'vision';
type WorkerAction = 'LOAD_MODEL' | 'GENERATE' | 'UNLOAD';
type WorkerStatus = 'loading' | 'success' | 'error';

export type LoadProgressEvent = {
    status: 'loading';
    message?: string;
    progress?: number | ProgressPayload;
};

interface WorkerRequest<TPayload = unknown> {
    action: WorkerAction;
    msgId: number;
    payload?: TPayload;
}

interface WorkerResponse<TData = unknown> {
    msgId: number;
    status: WorkerStatus;
    message?: string;
    progress?: number | ProgressPayload;
    data?: TData;
    error?: string;
}

export interface ChatMessage {
    role: string;
    content: unknown;
}

class InferenceManager {
    private gemmaWorker: Worker | null = null;
    private visionWorker: Worker | null = null;
    private activeModel: ActiveModel | null = null;
    private msgIdCounter = 0;

    constructor() {
    }

    public getStatus() {
        const loadedModels = [];
        if (this.activeModel === 'gemma') {
            loadedModels.push({ id: 'gemma', name: 'Gemma 4 (2B) E2B', device: 'webgpu', memoryFootprintMB: 2800 });
        } else if (this.activeModel === 'vision') {
            loadedModels.push({ id: 'vision', name: 'Vision Translator', device: 'wasm/webgpu', memoryFootprintMB: 250 });
        }
        return { loadedModels };
    }

    private nextMsgId(): number {
        return this.msgIdCounter++;
    }

    private async sendWorkerRequest<TData, TPayload = unknown>(
        worker: Worker,
        request: WorkerRequest<TPayload>,
        onProgress?: (event: LoadProgressEvent) => void,
    ): Promise<TData> {
        return new Promise<TData>((resolve, reject) => {
            const handleMessage = (event: MessageEvent<WorkerResponse<TData>>) => {
                const response = event.data;
                if (response.msgId !== request.msgId) {
                    return;
                }

                if (response.status === 'loading') {
                    onProgress?.({
                        status: 'loading',
                        message: response.message,
                        progress: response.progress,
                    });
                    return;
                }

                worker.removeEventListener('message', handleMessage);

                if (response.status === 'success') {
                    resolve(response.data as TData);
                    return;
                }

                reject(new Error(response.error ?? 'Worker request failed'));
            };

            worker.addEventListener('message', handleMessage);
            worker.postMessage(request);
        });
    }

    private initGemmaWorker() {
        if (!this.gemmaWorker) {
            this.gemmaWorker = new Worker(
                new URL('../../workers/gemma.worker.ts', import.meta.url),
                { type: 'module' }
            );
        }
    }

    private initVisionWorker() {
        if (!this.visionWorker) {
            this.visionWorker = new Worker(
                new URL('../../workers/vision.worker.ts', import.meta.url),
                { type: 'module' }
            );
        }
    }

    public async loadGemma(onProgress?: (event: LoadProgressEvent) => void): Promise<void> {
        if (this.activeModel === 'vision') {
            debug('Unloading Vision Translator to make room for Gemma...');
            await this.unloadVision();
        }

        if (!this.gemmaWorker) {
            this.initGemmaWorker();
        }

        if (!this.gemmaWorker) {
            throw new Error('Gemma worker not initialized');
        }

        await this.sendWorkerRequest<string>(this.gemmaWorker, {
            action: 'LOAD_MODEL',
            msgId: this.nextMsgId(),
        }, onProgress);

        this.activeModel = 'gemma';
    }

    public async generateGemma(messages: ChatMessage[], maxNewTokens: number = 512): Promise<unknown> {
        if (!this.gemmaWorker) {
            throw new Error('Gemma worker not initialized');
        }

        return this.sendWorkerRequest(this.gemmaWorker, {
            action: 'GENERATE',
            payload: { messages, max_new_tokens: maxNewTokens },
            msgId: this.nextMsgId(),
        });
    }

    public async unloadGemma(): Promise<void> {
        if (!this.gemmaWorker) return;

        await this.sendWorkerRequest(this.gemmaWorker, {
            action: 'UNLOAD',
            msgId: this.nextMsgId(),
        });

        if (this.activeModel === 'gemma') this.activeModel = null;
    }

    public async loadVision(onProgress?: (event: LoadProgressEvent) => void): Promise<void> {
        if (this.activeModel === 'gemma') {
            await this.unloadGemma();
        }

        if (!this.visionWorker) {
            this.initVisionWorker();
        }

        if (!this.visionWorker) {
            throw new Error('Vision worker not initialized');
        }

        await this.sendWorkerRequest<string>(this.visionWorker, {
            action: 'LOAD_MODEL',
            msgId: this.nextMsgId(),
        }, onProgress);

        this.activeModel = 'vision';
    }

    public async extractImageCaption(imageStr: string): Promise<string> {
        if (!this.visionWorker) {
            throw new Error('Vision worker not initialized');
        }

        return this.sendWorkerRequest<string>(this.visionWorker, {
            action: 'GENERATE',
            payload: { imageStr },
            msgId: this.nextMsgId(),
        });
    }

    public async unloadVision(): Promise<void> {
        if (!this.visionWorker) return;

        await this.sendWorkerRequest(this.visionWorker, {
            action: 'UNLOAD',
            msgId: this.nextMsgId(),
        });

        if (this.activeModel === 'vision') this.activeModel = null;
    }
}

// Singleton instance
export const inferenceManager = new InferenceManager();

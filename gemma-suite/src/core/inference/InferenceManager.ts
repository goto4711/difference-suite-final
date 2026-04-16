export type LoadProgressEvent = { status: 'loading', message?: string, progress?: any };
export type ModelResponse = { status: 'success', data: any } | { status: 'error', error: string };

class InferenceManager {
    private gemmaWorker: Worker | null = null;
    private sdWorker: Worker | null = null;
    private visionWorker: Worker | null = null;
    private activeModel: 'gemma' | 'sd' | 'vision' | null = null;
    private msgIdCounter = 0;

    constructor() {
    }

    public getStatus() {
        const loadedModels = [];
        if (this.activeModel === 'gemma') {
            loadedModels.push({ id: 'gemma', name: 'Gemma 4 (2B) E2B', device: 'webgpu', memoryFootprintMB: 2800 });
        } else if (this.activeModel === 'sd') {
            loadedModels.push({ id: 'sd', name: 'Stable Diffusion Turbo', device: 'webgpu', memoryFootprintMB: 3500 });
        } else if (this.activeModel === 'vision') {
            loadedModels.push({ id: 'vision', name: 'Vision Translator', device: 'wasm/webgpu', memoryFootprintMB: 250 });
        }
        return { loadedModels };
    }

    private initGemmaWorker() {
        if (!this.gemmaWorker) {
            this.gemmaWorker = new Worker(
                new URL('../../workers/gemma.worker.ts', import.meta.url),
                { type: 'module' }
            );
        }
    }

    private initSdWorker() {
        if (!this.sdWorker) {
            this.sdWorker = new Worker(
                new URL('../../workers/sd.worker.ts', import.meta.url),
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
        return new Promise(async (resolve, reject) => {
            // Mutual exclusion: Unload heavy models if active to free up GPU memory
            if (this.activeModel === 'sd') {
                console.log('Unloading SD to make room for Gemma...');
                await this.unloadSD();
            } else if (this.activeModel === 'vision') {
                console.log('Unloading Vision Translator to make room for Gemma...');
                await this.unloadVision();
            }
            
            if (!this.gemmaWorker) this.initGemmaWorker();
            
            const msgId = this.msgIdCounter++;
            
            const handleMessage = (e: MessageEvent) => {
                if (e.data.msgId !== msgId) return;
                
                if (e.data.status === 'loading' && onProgress) {
                    onProgress(e.data);
                } else if (e.data.status === 'success') {
                    this.gemmaWorker?.removeEventListener('message', handleMessage);
                    this.activeModel = 'gemma';
                    resolve();
                } else if (e.data.status === 'error') {
                    this.gemmaWorker?.removeEventListener('message', handleMessage);
                    reject(new Error(e.data.error));
                }
            };

            this.gemmaWorker?.addEventListener('message', handleMessage);
            this.gemmaWorker?.postMessage({ action: 'LOAD_MODEL', msgId });
        });
    }

    public async generateGemma(messages: any[], maxNewTokens: number = 512): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.gemmaWorker) {
                reject(new Error('Gemma worker not initialized'));
                return;
            }

            const msgId = this.msgIdCounter++;

            const handleMessage = (e: MessageEvent) => {
                if (e.data.msgId !== msgId) return;

                if (e.data.status === 'success') {
                    this.gemmaWorker?.removeEventListener('message', handleMessage);
                    resolve(e.data.data);
                } else if (e.data.status === 'error') {
                    this.gemmaWorker?.removeEventListener('message', handleMessage);
                    reject(new Error(e.data.error));
                }
            };

            this.gemmaWorker?.addEventListener('message', handleMessage);
            this.gemmaWorker?.postMessage({
                action: 'GENERATE',
                payload: { messages, max_new_tokens: maxNewTokens },
                msgId
            });
        });
    }

    public async unloadGemma(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.gemmaWorker) return resolve();
            
            const msgId = this.msgIdCounter++;
            const handleMessage = (e: MessageEvent) => {
                if (e.data.msgId !== msgId) return;
                this.gemmaWorker?.removeEventListener('message', handleMessage);
                if (this.activeModel === 'gemma') this.activeModel = null;
                resolve();
            };
            this.gemmaWorker.addEventListener('message', handleMessage);
            this.gemmaWorker.postMessage({ action: 'UNLOAD', msgId });
        });
    }

    public async loadSD(onProgress?: (event: LoadProgressEvent) => void): Promise<void> {
        return new Promise(async (resolve, reject) => {
            // Mutual exclusion: Unload Gemma/Vision if active to free up GPU memory
            if (this.activeModel === 'gemma') {
                console.log('Unloading Gemma to make room for Stable Diffusion...');
                await this.unloadGemma();
            } else if (this.activeModel === 'vision') {
                await this.unloadVision();
            }
            
            if (!this.sdWorker) this.initSdWorker();
            
            const msgId = this.msgIdCounter++;
            
            const handleMessage = (e: MessageEvent) => {
                if (e.data.msgId !== msgId) return;
                
                if (e.data.status === 'loading' && onProgress) {
                    onProgress(e.data);
                } else if (e.data.status === 'success') {
                    this.sdWorker?.removeEventListener('message', handleMessage);
                    this.activeModel = 'sd';
                    resolve();
                } else if (e.data.status === 'error') {
                    this.sdWorker?.removeEventListener('message', handleMessage);
                    reject(new Error(e.data.error));
                }
            };

            this.sdWorker?.addEventListener('message', handleMessage);
            this.sdWorker?.postMessage({ action: 'LOAD_MODEL', msgId });
        });
    }

    public async generateSD(prompt: string, steps: number = 2): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.sdWorker) {
                reject(new Error('SD worker not initialized'));
                return;
            }

            const msgId = this.msgIdCounter++;

            const handleMessage = (e: MessageEvent) => {
                if (e.data.msgId !== msgId) return;

                if (e.data.status === 'success') {
                    this.sdWorker?.removeEventListener('message', handleMessage);
                    resolve(e.data.data);
                } else if (e.data.status === 'error') {
                    this.sdWorker?.removeEventListener('message', handleMessage);
                    reject(new Error(e.data.error));
                }
            };

            this.sdWorker?.addEventListener('message', handleMessage);
            this.sdWorker?.postMessage({
                action: 'GENERATE',
                payload: { prompt, steps },
                msgId
            });
        });
    }

    public async unloadSD(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.sdWorker) return resolve();
            
            const msgId = this.msgIdCounter++;
            const handleMessage = (e: MessageEvent) => {
                if (e.data.msgId !== msgId) return;
                this.sdWorker?.removeEventListener('message', handleMessage);
                if (this.activeModel === 'sd') this.activeModel = null;
                resolve();
            };
            this.sdWorker.addEventListener('message', handleMessage);
            this.sdWorker.postMessage({ action: 'UNLOAD', msgId });
        });
    }

    public async loadVision(onProgress?: (event: LoadProgressEvent) => void): Promise<void> {
        return new Promise(async (resolve, reject) => {
            // Mutual exclusion: Unload heavy models if active to free up memory
            if (this.activeModel === 'gemma') {
                await this.unloadGemma();
            } else if (this.activeModel === 'sd') {
                await this.unloadSD();
            }
            
            if (!this.visionWorker) this.initVisionWorker();
            
            const msgId = this.msgIdCounter++;
            
            const handleMessage = (e: MessageEvent) => {
                if (e.data.msgId !== msgId) return;
                
                if (e.data.status === 'loading' && onProgress) {
                    onProgress(e.data);
                } else if (e.data.status === 'success') {
                    this.visionWorker?.removeEventListener('message', handleMessage);
                    this.activeModel = 'vision';
                    resolve();
                } else if (e.data.status === 'error') {
                    this.visionWorker?.removeEventListener('message', handleMessage);
                    reject(new Error(e.data.error));
                }
            };

            this.visionWorker?.addEventListener('message', handleMessage);
            this.visionWorker?.postMessage({ action: 'LOAD_MODEL', msgId });
        });
    }

    public async extractImageCaption(imageStr: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.visionWorker) {
                reject(new Error('Vision worker not initialized'));
                return;
            }

            const msgId = this.msgIdCounter++;

            const handleMessage = (e: MessageEvent) => {
                if (e.data.msgId !== msgId) return;

                if (e.data.status === 'success') {
                    this.visionWorker?.removeEventListener('message', handleMessage);
                    resolve(e.data.data);
                } else if (e.data.status === 'error') {
                    this.visionWorker?.removeEventListener('message', handleMessage);
                    reject(new Error(e.data.error));
                }
            };

            this.visionWorker?.addEventListener('message', handleMessage);
            this.visionWorker?.postMessage({
                action: 'GENERATE',
                payload: { imageStr },
                msgId
            });
        });
    }

    public async unloadVision(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.visionWorker) return resolve();
            
            const msgId = this.msgIdCounter++;
            const handleMessage = (e: MessageEvent) => {
                if (e.data.msgId !== msgId) return;
                this.visionWorker?.removeEventListener('message', handleMessage);
                if (this.activeModel === 'vision') this.activeModel = null;
                resolve();
            };
            this.visionWorker.addEventListener('message', handleMessage);
            this.visionWorker.postMessage({ action: 'UNLOAD', msgId });
        });
    }
}

// Singleton instance
export const inferenceManager = new InferenceManager();

import { transformersClient } from '../../../../core/inference/TransformersClient';

class VectorManager {
    constructor() {
        this.models = {
            image: true, // handled by worker
            text: true,  // handled by worker
            sound: null
        };
    }

    async loadModel(mode) {
        // Model loading is handled by TransformersClient on demand
        return true;
    }

    async getVector(input, mode) {
        if (mode === 'image') {
            // input can be a URL or data URI. In the worker it might need to be a RawImage.
            // For now, if input is an HTMLImageElement/VideoElement, we should extract the pixels or URI.
            let imageSource = input;
            if (input instanceof HTMLImageElement || input instanceof HTMLCanvasElement) {
                imageSource = input.src || input.toDataURL();
            }

            const result = await transformersClient.run({
                id: crypto.randomUUID(),
                tool: 'DeepVectorMirror',
                model: 'clip-vit-base-patch32-q4',
                task: 'feature-extraction',
                payload: { text: '', imageUrl: imageSource } // CLIP handler or feature-extraction handles image
            });
            return Array.from(result.output);

        } else if (mode === 'text') {
            const result = await transformersClient.run({
                id: crypto.randomUUID(),
                tool: 'DeepVectorMirror',
                model: 'bge-small-en-v1.5',
                task: 'feature-extraction',
                payload: { text: input }
            });
            return Array.from(result.output);

        } else if (mode === 'sound') {
            // spectrogram data (Float32Array)
            return Array.from(input);
        }
        return [];
    }

    getSoundRecognizer() {
        return this.recognizer;
    }
}

export const vectorManager = new VectorManager();

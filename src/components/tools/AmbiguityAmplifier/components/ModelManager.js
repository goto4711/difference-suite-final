import * as tf from '@tensorflow/tfjs';
import { transformersClient } from '../../../../core/inference/TransformersClient';

class ModelManager {
    constructor() {
        this.isReady = false;
    }

    async loadModel() {
        this.isReady = true;
        console.log("Ambiguity Amplifier (Image) using TransformersClient");
    }

    async predict(input, noiseLevel = 0) {
        if (!this.isReady) return null;

        // 1. Get image tensor
        let img;
        if (input instanceof tf.Tensor) {
            img = input.clone();
        } else {
            img = tf.browser.fromPixels(input);
        }

        // 2. Resize to 224x224
        img = tf.image.resizeBilinear(img, [224, 224]);

        // 3. Add noise if needed
        if (noiseLevel > 0) {
            const noise = tf.randomNormal([224, 224, 3], 0, noiseLevel * 50);
            const noisy = img.add(noise);
            img.dispose();
            noise.dispose();
            img = noisy.clipByValue(0, 255);
        }

        // 4. Convert to data URL for the worker
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        // toPixels expects Int32, so we cast to int32 before toPixels
        const intImg = img.cast('int32');
        await tf.browser.toPixels(intImg, canvas);
        intImg.dispose();
        img.dispose();
        
        const dataUrl = canvas.toDataURL('image/jpeg');

        // 5. Classify via TransformersClient
        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'AmbiguityAmplifier',
            model: 'resnet-50',
            task: 'image-classification',
            payload: { image: dataUrl, topK: 10 }
        });

        // Map output `{ label: string, score: number }` to `{ className: string, probability: number }`
        const predictions = result.output;
        return predictions.map(p => ({
            className: p.label,
            probability: p.score
        }));
    }
}

export const modelManager = new ModelManager();

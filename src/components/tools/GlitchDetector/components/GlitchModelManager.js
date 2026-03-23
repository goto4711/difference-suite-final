import * as tf from '@tensorflow/tfjs';
import { transformersClient } from '../../../../core/inference/TransformersClient';

class ModelManager {
    constructor() {
        this.examples = []; // Stores activation tensors
        this.isReady = false;
    }

    async loadModel() {
        this.isReady = true;
        console.log("Glitch Detector (Image) using TransformersClient");
    }

    async extractFeature(tensor) {
        // Convert to data URL
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const resized = tf.image.resizeBilinear(tensor, [224, 224]);
        const intImg = resized.cast('int32');
        await tf.browser.toPixels(intImg, canvas);
        intImg.dispose();
        resized.dispose();

        const dataUrl = canvas.toDataURL('image/jpeg');

        // Extract embedding with CLIP
        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'GlitchDetector',
            model: 'clip-vit-base-patch32-q4',
            task: 'feature-extraction',
            payload: { image: dataUrl }
        });

        // Transformers.js feature-extraction returns float32 array
        // We wrap it in a [1, N] tensor
        return tf.tensor2d([result.output]);
    }

    async addExample(tensor) {
        if (!this.isReady) return;
        const activation = await this.extractFeature(tensor);
        this.examples.push(activation);
    }

    async predict(tensor) {
        if (!this.isReady || this.examples.length === 0) return null;

        const inputActivation = await this.extractFeature(tensor);

        const maxSim = tf.tidy(() => {
            // Stack all examples into one tensor: [N, 512]
            const database = tf.concat(this.examples, 0);

            // Normalize Input: [1, 512]
            const inputNorm = inputActivation.div(inputActivation.norm());

            // Normalize Database: [N, 512]
            const databaseNorm = database.div(database.norm('euclidean', 1, true));

            // Cosine Similarity: [N, 1]
            const similarities = tf.matMul(databaseNorm, inputNorm.transpose());

            return similarities.max().dataSync()[0];
        });

        inputActivation.dispose();

        // Score 1.0 = Identical to a normal example
        // Score < 0.5 = Very different
        return {
            confidences: { 'normal': maxSim }
        };
    }

    clear() {
        this.examples.forEach(t => t.dispose());
        this.examples = [];
    }

    getExampleCount() {
        return this.examples.length;
    }
}

export const modelManager = new ModelManager();

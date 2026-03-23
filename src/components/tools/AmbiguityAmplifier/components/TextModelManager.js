import { transformersClient } from '../../../../core/inference/TransformersClient';
import * as tf from '@tensorflow/tfjs';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

class TextModelManager {
    constructor() {
        this.classifier = null;
        this.isReady = false;
    }

    async loadModel() {
        if (this.isReady) return;
        this.classifier = knnClassifier.create();
        this.isReady = true;
        console.log("KNN Classifier initialized for Ambiguity Amplifier Text (TransformersClient backend)");
    }

    async addExample(text, label) {
        console.log('[TextModelManager] addExample (TransformersClient):', { text: text?.substring(0, 50), label });
        if (!this.isReady || !this.classifier) {
            await this.loadModel();
        }

        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'AmbiguityAmplifier',
            model: 'bge-small-en-v1.5',
            task: 'feature-extraction',
            payload: { text }
        });
        const embeddingArray = result.output;
        const tensor = tf.tensor2d([embeddingArray]);
        this.classifier.addExample(tensor, label);

        console.log('[TextModelManager] Example added. Current counts:', this.classifier.getClassExampleCount());
        tensor.dispose();
    }

    async predict(text) {
        if (!this.isReady || !this.classifier) return null;
        if (this.classifier.getNumClasses() === 0) return null;

        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'AmbiguityAmplifier',
            model: 'bge-small-en-v1.5',
            task: 'feature-extraction',
            payload: { text }
        });
        const embeddingArray = result.output;
        const tensor = tf.tensor2d([embeddingArray]);
        const resultClass = await this.classifier.predictClass(tensor);

        tensor.dispose();
        return resultClass;
    }

    clear() {
        if (this.classifier) {
            this.classifier.clearAllClasses();
        }
    }

    getExampleCount() {
        if (!this.classifier) return {};
        return this.classifier.getClassExampleCount();
    }
}

export const textModelManager = new TextModelManager();

import * as tf from '@tensorflow/tfjs';
import { dictionary } from '../data/dictionary';
import { transformersClient } from '../../../../core/inference/TransformersClient';

class LatentTextModelManager {
    private dictionaryEmbeddings: tf.Tensor2D | null = null;
    private dictionaryWords: string[] = dictionary;
    private isInitialized: boolean = false;

    public async loadModel(onProgress?: (stage: string, progress: number) => void) {
        if (this.isInitialized && this.dictionaryEmbeddings) {
            if (onProgress) onProgress('Ready', 1.0);
            return;
        }

        console.log("Latent Space Navigator: Initializing Transformers.js worker...");
        if (onProgress) onProgress('Initializing', 0.1);

        // Pre-compute embeddings for dictionary using the new client
        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'LatentSpaceNavigator',
            model: 'bge-small-en-v1.5',
            task: 'feature-extraction',
            payload: { texts: this.dictionaryWords }
        }, (p) => {
            if (onProgress) {
                onProgress(p.message || 'Computing Dictionary', p.progress || 0.5);
            }
        });
        
        const embeddingsArray = result.output;

        // Convert to TF.js Tensor for fast similarity search
        const tensor = tf.tensor2d(embeddingsArray as any);
        this.dictionaryEmbeddings = tensor;
        this.isInitialized = true;

        if (onProgress) {
            onProgress('Ready', 1.0);
        }

        const shapeInfo = tensor.shape.join('x');
        console.log(`Latent Navigator: Dictionary embeddings computed (${shapeInfo})`);
    }

    private async ensureInitialized() {
        if (this.isInitialized && this.dictionaryEmbeddings) return;
        await this.loadModel();
    }

    async getNearest(vectorTensor: tf.Tensor2D) {
        await this.ensureInitialized();

        if (!this.dictionaryEmbeddings) {
            console.error("LatentTextModelManager: Dictionary embeddings not loaded.");
            return null;
        }

        return tf.tidy(() => {
            // Calculate Cosine Similarity
            const v = tf.div(vectorTensor, tf.add(tf.norm(vectorTensor, 2, 1, true), 1e-8));
            const dict = this.dictionaryEmbeddings!;
            const dictNorm = tf.div(dict, tf.add(tf.norm(dict, 2, 1, true), 1e-8));

            // Dot product: [1, 384] * [N, 384]^T = [1, N]
            const similarities = tf.matMul(v, dictNorm, false, true);

            // Get top k
            const { values, indices } = tf.topk(similarities, 5);
            const topIndices = indices.dataSync();
            const topScores = values.dataSync();

            const results = [];
            for (let i = 0; i < topIndices.length; i++) {
                results.push({
                    word: this.dictionaryWords[topIndices[i]],
                    score: topScores[i]
                });
            }
            return results;
        });
    }

    async interpolate(textA: string, textB: string, t: number) {
        await this.ensureInitialized();

        // Get embeddings from TransformersClient
        const resA = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'LatentSpaceNavigator',
            model: 'bge-small-en-v1.5',
            task: 'feature-extraction',
            payload: { text: textA }
        });
        const resB = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'LatentSpaceNavigator',
            model: 'bge-small-en-v1.5',
            task: 'feature-extraction',
            payload: { text: textB }
        });

        const embA = tf.tensor2d([resA.output as any]);
        const embB = tf.tensor2d([resB.output as any]);

        const interpolated = tf.tidy(() => {
            // Linear Interpolation: A * (1-t) + B * t
            return tf.add(
                embA.mul(1 - t),
                embB.mul(t)
            ) as tf.Tensor2D;
        });

        const nearest = await this.getNearest(interpolated);

        embA.dispose();
        embB.dispose();
        interpolated.dispose();
        return nearest;
    }

    async extendDictionary(words: string[]) {
        // Filter out existing words and normalize
        const newWords = words
            .map(w => w.toLowerCase().trim())
            .filter(w => w.length > 2)
            .filter(w => !this.dictionaryWords.includes(w));

        if (newWords.length === 0) return;

        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'LatentSpaceNavigator',
            model: 'bge-small-en-v1.5',
            task: 'feature-extraction',
            payload: { texts: newWords }
        });
        const newEmbeddingsArray = result.output;
        const newEmbeddings = tf.tensor2d(newEmbeddingsArray as any);

        if (this.dictionaryEmbeddings) {
            const oldEmbeddings = this.dictionaryEmbeddings;
            this.dictionaryEmbeddings = tf.concat([oldEmbeddings, newEmbeddings]) as tf.Tensor2D;
            oldEmbeddings.dispose();
            newEmbeddings.dispose();
        } else {
            this.dictionaryEmbeddings = newEmbeddings;
        }

        this.dictionaryWords = [...this.dictionaryWords, ...newWords];
        console.log(`Latent Navigator: Dictionary size is now ${this.dictionaryWords.length}`);
    }

    async getEmbedding(text: string) {
        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'LatentSpaceNavigator',
            model: 'bge-small-en-v1.5',
            task: 'feature-extraction',
            payload: { text }
        });
        return tf.tensor2d([result.output as any]);
    }
}

export const latentTextManager = new LatentTextModelManager();

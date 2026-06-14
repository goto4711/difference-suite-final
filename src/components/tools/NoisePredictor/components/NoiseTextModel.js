import * as tf from '@tensorflow/tfjs';
import { debug } from '../../../../utils/log';

export class NoiseTextModel {
    constructor() {
        this.model = null;
        this.latentDim = 32;
    }

    // Caller must pass inputDim derived from the actual embedding width
    // (different embedding models produce different widths — 384, 512, 768, …).
    async createModel(inputDim, latentDim = 32) {
        if (!inputDim || inputDim <= 0) {
            throw new Error('NoiseTextModel.createModel: inputDim is required.');
        }
        this.latentDim = latentDim;

        const input = tf.input({ shape: [inputDim] });

        // Encoder
        let x = tf.layers.dense({
            units: 128,
            activation: 'relu'
        }).apply(input);

        x = tf.layers.dense({
            units: latentDim,
            activation: 'relu',
            name: 'bottleneck'
        }).apply(x);

        // Decoder
        x = tf.layers.dense({
            units: 128,
            activation: 'relu'
        }).apply(x);

        const output = tf.layers.dense({
            units: inputDim,
            activation: 'linear' // Embeddings can be positive or negative
        }).apply(x);

        this.model = tf.model({ inputs: input, outputs: output });

        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError'
        });

        debug('NoiseTextModel: Model created with latent dim', latentDim);
    }

    async train(embeddingsTensor, epochs = 50, onEpochEnd) {
        if (!this.model) return;

        await this.model.fit(embeddingsTensor, embeddingsTensor, {
            epochs: epochs,
            batchSize: 1,
            shuffle: false,
            yieldEvery: 'epoch',
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if (onEpochEnd) onEpochEnd(epoch, logs.loss);
                }
            }
        });
    }

    predict(embeddingsTensor) {
        if (!this.model) return null;
        return this.model.predict(embeddingsTensor);
    }

    getResidual(original, reconstructed) {
        return tf.tidy(() => {
            return tf.sub(original, reconstructed).abs();
        });
    }
}

import * as tf from '@tensorflow/tfjs';

export class NoiseModel {
    constructor() {
        this.model = null;
        this.latentDim = 32; // Default bottleneck
    }

    async createModel(inputShape, latentDim = 32) {
        console.log('Creating model with input shape:', inputShape);
        this.latentDim = latentDim;

        // Encoder
        const input = tf.input({ shape: inputShape });
        console.log('Input created');

        let x = tf.layers.conv2d({
            filters: 16,
            kernelSize: 3,
            activation: 'relu',
            padding: 'same'
        }).apply(input);

        x = tf.layers.maxPooling2d({
            poolSize: 2,
            padding: 'same'
        }).apply(x);

        x = tf.layers.conv2d({
            filters: 8,
            kernelSize: 3,
            activation: 'relu',
            padding: 'same'
        }).apply(x);

        x = tf.layers.maxPooling2d({
            poolSize: 2,
            padding: 'same'
        }).apply(x);

        // Decoder
        x = tf.layers.upSampling2d({ size: [2, 2] }).apply(x);

        x = tf.layers.conv2d({
            filters: 8,
            kernelSize: 3,
            activation: 'relu',
            padding: 'same'
        }).apply(x);

        x = tf.layers.upSampling2d({ size: [2, 2] }).apply(x);

        const output = tf.layers.conv2d({
            filters: 3,
            kernelSize: 3,
            activation: 'sigmoid',
            padding: 'same'
        }).apply(x);

        console.log('Building model...');
        this.model = tf.model({ inputs: input, outputs: output });
        console.log('Model built, output shape:', this.model.outputShape);

        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError'
        });

        console.log('Model compiled successfully');
    }

    async train(tensor, epochs = 50, onEpochEnd) {
        if (!this.model) {
            console.error('Model not initialized');
            return;
        }

        console.log('model.fit starting...');

        await this.model.fit(tensor, tensor, {
            epochs: epochs,
            batchSize: 1,
            shuffle: false,
            yieldEvery: 'epoch',
            callbacks: {
                onEpochBegin: () => {
                    console.log('Epoch beginning...');
                },
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch} complete, loss: ${logs.loss}`);
                    if (onEpochEnd) {
                        onEpochEnd(epoch, logs.loss);
                    }
                }
            }
        });

        console.log('model.fit complete');
    }

    predict(tensor) {
        if (!this.model) return null;
        return this.model.predict(tensor);
    }

    getResidual(original, reconstructed) {
        return tf.tidy(() => {
            // Abs difference
            const diff = tf.sub(original, reconstructed).abs();
            // Enhance contrast to make the "noise" visible
            const enhanced = diff.mul(5).clipByValue(0, 1);
            return enhanced;
        });
    }
}

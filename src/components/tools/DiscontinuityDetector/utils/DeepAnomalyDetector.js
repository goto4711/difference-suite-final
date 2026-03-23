import * as tf from '@tensorflow/tfjs';

/**
 * Deep Learning Anomaly Detector using LSTM.
 * Trains a model to predict the next value in the sequence.
 * Anomalies are points where the prediction error (MSE) is high.
 */
export class DeepAnomalyDetector {
    constructor(windowSize = 10) {
        this.windowSize = windowSize;
        this.model = null;
        this.normalizationStats = { min: 0, max: 1 };
    }

    /**
     * Preprocess data: Normalize to 0-1 range.
     */
    normalize(data) {
        const values = data.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        this.normalizationStats = { min, max };

        // Avoid division by zero if flat line
        const range = max - min === 0 ? 1 : max - min;

        return values.map(v => (v - min) / range);
    }

    /**
     * Create sequences for LSTM training (X, y pairs).
     */
    createSequences(normalizedData) {
        const X = [];
        const y = [];

        for (let i = 0; i < normalizedData.length - this.windowSize; i++) {
            X.push(normalizedData.slice(i, i + this.windowSize));
            y.push(normalizedData[i + this.windowSize]);
        }

        return {
            xs: tf.tensor2d(X, [X.length, this.windowSize]).reshape([X.length, this.windowSize, 1]),
            ys: tf.tensor2d(y, [y.length, 1])
        };
    }

    /**
     * Build and compile the LSTM model.
     */
    buildModel() {
        const model = tf.sequential();

        // LSTM Layer
        model.add(tf.layers.lstm({
            units: 32,
            inputShape: [this.windowSize, 1],
            returnSequences: false
        }));

        // Output Layer (Dense)
        model.add(tf.layers.dense({ units: 1 }));

        model.compile({
            optimizer: tf.train.adam(0.01),
            loss: 'meanSquaredError'
        });

        return model;
    }

    /**
     * Train the model on the provided data.
     */
    async train(data, onEpochEnd) {
        if (data.length < this.windowSize + 5) {
            throw new Error("Not enough data points to train (need at least windowSize + 5).");
        }

        const normalized = this.normalize(data);
        const { xs, ys } = this.createSequences(normalized);

        this.model = this.buildModel();

        await this.model.fit(xs, ys, {
            epochs: 50,
            batchSize: 32,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if (onEpochEnd) onEpochEnd(epoch, logs.loss);
                }
            }
        });

        xs.dispose();
        ys.dispose();
    }

    /**
     * Detect anomalies by comparing predictions vs actuals.
     */
    detect(data, thresholdMultiplier = 2.0) {
        if (!this.model) throw new Error("Model not trained yet.");

        const normalized = this.normalize(data);
        const X_test = [];

        // Prepare input sequences for the whole series (padding start with 0s for simplicity in visualization alignment)
        // Actually, simpler to just predict for valid windows and map back to indices
        for (let i = 0; i < normalized.length - this.windowSize; i++) {
            X_test.push(normalized.slice(i, i + this.windowSize));
        }

        const xs = tf.tensor2d(X_test, [X_test.length, this.windowSize]).reshape([X_test.length, this.windowSize, 1]);
        const predsTensor = this.model.predict(xs);
        const preds = predsTensor.dataSync(); // Sync for simplicity in this prototype

        xs.dispose();
        predsTensor.dispose();

        // Calculate errors
        const range = this.normalizationStats.max - this.normalizationStats.min;
        const min = this.normalizationStats.min;

        const results = data.map((item, index) => {
            // We can only predict from index = windowSize onwards
            if (index < this.windowSize) {
                return { ...item, predictedValue: null, error: 0, isAnomaly: false };
            }

            const predNorm = preds[index - this.windowSize];
            const predValue = (predNorm * range) + min; // Denormalize
            const error = Math.abs(item.value - predValue);

            return {
                ...item,
                predictedValue: predValue,
                error: error
            };
        });

        // Calculate threshold based on error distribution (Mean + N * StdDev)
        const errors = results.filter(r => r.predictedValue !== null).map(r => r.error);
        const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
        const variance = errors.reduce((a, b) => a + Math.pow(b - meanError, 2), 0) / errors.length;
        const stdDev = Math.sqrt(variance);

        const threshold = meanError + (thresholdMultiplier * stdDev);

        return results.map(r => ({
            ...r,
            isAnomaly: r.error > threshold,
            score: r.error // Use raw error as score for now
        }));
    }
}

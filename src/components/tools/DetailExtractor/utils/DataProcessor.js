import { transformersClient } from '../../../../core/inference/TransformersClient';

export const loadModels = async () => {
    // Model loading is handled by TransformersClient on demand
    return true;
};

export const processTextData = async (texts) => {
    // Get embeddings using the new worker-based client
    const result = await transformersClient.run({
        id: crypto.randomUUID(),
        tool: 'DetailExtractor',
        model: 'bge-small-en-v1.5',
        task: 'feature-extraction',
        payload: { texts }
    });
    const embeddings = result.output;

    // Simple K-Means Clustering (k=3 for now)
    const k = 3;
    const { clusters, centroids } = kMeans(embeddings, k);

    // Calculate distance to nearest centroid for each item
    const processedData = texts.map((text, i) => {
        const embedding = embeddings[i];
        const clusterIndex = clusters[i];
        const centroid = centroids[clusterIndex];
        const distance = euclideanDistance(embedding, centroid);

        return {
            id: i,
            content: text,
            type: 'text',
            embedding,
            cluster: clusterIndex,
            distance,
            x: 0, // Will be calculated by projection
            y: 0
        };
    });

    // Project to 2D (Simple PCA-like projection or just use first 2 dims of embedding? 
    // Embeddings are 512 dim. First 2 dims might be noise.
    // Let's do a simple projection: map to distance from center + angle?)
    // Better: PCA.
    const points = projectTo2D(embeddings);
    processedData.forEach((d, i) => {
        d.x = points[i][0];
        d.y = points[i][1];
    });

    return { data: processedData, centroids };
};

// Simple K-Means implementation
const kMeans = (data, k) => {
    // Initialize centroids randomly
    let centroids = data.slice(0, k);
    let clusters = new Array(data.length).fill(0);
    let iterations = 0;
    const maxIterations = 20;

    while (iterations < maxIterations) {
        // Assign clusters
        let changed = false;
        clusters = data.map(point => {
            let minDist = Infinity;
            let cluster = 0;
            centroids.forEach((centroid, i) => {
                const dist = euclideanDistance(point, centroid);
                if (dist < minDist) {
                    minDist = dist;
                    cluster = i;
                }
            });
            return cluster;
        });

        // Update centroids
        const newCentroids = Array(k).fill(0).map(() => Array(data[0].length).fill(0));
        const counts = Array(k).fill(0);

        data.forEach((point, i) => {
            const cluster = clusters[i];
            counts[cluster]++;
            for (let j = 0; j < point.length; j++) {
                newCentroids[cluster][j] += point[j];
            }
        });

        centroids = newCentroids.map((c, i) => {
            if (counts[i] === 0) return centroids[i]; // Keep old if empty
            return c.map(val => val / counts[i]);
        });

        iterations++;
    }

    return { clusters, centroids };
};

const euclideanDistance = (a, b) => {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
};

// Simple projection (PCA-ish: find two furthest points as axis?)
// For now, let's just pick 2 random dimensions that have high variance? 
// Or better: Use the distance to the two furthest centroids as X and Y?
const projectTo2D = (data) => {
    // Very naive projection: just use first 2 dimensions for speed
    // This is bad for USE embeddings.
    // Better: PCA

    // Compute mean
    const mean = data[0].map((_, i) => data.reduce((sum, row) => sum + row[i], 0) / data.length);

    // Center data
    const centered = data.map(row => row.map((val, i) => val - mean[i]));

    // Find first principal component (direction of max variance) - Power Iteration
    const getPC = (matrix) => {
        let v = Array(matrix[0].length).fill(1).map(Math.random);
        // Normalize
        let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
        v = v.map(x => x / norm);

        for (let i = 0; i < 5; i++) {
            // Multiply matrix * v
            // Actually we need Covariance * v. 
            // C = (X^T * X) / n
            // C*v = X^T * (X * v) / n

            // X * v
            const Xv = matrix.map(row => row.reduce((s, x, idx) => s + x * v[idx], 0));

            // X^T * (Xv)
            const XtXv = Array(v.length).fill(0).map((_, idx) => {
                return matrix.reduce((s, row, rIdx) => s + row[idx] * Xv[rIdx], 0);
            });

            v = XtXv;
            norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
            v = v.map(x => x / norm);
        }
        return v;
    };

    const pc1 = getPC(centered);

    // Deflate? Or just find PC2 orthogonal?
    // Let's just use PC1 as X, and distance from PC1 as Y?
    // Or just pick a random orthogonal vector for Y?

    // Let's try to find PC2 roughly.
    // Subtract projection on PC1 from data
    const centered2 = centered.map(row => {
        const dot = row.reduce((s, x, i) => s + x * pc1[i], 0);
        return row.map((x, i) => x - dot * pc1[i]);
    });

    const pc2 = getPC(centered2);

    // Project
    return centered.map(row => {
        const x = row.reduce((s, val, i) => s + val * pc1[i], 0);
        const y = row.reduce((s, val, i) => s + val * pc2[i], 0);
        return [x, y];
    });
};

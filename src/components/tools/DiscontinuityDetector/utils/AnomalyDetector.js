/**
 * Simple statistical anomaly detection for time-series data.
 * Uses a moving average and standard deviation (Z-score) to flag outliers.
 */

export const detectAnomalies = (data, windowSize = 5, threshold = 2.0) => {
    if (!data || data.length < windowSize) return data.map(d => ({ ...d, isAnomaly: false, score: 0 }));

    const processed = data.map((item, index) => {
        // Calculate moving average and std dev for the window ending at current index
        const start = Math.max(0, index - windowSize);
        const window = data.slice(start, index + 1).map(d => d.value);

        const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
        const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
        const stdDev = Math.sqrt(variance);

        // Avoid division by zero
        const zScore = stdDev === 0 ? 0 : Math.abs((item.value - mean) / stdDev);

        return {
            ...item,
            isAnomaly: zScore > threshold,
            score: zScore,
            mean, // useful for visualization
        };
    });

    return processed;
};

// Mock data generator for testing
export const generateMockData = (points = 100) => {
    const data = [];
    let value = 20; // Baseline "online chatter"
    const now = new Date();
    // Start 100 days ago
    const startDate = new Date(now.getTime() - points * 24 * 60 * 60 * 1000);

    for (let i = 0; i < points; i++) {
        // Random walk with mean reversion (simulating normal social media activity)
        const noise = (Math.random() - 0.5) * 5;
        value = value + noise + (20 - value) * 0.1;

        let content = "Routine grassroots organizing and community discussions.";
        let isArtificialAnomaly = false;

        // Inject Contingent Events (Anomalies)
        if (i === 30) {
            value += 60; // Sudden spike
            content = "CONTINGENCY: Viral Campaign Launch. A hashtag gains sudden traction.";
            isArtificialAnomaly = true;
        } else if (i === 31 || i === 32) {
            value *= 0.8; // Decay
            content = "Campaign momentum sustains high engagement.";
        } else if (i === 65) {
            value += 80; // Massive spike
            content = "CONTINGENCY: Protest Event. Mass mobilization in the city square.";
            isArtificialAnomaly = true;
        } else if (i === 85) {
            value -= 15; // Drop below baseline
            content = "CONTINGENCY: Government Crackdown / Internet Shutdown. Silence in the signal.";
            isArtificialAnomaly = true;
        }

        data.push({
            id: i,
            timestamp: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: Math.max(0, value),
            content: content
        });
    }
    return data;
};

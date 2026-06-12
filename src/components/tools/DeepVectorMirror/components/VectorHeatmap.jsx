import React, { useEffect, useRef } from 'react';

const VectorHeatmap = ({ vector, width = 300, height = 300 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !vector || vector.length === 0) return;

        const ctx = canvas.getContext('2d');
        const numValues = vector.length;

        // We'll visualize it as a square grid if possible, or just lines
        const side = Math.ceil(Math.sqrt(numValues));
        const cellWidth = width / side;
        const cellHeight = height / side;

        ctx.clearRect(0, 0, width, height);

        // Robust scale: CLIP-style embeddings contain a few extreme outlier
        // dimensions (one value can be ~10x all others). Normalising by the MAX
        // made every other cell round to black. Scale by the 95th percentile of
        // magnitudes instead, clamp the outliers, and compress with sqrt so the
        // bulk of small activations stays visible.
        const magnitudes = vector.map(Math.abs).sort((a, b) => a - b);
        const scale = magnitudes[Math.floor(magnitudes.length * 0.95)] || 0.0001;

        for (let i = 0; i < numValues; i++) {
            const val = vector[i];

            const clamped = Math.max(-1, Math.min(1, val / scale));
            const intensity = Math.sqrt(Math.abs(clamped)); // perceptual boost for small values

            let r = 0, g = 0, b = 0;
            if (clamped > 0) {
                r = Math.floor(intensity * 255);
            } else {
                b = Math.floor(intensity * 255);
            }
            // Add some green for "activity"
            g = Math.floor(intensity * 50);

            ctx.fillStyle = `rgb(${r},${g},${b})`;

            const x = (i % side) * cellWidth;
            const y = Math.floor(i / side) * cellHeight;

            ctx.fillRect(x, y, cellWidth, cellHeight);
        }

    }, [vector, width, height]);

    return (
        <div className="vector-heatmap" style={{ border: '4px solid var(--color-main)', padding: '4px', display: 'inline-block' }}>
            <canvas ref={canvasRef} width={width} height={height} />
        </div>
    );
};

export default VectorHeatmap;

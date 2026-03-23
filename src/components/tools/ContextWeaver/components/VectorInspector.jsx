import React, { useEffect, useRef } from 'react';

const VectorInspector = ({ queryVector, matchVector, matchText, color }) => {
    const canvasRef = useRef(null);
    const [hoverInfo, setHoverInfo] = React.useState(null);

    useEffect(() => {
        if (!queryVector || !matchVector || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const barHeight = height / 2;
        const numDims = queryVector.length;
        const barWidth = width / numDims;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Helper to draw a vector strip
        const drawStrip = (vector, yOffset) => {
            vector.forEach((val, i) => {
                const intensity = Math.max(-1, Math.min(1, val * 10));
                let r, g, b;
                if (intensity > 0) {
                    r = 255 - (255 - 131) * intensity;
                    g = 255 - (255 - 33) * intensity;
                    b = 255 - (255 - 97) * intensity;
                } else {
                    const absInt = Math.abs(intensity);
                    r = 255 - (255 - 173) * absInt;
                    g = 255 - (255 - 252) * absInt;
                    b = 255 - (255 - 146) * absInt;
                }
                ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
                ctx.fillRect(i * barWidth, yOffset, barWidth + 0.5, barHeight);
            });
        };

        drawStrip(queryVector, 0);
        drawStrip(matchVector, barHeight);

        // Draw separator
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, barHeight - 1, width, 2);

    }, [queryVector, matchVector]);

    const handleMouseMove = (e) => {
        if (!canvasRef.current || !queryVector || !matchVector) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const width = rect.width;
        const height = rect.height;

        const dimIndex = Math.floor((x / width) * queryVector.length);
        const isQuery = y < height / 2;
        const value = isQuery ? queryVector[dimIndex] : matchVector[dimIndex];

        setHoverInfo({
            x: e.clientX,
            y: e.clientY,
            dim: dimIndex,
            value: value.toFixed(4),
            type: isQuery ? "Query" : "Match"
        });
    };

    return (
        <div className="bg-white border-2 border-main p-6 mt-8 relative">
            <h2 className="text-xl font-bold text-main uppercase mb-4 flex justify-between items-center">
                <span>Vector Inspector</span>
                <span className="text-sm font-mono opacity-70">512 Dimensions</span>
            </h2>

            <div className="mb-4 relative group">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-1 opacity-70">
                    <span>Query Vector (Top)</span>
                    <span>Match Vector: "{matchText}" (Bottom)</span>
                </div>
                <canvas
                    ref={canvasRef}
                    width={1024}
                    height={100}
                    className="w-full h-24 border border-black/10 image-pixelated cursor-crosshair"
                    style={{ imageRendering: 'pixelated' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverInfo(null)}
                />

                {/* Hover Tooltip */}
                {hoverInfo && (
                    <div
                        className="fixed z-50 bg-white text-black border border-black text-xs font-mono p-2 rounded pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px] shadow-lg"
                        style={{ left: hoverInfo.x, top: hoverInfo.y }}
                    >
                        <div>Dim: {hoverInfo.dim}</div>
                        <div>Val: {hoverInfo.value}</div>
                        <div className="opacity-50 uppercase text-[10px]">{hoverInfo.type}</div>
                    </div>
                )}
            </div>

            <p className="text-sm opacity-70">
                Visualizing the raw "thought" vectors.
                <span className="text-main font-bold"> Purple</span> indicates positive activation,
                <span className="text-[var(--color-alt)] font-bold bg-black/5 px-1"> Green</span> indicates negative.
                Vertical alignment of colors shows why these two texts are considered similar.
            </p>
        </div>
    );
};

export default VectorInspector;

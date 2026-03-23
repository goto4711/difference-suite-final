import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export const GraphViz = ({ data, onNodeClick }) => {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    }, [containerRef.current]);

    return (
        <div ref={containerRef} className="w-full h-full border border-deep-surface shadow-lg bg-[#D3D3D3] overflow-hidden rounded-lg">
            <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={data}
                nodeLabel="name"
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 12 / globalScale;

                    if (node.type === 'image' && node.img) {
                        const size = 12; // Base size
                        // Draw circle clip
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                        ctx.fillStyle = '#fff';
                        ctx.fill();

                        // We need to handle image loading efficiently
                        // This pattern assumes browser caching is fast enough or use a simple external cache
                        if (!node.__imgObj) {
                            const img = new Image();
                            img.src = node.img;
                            node.__imgObj = img; // Attach to node for re-use
                        }

                        const img = node.__imgObj;
                        if (img.complete) {
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                            ctx.clip();
                            ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
                            ctx.restore();

                            // Border
                            ctx.stroke();
                        } else {
                            // Fallback while loading
                            ctx.fillStyle = '#cccccc';
                            ctx.fill();
                        }
                    } else {
                        // Standard Node Drawing
                        const r = 4;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);

                        let color = '#a3a3a3';
                        switch (node.type) {
                            case 'person': color = '#8b5cf6'; break;
                            case 'place': color = '#10b981'; break;
                            case 'org': color = '#f43f5e'; break;
                            case 'concept': color = '#f59e0b'; break; // Amber
                        }
                        ctx.fillStyle = color;
                        ctx.fill();

                        // Text Label
                        if (globalScale >= 1.5) { // Only show labels when zoomed in
                            ctx.font = `${fontSize}px Sans-Serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = 'black';
                            ctx.fillText(label, node.x, node.y + 6);
                        }
                    }
                }}
                nodeRelSize={6}
                linkColor={(link) => link.color || '#000000'}
                linkWidth={(link) => link.color ? 2 : 1}
                onNodeClick={onNodeClick}
                backgroundColor="#D3D3D3"
            />
        </div>
    );
};

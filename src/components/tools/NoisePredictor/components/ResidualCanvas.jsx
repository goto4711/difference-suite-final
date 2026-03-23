import React, { useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

export const ResidualCanvas = ({ tensor, width, height, label = "Residual" }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (tensor && canvasRef.current) {
            const draw = async () => {
                // toPixels requires 2D or 3D tensor. If we have a batch dim (rank 4), squeeze it.
                const tensorToDraw = tensor.rank === 4 ? tensor.squeeze() : tensor;
                try {
                    await tf.browser.toPixels(tensorToDraw, canvasRef.current);
                } catch (e) {
                    console.error("Error drawing tensor:", e);
                } finally {
                    // Clean up if we created a temporary tensor
                    if (tensor.rank === 4) {
                        tensorToDraw.dispose();
                    }
                }
            };
            draw();
        }
    }, [tensor, width, height]);

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-deep-muted text-sm mb-2 uppercase tracking-wider">{label}</h3>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="border border-deep-surface shadow-lg"
            />
        </div>
    );
};

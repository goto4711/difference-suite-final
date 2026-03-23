import { useState, useEffect, useRef } from 'react';
import { useSuiteStore } from '../../../stores/suiteStore';
import { Image as ImageIcon, Box, AlignVerticalSpaceAround } from 'lucide-react';
import ToolLayout from '../../shared/ToolLayout';
import { transformersClient } from '../../../core/inference/TransformersClient';

const DepthMirror = () => {
    const { dataset, activeItem, setActiveItem } = useSuiteStore();
    const imageItems = dataset.filter(i => i.type === 'image');
    const selectedItem = dataset.find(i => i.id === activeItem);

    const [isProcessing, setIsProcessing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!selectedItem || selectedItem.type !== 'image') return;

        const processDepth = async () => {
            setIsProcessing(true);
            try {
                const result = await transformersClient.run({
                    id: crypto.randomUUID(),
                    tool: 'DepthMirror',
                    model: 'depth-anything-small',
                    task: 'depth-estimation',
                    payload: { image: selectedItem.content }
                });

                const { width, height, data } = result.output as any;

                const canvas = canvasRef.current;
                if (canvas) {
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const imgData = ctx.createImageData(width, height);
                        for (let i = 0; i < data.length; i++) {
                            const val = data[i];
                            const offset = i * 4;
                            imgData.data[offset] = val;     // R
                            imgData.data[offset + 1] = val; // G
                            imgData.data[offset + 2] = val; // B
                            imgData.data[offset + 3] = 255; // Alpha
                        }
                        ctx.putImageData(imgData, 0, 0);
                    }
                }

            } catch (error) {
                console.error("Depth estimation failed:", error);
            } finally {
                setIsProcessing(false);
            }
        };

        processDepth();
    }, [selectedItem]);

    const mainContent = (
        <div className="h-full flex flex-col">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-main flex items-center gap-2">
                        <Box className="w-5 h-5" />
                        Depth Perception
                    </h2>
                    <p className="text-xs text-text-muted">
                        Extracting the physical Z-axis from a purely 2D image utilizing Depth Anything.
                    </p>
                </div>
                {isProcessing && <span className="text-xs text-main animate-pulse font-bold uppercase tracking-wider">Estimating Depth...</span>}
            </div>

            <div className="flex-1 p-6 flex items-center justify-center gap-6 min-h-0 bg-gray-50 overflow-hidden">
                {selectedItem && selectedItem.type === 'image' ? (
                    <>
                        <div className="flex-1 flex items-center justify-center h-full border border-gray-200 bg-white shadow-sm p-4 relative rounded-lg">
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-500 rounded">Original</span>
                            <img src={selectedItem.content as string} alt="Original" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="flex-1 flex items-center justify-center h-full border border-gray-200 bg-black shadow-sm p-4 relative rounded-lg">
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-gray-800 text-[10px] font-bold uppercase tracking-widest text-gray-300 rounded border border-gray-600 z-10">Depth Map</span>
                            <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
                            {isProcessing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center p-8 text-gray-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Select an image to perceive its depth.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col gap-6 p-1">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="text-xs font-bold text-text-muted block mb-2 uppercase tracking-wide">Select Input:</label>
                <select
                    className="deep-input w-full text-xs"
                    value={activeItem || ''}
                    onChange={(e) => setActiveItem(e.target.value)}
                >
                    <option value="" disabled>-- Choose Image --</option>
                    {imageItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </select>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-[10px] text-gray-600 space-y-3 shadow-inner">
                <h3 className="font-bold text-main uppercase flex items-center gap-1.5 border-b border-gray-200 pb-2 mb-2">
                    <AlignVerticalSpaceAround className="w-3 h-3" />
                    Depth Anything Inference
                </h3>
                <p className="leading-relaxed">
                    The network predicts relative physical distance for every pixel, transforming a flat photograph back into a simulated 3D space.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-1 opacity-80 mt-2">
                    <li><span className="text-white bg-black px-1 rounded mx-0.5 border border-gray-700">Lighter</span> closer to camera</li>
                    <li><span className="text-black bg-gray-300 px-1 rounded mx-0.5 border border-gray-400">Darker</span> recedes into background</li>
                </ul>
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Depth Mirror"
            subtitle="Machine perception of physical space"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default DepthMirror;

import { useState, useEffect, useMemo, useRef } from 'react';
import { vectorManager } from './components/VectorManager';
import VectorHeatmap from './components/VectorHeatmap';
import { useSuiteStore } from '../../../stores/suiteStore';
import { Info, Cpu, Image as ImageIcon, Type, Layers } from 'lucide-react';
import ToolLayout from '../../shared/ToolLayout';
import { transformersClient } from '../../../core/inference/TransformersClient';

type AnalysisMode = 'image' | 'text';


const AttentionLens = ({ text, isProcessing }: { text: string; isProcessing: boolean }) => {
    const [analysis, setAnalysis] = useState<{ tokens: string[], attention: number[] | null, isSimulated?: boolean } | null>(null);
    const [isInternalLoading, setIsInternalLoading] = useState(false);

    useEffect(() => {
        if (!text) return;
        const analyze = async () => {
            setIsInternalLoading(true);
            try {
                const result = await transformersClient.run({
                    id: crypto.randomUUID(),
                    tool: 'DeepVectorMirror',
                    model: 'bert-base-uncased',
                    task: 'attention-analysis',
                    payload: { text }
                });
                setAnalysis(result.output as any);
            } catch (e) {
                console.error("Attention analysis failed", e);
            } finally {
                setIsInternalLoading(false);
            }
        };
        analyze();
    }, [text]);

    if (isProcessing || isInternalLoading) {
        return (
            <div className="flex items-center justify-center w-full min-h-[100px] bg-gray-50/50">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-black text-main animate-pulse uppercase tracking-[0.2em]">Inspecting Latent Layers</span>
                    <div className="w-12 h-0.5 bg-gray-200 overflow-hidden rounded-full">
                        <div className="h-full bg-main animate-progress-fast"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!analysis) return null;

    return (
        <>
            <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Attention Lens</span>
                </div>
                {analysis.isSimulated && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 font-medium uppercase tracking-tight" title="Real attention weights not available from this model">
                        Simulated
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-1.5 p-4 bg-white rounded-b min-h-[100px] content-start">
                {analysis.tokens.map((token: string, i: number) => {
                    // Calculate weight from averaged attention matrix [seqLen * seqLen]
                    let weight = 0;
                    if (analysis.attention) {
                        const seqLen = analysis.tokens.length;
                        for (let j = 0; j < seqLen; j++) {
                            // Matrix is pre-averaged across heads, we sum attention received by token i
                            weight += analysis.attention[j * seqLen + i] || 0;
                        }
                        weight /= seqLen;
                    } else {
                        weight = 0.1;
                    }

                    // Scale weight for better visualization visibility
                    const displayWeight = Math.min(weight * 5, 1.0);

                    return (
                        <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-[11px] font-mono transition-all duration-500 border"
                            style={{
                                backgroundColor: `rgba(var(--color-main-rgb), ${displayWeight * 0.7})`,
                                color: displayWeight > 0.4 ? 'white' : 'var(--color-main)',
                                borderColor: displayWeight > 0.4 ? 'rgba(var(--color-main-rgb), 0.3)' : 'transparent',
                                fontWeight: displayWeight > 0.4 ? 'bold' : 'normal',
                                transform: `scale(${0.98 + displayWeight * 0.1})`,
                                zIndex: Math.floor(displayWeight * 10)
                            }}
                            title={`Token Attention: ${(weight * 100).toFixed(2)}%`}
                        >
                            {token.replace('Ġ', '').replace(' ', '')}
                        </span>
                    );
                })}
            </div>

            <div className="px-4 py-2 bg-white/50 text-[9px] text-text-muted italic border-t border-gray-100">
                {analysis.isSimulated
                    ? "Model optimized for web: simulating attention patterns based on token structure."
                    : "Visualizes the real \"Transformer Attention\"—highlighting which words contribute most to the vector."}
            </div>
        </>
    );
};

const DeepVectorMirror = () => {
    const { dataset, activeItem, setActiveItem } = useSuiteStore();
    const [mode, setMode] = useState<AnalysisMode>('image');

    const imageItems = useMemo(() => dataset.filter(i => i.type === 'image'), [dataset]);
    const textItems = useMemo(() => dataset.filter(i => i.type === 'text'), [dataset]);

    // When mode changes, optionally clear selection or try to find a match
    useEffect(() => {
        const item = dataset.find(i => i.id === activeItem);
        if (item && item.type !== mode) {
            // If the current active item doesn't match the mode, we don't force clear
            // but the UI will handle it gracefully.
        }
    }, [mode]);

    const selectedItem = dataset.find(i => i.id === activeItem);

    const [vector, setVector] = useState<number[]>([]);
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [contextLevel, setContextLevel] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    // Load models on mount
    useEffect(() => {
        vectorManager.loadModel('image');
        vectorManager.loadModel('text');
    }, []);

    // Process item when selected or params change
    useEffect(() => {
        if (!selectedItem) return;

        // Safety check - ONLY process if item type matches mode
        if (selectedItem.type !== mode) return;

        const processItem = async () => {
            setIsProcessing(true);
            try {
                let rawVector: number[] = [];

                if (selectedItem.type === 'image') {
                    const img = new Image();
                    img.src = selectedItem.content as string;
                    await new Promise((resolve) => { img.onload = resolve; });
                    rawVector = await vectorManager.getVector(img, 'image');
                } else if (selectedItem.type === 'text') {
                    rawVector = await vectorManager.getVector(selectedItem.content, 'text');
                }

                if (rawVector.length > 0) {
                    const noisyVector = rawVector.map((v: number) => v + (Math.random() - 0.5) * noiseLevel * 2);
                    const contextVector = noisyVector.map((v: number, i: number) => v + Math.sin(i) * contextLevel);
                    setVector(contextVector);
                }
            } catch (error) {
                console.error("Vectorization failed:", error);
            } finally {
                setIsProcessing(false);
            }
        };

        processItem();
    }, [selectedItem, noiseLevel, contextLevel, mode]);

    const mainContent = (
        <div className="h-full flex flex-col">
            {/* Mode Toggle Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 uppercase">Input Mode:</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-300">
                    <button
                        onClick={() => setMode('image')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${mode === 'image'
                            ? 'bg-[var(--color-main)] text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <ImageIcon size={16} />
                        Image
                    </button>
                    <button
                        onClick={() => setMode('text')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${mode === 'text'
                            ? 'bg-[var(--color-main)] text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Type size={16} />
                        Text
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-6 min-h-0">
                {selectedItem && selectedItem.type === mode ? (
                    <div className="flex-1 flex gap-6 min-h-0">
                        {/* Left: Reality (Input) */}
                        <div className="flex-1 flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <div className="px-4 py-2 border-b border-gray-200 bg-white flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Input (Reality)</span>
                            </div>
                            <div className="flex-1 p-4 flex items-center justify-center overflow-hidden relative">
                                {selectedItem.type === 'image' ? (
                                    <img
                                        src={selectedItem.content as string}
                                        alt="Target"
                                        className="max-w-full max-h-full object-contain shadow-sm"
                                    />
                                ) : (
                                    <div className="prose prose-sm max-w-none p-4 w-full h-full overflow-y-auto bg-white border border-gray-100 rounded text-xs font-mono whitespace-pre-wrap">
                                        {selectedItem.content as string}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Representation (Vector) */}
                        <div className="flex-1 flex flex-col gap-4 min-h-0">
                            <div className="flex-1 flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden relative">
                                <div className="px-4 py-2 border-b border-gray-200 bg-white flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Vector (Representation)</span>
                                    {isProcessing && <span className="text-xs text-main animate-pulse">Processing...</span>}
                                </div>
                                <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
                                    {vector.length > 0 ? (
                                        <div className="border border-gray-200 shadow-sm bg-white p-1">
                                            {/* @ts-ignore */}
                                            <VectorHeatmap vector={vector} width={mode === 'text' ? 300 : 400} height={mode === 'text' ? 300 : 400} />
                                        </div>
                                    ) : (
                                        <div className="text-center text-text-muted text-xs">
                                            {isProcessing ? 'Calculating...' : 'Waiting for vector...'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {mode === 'text' && (
                                <div className="flex-1 flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                    <AttentionLens text={selectedItem.content as string} isProcessing={isProcessing} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <Info className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-text-muted max-w-sm">
                            Select a {mode === 'image' ? 'photo' : 'text snippet'} from the dashboard to see its mathematical reflection.
                        </p>
                    </div>
                )}

                {/* Footer / Description */}
                {selectedItem && selectedItem.type === mode && (
                    <div className="mt-4 text-center">
                        <p className="text-xs text-text-muted max-w-2xl mx-auto">
                            <strong>Left:</strong> The raw input as perceived by humans. <strong>Right:</strong> The internal mathematical representation (embedding) used by the AI. Note how the "Context Shift" alters the representation even if the input stays the same.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col gap-6 p-1">
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-2">
                <label className="text-xs font-bold text-text-muted block mb-2 uppercase tracking-tight">
                    Select {mode === 'image' ? 'Image' : 'Text'} Target:
                </label>
                <select
                    className="deep-input w-full text-xs"
                    value={activeItem || ''}
                    onChange={(e) => setActiveItem(e.target.value)}
                >
                    <option value="" disabled>-- Choose {mode === 'image' ? 'Image' : 'Text'} --</option>
                    {(mode === 'image' ? imageItems : textItems).map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </select>
                {(mode === 'image' ? imageItems : textItems).length === 0 && (
                    <p className="text-[10px] text-orange-600 mt-2 italic">
                        No {mode}s found in your dataset. Upload some via the dashboard.
                    </p>
                )}
            </div>

            {/* Controls */}
            <div>
                <label className="text-sm font-bold block mb-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-main" />
                    Injection Parameters
                </label>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex justify-between mb-1">
                            <label className="text-[10px] font-bold text-text-muted uppercase">Noise Level</label>
                            <span className="text-[10px] font-bold text-main">{(noiseLevel * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            value={noiseLevel}
                            onChange={e => setNoiseLevel(parseFloat(e.target.value))}
                            className="dc-slider"
                        />
                        <p className="text-[9px] text-text-muted mt-1 opacity-70">Simulates input corruption.</p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex justify-between mb-1">
                            <label className="text-[10px] font-bold text-text-muted uppercase">Context Shift</label>
                            <span className="text-[10px] font-bold text-secondary">{(contextLevel * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            value={contextLevel}
                            onChange={e => setContextLevel(parseFloat(e.target.value))}
                            className="dc-slider"
                        />
                        <p className="text-[9px] text-text-muted mt-1 opacity-70">Simulates semantic bias.</p>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-main"></div>
                    <span className="text-sm font-bold">Vector Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border border-gray-100">
                        <span className="block text-[10px] text-text-muted uppercase">Dimensions</span>
                        <span className="font-bold">{vector.length || '-'}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-100">
                        <span className="block text-[10px] text-text-muted uppercase">Sparsity</span>
                        <span className="font-bold">
                            {vector.length > 0 ? (
                                (() => {
                                    const maxVal = Math.max(...vector.map(Math.abs));
                                    const threshold = mode === 'text' ? maxVal * 0.1 : 0.01;
                                    return (vector.filter(v => Math.abs(v) < threshold).length / vector.length * 100).toFixed(0);
                                })()
                            ) : '-'}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold uppercase tracking-tighter text-text-muted opacity-50">Legend</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                    <div className="flex items-center gap-2 px-2 py-1 bg-red-50 text-red-700 rounded border border-red-100">
                        <div className="w-2 h-2 bg-red-500 rounded-full shadow-sm"></div>
                        <span>Positive Activation</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 text-gray-700 rounded border border-gray-200">
                        <div className="w-2 h-2 bg-black rounded-full shadow-sm"></div>
                        <span>Neutral / Zero</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">
                        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>
                        <span>Negative Activation</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Deep Vector Mirror"
            subtitle="Explore the mathematical reflection of meaning"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default DeepVectorMirror;

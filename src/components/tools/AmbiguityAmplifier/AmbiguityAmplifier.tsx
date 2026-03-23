import { useState, useEffect } from 'react';
import { modelManager } from './components/ModelManager';
import { useSuiteStore } from '../../../stores/suiteStore';
import * as tf from '@tensorflow/tfjs';
import { Zap, Info, AlertTriangle, Activity, Image as ImageIcon, Type } from 'lucide-react';
import ToolLayout from '../../shared/ToolLayout';
import AmbiguityAmplifierTextContent from './components/AmbiguityAmplifierText';

interface Prediction {
    className: string;
    probability: number;
}

type AnalysisMode = 'image' | 'text';

const AmbiguityAmplifier = () => {
    const [mode, setMode] = useState<AnalysisMode>('image');

    // If text mode, render the text component
    if (mode === 'text') {
        return (
            <div className="h-full flex flex-col">
                {/* Mode Toggle */}
                <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-500 uppercase">Analysis Mode:</span>
                    <div className="flex rounded-lg overflow-hidden border border-gray-300">
                        <button
                            onClick={() => setMode('image')}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white text-gray-600 hover:bg-gray-50"
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
                <div className="flex-1 overflow-hidden">
                    <AmbiguityAmplifierTextContent />
                </div>
            </div>
        );
    }

    // Image mode - original implementation
    return <AmbiguityAmplifierImage mode={mode} setMode={setMode} />;
};

// Renamed original component
const AmbiguityAmplifierImage = ({ mode, setMode }: { mode: AnalysisMode; setMode: (m: AnalysisMode) => void }) => {
    const { dataset, activeItem, setActiveItem } = useSuiteStore();
    const imageItems = dataset.filter(i => i.type === 'image');
    const selectedItem = dataset.find(i => i.id === activeItem);

    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [isModelReady, setIsModelReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        async function init() {
            await modelManager.loadModel();
            setIsModelReady(true);
        }
        init();
    }, []);

    useEffect(() => {
        if (!selectedItem || !isModelReady || selectedItem.type !== 'image') return;

        const processItem = async () => {
            setIsProcessing(true);
            try {
                const img = new Image();
                img.src = selectedItem.content as string;
                await new Promise((resolve) => { img.onload = resolve; });
                const tensor = tf.browser.fromPixels(img).resizeBilinear([224, 224]);
                const results = await modelManager.predict(tensor, noiseLevel);
                if (results) {
                    setPredictions(results as unknown as Prediction[]);
                }
                tensor.dispose();
            } catch (error) {
                console.error("Prediction failed:", error);
            } finally {
                setIsProcessing(false);
            }
        };

        processItem();
    }, [selectedItem, noiseLevel, isModelReady]);

    const mainContent = (
        <div className="h-full flex flex-col">
            {/* Mode Toggle */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 uppercase">Analysis Mode:</span>
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

            {/* Image Display */}
            <div className="flex-1 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-100 rounded-lg overflow-hidden relative">
                {selectedItem && selectedItem.type === 'image' ? (
                    <>
                        <img
                            src={selectedItem.content as string}
                            alt="Analysis Target"
                            className="max-h-full max-w-full object-contain shadow-lg"
                            style={{ filter: `contrast(${100 - noiseLevel * 50}%) brightness(${100 + noiseLevel * 20}%)` }}
                        />
                        {isProcessing && (
                            <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-main animate-pulse shadow-sm">
                                Analyzing...
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center p-8">
                        {selectedItem?.type !== 'image' && selectedItem ? (
                            <>
                                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-400" />
                                <p className="text-text-muted">This tool requires an image input.</p>
                            </>
                        ) : (
                            <>
                                <Info className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-text-muted">Select an image from the dashboard.</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col gap-6 p-1">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="text-xs font-bold text-text-muted block mb-2">Select Target Image:</label>
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

            {/* Status Header */}
            <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-muted uppercase tracking-wider">Neural Net Status</span>
                <span className={`px-2 py-0.5 rounded font-bold ${isModelReady ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {isModelReady ? 'ONLINE' : 'LOADING'}
                </span>
            </div>

            {/* Noise Control */}
            <div>
                <label className="text-sm font-bold block mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-main" />
                    Noise Injection
                </label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <input
                        type="range" min="0" max="1" step="0.01"
                        value={noiseLevel}
                        onChange={e => setNoiseLevel(parseFloat(e.target.value))}
                        className="dc-slider mb-2"
                    />
                    <div className="flex justify-between text-xs font-medium text-text-muted">
                        <span>Clear Signal</span>
                        <span className="text-main font-bold">{(noiseLevel * 100).toFixed(0)}%</span>
                        <span>High Noise</span>
                    </div>
                </div>
                <p className="text-xs text-text-muted mt-2">
                    Inject digital noise to test the fragility of the AI's classification model.
                </p>
            </div>

            {/* Results */}
            <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-secondary" />
                    Confidence Spectrum
                </h4>

                <div className="space-y-4">
                    {predictions.map((pred, idx) => (
                        <div key={pred.className}>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="truncate max-w-[180px]">{pred.className.split(',')[0]}</span>
                                <span className={idx === 0 ? "text-main" : "text-text-muted"}>{(pred.probability * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${idx === 0 ? 'bg-main' : 'bg-gray-300'} transition-all duration-300`}
                                    style={{ width: `${pred.probability * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}

                    {predictions.length === 0 && (
                        <div className="text-center py-8 text-xs text-text-muted italic bg-gray-50 rounded">
                            Analysis results will appear here.
                        </div>
                    )}
                </div>

                {predictions.length > 0 && (
                    <div className={`mt-4 p-3 rounded text-xs ${predictions[0].probability < 0.5 ? 'bg-orange-50 text-orange-800 border border-orange-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                        {predictions[0].probability < 0.5 ? (
                            <div className="flex gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <div>
                                    <strong>High Ambiguity:</strong> The model is uncertain. The noise has successfully disrupted meaning.
                                </div>
                            </div>
                        ) : (
                            <div>
                                <strong>Stable Classification:</strong> The model is confident in its interpretation despite the interference.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Ambiguity Amplifier"
            subtitle="Test algorithmic robustness against noise"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default AmbiguityAmplifier;

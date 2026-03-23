import { useState, useEffect } from 'react';
import { modelManager } from './components/GlitchModelManager';
import { useSuiteStore } from '../../../stores/suiteStore';
import * as tf from '@tensorflow/tfjs';
import { AlertTriangle, Info, Target, Trash2, Activity, Shield, Image as ImageIcon, Type } from 'lucide-react';
import ToolLayout from '../../shared/ToolLayout';
import GlitchDetectorTextContent from './components/GlitchDetectorText';

type InputMode = 'image' | 'text';

const GlitchDetector = () => {
    const [inputMode, setInputMode] = useState<InputMode>('image');

    // If text mode, render the text component with mode toggle
    if (inputMode === 'text') {
        return (
            <div className="h-full flex flex-col">
                {/* Input Mode Toggle */}
                <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-500 uppercase">Input Type:</span>
                    <div className="flex rounded-lg overflow-hidden border border-gray-300">
                        <button
                            onClick={() => setInputMode('image')}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white text-gray-600 hover:bg-gray-50"
                        >
                            <ImageIcon size={16} />
                            Image
                        </button>
                        <button
                            onClick={() => setInputMode('text')}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-[var(--color-main)] text-white"
                        >
                            <Type size={16} />
                            Text
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <GlitchDetectorTextContent />
                </div>
            </div>
        );
    }

    // Image mode - render the original image-based component
    return <GlitchDetectorImage inputMode={inputMode} setInputMode={setInputMode} />;
};

const GlitchDetectorImage = ({ inputMode, setInputMode }: { inputMode: InputMode; setInputMode: (m: InputMode) => void }) => {
    const { dataset, activeItem, collections } = useSuiteStore();

    const [mode, setMode] = useState<'train' | 'test'>('train');
    const [testImageId, setTestImageId] = useState<string | null>(null);

    const imageItems = dataset.filter(i => i.type === 'image');

    // Resolve selected item: Use specific test selection in test mode, otherwise active item
    const selectedItem = mode === 'test' && testImageId
        ? dataset.find(i => i.id === testImageId)
        : dataset.find(i => i.id === activeItem);
    const [isModelReady, setIsModelReady] = useState(false);
    const [exampleCount, setExampleCount] = useState(0);
    const [trainingCollectionId, setTrainingCollectionId] = useState<string>('');

    // Testing State
    const [isAnomaly, setIsAnomaly] = useState(false);
    const [confidence, setConfidence] = useState(0);
    const [threshold, setThreshold] = useState(0.8);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        async function init() {
            await modelManager.loadModel();
            setIsModelReady(true);
        }
        init();
    }, []);

    // Training Logic
    const trainOnCollection = async () => {
        const trainingItems = dataset.filter(i => i.collectionId === trainingCollectionId && i.type === 'image');
        if (trainingItems.length === 0) return;

        setIsProcessing(true);
        modelManager.clear();
        setExampleCount(0);
        setProgress({ current: 0, total: trainingItems.length });

        for (let i = 0; i < trainingItems.length; i++) {
            const item = trainingItems[i];
            try {
                const img = new Image();
                img.src = item.content as string;
                img.crossOrigin = "anonymous";
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });

                const tensor = tf.browser.fromPixels(img);
                modelManager.addExample(tensor);
                tensor.dispose();

                setExampleCount(modelManager.getExampleCount());
                setProgress(prev => ({ ...prev, current: i + 1 }));

                // Yield to UI
                await new Promise(r => setTimeout(r, 10));
            } catch (err) {
                console.error("Error training on item:", item.name, err);
            }
        }

        setIsProcessing(false);
        setMode('test'); // Auto-switch to test mode
    };

    const resetModel = () => {
        modelManager.clear();
        setExampleCount(0);
        setIsAnomaly(false);
        setConfidence(0);
    };

    // Detection Logic (Auto-run when in Test Mode & Item Selected)
    useEffect(() => {
        if (mode !== 'test' || !selectedItem || selectedItem.type !== 'image' || !isModelReady || exampleCount === 0) {
            return;
        }

        const detect = async () => {
            setIsProcessing(true);
            try {
                const img = new Image();
                img.src = selectedItem.content as string;
                img.crossOrigin = "anonymous";
                await new Promise((resolve) => { img.onload = resolve; });

                const tensor = tf.browser.fromPixels(img);
                const result = await modelManager.predict(tensor);
                tensor.dispose();

                if (result) {
                    const normConf = result.confidences['normal'] || 0;
                    setConfidence(normConf);
                    setIsAnomaly(normConf < threshold);
                }
            } catch (error) {
                console.error("Detection failed:", error);
            } finally {
                setIsProcessing(false);
            }
        };

        detect();
    }, [selectedItem, threshold, exampleCount, isModelReady, mode]);

    const mainContent = (
        <div className="h-full flex flex-col">
            {/* Input Mode Toggle */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 uppercase">Input Type:</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-300">
                    <button
                        onClick={() => setInputMode('image')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-[var(--color-main)] text-white"
                    >
                        <ImageIcon size={16} />
                        Image
                    </button>
                    <button
                        onClick={() => setInputMode('text')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white text-gray-600 hover:bg-gray-50"
                    >
                        <Type size={16} />
                        Text
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden relative">
                {mode === 'train' ? (
                    <div className="text-center max-w-md">
                        <div className="mb-6 flex justify-center">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                                <Target className="w-10 h-10 text-main" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-main mb-2">Training Mode</h2>
                        <p className="text-text-muted mb-6">
                            Select a "Normal" collection from the sidebar to establish a baseline.
                            The model will learn the visual patterns of that entire collection.
                        </p>

                        {isProcessing && (
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                                <div
                                    className="bg-main h-full transition-all duration-300 transform origin-left"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                ></div>
                            </div>
                        )}
                        {isProcessing && (
                            <p className="text-xs font-bold text-main mt-2">
                                Learning pattern {progress.current} of {progress.total}...
                            </p>
                        )}
                    </div>
                ) : (
                    // TEST MODE
                    <div className={`relative w-full h-full flex items-center justify-center rounded-lg border-2 border-dashed transition-all ${isAnomaly ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                        {isAnomaly && (
                            <div className="absolute top-4 bg-red-600 text-white px-6 py-2 rounded-full font-bold shadow-lg z-20 animate-fade-in flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                GLITCH DETECTED
                            </div>
                        )}

                        {selectedItem && selectedItem.type === 'image' ? (
                            <img
                                src={selectedItem.content as string}
                                alt="Analysis Target"
                                className={`max-h-full max-w-full object-contain shadow-sm ${isAnomaly ? 'sepia contrast-125' : ''} transition-all duration-1000`}
                            />
                        ) : (
                            <div className="text-center">
                                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-text-muted">Select an image from the dashboard to test for anomalies.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col h-full gap-4 p-1">
            {/* Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setMode('train')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mode === 'train' ? 'bg-white text-main shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    TRAIN
                </button>
                <button
                    onClick={() => setMode('test')}
                    disabled={exampleCount === 0}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${mode === 'test' ? 'bg-white text-main shadow-sm' : 'text-gray-500 hover:text-gray-700'} ${exampleCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    TEST
                </button>
            </div>

            {mode === 'train' ? (
                // TRAIN CONTROLS
                <div className="flex flex-col gap-4 animate-fade-in">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <label className="text-xs font-bold text-text-muted block mb-2">Select Normal Collection:</label>
                        <select
                            className="deep-input w-full mb-4 text-xs"
                            value={trainingCollectionId}
                            onChange={(e) => setTrainingCollectionId(e.target.value)}
                        >
                            <option value="">-- Choose Collection --</option>
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({dataset.filter(i => i.collectionId === c.id && i.type === 'image').length} images)</option>
                            ))}
                        </select>

                        <button
                            onClick={trainOnCollection}
                            disabled={!trainingCollectionId || isProcessing}
                            className="deep-button w-full justify-center"
                        >
                            <Target className="w-4 h-4" />
                            {isProcessing ? 'Training...' : 'Train Model'}
                        </button>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-xs text-blue-800">
                        <p className="font-bold mb-1">Training Instructions:</p>
                        <ul className="list-disc list-inside space-y-1 opacity-80">
                            <li>Choose a collection containing only <strong>normal</strong> images.</li>
                            <li>The AI will learn the "normal" features from this entire set.</li>
                            <li>Once trained, switch to <strong>Test</strong> mode.</li>
                        </ul>
                    </div>
                </div>
            ) : (
                // TEST CONTROLS
                <div className="flex flex-col gap-4 animate-fade-in">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <label className="text-xs font-bold text-text-muted block mb-2">Test Image:</label>
                        <select
                            className="deep-input w-full mb-4 text-xs"
                            value={selectedItem?.id || ''}
                            onChange={(e) => setTestImageId(e.target.value)}
                        >
                            <option value="">-- Select Image to Test --</option>
                            {imageItems.map(item => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>

                        <div className="flex justify-between items-center mb-4 pt-4 border-t border-gray-100">
                            <span className="text-xs font-bold text-text-muted">Trained Samples</span>
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">{exampleCount}</span>
                        </div>

                        <label className="text-xs font-bold text-text-muted block mb-2">Sensitivity:</label>
                        <input
                            type="range" min="0.5" max="1" step="0.01"
                            value={threshold}
                            onChange={e => setThreshold(parseFloat(e.target.value))}
                            className="dc-slider mb-1"
                        />
                        <div className="flex justify-between text-[10px] text-text-muted mb-2">
                            <span>Lenient</span>
                            <span>{threshold.toFixed(2)}</span>
                            <span>Strict</span>
                        </div>
                        <p className="text-[10px] text-text-muted leading-relaxed opacity-80 mb-4 bg-gray-50 p-2 rounded border border-gray-100 italic">
                            Controls deviation tolerance. Higher values flag minor variations as glitches.
                        </p>

                        <div className="p-3 bg-gray-50 rounded border border-gray-100 text-center">
                            <div className="text-xs text-text-muted mb-1">Normality Score</div>
                            <div className={`text-2xl font-black ${confidence < threshold ? 'text-red-500' : 'text-green-500'}`}>
                                {(confidence * 100).toFixed(0)}%
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={resetModel}
                        className="w-full py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-red-100"
                    >
                        <Trash2 className="w-3 h-3" />
                        Reset Model & Start Over
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <ToolLayout
            title="Glitch Detector"
            subtitle="Identify visual anomalies and disruptions"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default GlitchDetector;

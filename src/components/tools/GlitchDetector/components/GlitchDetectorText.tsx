import { useState, useEffect, useCallback, useMemo } from 'react';
import { glitchTextModelManager } from './GlitchTextModelManager';
import ToolLayout from '../../../shared/ToolLayout';
import { Loader2, Plus, Trash2, AlertTriangle, CheckCircle, FolderOpen, Play } from 'lucide-react';
import { useSuiteStore } from '../../../../stores/suiteStore';

const GlitchDetectorText = () => {
    const { collections, dataset } = useSuiteStore();
    const [isModelReady, setIsModelReady] = useState(false);
    const [exampleCount, setExampleCount] = useState(0);
    const [inputText, setInputText] = useState('');
    const [selectedCollection, setSelectedCollection] = useState('');
    const [isTraining, setIsTraining] = useState(false);

    const [testSentence, setTestSentence] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [threshold, setThreshold] = useState(0.8);
    const [isAnomaly, setIsAnomaly] = useState(false);

    // Filter collections that contain text items
    const textCollections = useMemo(() => {
        return collections.filter((c: any) => dataset.some((item: any) => item.collectionId === c.id && item.type === 'text'));
    }, [collections, dataset]);

    useEffect(() => {
        async function init() {
            await glitchTextModelManager.loadModel();
            setIsModelReady(true);
        }
        init();
    }, []);

    const addExample = useCallback(async () => {
        if (!inputText.trim()) return;
        await glitchTextModelManager.addExample(inputText);
        setExampleCount(glitchTextModelManager.getExampleCount());
        setInputText('');
    }, [inputText]);

    const trainFromCollection = useCallback(async (collectionId: string) => {
        if (!collectionId) return;

        setIsTraining(true);
        const textItems = dataset.filter((item: any) => item.collectionId === collectionId && item.type === 'text' && item.content);
        for (const item of textItems) {
            await glitchTextModelManager.addExample(item.content as string);
        }
        setExampleCount(glitchTextModelManager.getExampleCount());
        setIsTraining(false);
    }, [dataset]);

    useEffect(() => {
        const predict = async () => {
            if (isModelReady && exampleCount > 0 && testSentence.trim()) {
                const conf = await glitchTextModelManager.predict(testSentence);
                setConfidence(conf);
                setIsAnomaly(conf < threshold);
            } else {
                setIsAnomaly(false);
                setConfidence(0);
            }
        };
        predict();
    }, [testSentence, exampleCount, isModelReady, threshold]);

    const handleReset = () => {
        glitchTextModelManager.clear();
        setExampleCount(0);
        setConfidence(0);
        setIsAnomaly(false);
        // Reload to re-seed anomaly examples
        window.location.reload();
    };

    const mainContent = (
        <div className={`flex flex-col h-full gap-6 p-6 rounded-lg border shadow-sm overflow-y-auto transition-all duration-300 ${isAnomaly ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>

            {/* Glitch Overlay Effect */}
            {isAnomaly && (
                <div className="absolute inset-0 pointer-events-none z-10 animate-pulse bg-red-500/5 rounded-lg"></div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-[var(--color-main)] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        System Status
                    </h2>
                    <p className="text-xs text-gray-500">Anomaly detection for text.</p>
                </div>
                {!isModelReady && (
                    <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 px-3 py-1 rounded-full">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading Model...
                    </div>
                )}
            </div>

            {/* Status Indicator */}
            <div className={`text-center py-8 rounded-lg border-2 font-bold text-2xl uppercase tracking-widest transition-all ${isAnomaly ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-50 border-green-300 text-green-700'}`}>
                {isAnomaly ? (
                    <span className="flex items-center justify-center gap-3">
                        <AlertTriangle className="w-8 h-8 animate-bounce" />
                        ANOMALY DETECTED
                        <AlertTriangle className="w-8 h-8 animate-bounce" />
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-3">
                        <CheckCircle className="w-8 h-8" />
                        SYSTEM NORMAL
                    </span>
                )}
            </div>

            {/* Confidence Bar */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <p className="text-sm font-bold mb-2">Match Confidence: <span className="font-mono">{(confidence * 100).toFixed(1)}%</span></p>
                <div className="relative h-6 bg-gray-100 rounded">
                    {/* Threshold Marker */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-black z-10"
                        style={{ left: `${threshold * 100}%` }}
                        title="Threshold"
                    />
                    {/* Confidence Bar */}
                    <div
                        className={`h-full transition-all duration-300 rounded ${isAnomaly ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${confidence * 100}%` }}
                    />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">
                    If confidence drops below the threshold line, the system glitches.
                </p>
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col h-full gap-4 p-1 overflow-y-auto">
            {/* Training Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold uppercase text-[var(--color-main)] mb-3">1. Train "Normal"</h3>
                <p className="text-[10px] text-gray-500 mb-3">
                    Teach the system what "Normal" conversation looks like.
                </p>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder='Type normal text (e.g. "Hello")...'
                        className="flex-1 p-2 border border-gray-300 rounded text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && addExample()}
                    />
                    <button onClick={addExample} className="bg-[var(--color-main)] text-white p-2 rounded font-bold">
                        <Plus size={16} />
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">{exampleCount} normal examples learned</p>

                {/* Collection Selector */}
                <div className="mt-3 flex gap-2 items-center">
                    <FolderOpen size={14} className="text-gray-400" />
                    <select
                        value={selectedCollection}
                        onChange={(e) => setSelectedCollection(e.target.value)}
                        className="flex-1 p-1 text-xs border border-gray-200 rounded bg-gray-50"
                    >
                        <option value="">Load from collection...</option>
                        {textCollections.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => trainFromCollection(selectedCollection)}
                        disabled={!selectedCollection || isTraining}
                        className="bg-[var(--color-main)] text-white p-1 rounded text-xs disabled:opacity-50"
                    >
                        {isTraining ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    </button>
                </div>

                <button onClick={handleReset} className="mt-4 w-full flex items-center justify-center gap-2 p-2 bg-red-50 text-red-600 rounded border border-red-100 text-xs hover:bg-red-100 transition-colors">
                    <Trash2 size={14} />
                    Reset Model
                </button>
            </div>

            {/* Detection Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold uppercase text-[var(--color-main)] mb-3">2. Detect Anomalies</h3>
                <textarea
                    value={testSentence}
                    onChange={(e) => setTestSentence(e.target.value)}
                    placeholder="Type text to test..."
                    className="w-full p-3 border border-gray-300 rounded font-mono text-sm min-h-[80px] resize-none"
                />

                <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-gray-500">Sensitivity Threshold</span>
                        <span className="font-mono">{threshold.toFixed(2)}</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="1"
                        step="0.01"
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-full accent-[var(--color-main)]"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Glitch Detector (Text)"
            subtitle='Train "Normal". Detect the Abnormal.'
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default GlitchDetectorText;

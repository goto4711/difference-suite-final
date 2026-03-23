import { useState, useEffect, useCallback, useMemo } from 'react';
import { textModelManager } from './TextModelManager';
import ToolLayout from '../../../shared/ToolLayout';
import { Loader2, Plus, Trash2, Volume2, FolderOpen, Play } from 'lucide-react';
import { useSuiteStore } from '../../../../stores/suiteStore';

const AmbiguityAmplifierText = () => {
    const { collections, dataset } = useSuiteStore();
    const [isModelReady, setIsModelReady] = useState(false);
    const [classA, setClassA] = useState('Concept A');
    const [classB, setClassB] = useState('Concept B');
    const [inputTextA, setInputTextA] = useState('');
    const [inputTextB, setInputTextB] = useState('');
    const [exampleCounts, setExampleCounts] = useState<Record<string, number>>({});

    const [selectedCollectionA, setSelectedCollectionA] = useState('');
    const [selectedCollectionB, setSelectedCollectionB] = useState('');
    const [isTraining, setIsTraining] = useState(false);

    const [testSentence, setTestSentence] = useState('This is a test sentence.');
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [noisySentence, setNoisySentence] = useState('');
    const [predictions, setPredictions] = useState<{ className: string; probability: number }[]>([]);

    // Filter collections that contain text items
    const textCollections = useMemo(() => {
        return collections.filter((c: any) => dataset.some((item: any) => item.collectionId === c.id && item.type === 'text'));
    }, [collections, dataset]);

    // Debug: log collections and dataset on change
    useEffect(() => {
        console.log('[AmbiguityAmplifierText] Collections:', collections.map((c: any) => ({ id: c.id, name: c.name })));
        console.log('[AmbiguityAmplifierText] Dataset:', dataset.length, 'items. Text items by collection:',
            collections.map((c: any) => ({
                name: c.name,
                id: c.id,
                textCount: dataset.filter((i: any) => i.collectionId === c.id && i.type === 'text').length
            }))
        );
        console.log('[AmbiguityAmplifierText] textCollections (filtered):', textCollections.map((c: any) => c.name));
    }, [collections, dataset, textCollections]);

    useEffect(() => {
        async function init() {
            console.log('[AmbiguityAmplifierText] Initializing model...');
            try {
                await textModelManager.loadModel();
                console.log('[AmbiguityAmplifierText] Model loaded successfully!');
                setIsModelReady(true);
            } catch (err) {
                console.error('[AmbiguityAmplifierText] Model loading failed:', err);
            }
        }
        init();
    }, []);

    const addExample = useCallback(async (text: string, label: string) => {
        console.log('[AmbiguityAmplifierText] addExample called:', { text, label, isModelReady });
        if (!text.trim()) {
            console.warn('[AmbiguityAmplifierText] Empty text, skipping');
            return;
        }
        await textModelManager.addExample(text, label);
        const counts = textModelManager.getExampleCount();
        console.log('[AmbiguityAmplifierText] After adding, counts:', counts);
        setExampleCounts(counts);
        if (label === classA) setInputTextA('');
        else setInputTextB('');
    }, [classA, classB, isModelReady]);

    const trainFromCollection = useCallback(async (collectionId: string, label: string) => {
        console.log('[AmbiguityAmplifierText] trainFromCollection called:', { collectionId, label, datasetLength: dataset.length });

        // Debug: log all items in the collection
        const allCollectionItems = dataset.filter((item: any) => item.collectionId === collectionId);
        console.log('[AmbiguityAmplifierText] All items in collection:', allCollectionItems.length, allCollectionItems.map((i: any) => ({ name: i.name, type: i.type, contentType: typeof i.content, hasContent: !!i.content })));

        if (!collectionId) {
            console.warn('[AmbiguityAmplifierText] No collection selected');
            return;
        }

        setIsTraining(true);
        const textItems = dataset.filter((item: any) => item.collectionId === collectionId && item.type === 'text' && item.content);
        console.log('[AmbiguityAmplifierText] Found text items:', textItems.length);

        if (textItems.length === 0) {
            console.warn('[AmbiguityAmplifierText] No text items with content found!');
            setIsTraining(false);
            return;
        }

        for (const item of textItems) {
            const contentStr = typeof item.content === 'string' ? item.content : '';
            console.log('[AmbiguityAmplifierText] Training with:', contentStr.substring(0, 50));
            await textModelManager.addExample(contentStr, label);
        }
        setExampleCounts(textModelManager.getExampleCount());
        setIsTraining(false);
    }, [dataset]);

    const applyNoise = useCallback((text: string, level: number): string => {
        if (level === 0) return text;
        let chars = text.split('');
        for (let i = 0; i < chars.length; i++) {
            if (Math.random() < level * 0.2) {
                const type = Math.random();
                if (type < 0.33) {
                    const alphabet = "abcdefghijklmnopqrstuvwxyz";
                    chars[i] = alphabet[Math.floor(Math.random() * alphabet.length)];
                } else if (type < 0.66 && i < chars.length - 1) {
                    const temp = chars[i];
                    chars[i] = chars[i + 1];
                    chars[i + 1] = temp;
                    i++;
                } else {
                    chars[i] = '';
                }
            }
        }
        return chars.join('');
    }, []);

    useEffect(() => {
        const noisy = applyNoise(testSentence, noiseLevel);
        setNoisySentence(noisy);

        const predict = async () => {
            if (isModelReady && (exampleCounts[classA] || 0) > 0 && (exampleCounts[classB] || 0) > 0) {
                const result = await textModelManager.predict(noisy);
                if (result && result.confidences) {
                    const preds = Object.entries(result.confidences).map(([label, score]) => ({
                        className: label,
                        probability: score as number
                    })).sort((a, b) => b.probability - a.probability);
                    setPredictions(preds);
                }
            }
        };
        predict();
    }, [testSentence, noiseLevel, exampleCounts, isModelReady, classA, classB, applyNoise]);

    const handleReset = () => {
        textModelManager.clear();
        setExampleCounts({});
        setPredictions([]);
    };

    const mainContent = (
        <div className="flex flex-col h-full gap-6 p-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-[var(--color-main)] flex items-center gap-2">
                        <Volume2 className="w-5 h-5" />
                        Confidence Spectrum
                    </h2>
                    <p className="text-xs text-gray-500">How noise disrupts semantic confidence.</p>
                </div>
                {!isModelReady && (
                    <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 px-3 py-1 rounded-full">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading Model...
                    </div>
                )}
            </div>

            {/* Noisy Input Display */}
            <div className="p-4 bg-gray-50 border-2 border-[var(--color-main)] rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Noisy Input:</p>
                <p className="text-xl font-mono break-all leading-relaxed text-gray-800">
                    {noisySentence || "..."}
                </p>
            </div>

            {/* Predictions */}
            {predictions.length === 0 && isModelReady && (
                <div className="text-center text-gray-400 py-8 italic">
                    Train both concepts to see predictions.
                </div>
            )}

            <div className="space-y-3">
                {predictions.map((pred) => (
                    <div key={pred.className} className="flex items-center gap-3">
                        <div className="w-28 font-bold text-sm truncate">{pred.className}</div>
                        <div className="flex-1 h-8 bg-gray-100 rounded overflow-hidden relative">
                            <div
                                className="h-full transition-all duration-300"
                                style={{
                                    width: `${pred.probability * 100}%`,
                                    backgroundColor: pred.className === classA ? 'var(--color-main)' : 'var(--color-main-secondary)'
                                }}
                            />
                        </div>
                        <div className="w-16 text-right text-sm font-mono">
                            {(pred.probability * 100).toFixed(1)}%
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col h-full gap-4 p-1 overflow-y-auto">
            {/* Training Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold uppercase text-[var(--color-main)] mb-3">1. Train Concepts</h3>

                {/* Concept A */}
                <div className="mb-4">
                    <input
                        type="text"
                        value={classA}
                        onChange={(e) => setClassA(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded font-bold text-[var(--color-main)] mb-1"
                    />
                    <p className="text-[10px] text-gray-400 mb-2">{exampleCounts[classA] || 0} examples</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputTextA}
                            onChange={(e) => setInputTextA(e.target.value)}
                            placeholder={`Text for ${classA}...`}
                            className="flex-1 p-2 border border-gray-300 rounded text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && addExample(inputTextA, classA)}
                        />
                        <button onClick={() => addExample(inputTextA, classA)} className="bg-[var(--color-main)] text-white p-2 rounded">
                            <Plus size={16} />
                        </button>
                    </div>
                    {/* Collection Selector A */}
                    <div className="mt-2 flex gap-2 items-center">
                        <FolderOpen size={14} className="text-gray-400" />
                        <select
                            value={selectedCollectionA}
                            onChange={(e) => setSelectedCollectionA(e.target.value)}
                            className="flex-1 p-1 text-xs border border-gray-200 rounded bg-gray-50"
                        >
                            <option value="">Load from collection...</option>
                            {textCollections.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => trainFromCollection(selectedCollectionA, classA)}
                            disabled={!selectedCollectionA || isTraining}
                            className="bg-[var(--color-main)] text-white p-1 rounded text-xs disabled:opacity-50"
                        >
                            <Play size={12} />
                        </button>
                    </div>
                </div>

                <hr className="my-3" />

                {/* Concept B */}
                <div>
                    <input
                        type="text"
                        value={classB}
                        onChange={(e) => setClassB(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded font-bold text-[var(--color-main-secondary)] mb-1"
                    />
                    <p className="text-[10px] text-gray-400 mb-2">{exampleCounts[classB] || 0} examples</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputTextB}
                            onChange={(e) => setInputTextB(e.target.value)}
                            placeholder={`Text for ${classB}...`}
                            className="flex-1 p-2 border border-gray-300 rounded text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && addExample(inputTextB, classB)}
                        />
                        <button onClick={() => addExample(inputTextB, classB)} className="bg-[var(--color-main-secondary)] text-white p-2 rounded">
                            <Plus size={16} />
                        </button>
                    </div>
                    {/* Collection Selector B */}
                    <div className="mt-2 flex gap-2 items-center">
                        <FolderOpen size={14} className="text-gray-400" />
                        <select
                            value={selectedCollectionB}
                            onChange={(e) => setSelectedCollectionB(e.target.value)}
                            className="flex-1 p-1 text-xs border border-gray-200 rounded bg-gray-50"
                        >
                            <option value="">Load from collection...</option>
                            {textCollections.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => trainFromCollection(selectedCollectionB, classB)}
                            disabled={!selectedCollectionB || isTraining}
                            className="bg-[var(--color-main-secondary)] text-white p-1 rounded text-xs disabled:opacity-50"
                        >
                            <Play size={12} />
                        </button>
                    </div>
                </div>

                <button onClick={handleReset} className="mt-4 w-full flex items-center justify-center gap-2 p-2 bg-red-50 text-red-600 rounded border border-red-100 text-xs hover:bg-red-100 transition-colors">
                    <Trash2 size={14} />
                    Reset Model
                </button>
            </div>

            {/* Test Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold uppercase text-[var(--color-main)] mb-3">2. Test & Amplify Noise</h3>
                <textarea
                    value={testSentence}
                    onChange={(e) => setTestSentence(e.target.value)}
                    placeholder="Type a sentence to test..."
                    className="w-full p-3 border border-gray-300 rounded font-mono text-sm min-h-[80px] resize-none"
                />

                <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-gray-500">Noise Level</span>
                        <span className="font-mono">{(noiseLevel * 100).toFixed(0)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={noiseLevel}
                        onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                        className="w-full accent-[var(--color-main)]"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Ambiguity Amplifier (Text)"
            subtitle="Explore how semantic noise disrupts machine understanding."
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default AmbiguityAmplifierText;

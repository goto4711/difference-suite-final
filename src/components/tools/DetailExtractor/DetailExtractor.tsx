import { useState, useEffect } from 'react';
import { RefreshCw, Info, Layers, Database, CheckSquare, Square } from 'lucide-react';
import ClusterViz from './components/ClusterViz';
import DetailView from './components/DetailView';
import { processTextData, loadModels } from './utils/DataProcessor';
import { useSuiteStore } from '../../../stores/suiteStore';
import ToolLayout from '../../shared/ToolLayout';

const DEMO_TEXTS = [
    "The Jewish Council in Warsaw attempted to organize underground education despite the ban.",
    "Emanuel Ringelblum and his team hid the Oyneg Shabbos archive in milk cans to preserve history.",
    "Couriers like Vladka Meed smuggled weapons and dynamite into the ghetto for the resistance.",
    "The ZOB launched an armed uprising in April 1943, surprising the German forces.",
    "Partisans in the forests of Belarus disrupted supply lines and rescued escapees.",
    "Individual acts of sabotage were common in forced labor camps, though often undocumented.",
    "Diaries were kept in secret to document the daily atrocities and preserve the memory of victims.",
    "Underground newspapers circulated news from the front to boost morale among the imprisoned.",
    "The quick brown fox jumps over the lazy dog.",
    "Quantum mechanics describes the behavior of particles at the subatomic level.",
    "Resistance was not just armed; it included spiritual and cultural defiance.",
    "Smugglers risked their lives to bring food into the sealed districts."
];

const DetailExtractor = () => {
    const { dataset, collections } = useSuiteStore();
    const textItems = dataset.filter(item => item.type === 'text');

    const [data, setData] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("Ready");
    const [useDataset, setUseDataset] = useState(false);
    const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

    // Filter collections that actually have text data
    const textCollections = collections.filter(col =>
        dataset.some(item => item.collectionId === col.id && item.type === 'text')
    );

    useEffect(() => {
        handleProcess(DEMO_TEXTS);
    }, []);

    const handleProcess = async (texts: string[]) => {
        if (texts.length === 0) return;

        setLoading(true);
        setStatus("Loading Models...");
        try {
            await loadModels();
            setStatus("Processing Embeddings...");
            const { data: processed } = await processTextData(texts);
            setData(processed);
            setStatus("Ready");
        } catch (error) {
            console.error(error);
            setStatus("Error processing data");
        } finally {
            setLoading(false);
        }
    };

    const toggleCollection = (id: string) => {
        setSelectedCollectionIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const handleAnalyzeSelected = () => {
        const itemsToProcess = dataset.filter(item =>
            item.collectionId &&
            selectedCollectionIds.includes(item.collectionId) &&
            item.type === 'text' &&
            item.content &&
            (item.content as string).length > 10
        );

        if (itemsToProcess.length === 0) {
            alert("No valid text content found in selected collections.");
            return;
        }

        const texts = itemsToProcess.map(item => (item.content as string).slice(0, 500));
        setUseDataset(true);
        handleProcess(texts);
    };

    const mainContent = (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center flex-col gap-4 backdrop-blur-sm">
                    <div className="w-16 h-16 border-4 border-main border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-mono text-xl text-main animate-pulse">{status}</p>
                </div>
            )}

            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-main flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        Latent Space Projection
                    </h2>
                    <p className="text-xs text-text-muted">
                        Visual clustering of text segments. Outliers often indicate unique details or anomalies.
                    </p>
                </div>
                <div className="text-sm font-bold text-main bg-main/5 px-2 py-1 rounded border border-main/10">
                    {data.length} items clustered
                </div>
            </div>

            <div className="flex-1 min-h-0 relative p-4">
                <ClusterViz
                    data={data}
                    onSelect={setSelectedItem}
                    selectedId={selectedItem?.id}
                />
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col h-full gap-6 p-1">
            {/* Controls Panel */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide text-text-muted">
                    <Database className="w-4 h-4" />
                    Data Source
                </h2>

                <div className="flex flex-col gap-3">
                    {/* Collection List */}
                    {textCollections.length > 0 ? (
                        <div className="flex flex-col gap-2 mb-2 max-h-32 overflow-y-auto pr-1">
                            {textCollections.map(col => {
                                const isSelected = selectedCollectionIds.includes(col.id);
                                return (
                                    <button
                                        key={col.id}
                                        onClick={() => toggleCollection(col.id)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left w-full ${isSelected ? 'bg-main/5 text-main font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                                    >
                                        {isSelected ? (
                                            <CheckSquare className="w-4 h-4 shrink-0" />
                                        ) : (
                                            <Square className="w-4 h-4 shrink-0 opacity-50" />
                                        )}
                                        <span className="truncate">{col.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic mb-2">
                            No text collections found. Create a collection with text files in the Dashboard.
                        </p>
                    )}

                    <button
                        onClick={handleAnalyzeSelected}
                        disabled={loading || selectedCollectionIds.length === 0}
                        className="deep-button w-full justify-center disabled:opacity-50"
                    >
                        Analyze Selected ({selectedCollectionIds.length})
                    </button>

                    <div className="h-px bg-gray-100 my-1" />

                    <button
                        onClick={() => {
                            setUseDataset(false);
                            setSelectedCollectionIds([]);
                            handleProcess(DEMO_TEXTS);
                        }}
                        className="deep-button bg-white text-main border-main w-full justify-center hover:bg-gray-50"
                        disabled={loading || (!useDataset && selectedCollectionIds.length === 0)}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reset Demo
                    </button>
                </div>
            </div>

            {/* Detail Inspector Panel */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide text-text-muted">
                        <Info className="w-4 h-4" />
                        Detail Inspector
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {selectedItem ? (
                        <DetailView item={selectedItem} normDistance={selectedItem?.distance || 0} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                            <Info className="w-8 h-8 text-gray-300" />
                            <p className="text-sm text-text-muted">Click on a point in the visualization to inspect</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Instructions Panel - Small & Collapsible feel */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-text-muted">
                <p className="opacity-80 leading-relaxed">
                    <span className="font-bold">Tip:</span> Items closer together share similar meanings. Items far apart (outliers) represent unique details.
                </p>
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Detail Extractor"
            subtitle="Identify and isolate specific anomalies or unique details within a text"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default DetailExtractor;

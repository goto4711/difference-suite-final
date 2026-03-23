import { useState, useEffect, useRef } from 'react';
import { Activity, RefreshCw, Brain, Info } from 'lucide-react';
import TimelineViz from './components/TimelineViz';
import AnomalyInspector from './components/AnomalyInspector';
import { generateMockData } from './utils/AnomalyDetector';
import { DeepAnomalyDetector } from './utils/DeepAnomalyDetector';
import { useSuiteStore } from '../../../stores/suiteStore';
import { parseCSV } from './utils/DataProcessor';
import ToolLayout from '../../shared/ToolLayout';

const DiscontinuityDetector = () => {
    const { dataset, activeItem, setActiveItem } = useSuiteStore();
    const selectedItem = dataset.find(i => i.id === activeItem);

    // Filter for compatible data types
    const dataItems = dataset.filter(i =>
        i.type === 'timeseries' || i.type === 'tabular' || i.name.endsWith('.json') || i.name.endsWith('.csv')
    );

    const [data, setData] = useState<any[]>([]);
    const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [trainingProgress, setTrainingProgress] = useState(0);
    const [trainingLoss, setTrainingLoss] = useState<number | null>(null);
    const detectorRef = useRef(new DeepAnomalyDetector());

    // Load data: Prefer selected item, fallback to mock if empty
    useEffect(() => {
        if (selectedItem) {
            loadFromItem(selectedItem);
        } else if (data.length === 0) {
            handleReset();
        }
    }, [selectedItem]);

    const loadFromItem = async (item: any) => {
        if (!item.content) return;

        try {
            let rawData: any[] = [];
            // Parse based on type or content structure
            if (item.name.endsWith('.json') || item.type === 'timeseries') {
                rawData = JSON.parse(item.content as string);
                // Handle various JSON shapes? Assuming generic array for now.
                if (!Array.isArray(rawData)) throw new Error("JSON must be an array of objects");
            } else {
                // Assume CSV for everything else (tabular, text, or .csv)
                rawData = parseCSV(item.content as string);
            }

            if (rawData && rawData.length > 5) {
                await processDataWithModel(rawData);
            }
        } catch (error) {
            console.error("Failed to load data from item:", error);
        }
    };

    const processDataWithModel = async (rawData: any[]) => {
        setLoading(true);
        setTrainingProgress(0);
        setTrainingLoss(null);

        try {
            // Train the model
            await detectorRef.current.train(rawData, (epoch: number, loss: number) => {
                setTrainingProgress(Math.round(((epoch + 1) / 50) * 100));
                setTrainingLoss(loss);
            });

            // Detect anomalies
            const processed = detectorRef.current.detect(rawData);
            setData(processed);
            setSelectedAnomaly(null);
        } catch (error) {
            console.error("Error processing data:", error);
            alert("Error processing data: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        const mock = generateMockData(100);
        processDataWithModel(mock);
    };

    const mainContent = (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center flex-col gap-4 backdrop-blur-sm">
                    <div className="w-16 h-16 border-4 border-main border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-center">
                        <p className="font-mono text-xl text-main animate-pulse flex items-center justify-center gap-2">
                            <Brain className="w-6 h-6" />
                            Training Neural Network...
                        </p>
                        <div className="w-64 h-4 bg-gray-200 rounded-full mt-4 overflow-hidden border border-main/20">
                            <div
                                className="h-full bg-main transition-all duration-200"
                                style={{ width: `${trainingProgress}%` }}
                            ></div>
                        </div>
                        <p className="font-mono text-xs mt-2 opacity-60">
                            Epoch: {Math.round((trainingProgress / 100) * 50)}/50 | Loss: {trainingLoss?.toFixed(4) || '...'}
                        </p>
                    </div>
                </div>
            )}

            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-main flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Timeline Visualization
                    </h2>
                    <p className="text-xs text-text-muted">
                        Red points indicate detected discontinuities in the temporal flow
                    </p>
                </div>
                <div className="text-sm font-bold text-main bg-main/5 px-2 py-1 rounded border border-main/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    {data.filter(d => d.isAnomaly).length} Ruptures
                </div>
            </div>

            <div className="flex-1 min-h-0 relative p-4">
                <TimelineViz
                    data={data}
                    onSelectAnomaly={setSelectedAnomaly}
                    selectedId={selectedAnomaly?.id}
                />
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col h-full gap-6 p-1">
            {/* Data Selector */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="text-xs font-bold text-text-muted block mb-2">Select Time Series Source:</label>
                <select
                    className="deep-input w-full text-xs"
                    value={activeItem || ''}
                    onChange={(e) => setActiveItem(e.target.value)}
                >
                    <option value="" disabled>-- Choose Dataset --</option>
                    {dataItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </select>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <button
                    onClick={handleReset}
                    className="deep-button bg-white text-main border-main w-full justify-center hover:bg-gray-50"
                    disabled={loading}
                >
                    <RefreshCw className="w-4 h-4" />
                    Generate Example Timeline
                </button>
            </div>

            {/* Inspector Panel */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide text-text-muted">
                        <Info className="w-4 h-4" />
                        Event Inspector
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {selectedAnomaly ? (
                        <AnomalyInspector anomaly={selectedAnomaly} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                            <Activity className="w-8 h-8 text-gray-300" />
                            <p className="text-sm text-text-muted">Click on a point to inspect</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-text-muted">
                <p className="opacity-80 italic leading-relaxed">
                    "History is not smooth - it is punctuated by contingent events."
                </p>
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Temporal Ruptures"
            subtitle="Detect discontinuities and anomalies in time-series data using RNNs"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default DiscontinuityDetector;

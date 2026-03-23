import { useState, useEffect } from 'react';
import { generateMockData } from './data/mockData.js';
import ThresholdHistogram from './components/ThresholdHistogram';
import ImpactStats from './components/ImpactStats';
import CaseList from './components/CaseList';
import { Sliders, Scale, RefreshCw } from 'lucide-react';
import ToolLayout from '../../shared/ToolLayout';

import { useSuiteStore } from '../../../stores/suiteStore';
import { parseCSV } from '../DiscontinuityDetector/utils/DataProcessor.js';

const ThresholdAdjuster = () => {
    const { dataset, activeItem, setActiveItem } = useSuiteStore();
    const [data, setData] = useState<any[]>([]);
    const [threshold, setThreshold] = useState(0.5);

    const dataItems = dataset.filter(i =>
        i.type === 'tabular' || i.type === 'timeseries' || i.name.endsWith('.json') || i.name.endsWith('.csv')
    );

    const selectedItem = dataset.find(i => i.id === activeItem);

    const loadData = (item: any) => {
        try {
            let parsed = [];
            if (item.name.endsWith('.json')) {
                parsed = JSON.parse(item.content);
            } else {
                parsed = parseCSV(item.content);
            }

            // Normalize CSV data if needed (rename fields to match expected schema if possible, or just expect correct headers)
            // Expect: risk_score, applicant_name, etc.
            if (Array.isArray(parsed) && parsed.length > 0) {
                let normalized = parsed.map((p, idx) => ({
                    ...p,
                    id: p.id || p.ID || `CASE-${idx + 1}`,
                    origin: p.origin || p.source || p.location || p.country || "Uploaded Data",
                    case_summary: p.case_summary || p.summary || p.description || p.text || p.content || "No summary provided.",
                    applicant_name: p.applicant_name || p.name || p.applicant || `Applicant ${idx + 1}`,
                    risk_score: p.risk_score !== undefined ? Number(p.risk_score) : (p.value !== undefined ? Number(p.value) : undefined)
                })).filter(p => p.risk_score !== undefined && !isNaN(p.risk_score));

                if (normalized.length > 0) {
                    // Auto-normalize if values are outside [0, 1]
                    const scores = normalized.map(p => p.risk_score as number);
                    const min = Math.min(...scores);
                    const max = Math.max(...scores);

                    if (max > 1 || min < 0) {
                        const range = max - min;
                        normalized = normalized.map(p => ({
                            ...p,
                            original_score: p.risk_score,
                            risk_score: range > 0 ? ((p.risk_score as number) - min) / range : 0.5
                        }));
                    }

                    setData(normalized);
                } else {
                    console.warn("Parsed data contained no valid risk_score or value fields.");
                }
            }
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };

    useEffect(() => {
        if (selectedItem && selectedItem.content) {
            loadData(selectedItem);
        } else if (data.length === 0) {
            setData(generateMockData(1000));
        }
    }, [selectedItem]);

    const mainContent = (
        <div className="flex flex-col h-full gap-6">
            {/* Top Analysis: Histogram */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[400px]">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-main flex items-center gap-2">
                            <Sliders className="w-5 h-5" />
                            Decision Boundary
                        </h2>
                        <p className="text-xs text-text-muted">
                            Drag the slider to adjust the classification threshold
                        </p>
                    </div>
                    <div className="bg-alt/20 px-3 py-1 text-sm font-mono text-main font-bold border border-main/20 rounded">
                        Threshold: {(threshold * 100).toFixed(1)}%
                    </div>
                </div>

                <div className="flex-1 p-6 relative">
                    <ThresholdHistogram
                        data={data}
                        threshold={threshold}
                        setThreshold={setThreshold}
                    />
                </div>
            </div>

            {/* Bottom Evidence: Case List */}
            <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-sm font-bold text-main flex items-center gap-2 uppercase tracking-wide">
                        Sample Cases
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <CaseList data={data} threshold={threshold} />
                </div>
            </div>
        </div>
    );

    const handleReset = () => {
        setActiveItem(null);
        setData(generateMockData(1000));
    };

    const sideContent = (
        <div className="flex flex-col h-full gap-6 p-1">
            {/* Data Selector */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="text-xs font-bold text-text-muted block mb-2">Select Dataset:</label>
                <div className="flex flex-col gap-2">
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

                    <button
                        onClick={handleReset}
                        className="text-xs text-main/60 hover:text-main underline transition-colors flex items-center justify-center gap-1 mt-1"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Reset to Demo Data
                    </button>
                </div>
            </div>

            {/* Impact Stats Panel */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden text-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-bold flex items-center gap-2 uppercase tracking-wide text-text-muted">
                        <Scale className="w-4 h-4" />
                        Impact Analysis
                    </h2>
                </div>
                <div className="p-6">
                    <ImpactStats data={data} threshold={threshold} />
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs text-text-muted space-y-2">
                <p className="font-bold mb-1">Observation Guide:</p>
                <ul className="list-disc list-inside space-y-1 opacity-80">
                    <li>Move the slider to shift outcomes.</li>
                    <li>Observe how False Positives vs False Negatives trade off.</li>
                    <li>In the Sample Cases below, notice how some lives (cases) flip between approved/rejected based on your arbitrary line.</li>
                </ul>
                <div className="mt-4 pt-4 border-t border-gray-200 opacity-60 italic">
                    "The threshold is not neutral - it embodies values and priorities."
                </div>
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Threshold Adjuster"
            subtitle="The Ethics of the Cut: adjusting decision boundaries in classification systems"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default ThresholdAdjuster;

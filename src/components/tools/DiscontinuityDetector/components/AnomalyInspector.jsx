import React, { useState } from 'react';
import { AlertTriangle, MessageSquare } from 'lucide-react';

const AnomalyInspector = ({ anomaly }) => {
    const [interpretation, setInterpretation] = useState('');

    if (!anomaly) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-8 border-2 border-dashed border-[var(--color-main)]">
                <AlertTriangle size={48} className="mb-4 text-[var(--color-main)]" />
                <p className="text-xl font-bold">Select an anomaly to inspect</p>
                <p className="text-sm">Click on any red dot in the timeline.</p>
            </div>
        );
    }

    return (
        <div className="card h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 text-red-500 border-b-2 border-red-100 pb-2">
                <AlertTriangle size={24} />
                <h2 className="text-xl font-bold uppercase">Discontinuity Detected</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="block opacity-60 uppercase text-xs">Timestamp</span>
                    <span className="font-mono font-bold">{anomaly.timestamp}</span>
                </div>
                <div>
                    <span className="block opacity-60 uppercase text-xs">Severity Score</span>
                    <span className="font-mono font-bold text-red-500">{anomaly.score?.toFixed(2)} σ</span>
                </div>
            </div>

            <div className="bg-gray-50 p-4 border-l-4 border-[var(--color-main)] italic">
                "{anomaly.content}"
            </div>

            <div className="mt-auto">
                <label className="block text-sm font-bold uppercase mb-2 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Human Interpretation
                </label>
                <textarea
                    className="w-full h-32 p-3 border-2 border-gray-200 focus:border-[var(--color-main)] outline-none resize-none font-mono text-sm"
                    placeholder="What contingent event caused this rupture? (e.g., 'Election results announced', 'Policy change')"
                    value={interpretation}
                    onChange={(e) => setInterpretation(e.target.value)}
                />
                <button
                    className="btn-primary w-full mt-4 justify-center"
                    onClick={() => alert("Interpretation saved to local session.")}
                >
                    Save Interpretation
                </button>
            </div>
        </div>
    );
};

export default AnomalyInspector;

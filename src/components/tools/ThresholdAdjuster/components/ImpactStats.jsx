import React from 'react';

const ImpactStats = ({ data, threshold }) => {
    if (!data) return null;

    const accepted = data.filter(d => d.risk_score >= threshold).length;
    const rejected = data.filter(d => d.risk_score < threshold).length;
    const total = data.length;

    // Calculate "In Doubt" (within +/- 5% of threshold)
    const doubtRange = 0.05;
    const inDoubt = data.filter(d => Math.abs(d.risk_score - threshold) < doubtRange).length;

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex items-center justify-between">
                <div>
                    <h4 className="text-gray-600 font-semibold text-xs uppercase">Accepted</h4>
                    <p className="text-xs text-gray-500 font-mono">{((accepted / total) * 100).toFixed(1)}%</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{accepted}</p>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-center justify-between">
                <div>
                    <h4 className="text-gray-600 font-semibold text-xs uppercase">In Doubt</h4>
                    <p className="text-xs text-gray-500 font-mono">Cases within ±5%</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{inDoubt}</p>
            </div>

            <div className="bg-red-50 p-3 rounded-lg border border-red-200 flex items-center justify-between">
                <div>
                    <h4 className="text-gray-600 font-semibold text-xs uppercase">Rejected</h4>
                    <p className="text-xs text-gray-500 font-mono">{((rejected / total) * 100).toFixed(1)}%</p>
                </div>
                <p className="text-2xl font-bold text-red-600">{rejected}</p>
            </div>
        </div>
    );
};

export default ImpactStats;

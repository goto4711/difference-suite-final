import React from 'react';

const CaseList = ({ data, threshold }) => {
    if (!data) return null;

    // Sort by proximity to threshold
    const sortedData = [...data].sort((a, b) => {
        const distA = Math.abs(a.risk_score - threshold);
        const distB = Math.abs(b.risk_score - threshold);
        return distA - distB;
    });

    // Show top 20 closest cases
    const displayData = sortedData.slice(0, 20);

    return (
        <div className="bg-white/50 border-2 border-[var(--color-main)] p-4 mt-6 shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
            <h3 className="text-lg font-bold mb-4 text-[var(--color-main)] uppercase">Cases in the Balance (Nearest to Threshold)</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-[var(--color-main)] text-white uppercase font-medium">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Origin</th>
                            <th className="px-4 py-3">Risk Score</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Summary</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-main)]">
                        {displayData.map((item) => {
                            const isAccepted = item.risk_score >= threshold;
                            const isDoubt = Math.abs(item.risk_score - threshold) < 0.05;

                            return (
                                <tr key={item.id} className="transition-colors border-b border-[var(--color-main)]/20 hover:bg-[var(--color-main)]/10 bg-[var(--color-main)]/5">
                                    <td className="px-4 py-3 font-mono text-[var(--color-text)] opacity-70">{item.id}</td>
                                    <td className="px-4 py-3 font-bold text-[var(--color-main)]">{item.origin}</td>
                                    <td className="px-4 py-3 font-mono font-bold">
                                        {item.risk_score.toFixed(3)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${isAccepted
                                            ? "bg-green-100 text-green-800 border border-green-300"
                                            : "bg-red-100 text-red-800 border border-red-300"
                                            }`}>
                                            {isAccepted ? "ACCEPTED" : "REJECTED"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--color-text)] truncate max-w-xs italic" title={item.case_summary}>
                                        "{item.case_summary}"
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-[var(--color-text)] mt-4 text-center opacity-60">Showing the 20 cases most affected by the current threshold setting.</p>
        </div>
    );
};

export default CaseList;

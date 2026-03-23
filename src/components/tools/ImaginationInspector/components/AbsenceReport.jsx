import React from 'react';
import { AlertTriangle } from 'lucide-react';

const AbsenceReport = ({ report }) => {
    if (!report) return null;

    return (
        <div className="card flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b-2 border-[var(--color-main)] pb-2">
                <AlertTriangle className="text-[var(--color-main)]" />
                <h2 className="text-xl font-bold uppercase text-[var(--color-main)]">
                    The Void Report
                </h2>
            </div>
            <p className="text-sm opacity-70 italic max-w-2xl">
                What the model <strong>fails</strong> to imagine is as important as what it sees.
                Dashed bars represent the "Ghost of Possibility"—concepts that exist in reality but are absent from the model's output.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(report.categories).map(([category, data]) => {
                    // Combine present and absent for a unified view
                    const allTraits = [
                        ...data.present.map(p => ({ ...p, type: 'present' })),
                        ...data.absent.map(tag => ({ tag, percentage: 0, type: 'absent' }))
                    ].sort((a, b) => {
                        // Sort present first by %, then absent
                        if (a.type !== b.type) return a.type === 'present' ? -1 : 1;
                        return b.percentage - a.percentage;
                    });

                    return (
                        <div key={category} className="flex flex-col gap-2">
                            <h3 className="font-bold uppercase text-sm bg-[var(--color-main)] text-white px-2 py-1 inline-block self-start">
                                {category}
                            </h3>

                            <div className="space-y-2 mt-2">
                                {allTraits.map((item) => (
                                    <div key={item.tag} className="flex flex-col gap-1 text-sm group">
                                        <div className="flex justify-between items-end">
                                            <span className={`font-mono text-xs ${item.type === 'absent' ? 'opacity-50 italic' : ''}`}>
                                                {item.tag}
                                            </span>
                                            <span className="text-[10px] opacity-50">
                                                {item.type === 'present' ? `${Math.round(item.percentage)}%` : 'VOID'}
                                            </span>
                                        </div>

                                        {/* Bar Container */}
                                        <div className="h-6 w-full relative">
                                            {item.type === 'present' ? (
                                                <div
                                                    className="h-full bg-[var(--color-main)] transition-all duration-500"
                                                    style={{ width: `${Math.max(item.percentage, 5)}%` }} // Min width for visibility
                                                ></div>
                                            ) : (
                                                <div className="h-full w-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
                                                    <span className="text-[10px] uppercase tracking-widest text-gray-300 font-bold">Absent</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AbsenceReport;

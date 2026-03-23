import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { transformersClient } from '../../../../core/inference/TransformersClient';

interface DetailViewProps {
    item: any;
    normDistance: number;
}

const DetailView: React.FC<DetailViewProps> = ({ item, normDistance }) => {
    const [isExtracting, setIsExtracting] = useState(false);
    const [entities, setEntities] = useState<any[]>([]);

    if (!item) {
        return (
            <div className="h-full flex items-center justify-center text-[var(--color-main)] opacity-50 italic border-2 border-dashed border-[var(--color-main)]">
                Select a point to analyze its difference
            </div>
        );
    }

    const handleExtract = async () => {
        setIsExtracting(true);
        try {
            const labels = ["Person", "Location", "Organization", "Date", "Event"];
            const extractionPrompt = `Extract entities from the following text and categorize them as: ${labels.join(', ')}.
Text: "${item.content}"

Output each entity on a new line in the format: "Category: EntityName". Do not include any other text.`;

            const result = await transformersClient.run({
                id: crypto.randomUUID(),
                tool: 'DetailExtractor',
                model: 'smollm2-135m-instruct',
                task: 'text-generation',
                payload: { 
                    prompt: `<|im_start|>user\n${extractionPrompt}<|im_end|>\n<|im_start|>assistant\n`,
                    options: { max_new_tokens: 200, temperature: 0 }
                }
            });

            // Parse the "Category: EntityName" format
            const output = (result.output as string) || '';
            const extracted = output.split('\n')
                .map(line => {
                    const match = line.match(/^(.*?):\s*(.*)$/);
                    if (match) {
                        return { 
                            entity_group: match[1].trim(), 
                            word: match[2].trim(), 
                            score: 0.95 // Synthetic score for compatibility
                        };
                    }
                    return null;
                })
                .filter(e => e !== null);

            setEntities(extracted);
        } catch (error) {
            console.error("NER extraction failed", error);
        } finally {
            setIsExtracting(false);
        }
    };

    const getNarrative = (dist: number) => {
        if (dist < 0.5) return "This item sits comfortably within the norm. It shares the common patterns of the cluster.";
        if (dist < 1.0) return "This item shows slight deviations. It conforms to the general pattern but has unique characteristics.";
        return "This item is a distinct outlier. It resists the simplifying logic of the cluster, holding details that don't fit the standard profile.";
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="bg-[var(--color-alt)] p-6 border-2 border-[var(--color-main)] shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
                <h2 className="text-xl font-bold text-[var(--color-main)] mb-2 uppercase">The Detail</h2>
                <div className="text-lg font-serif leading-relaxed bg-white/50 p-4 border border-[var(--color-main)] mb-4">
                    "{item.content}"
                </div>

                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[var(--color-main)] uppercase tracking-wider">Zero-Shot Intelligence</span>
                    <button
                        onClick={handleExtract}
                        disabled={isExtracting}
                        className="deep-button flex items-center gap-2"
                    >
                        {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {isExtracting ? 'Analyzing Elements...' : 'Extract Core Entities'}
                    </button>
                </div>

                {entities.length > 0 && (
                    <div className="bg-white border border-[var(--color-main)] p-4 flex flex-wrap gap-2">
                        {entities.filter(e => e.score > 0.5).map((e, idx) => (
                            <div key={idx} className="flex flex-col border border-gray-200 bg-gray-50 rounded px-2 py-1">
                                <span className="text-[10px] uppercase font-bold text-gray-400">{e.entity_group}</span>
                                <span className="text-sm font-black text-[var(--color-main)]">{e.word}</span>
                                <span className="text-[10px] text-green-600 font-mono mt-0.5">{(e.score * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                        {entities.filter(e => e.score > 0.5).length === 0 && (
                            <span className="text-xs italic text-gray-500">No high-confidence entities found in this context.</span>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white p-6 border border-gray-200 shadow-sm flex-1">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Algorithmic Interpretation</h3>
                <p className="text-sm leading-relaxed text-gray-700">
                    {getNarrative(normDistance)}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>Deviation Vector Magnitude:</span>
                    <span>{normDistance.toFixed(4)}</span>
                </div>
            </div>
        </div>
    );
};

export default DetailView;

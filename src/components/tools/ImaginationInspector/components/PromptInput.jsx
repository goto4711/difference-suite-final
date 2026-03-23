import React from 'react';
import { Search, Info, Mic } from 'lucide-react';

const SUPPORTED_KEYWORDS = ["CEO", "Nurse", "Terrorist", "Professor", "Criminal", "Worker"];

const PromptInput = ({ prompt, setPrompt, onGenerate, loading, label = "Probe the Latent Space", onMicClick }) => {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
                <label className="text-xs font-bold uppercase text-[var(--color-main)] opacity-70 tracking-widest">
                    {label}
                </label>
                <div className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-100 flex items-center gap-1">
                    <Info size={10} />
                    <span>SIMULATION MODE (Demo)</span>
                </div>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder='Enter a concept...'
                    className="flex-1 p-3 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-[var(--color-main)] focus:ring-1 focus:ring-[var(--color-main)] transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && onGenerate && onGenerate()}
                />
                <button
                    onClick={onMicClick}
                    className="bg-gray-100 text-[var(--color-main)] p-3 rounded hover:bg-gray-200 transition-all border border-gray-200"
                    title="Voice Input"
                >
                    <Mic size={20} />
                </button>
                {onGenerate && (
                    <button
                        onClick={onGenerate}
                        disabled={loading || !prompt.trim()}
                        className="bg-[var(--color-main)] text-white p-3 rounded hover:opacity-90 disabled:opacity-50 transition-all font-bold"
                    >
                        {loading ? <span className="animate-spin">⌛</span> : <Search size={20} />}
                    </button>
                )}
            </div>

            {/* Keywords Helper */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Try:</span>
                {SUPPORTED_KEYWORDS.map(kw => (
                    <button
                        key={kw}
                        onClick={() => setPrompt(kw)}
                        className="px-2 py-1 bg-gray-100 hover:bg-[var(--color-main)] hover:text-white text-gray-600 text-[10px] rounded border border-gray-200 transition-colors font-mono"
                    >
                        {kw}
                    </button>
                ))}
            </div>

            <p className="text-[10px] text-gray-400 italic">
                * Note: This demo uses pre-generated archetypes to simulate common model biases without hitting a live GPU.
            </p>
        </div>
    );
};

export default PromptInput;

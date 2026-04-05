import React from 'react';
import { Search, Mic } from 'lucide-react';

// A curated sample of professions drawn from the Stable Bias dataset (stable-bias/professions)
// so suggestion chips are guaranteed to return real images.
const SUGGESTED_PROFESSIONS = [
    'doctor', 'nurse', 'CEO', 'software developer', 'lawyer',
    'teacher', 'firefighter', 'janitor', 'pilot', 'therapist',
];

const PromptInput = ({ prompt, setPrompt, onGenerate, loading, label = "Probe the Latent Space", onMicClick }) => {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end">
                <label className="text-xs font-bold uppercase text-[var(--color-main)] opacity-70 tracking-widest">
                    {label}
                </label>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder='Enter a profession...'
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

            {/* Profession suggestion chips — all guaranteed to match Stable Bias dataset */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Try:</span>
                {SUGGESTED_PROFESSIONS.map(kw => (
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
                Searches the <strong>Stable Bias</strong> dataset (Bianchi et al., 2023) — real Stable Diffusion outputs for 146 professions. Unknown terms fall back to language model simulation.
            </p>
        </div>
    );
};

export default PromptInput;

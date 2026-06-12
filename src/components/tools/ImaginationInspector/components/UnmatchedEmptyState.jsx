import React from 'react';
import { SearchX } from 'lucide-react';

const humanize = (slug) => slug.replace(/_/g, ' ');

const UnmatchedEmptyState = ({ prompt, suggestions, onPick }) => (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--color-main)]/10 flex items-center justify-center">
            <SearchX className="text-[var(--color-main)]" size={28} />
        </div>
        <div className="max-w-md space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-main">
                Not in the archive
            </h3>
            <p className="text-[13px] text-text-muted leading-relaxed">
                <em>"{prompt}"</em> isn't in the Stable Bias archive. The archive covers
                146 professions — try one of these:
            </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {suggestions.map(slug => (
                <button
                    key={slug}
                    onClick={() => onPick && onPick(humanize(slug))}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-[var(--color-main)] hover:text-white text-gray-700 text-xs rounded-full border border-gray-200 transition-colors font-mono"
                >
                    {humanize(slug)}
                </button>
            ))}
        </div>
        <p className="text-[10px] text-text-muted/70 italic max-w-md leading-relaxed">
            We don't run a generative model in the browser for unrecognised prompts —
            anything we'd show would be unreliable text-only invention, not a real
            image-generation result.
        </p>
    </div>
);

export default UnmatchedEmptyState;

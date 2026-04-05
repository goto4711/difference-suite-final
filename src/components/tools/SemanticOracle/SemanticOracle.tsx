import React, { useState, useMemo } from 'react';
import { useSuiteStore } from '../../../stores/suiteStore';
import { transformersClient } from '../../../core/inference/TransformersClient';
import { Sparkles, BookOpen, GitBranch, Lightbulb, Send, BrainCircuit, FileText, ChevronDown } from 'lucide-react';

const MODES = [
    { id: 'define', label: 'Define', icon: BookOpen, prompt: "Define and explain this concept clearly: " },
    { id: 'expand', label: 'Expand', icon: GitBranch, prompt: "List 5 related concepts or hidden connections to: " },
    { id: 'tangent', label: 'Tangent', icon: Lightbulb, prompt: "Write a creative, abstract metaphor describing: " }
];

const SemanticOracle = () => {
    const store = useSuiteStore();
    // FIX: store uses 'dataset', not 'items'
    const dataset = store?.dataset || [];

    console.log('SemanticOracle mounting. Dataset size:', dataset?.length);

    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [mode, setMode] = useState('define');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showCorpus, setShowCorpus] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter for text corpus items
    const textCorpus = useMemo(() => {
        try {
            if (!dataset) return [];
            const texts = dataset.filter(i => i && i.type === 'text');
            console.log('Corpus filtered. Text items found:', texts.length);
            return texts;
        } catch (e) {
            console.error('Error filtering corpus:', e);
            return [];
        }
    }, [dataset]);

    const handleGenerate = async () => {
        if (!input.trim()) return;

        setIsGenerating(true);
        setOutput('');
        setProgress(0);
        setError(null);

        try {
            const selectedMode = MODES.find(m => m.id === mode);
            const fullPrompt = `${selectedMode?.prompt} ${input}`;

            const result = await transformersClient.run(
                {
                    id: crypto.randomUUID(),
                    tool: 'SemanticOracle',
                    model: 'smollm2-135m-instruct',
                    task: 'text-generation',
                    payload: { prompt: fullPrompt, options: { max_new_tokens: 200 } }
                },
                (p) => setProgress(p.progress || 0)
            );

            setOutput(result.output as string);
        } catch (error: any) {
            console.error("Oracle failed:", error);
            setError(error.message || "Unknown error during generation");
            setOutput("The Oracle is clouded. (Model generation failed)");
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    const handleSelectCorpusItem = (content: string) => {
        const truncated = content.length > 500 ? content.substring(0, 500) + "..." : content;
        setInput(truncated);
        setShowCorpus(false);
    };

    if (!store) {
        return (
            <div className="h-full flex items-center justify-center text-red-500">
                Error: Store not initialized.
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#fafaf9] relative overflow-hidden font-sans">
            {error && (
                <div className="bg-red-50 text-red-600 p-4 border-b border-red-200 z-50 text-center font-bold">
                    ⚠️ Oracle Error: {error}
                </div>
            )}

            {/* Background Ambient - Deep Culture Colors */}
            <div className="absolute inset-0 pointer-events-none opacity-5">
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-main rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-40 -left-20 w-72 h-72 bg-alt rounded-full blur-3xl" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="p-6 border-b border-black/5 bg-white/80 backdrop-blur-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-main/10 text-main rounded-lg border border-main/20">
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-main tracking-tight">The Semantic Oracle</h2>
                        <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Local Generative Intelligence • SmolLM2-135M</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-8 relative z-10">

                {/* Output Display */}
                <div className={`w-full max-w-3xl min-h-[240px] p-10 rounded-xl bg-white shadow-card border-2 border-black/5 transition-all duration-500 ${output ? 'opacity-100 translate-y-0' : 'opacity-80 translate-y-4'}`}>
                    {isGenerating && !output ? (
                        <div className="flex flex-col items-center justify-center h-full text-main gap-6">
                            <Sparkles className="animate-spin text-alt" size={48} />
                            <div className="flex flex-col items-center gap-3 w-64">
                                <span className="text-sm font-bold uppercase tracking-widest text-main/60 animate-pulse">Consulting Oracle...</span>
                                {progress > 0 && progress < 1 && (
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-black/5">
                                        <div className="h-full bg-main transition-all duration-300" style={{ width: `${progress * 100}%` }}></div>
                                    </div>
                                )}
                                {progress > 0 && progress < 1 && <span className="text-[10px] uppercase font-bold text-text-muted">Loading Weights ({(progress * 100).toFixed(0)}%)</span>}
                            </div>
                        </div>
                    ) : output ? (
                        <div className="prose max-w-none">
                            <p className="text-xl leading-loose text-text font-medium font-serif border-l-4 border-alt pl-6 italic">{output}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted/40 gap-4">
                            <BrainCircuit size={64} strokeWidth={0.5} />
                            <p className="font-medium text-lg">Ask a question or define a concept.</p>
                        </div>
                    )}
                </div>

                {/* Input Interface */}
                <div className="w-full max-w-3xl flex flex-col gap-5">

                    {/* Mode Selector */}
                    <div className="flex gap-3 justify-center">
                        {MODES.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id)}
                                className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide flex items-center gap-2 transition-all border-2 ${mode === m.id
                                    ? 'bg-main text-white border-main shadow-lg scale-105'
                                    : 'bg-white text-text-muted border-transparent hover:border-main/20 hover:text-main'
                                    }`}
                            >
                                <m.icon size={16} />
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Prompt Input Area */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-main to-alt rounded-lg opacity-20 group-hover:opacity-40 transition duration-500 blur-sm"></div>
                        <div className="relative bg-white rounded-lg shadow-sm border border-black/5">

                            {/* Corpus Selector */}
                            {textCorpus.length > 0 && (
                                <div className="px-2 pt-2 flex justify-end">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowCorpus(!showCorpus)}
                                            className="text-xs font-bold uppercase tracking-wider text-main/70 hover:text-main flex items-center gap-1 px-2 py-1 hover:bg-main/5 rounded transition-colors"
                                        >
                                            <FileText size={12} />
                                            Load from Corpus
                                            <ChevronDown size={12} className={`transition-transform ${showCorpus ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showCorpus && (
                                            <div className="absolute bottom-full right-0 mb-2 w-64 max-h-60 overflow-y-auto bg-white border border-black/10 rounded-lg shadow-xl z-20 custom-scrollbar">
                                                <div className="p-2 text-[10px] font-bold uppercase text-text-muted border-b border-black/5 mb-1">Select Text Item</div>
                                                {dataset.map(item => (
                                                    <button
                                                        key={item.id}
                                                        // Only enable click if it has text content
                                                        onClick={() => {
                                                            // @ts-ignore
                                                            const content = item.content || item.text || item.description || item.name;
                                                            handleSelectCorpusItem(content);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm text-text hover:bg-main/5 hover:text-main truncate transition-colors flex items-center justify-between group"
                                                    >
                                                        <span>{item.name}</span>
                                                        <span className="text-[10px] text-text-muted opacity-50 group-hover:opacity-100">{item.type}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center p-2">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleGenerate())}
                                    placeholder="Enter a concept or paste text..."
                                    className="flex-1 px-4 py-3 text-lg bg-transparent outline-none text-text placeholder-text-muted/50 font-medium resize-none"
                                    rows={2}
                                    disabled={isGenerating}
                                />
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !input.trim()}
                                    className="h-12 w-12 flex items-center justify-center bg-main text-white rounded hover:bg-main-hover disabled:opacity-50 disabled:hover:bg-main transition-colors mx-2"
                                >
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default SemanticOracle;

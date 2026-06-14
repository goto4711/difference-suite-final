import { useState } from 'react';
import { Sparkles, User, Split, Maximize, WifiOff } from 'lucide-react';
import PromptInput from './components/PromptInput';
import GenerationGrid from './components/GenerationGrid';
import AbsenceReport from './components/AbsenceReport';
import UnmatchedEmptyState from './components/UnmatchedEmptyState';
import { generateImages, type GenerateOptions, type GeneratedResult, type GenerateOutcome } from './utils/GeneratorEngine';
import { analyzeBias } from './utils/BiasAnalyzer';
import ToolLayout from '../../shared/ToolLayout';
import { AudioRecorderModal } from '../../dashboard/modals/AudioRecorderModal';
import { useReportCurrentOutput } from '../../../stores/currentOutputStore';

interface BiasCategoryReport {
    present: Array<{ tag: string; count: number; percentage: number }>;
    absent: string[];
}

interface BiasReport {
    totalImages: number;
    categories: Record<string, BiasCategoryReport>;
}

// NOTE: the "Dataset Alignment" panel (RealityMatches + DatasetAligner) was
// removed 2026-06-12. It ran an extra CLIP pass over the whole image corpus on
// every generation, its raw-cosine percentages were uninformative, and the
// blob-URL→Blob transport change broke its identity matching (every thumbnail
// rendered as "Unknown"). Corpus-vs-prompt similarity is better served by
// Deep Vector Mirror and Context Weaver.

const ImaginationInspector = () => {
    const [mode, setMode] = useState<'single' | 'compare'>('single');

    // When generateImages returns kind:'unmatched', the side displays an
    // empty state with suggestion chips instead of the grid. null = no
    // unmatched state for this side.
    interface UnmatchedState { prompt: string; suggestions: string[] }
    interface OfflineState { prompt: string; reason: string }

    // Side A (Default)
    const [promptA, setPromptA] = useState('');
    const [resultsA, setResultsA] = useState<GeneratedResult[]>([]);
    const [reportA, setReportA] = useState<BiasReport | null>(null);
    const [unmatchedA, setUnmatchedA] = useState<UnmatchedState | null>(null);
    const [offlineA, setOfflineA] = useState<OfflineState | null>(null);

    // Side B (Comparison)
    const [promptB, setPromptB] = useState('');
    const [resultsB, setResultsB] = useState<GeneratedResult[]>([]);
    const [reportB, setReportB] = useState<BiasReport | null>(null);
    const [unmatchedB, setUnmatchedB] = useState<UnmatchedState | null>(null);
    const [offlineB, setOfflineB] = useState<OfflineState | null>(null);

    const [loading, setLoading] = useState(false);
    const [adjectiveMode, setAdjectiveMode] = useState<'varied' | 'fixed'>('varied');
    const [fixedAdjective, setFixedAdjective] = useState('no_adjective');

    // Voice Input State
    const [isMicOpen, setIsMicOpen] = useState(false);
    const [targetVoiceInput, setTargetVoiceInput] = useState<'A' | 'B'>('A');

    interface PanelSetters {
        setResults: (r: GeneratedResult[]) => void;
        setReport: (r: BiasReport | null) => void;
        setUnmatched: (s: UnmatchedState | null) => void;
        setOffline: (s: OfflineState | null) => void;
    }

    const applyOutcome = (outcome: GenerateOutcome, s: PanelSetters) => {
        // Reset siblings so a follow-up run cannot leave a stale offline /
        // unmatched panel visible alongside fresh results.
        s.setUnmatched(null);
        s.setOffline(null);
        if (outcome.kind === 'unmatched') {
            s.setResults([]);
            s.setReport(null);
            s.setUnmatched({ prompt: outcome.prompt, suggestions: outcome.suggestions });
            return;
        }
        if (outcome.kind === 'offline') {
            s.setResults([]);
            s.setReport(null);
            s.setOffline({ prompt: outcome.prompt, reason: outcome.reason });
            return;
        }
        s.setResults(outcome.results);
        s.setReport(analyzeBias(outcome.results) as BiasReport | null);
    };

    const handleGenerate = async () => {
        if (!promptA.trim() && !promptB.trim()) return;
        setLoading(true);

        try {
            const opts: GenerateOptions = adjectiveMode === 'fixed' ? { fixedAdjective } : {};
            // Run A
            if (promptA.trim()) {
                const outA = await generateImages(promptA, opts);
                applyOutcome(outA, {
                    setResults: setResultsA,
                    setReport: setReportA,
                    setUnmatched: setUnmatchedA,
                    setOffline: setOfflineA,
                });
            }
            // Run B if comparing
            if (mode === 'compare' && promptB.trim()) {
                const outB = await generateImages(promptB, opts);
                applyOutcome(outB, {
                    setResults: setResultsB,
                    setReport: setReportB,
                    setUnmatched: setUnmatchedB,
                    setOffline: setOfflineB,
                });
            }
        } catch (error) {
            console.error("Generation failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceCapture = (text: string) => {
        if (targetVoiceInput === 'A') {
            setPromptA(text);
        } else {
            setPromptB(text);
        }
    };

    const hasOutput = resultsA.length > 0 || resultsB.length > 0;
    useReportCurrentOutput({
        toolId: 'ImaginationInspector',
        outputSummary: hasOutput
            ? [
                  mode === 'compare'
                      ? `Prompt A: ${promptA || '—'} (${resultsA.length} images)`
                      : `Prompt: ${promptA || '—'} (${resultsA.length} images)`,
                  mode === 'compare'
                      ? `Prompt B: ${promptB || '—'} (${resultsB.length} images)`
                      : '',
                  adjectiveMode === 'fixed'
                      ? `Fixed adjective: ${fixedAdjective}`
                      : 'Adjective: varied',
              ]
                  .filter(Boolean)
                  .join('\n')
            : null,
        settings: hasOutput
            ? {
                  mode,
                  adjectiveMode,
                  ...(adjectiveMode === 'fixed' ? { fixedAdjective } : {}),
              }
            : undefined,
        models: hasOutput ? ['clip-vit-base-patch32-q4'] : undefined,
    });

    const renderPanel = (
        label: string,
        results: GeneratedResult[],
        loading: boolean,
        prompt: string,
        unmatched: UnmatchedState | null,
        offline: OfflineState | null,
        onPickSuggestion: (slug: string) => void,
    ) => (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-main)] opacity-10"></div>
            {label && <div className="p-2 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-main)] opacity-50 border-b border-gray-100">{label}</div>}

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex items-center justify-center flex-col opacity-50 gap-2">
                        <Sparkles className="animate-spin text-[var(--color-main)] w-8 h-8" />
                        <span className="text-xs font-mono animate-pulse">Dreaming of "{prompt}"...</span>
                    </div>
                ) : unmatched ? (
                    <UnmatchedEmptyState
                        prompt={unmatched.prompt}
                        suggestions={unmatched.suggestions}
                        onPick={onPickSuggestion}
                    />
                ) : offline ? (
                    <div className="h-full flex items-center justify-center text-text-muted flex-col gap-3 px-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                            <WifiOff className="opacity-40 text-[var(--color-main)]" size={32} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-main)]/70">
                            Image archive unavailable
                        </p>
                        <p className="text-[11px] leading-relaxed max-w-sm opacity-80">{offline.reason}</p>
                    </div>
                ) : results.length > 0 ? (
                    <GenerationGrid results={results} />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                            <User className="opacity-20" size={32} />
                        </div>
                        <span className="text-xs italic opacity-60">Waiting for imagination...</span>
                    </div>
                )}
            </div>
        </div>
    );

    const mainContent = (
        <div className="flex flex-col h-full gap-4">
            {/* Disclosure: name the instrument */}
            <div className="px-4 py-3 bg-[var(--color-main)]/5 border-l-2 border-[var(--color-main)] rounded-r-lg text-[11px] leading-relaxed text-text-muted">
                <p>
                    The demographic readings below are made by another AI — <strong>CLIP</strong>, a model trained on web images
                    with documented biases of its own. They are machine perceptions, not facts about the people depicted (who do
                    not exist). Where CLIP itself hesitates, we say so: <em>"ambiguous"</em>. Notably, the Stable Bias researchers
                    who created this image archive declined to assign identity labels to faces at all.
                </p>
            </div>

            {/* Header Area */}
            <div className="px-6 py-4 bg-white rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-main flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[var(--color-main)]" />
                        Generative Imagination
                    </h2>
                    <p className="text-xs text-text-muted opacity-70">
                        What does AI imagine when asked to picture a profession? Real Stable Diffusion outputs, classified by CLIP.
                    </p>
                </div>

                {/* Visual Mode Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setMode('single')}
                        className={`p-2 rounded-md transition-all ${mode === 'single' ? 'bg-white shadow-sm text-[var(--color-main)]' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Single Mode"
                    >
                        <Maximize size={16} />
                    </button>
                    <button
                        onClick={() => setMode('compare')}
                        className={`p-2 rounded-md transition-all ${mode === 'compare' ? 'bg-white shadow-sm text-[var(--color-main)]' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Comparison Mode"
                    >
                        <Split size={16} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 flex gap-4 min-h-0 ${mode === 'compare' ? '' : 'justify-center'}`}>
                {renderPanel(
                    mode === 'compare' ? 'Side A' : '',
                    resultsA,
                    loading,
                    promptA,
                    unmatchedA,
                    offlineA,
                    setPromptA,
                )}

                {mode === 'compare' && (
                    <>
                        <div className="w-[1px] bg-gray-200 self-stretch my-4"></div>
                        {renderPanel('Side B', resultsB, loading, promptB, unmatchedB, offlineB, setPromptB)}
                    </>
                )}
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col h-full gap-4 p-1">
            {/* Input Side A */}
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 relative overflow-hidden group transition-all ${mode === 'compare' && !promptA ? 'ring-2 ring-red-50' : ''}`}>
                {mode === 'compare' && <div className="absolute top-0 right-0 bg-gray-100 text-[10px] px-2 py-1 text-gray-500 font-mono rounded-bl-lg font-bold">SIDE A</div>}
                <PromptInput
                    prompt={promptA}
                    setPrompt={setPromptA}
                    onGenerate={mode === 'single' ? handleGenerate : undefined}
                    loading={loading}
                    label={mode === 'compare' ? "Prompt A" : "Prompt"}
                    onMicClick={() => {
                        setTargetVoiceInput('A');
                        setIsMicOpen(true);
                    }}
                />
            </div>

            {/* Input Side B (If Compare) */}
            {mode === 'compare' && (
                <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 relative overflow-hidden transition-all ${mode === 'compare' && !promptB ? 'ring-2 ring-red-50' : ''}`}>
                    <div className="absolute top-0 right-0 bg-gray-100 text-[10px] px-2 py-1 text-gray-500 font-mono rounded-bl-lg font-bold">SIDE B</div>
                    <PromptInput
                        prompt={promptB}
                        setPrompt={setPromptB}
                        onGenerate={undefined} // Manual run button only for compare
                        loading={loading}
                        label="Prompt B"
                        onMicClick={() => {
                            setTargetVoiceInput('B');
                            setIsMicOpen(true);
                        }}
                    />
                </div>
            )}

            {/* Adjective Control */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-main)] opacity-70 tracking-widest">Adjective</span>
                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded border border-gray-200">
                        <button
                            onClick={() => setAdjectiveMode('varied')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${adjectiveMode === 'varied' ? 'bg-white shadow-sm text-[var(--color-main)]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Varied
                        </button>
                        <button
                            onClick={() => setAdjectiveMode('fixed')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${adjectiveMode === 'fixed' ? 'bg-white shadow-sm text-[var(--color-main)]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Fixed
                        </button>
                    </div>
                </div>
                {adjectiveMode === 'fixed' ? (
                    <select
                        value={fixedAdjective}
                        onChange={(e) => setFixedAdjective(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded text-xs font-mono focus:outline-none focus:border-[var(--color-main)]"
                    >
                        <option value="no_adjective">— neutral (no adjective)</option>
                        {['ambitious', 'assertive', 'committed', 'compassionate', 'confident',
                          'considerate', 'decisive', 'determined', 'emotional', 'gentle',
                          'honest', 'intellectual', 'modest', 'outspoken', 'pleasant',
                          'self-confident', 'sensitive', 'stubborn', 'supportive', 'unreasonable',
                        ].map(adj => (
                            <option key={adj} value={adj}>{adj}</option>
                        ))}
                    </select>
                ) : (
                    <p className="text-[10px] text-gray-400 italic">Each image uses a different random adjective from the dataset.</p>
                )}
            </div>

            {/* Generate Button (Global if Compare) */}
            {mode === 'compare' && (
                <button
                    onClick={handleGenerate}
                    disabled={loading || (!promptA && !promptB)}
                    className="deep-button w-full py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs shadow-md hover:shadow-lg transition-all"
                >
                    <Sparkles size={16} />
                    {loading ? 'Comparing...' : 'Run Comparison'}
                </button>
            )}


            {/* Absence Report(s) */}
            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar pt-2 border-t border-gray-100">
                {reportA && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden shrink-0">
                        {mode === 'compare' && <div className="bg-gray-50 px-3 py-1 text-[10px] border-b border-gray-100 font-bold opacity-50 uppercase tracking-widest">Report A</div>}
                        <AbsenceReport report={reportA} />
                    </div>
                )}

                {mode === 'compare' && reportB && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden shrink-0">
                        <div className="bg-gray-50 px-3 py-1 text-[10px] border-b border-gray-100 font-bold opacity-50 uppercase tracking-widest">Report B</div>
                        <AbsenceReport report={reportB} />
                    </div>
                )}
            </div>

            {isMicOpen && (
                <AudioRecorderModal
                    isOpen={isMicOpen}
                    onClose={() => setIsMicOpen(false)}
                    onCapture={() => { }} // We don't need the file, we use onTranscribeCapture
                    onTranscribeCapture={(text) => handleVoiceCapture(text)}
                />
            )}
        </div>
    );

    return (
        <ToolLayout
            title="Imagination Inspector"
            subtitle="What does AI imagine when asked to picture a profession?"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default ImaginationInspector;

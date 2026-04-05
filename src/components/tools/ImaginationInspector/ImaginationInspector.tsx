import { useState } from 'react';
import { Sparkles, AlertTriangle, User, Split, Maximize, Search, Database } from 'lucide-react';
import PromptInput from './components/PromptInput';
import GenerationGrid from './components/GenerationGrid';
import AbsenceReport from './components/AbsenceReport';
import { generateImages, type GenerateOptions } from './utils/GeneratorEngine';
import { analyzeBias } from './utils/BiasAnalyzer';
import ToolLayout from '../../shared/ToolLayout';
import { useSuiteStore } from '../../../stores/suiteStore';
import { alignDatasetToPrompt } from './utils/DatasetAligner';
import type { AlignmentResult } from './utils/DatasetAligner';
import { AudioRecorderModal } from '../../dashboard/modals/AudioRecorderModal';

const INTERNAL_ARCHETYPES = [
    { id: 'arc-ceo', name: 'CEO', content: `${window.location.origin}/images/ceo_archetype.png`, type: 'image' },
    { id: 'arc-nurse', name: 'Nurse', content: `${window.location.origin}/images/nurse_archetype.png`, type: 'image' },
    { id: 'arc-criminal', name: 'Criminal', content: `${window.location.origin}/images/criminal_archetype.png`, type: 'image' },
    { id: 'arc-professor', name: 'Professor', content: `${window.location.origin}/images/professor_archetype.png`, type: 'image' },
    { id: 'arc-terrorist', name: 'Terrorist', content: `${window.location.origin}/images/terrorist_archetype.png`, type: 'image' },
    { id: 'arc-worker', name: 'Worker', content: `${window.location.origin}/images/worker_archetype.png`, type: 'image' },
];

const RealityMatches = ({ alignments, label, datasetName }: { alignments: AlignmentResult[], label?: string, datasetName: string }) => {
    if (alignments.length === 0) return null;

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-main uppercase tracking-widest flex items-center gap-1.5">
                    <Database size={10} />
                    Dataset Alignment {label && `(${label})`}
                </span>
                <span className="text-[9px] text-text-muted italic">CLIP semantic match</span>
            </div>
            <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                    {alignments.map((match, i) => (
                        <div key={i} className="group relative">
                            <div className="aspect-square rounded bg-gray-100 overflow-hidden border border-gray-100 transition-transform group-hover:scale-105">
                                <img src={match.url} alt={match.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8px] py-0.5 text-center font-bold">
                                    {(match.score * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-[9px] text-text-muted mt-2 leading-tight">
                    Top semantically similar items using multimodal CLIP alignment:{' '}
                    {datasetName.split(', ').map((name, i, arr) => (
                        <span key={name}>
                            <strong>{name}</strong>{i < arr.length - 1 ? ', ' : ''}
                        </span>
                    ))}
                </p>
            </div>
        </div>
    );
};

const ImaginationInspector = () => {
    const { dataset, collections } = useSuiteStore();

    // Derive a human-readable name for the dataset alignment section.
    const datasetName = (() => {
        if (dataset.length === 0) return 'Built-in Archetypes';
        const collectionIds = [...new Set(dataset.map(i => i.collectionId).filter(Boolean))];
        const namedCollections = collectionIds
            .map(id => collections.find(c => c.id === id)?.name)
            .filter(Boolean) as string[];
        if (namedCollections.length > 0) return namedCollections.join(', ');
        return `Your Dataset (${dataset.length} items)`;
    })();
    const [mode, setMode] = useState<'single' | 'compare'>('single');

    // Side A (Default)
    const [promptA, setPromptA] = useState('');
    const [resultsA, setResultsA] = useState<any[]>([]);
    const [reportA, setReportA] = useState<any>(null);
    const [alignmentsA, setAlignmentsA] = useState<AlignmentResult[]>([]);

    // Side B (Comparison)
    const [promptB, setPromptB] = useState('');
    const [resultsB, setResultsB] = useState<any[]>([]);
    const [reportB, setReportB] = useState<any>(null);
    const [alignmentsB, setAlignmentsB] = useState<AlignmentResult[]>([]);

    const [loading, setLoading] = useState(false);
    const [adjectiveMode, setAdjectiveMode] = useState<'varied' | 'fixed'>('varied');
    const [fixedAdjective, setFixedAdjective] = useState('no_adjective');

    // Voice Input State
    const [isMicOpen, setIsMicOpen] = useState(false);
    const [targetVoiceInput, setTargetVoiceInput] = useState<'A' | 'B'>('A');

    const handleGenerate = async () => {
        if (!promptA.trim() && !promptB.trim()) return;
        setLoading(true);

        try {
            const opts: GenerateOptions = adjectiveMode === 'fixed' ? { fixedAdjective } : {};
            // Run A
            if (promptA.trim()) {
                const genA = await generateImages(promptA, opts);
                setResultsA(genA);
                setReportA(analyzeBias(genA));
                const searchSpaceA = dataset.length > 0 ? dataset : INTERNAL_ARCHETYPES;
                const aliA = await alignDatasetToPrompt(promptA, searchSpaceA);
                setAlignmentsA(aliA.slice(0, 3));
            }
            // Run B if comparing
            if (mode === 'compare' && promptB.trim()) {
                const genB = await generateImages(promptB, opts);
                setResultsB(genB);
                setReportB(analyzeBias(genB));
                const searchSpaceB = dataset.length > 0 ? dataset : INTERNAL_ARCHETYPES;
                const aliB = await alignDatasetToPrompt(promptB, searchSpaceB);
                setAlignmentsB(aliB.slice(0, 3));
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

    const renderPanel = (label: string, results: any[], loading: boolean, prompt: string) => (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-main)] opacity-10"></div>
            {label && <div className="p-2 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-main)] opacity-50 border-b border-gray-100">{label}</div>}

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex items-center justify-center flex-col opacity-50 gap-2">
                        <Sparkles className="animate-spin text-[var(--color-main)] w-8 h-8" />
                        <span className="text-xs font-mono animate-pulse">Dreaming of "{prompt}"...</span>
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
                {renderPanel(mode === 'compare' ? 'Side A' : '', resultsA, loading, promptA)}

                {mode === 'compare' && (
                    <>
                        <div className="w-[1px] bg-gray-200 self-stretch my-4"></div>
                        {renderPanel('Side B', resultsB, loading, promptB)}
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


            {/* Absence Report(s) & Reality Matches */}
            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar pt-2 border-t border-gray-100">
                {alignmentsA.length > 0 && <RealityMatches alignments={alignmentsA} label={mode === 'compare' ? 'Side A' : ''} datasetName={datasetName} />}

                {reportA && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden shrink-0">
                        {mode === 'compare' && <div className="bg-gray-50 px-3 py-1 text-[10px] border-b border-gray-100 font-bold opacity-50 uppercase tracking-widest">Report A</div>}
                        <AbsenceReport report={reportA} />
                    </div>
                )}

                {alignmentsB.length > 0 && <RealityMatches alignments={alignmentsB} label="Side B" datasetName={datasetName} />}

                {mode === 'compare' && reportB && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden shrink-0">
                        <div className="bg-gray-50 px-3 py-1 text-[10px] border-b border-gray-100 font-bold opacity-50 uppercase tracking-widest">Report B</div>
                        <AbsenceReport report={reportB} />
                    </div>
                )}
            </div>

            <AudioRecorderModal
                isOpen={isMicOpen}
                onClose={() => setIsMicOpen(false)}
                onCapture={() => { }} // We don't need the file, we use onTranscribeCapture
                onTranscribeCapture={(text) => handleVoiceCapture(text)}
            />
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

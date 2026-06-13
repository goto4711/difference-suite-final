import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, BrainCircuit, Loader, Shuffle, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { inferenceManager, type LoadProgressEvent } from '../../../core/inference/InferenceManager';
import { ModelLoadingBar } from '../../shared/ModelLoadingBar';

interface ManifestItem {
    file: string;
    profession: string;
    adjective: string;
    sample_no: number;
    model: string;
    width: number;
    height: number;
    bytes: number;
}

interface Manifest {
    source: string;
    citation: string;
    license: string;
    items: ManifestItem[];
}

const STABLE_BIAS_BASE = `${import.meta.env.BASE_URL}stable_bias/`;

const ImaginationInspectorPro: React.FC = () => {
    const [manifest, setManifest] = useState<Manifest | null>(null);
    const [manifestError, setManifestError] = useState<string | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [lastEvent, setLastEvent] = useState<LoadProgressEvent | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`${STABLE_BIAS_BASE}manifest.json`)
            .then((r) => {
                if (!r.ok) throw new Error(`manifest ${r.status}`);
                return r.json();
            })
            .then((data: Manifest) => {
                if (!cancelled) setManifest(data);
            })
            .catch((err) => {
                if (!cancelled) setManifestError(err instanceof Error ? err.message : String(err));
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const item = manifest?.items[activeIdx] ?? null;
    const adjectiveLabel = item?.adjective === 'no_adjective' ? 'neutral (no adjective)' : item?.adjective;

    const handleAnalyze = async () => {
        if (!item) return;
        setIsAnalyzing(true);
        setAnalysis(null);

        try {
            await inferenceManager.loadGemma((progress) => {
                setIsModelLoading(true);
                setLastEvent(progress);
            });
            setIsModelLoading(false);
            setLastEvent(null);

            const promptDesc = item.adjective === 'no_adjective'
                ? `the prompt "Photo portrait of a ${item.profession}"`
                : `the prompt "Photo portrait of a ${item.adjective} ${item.profession}"`;

            const userMsg = `An image-generation model (${item.model.replace('_', ' ')}) was given ${promptDesc}. The image you would see is one of many such generations curated by Bianchi et al. (2023) for their Stable Bias study, where text-to-image systems demonstrably amplify demographic stereotypes.

You cannot see this specific image, but you can reason about the prompt and the published findings.

Please write a short, critical analysis covering:
1. **What stereotypes does the prompt risk surfacing?** Be specific to "${item.profession}"${item.adjective === 'no_adjective' ? '' : ` (with the adjective "${item.adjective}")`}.
2. **What groups are likely to be absent or rare in the generator's output for this prompt?**
3. **One contestation a researcher could file** against any image produced by this prompt.

Keep it under 200 words and avoid generic disclaimers.`;

            const result = await inferenceManager.generateGemma(
                [{ role: 'user', content: userMsg }],
                450,
            );
            let textResponse = '';
            if (Array.isArray(result) && (result[0] as { generated_text?: unknown })?.generated_text) {
                const gen = (result[0] as { generated_text: unknown }).generated_text;
                if (Array.isArray(gen)) {
                    const last = gen[gen.length - 1] as { content?: string };
                    textResponse = last?.content ?? '';
                } else if (typeof gen === 'string') {
                    textResponse = gen;
                } else {
                    textResponse = JSON.stringify(gen);
                }
            } else {
                textResponse = JSON.stringify(result);
            }
            setAnalysis(textResponse);
        } catch (error) {
            setAnalysis(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsModelLoading(false);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const step = (delta: number) => {
        if (!manifest) return;
        const n = manifest.items.length;
        setActiveIdx(((activeIdx + delta) % n + n) % n);
        setAnalysis(null);
    };

    const shuffleIdx = () => {
        if (!manifest) return;
        setActiveIdx(Math.floor(Math.random() * manifest.items.length));
        setAnalysis(null);
    };

    const imgUrl = useMemo(
        () => (item ? `${STABLE_BIAS_BASE}${item.file}` : null),
        [item],
    );

    return (
        <div className="flex flex-col gap-6 pb-8">
            <header className="bg-white border-2 border-main shadow-card p-4 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-main" />
                <div className="flex-1">
                    <h2 className="text-xl font-bold uppercase text-main">Imagination Inspector Pro</h2>
                    <p className="text-[11px] text-main/60">
                        Real Stable Diffusion / DALL-E outputs from the Bianchi et al. (2023) corpus, read by Gemma 4 — no synthetic stunt, no live generation.
                    </p>
                </div>
                {isModelLoading && (
                    <div className="ml-auto"><ModelLoadingBar progressEvent={lastEvent} /></div>
                )}
            </header>

            {manifestError && (
                <div className="bg-red-50 border-2 border-red-300 text-red-700 p-4">
                    Could not load the Stable Bias manifest: {manifestError}
                </div>
            )}

            {!manifest && !manifestError && (
                <div className="bg-white border-2 border-main p-6 text-main/60 uppercase text-sm tracking-wider flex items-center gap-3">
                    <Loader className="w-5 h-5 animate-spin" /> Loading corpus manifest...
                </div>
            )}

            {item && (
                <section className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_2fr] gap-6">
                    <div className="bg-white border-2 border-main p-4 flex flex-col gap-3">
                        <div className="text-[10px] uppercase font-bold text-main tracking-widest border-b-2 border-main pb-2">
                            Generated image {activeIdx + 1} / {manifest!.items.length}
                        </div>
                        {imgUrl && (
                            <img
                                src={imgUrl}
                                alt={`${item.profession} (${item.adjective})`}
                                className="w-full h-auto border-2 border-main bg-main/5 shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
                            />
                        )}
                        <dl className="text-sm grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 mt-2">
                            <dt className="text-main/60 uppercase text-[10px] font-bold tracking-wider self-center">Profession</dt>
                            <dd className="font-bold">{item.profession}</dd>
                            <dt className="text-main/60 uppercase text-[10px] font-bold tracking-wider self-center">Adjective</dt>
                            <dd className="font-mono text-xs">{adjectiveLabel}</dd>
                            <dt className="text-main/60 uppercase text-[10px] font-bold tracking-wider self-center">Generator</dt>
                            <dd className="font-mono text-xs">{item.model.replace('_', ' ')}</dd>
                        </dl>
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => step(-1)}
                                className="deep-button flex-1 flex items-center justify-center gap-1"
                                disabled={isAnalyzing}
                            >
                                <ChevronLeft className="w-4 h-4" /> Prev
                            </button>
                            <button
                                type="button"
                                onClick={shuffleIdx}
                                className="deep-button flex-1 flex items-center justify-center gap-1"
                                disabled={isAnalyzing}
                                title="Shuffle"
                            >
                                <Shuffle className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => step(1)}
                                className="deep-button flex-1 flex items-center justify-center gap-1"
                                disabled={isAnalyzing}
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-alt/10 border-2 border-main p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4 border-b-2 border-main/20 pb-3">
                            <div className="text-sm font-bold uppercase text-main tracking-widest flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5" /> Gemma 4 reading
                            </div>
                            <button
                                type="button"
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="deep-button flex items-center gap-2"
                            >
                                {isAnalyzing
                                    ? <><Loader className="w-4 h-4 animate-spin" /> Analyzing…</>
                                    : <>Run analysis</>}
                            </button>
                        </div>

                        {analysis ? (
                            <div className="markdown-body font-medium leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                            </div>
                        ) : isAnalyzing ? (
                            <div className="text-main/60 uppercase text-xs font-bold tracking-wider flex items-center gap-2">
                                <Loader className="w-4 h-4 animate-spin" /> Gemma is reading the prompt…
                            </div>
                        ) : (
                            <p className="text-sm text-main/60 leading-relaxed">
                                Press <span className="font-bold text-main">Run analysis</span> to have Gemma 4 read the prompt that produced this image and write a short critical analysis of likely stereotypes, omissions, and one possible contestation. Gemma works from the prompt and the published Stable Bias findings — it does not see the pixels.
                            </p>
                        )}
                    </div>
                </section>
            )}

            {manifest && (
                <footer className="text-[11px] text-main/50 leading-relaxed">
                    Source: <a className="underline" href="https://huggingface.co/datasets/stable-bias/professions" target="_blank" rel="noreferrer">stable-bias/professions</a>{' '}
                    ({manifest.license}). Citation: {manifest.citation}
                </footer>
            )}
        </div>
    );
};

export default ImaginationInspectorPro;

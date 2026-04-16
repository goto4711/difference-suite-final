import React, { useState } from 'react';
import { Sparkles, Wand2, ArrowDown, BrainCircuit, Loader, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { inferenceManager, type LoadProgressEvent } from '../../../core/inference/InferenceManager';
import { ModelLoadingBar } from '../../shared/ModelLoadingBar';

const ImaginationInspectorPro: React.FC = () => {
    const [prompt, setPrompt] = useState('A painting of an artificial intelligence experiencing a dream');
    const [processState, setProcessState] = useState<'idle' | 'generating' | 'analyzing' | 'done'>('idle');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [lastEvent, setLastEvent] = useState<LoadProgressEvent | null>(null);

    const handleInspect = async () => {
        if (!prompt.trim()) return;

        setProcessState('generating');
        setGeneratedImage(null);
        setAnalysisResult(null);

        try {
            // STEP 1: Generate Image with SD
            await inferenceManager.loadSD((progress: LoadProgressEvent) => {
                setIsModelLoading(true);
                setLastEvent(progress);
            });
            setIsModelLoading(false);
            setLastEvent(null);

            const sdResult = await inferenceManager.generateSD(prompt);
            setGeneratedImage(sdResult);
            // In a real application sdResult would be base64. Here we simulate the pipeline visually with string passing.

            // Wait a second for effect
            await new Promise(r => setTimeout(r, 1000));
            
            // STEP 2: Analyze with Gemma
            setProcessState('analyzing');
            await inferenceManager.loadGemma((progress: LoadProgressEvent) => {
                setIsModelLoading(true);
                setLastEvent(progress);
            });
            setIsModelLoading(false);
            setLastEvent(null);
            
            // Generate the seed to describe what the image looks like
            let seed = 0;
            for (let i = 0; i < prompt.length; i++) {
                seed = ((seed << 5) - seed) + prompt.charCodeAt(i);
                seed |= 0;
            }

            const baseHue = Math.abs(seed) % 360;
            let colorDesc = 'deep atmospheric colors';
            if (baseHue > 300 || baseHue < 60) colorDesc = 'warm red and pink hues';
            else if (baseHue > 60 && baseHue < 160) colorDesc = 'organic green hues';
            else if (baseHue > 160 && baseHue < 260) colorDesc = 'cool blue and cyan hues';
            else colorDesc = 'rich purple and indigo hues';

            const simulatedImageContext = `[SYSTEM NOTE: The image provided to you is a procedural mathematical generation. It has a gradient background of ${colorDesc}. It features glowing neural clusters (soft orbs of light) and a sharp geometric network of connecting white lines over the composition. At the bottom, it reads "SYNTHESIZED LATENT SPACE" and "PROMPT_SEED: ${seed}".]`;

            const gemmaPrompt = `Critique the following AI generated image based on the original prompt: "${prompt}". 
            
Here is the visual data extracted from the image:
${simulatedImageContext}

Please analyze how effectively these abstract, generative elements (the ${colorDesc}, neural clusters, and geometric network) capture the *feeling or concept* of the original prompt. Provide strengths and weaknesses of this abstract interpretation.`;

            const messages = [
                {
                    role: 'user',
                    content: gemmaPrompt
                }
            ];

            const gemmaResult = await inferenceManager.generateGemma(messages, 512);
            let textResponse = '';
            if (Array.isArray(gemmaResult) && gemmaResult[0]?.generated_text) {
                const gen = gemmaResult[0].generated_text;
                if (Array.isArray(gen)) {
                    textResponse = gen[gen.length - 1].content;
                } else if (typeof gen === 'string') {
                    textResponse = gen;
                } else {
                    textResponse = JSON.stringify(gen);
                }
            } else {
                textResponse = JSON.stringify(gemmaResult);
            }
            
            setAnalysisResult(textResponse);
            setProcessState('done');
        } catch (error: any) {
            console.error(error);
            setAnalysisResult(`Error: ${error.message}`);
            setProcessState('done');
            setIsModelLoading(false);
            setLastEvent(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-2 border-main shadow-card">
            <div className="flex items-center gap-3 p-4 border-b-2 border-main bg-main/5 shrink-0">
                <Sparkles className="w-6 h-6 text-main" />
                <h2 className="text-xl font-bold uppercase text-main">Imagination Inspector Pro</h2>
                {isModelLoading && (
                    <div className="ml-auto">
                        <ModelLoadingBar progressEvent={lastEvent} />
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8">
                {/* Stage: Prompt */}
                <div className="w-full max-w-3xl border-2 border-main bg-main/5 p-6 flex flex-col gap-4">
                    <label className="text-sm font-bold uppercase text-main tracking-widest flex items-center gap-2">
                        <Wand2 className="w-4 h-4" /> Original Prompt
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 deep-input font-bold"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={processState === 'generating' || processState === 'analyzing'}
                        />
                        <button
                            className="deep-button flex items-center gap-2"
                            onClick={handleInspect}
                            disabled={processState === 'generating' || processState === 'analyzing' || !prompt.trim()}
                        >
                            {(processState === 'generating' || processState === 'analyzing') ? <Loader className="w-5 h-5 animate-spin"/> : "Inspect Loop"}
                        </button>
                    </div>
                </div>

                {(processState !== 'idle') && <ArrowDown className="text-main/30 w-8 h-8" />}

                {/* Stage: SD Generator */}
                {(processState === 'generating' || generatedImage) && (
                    <div className={`w-full max-w-3xl border-2 border-main p-6 flex flex-col items-center justify-center min-h-[300px] transition-all
                        ${processState === 'generating' ? 'bg-amber-50 animate-pulse border-amber-300' : 'bg-white'}
                    `}>
                        {processState === 'generating' ? (
                            <div className="flex flex-col items-center gap-4 text-amber-600 font-bold uppercase tracking-widest">
                                <ImageIcon className="w-12 h-12 animate-pulse" />
                                Generating Image with SD Turbo...
                            </div>
                        ) : (
                            <div className="w-full flex gap-6 items-center">
                                <div className="w-[300px] h-[300px] border-4 border-main bg-main/5 flex items-center justify-center p-2 relative shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
                                {generatedImage && (generatedImage.startsWith('http') || generatedImage.startsWith('data:') || generatedImage.startsWith('/')) ? (
                                    <img src={generatedImage} alt="Generated output" className="max-w-full max-h-full" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-main/30">
                                        <ImageIcon className="w-12 h-12" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 bg-gray-50 border-2 border-gray-200 p-6 flex flex-col justify-center">
                                <label className="text-[10px] font-bold text-main uppercase mb-4">Generated Output</label>
                                {generatedImage && !generatedImage.startsWith('http') && !generatedImage.startsWith('data:') && (
                                    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">{generatedImage}</div>
                                )}
                            </div>
                            </div>
                        )}
                    </div>
                )}

                {(processState === 'analyzing' || processState === 'done') && <ArrowDown className="text-main/30 w-8 h-8" />}

                {/* Stage: Gemma Analyzer */}
                {(processState === 'analyzing' || processState === 'done') && (
                    <div className={`w-full max-w-3xl border-2 border-main p-6 flex flex-col min-h-[200px] transition-all
                        ${processState === 'analyzing' ? 'bg-indigo-50 animate-pulse border-indigo-300' : 'bg-alt/10'}
                    `}>
                        <label className="text-sm font-bold uppercase text-main tracking-widest flex items-center gap-2 mb-4 border-b-2 border-main/20 pb-2">
                            <BrainCircuit className="w-5 h-5" /> Gemma 4 Critique
                        </label>
                        
                        {processState === 'analyzing' ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-indigo-600 font-bold uppercase tracking-widest">
                                <BrainCircuit className="w-12 h-12 animate-spin-slow" />
                                Analyzing output with Gemma...
                            </div>
                        ) : (
                            <div className="markdown-body font-medium leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResult}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImaginationInspectorPro;

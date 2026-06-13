import React, { useRef, useState } from 'react';
import { FileText, Loader, Upload, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { inferenceManager, type LoadProgressEvent } from '../../../core/inference/InferenceManager';
import { ModelLoadingBar } from '../../shared/ModelLoadingBar';

const VisualStorytellerPro: React.FC = () => {
    const [imageStr, setImageStr] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('Caption this image and tell a short story about what might be happening.');
    const [isLoading, setIsLoading] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [lastEvent, setLastEvent] = useState<LoadProgressEvent | null>(null);
    const [resultText, setResultText] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setImageStr(event.target.result as string);
                setResultText('');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!imageStr || !prompt.trim()) return;
        setIsLoading(true);
        try {
            setResultText('Translating visual data to text...');
            await inferenceManager.loadVision((progress) => {
                setIsModelLoading(true);
                setLastEvent(progress);
            });
            setIsModelLoading(false);
            setLastEvent(null);

            const extractedCaption = await inferenceManager.extractImageCaption(imageStr);
            setResultText(`Extracted caption: "${extractedCaption}"\n\nHanding off to Gemma 4…`);

            await inferenceManager.loadGemma((progress) => {
                setIsModelLoading(true);
                setLastEvent(progress);
            });
            setIsModelLoading(false);
            setLastEvent(null);

            const gemmaPrompt = `A vision model analysed an image and returned this literal description: "${extractedCaption}".

Based on that description, follow this user prompt:
"${prompt}"`;

            const result = await inferenceManager.generateGemma(
                [{ role: 'user', content: gemmaPrompt }],
                512,
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
            setResultText(textResponse);
        } catch (error) {
            setResultText(`Error analyzing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsModelLoading(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-8">
            <header className="bg-white border-2 border-main shadow-card p-4 flex items-center gap-3">
                <FileText className="w-6 h-6 text-main" />
                <h2 className="text-xl font-bold uppercase text-main">Visual Storyteller Pro</h2>
                {isModelLoading && (
                    <div className="ml-auto"><ModelLoadingBar progressEvent={lastEvent} /></div>
                )}
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_2fr] gap-6">
                <div className="bg-white border-2 border-main p-4 flex flex-col gap-3">
                    <h3 className="font-bold text-main uppercase tracking-wider text-sm border-b-2 border-main pb-2">
                        1. Select visual context
                    </h3>
                    <div
                        className="aspect-square border-2 border-dashed border-main bg-alt/10 flex items-center justify-center cursor-pointer hover:bg-alt/20 transition-colors relative overflow-hidden"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                        {imageStr ? (
                            <img src={imageStr} alt="Uploaded context" className="w-full h-full object-contain p-2" />
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-main/50 p-8 text-center">
                                <Upload className="w-12 h-12" />
                                <span className="font-bold uppercase tracking-wider">Click or drag an image</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white border-2 border-main p-4 flex flex-col gap-4">
                    <h3 className="font-bold text-main uppercase tracking-wider text-sm border-b-2 border-main pb-2">
                        2. Prompt Gemma 4
                    </h3>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase text-main/60">Prompt</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 deep-input"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <button
                                className="deep-button flex items-center justify-center w-32 shrink-0"
                                onClick={handleGenerate}
                                disabled={isLoading || !imageStr}
                            >
                                {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : 'Analyze'}
                            </button>
                        </div>
                    </div>

                    <div className="border-2 border-main bg-main/5 p-4 min-h-[280px] flex flex-col relative">
                        <label className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-main uppercase">
                            Inference output
                        </label>
                        {isLoading && !isModelLoading ? (
                            <div className="m-auto flex flex-col items-center text-main/50 gap-4 uppercase font-bold text-sm tracking-wider">
                                <Loader className="w-8 h-8 animate-spin" />
                                Extracting semantics…
                            </div>
                        ) : resultText ? (
                            <div className="markdown-body text-left w-full p-2">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{resultText}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="m-auto text-main/30 uppercase font-bold text-center flex flex-col items-center gap-4">
                                <ImageIcon className="w-8 h-8" />
                                Upload an image to see Gemma 4 interpret its narrative.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default VisualStorytellerPro;

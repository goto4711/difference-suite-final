import React, { useState } from 'react';
import { Image as ImageIcon, Wand2, Loader } from 'lucide-react';
import { inferenceManager, type LoadProgressEvent } from '../../../core/inference/InferenceManager';
import { ModelLoadingBar } from '../../shared/ModelLoadingBar';

const SDShowcase: React.FC = () => {
    const [prompt, setPrompt] = useState('a futuristic city in the style of cyberpunk');
    const [isLoading, setIsLoading] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [lastEvent, setLastEvent] = useState<LoadProgressEvent | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsLoading(true);

        try {
            await inferenceManager.loadSD((progress: LoadProgressEvent) => {
                setIsModelLoading(true);
                setLastEvent(progress);
            });
            setIsModelLoading(false);
            setLastEvent(null);

            const result = await inferenceManager.generateSD(prompt);
            setGeneratedImage(result);

        } catch (error: any) {
            console.error(error);
            setIsModelLoading(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-2 border-main shadow-card">
            <div className="flex items-center gap-3 p-4 border-b-2 border-main bg-main/5">
                <ImageIcon className="w-6 h-6 text-main" />
                <h2 className="text-xl font-bold uppercase text-main">SD Turbo Showcase</h2>
                {isModelLoading && (
                    <div className="ml-auto">
                        <ModelLoadingBar progressEvent={lastEvent} />
                    </div>
                )}
            </div>

            <div className="flex-1 p-8 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-gray-100">
                {generatedImage ? (
                    <div className="w-full flex justify-center bg-gray-100 p-8 border-2 border-main shadow-inner relative min-h-[400px]">
                        <label className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-main uppercase">Inference Output</label>
                        {generatedImage.startsWith('http') || generatedImage.startsWith('data:') || generatedImage.startsWith('/') ? (
                            <img src={generatedImage} alt="Generated output" className="max-w-full max-h-[500px] shadow-card border border-main/20" />
                        ) : (
                            <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap flex items-center justify-center text-center">
                                {generatedImage}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-main p-12 text-center text-main/50 font-bold uppercase tracking-wider flex flex-col items-center gap-4">
                        <Wand2 className="w-12 h-12" />
                        Enter a prompt below to generate an image.
                    </div>
                )}
            </div>

            <div className="p-4 border-t-2 border-main bg-main/5 flex gap-4">
                <input
                    type="text"
                    className="flex-1 deep-input font-bold"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe an image..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGenerate();
                    }}
                />
                <button
                    className="deep-button flex items-center justify-center gap-2 w-48"
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt.trim()}
                >
                    {isLoading ? (
                        <><Loader className="w-5 h-5 animate-spin" /> Generating...</>
                    ) : (
                        <><Wand2 className="w-5 h-5" /> Generate</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default SDShowcase;

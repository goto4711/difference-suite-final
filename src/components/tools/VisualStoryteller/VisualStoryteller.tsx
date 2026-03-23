import { useState, useMemo } from 'react';
import { BookOpen, Image, Sparkles, RefreshCw } from 'lucide-react';
import ToolLayout from '../../shared/ToolLayout';
import { useSuiteStore } from '../../../stores/suiteStore';
import { transformersClient } from '../../../core/inference/TransformersClient';

const VisualStoryteller = () => {
    const { dataset } = useSuiteStore();
    const imageItems = useMemo(() => dataset.filter(i => i.type === 'image'), [dataset]);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageName, setSelectedImageName] = useState<string>('');
    const [caption, setCaption] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressStatus, setProgressStatus] = useState('');
    const [storyHistory, setStoryHistory] = useState<{ image: string; caption: string; name: string }[]>([]);

    const handleSelectImage = (imageUrl: string, name: string) => {
        setSelectedImage(imageUrl);
        setSelectedImageName(name);
        setCaption(''); // Clear previous caption
    };

    const handleGenerateCaption = async () => {
        if (!selectedImage) return;

        setIsGenerating(true);
        setProgressStatus('Initializing...');
        setCaption('');

        try {
            const result = await transformersClient.run(
                {
                    id: crypto.randomUUID(),
                    tool: 'VisualStoryteller',
                    model: 'florence-2-base-ft',
                    task: 'image-to-text',
                    payload: { imageSource: selectedImage, mode: 'caption' }
                },
                (p) => setProgressStatus(p.message || 'Processing...')
            );

            const generatedCaption = (result.output as { caption: string }).caption;
            setCaption(generatedCaption);

            // Add to story history
            setStoryHistory(prev => [
                { image: selectedImage, caption: generatedCaption, name: selectedImageName },
                ...prev.slice(0, 9) // Keep last 10
            ]);

        } catch (e: any) {
            console.error('Caption generation failed:', e);
            setCaption(`Failed: ${e.message || 'Unknown error'}`);
        } finally {
            setIsGenerating(false);
            setProgressStatus('');
        }
    };

    const mainContent = (
        <div className="flex flex-col gap-6 h-full p-1">
            {/* Main Image Display */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-main flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            Visual Story
                        </h2>
                        <p className="text-xs text-text-muted">AI-generated narrative from visual content</p>
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 bg-[#f8f8f8]">
                    {selectedImage ? (
                        <div className="flex flex-col items-center gap-6 max-w-2xl">
                            <div className="relative">
                                <img
                                    src={selectedImage}
                                    alt={selectedImageName}
                                    className="max-h-64 rounded-lg shadow-lg border-4 border-white"
                                />
                                {isGenerating && (
                                    <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            {/* Caption Display */}
                            {caption && (
                                <div className="bg-white p-6 rounded-lg border-2 border-[var(--color-alt)] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <p className="text-lg font-serif italic text-main leading-relaxed text-center">
                                        "{caption}"
                                    </p>
                                    <p className="text-xs text-text-muted text-center mt-2 uppercase tracking-wide">
                                        — AI Vision Model
                                    </p>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="text-sm text-text-muted animate-pulse">
                                    {progressStatus || 'Processing...'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-text-muted">
                            <Image className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-bold">Select an Image</p>
                            <p className="text-sm">Choose from your collection to generate a story</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Story History */}
            {storyHistory.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-48 overflow-hidden">
                    <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-sm font-bold text-main">Story Collection</h3>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        <div className="flex gap-4">
                            {storyHistory.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex-shrink-0 w-48 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:border-main transition-colors cursor-pointer"
                                    onClick={() => handleSelectImage(item.image, item.name)}
                                >
                                    <img src={item.image} alt="" className="w-full h-20 object-cover" />
                                    <div className="p-2">
                                        <p className="text-[10px] text-text-muted line-clamp-2 italic">
                                            "{item.caption}"
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const sideContent = (
        <div className="flex flex-col h-full gap-6 p-1">
            {/* Image Selection */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col min-h-0">
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide text-text-muted">
                    <Image className="w-4 h-4" />
                    Select Image ({imageItems.length} available)
                </h2>

                {imageItems.length > 0 ? (
                    <>
                        {/* Dropdown selector for many images */}
                        <select
                            onChange={(e) => {
                                const item = imageItems.find(i => i.id === e.target.value);
                                if (item) {
                                    handleSelectImage(item.content as string, item.name);
                                }
                            }}
                            className="w-full text-sm p-2 rounded border border-gray-300 focus:border-main focus:ring-1 focus:ring-main outline-none bg-white mb-3"
                            value={imageItems.find(i => i.content === selectedImage)?.id || ''}
                        >
                            <option value="" disabled>Choose an image...</option>
                            {imageItems.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>

                        {/* Preview of selected image */}
                        {selectedImage && (
                            <div className="aspect-video rounded-lg overflow-hidden border-2 border-[var(--color-main)] bg-gray-100">
                                <img
                                    src={selectedImage}
                                    alt={selectedImageName}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-text-muted py-8">
                        <div>
                            <Image className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">No images in collection</p>
                            <p className="text-[10px]">Upload images via Dashboard</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerateCaption}
                disabled={!selectedImage || isGenerating}
                className="deep-button w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGenerating ? (
                    <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-xs">{progressStatus || 'Generating...'}</span>
                    </div>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4" />
                        Generate Caption
                    </>
                )}
            </button>
        </div>
    );

    return (
        <ToolLayout
            title="Visual Storyteller"
            subtitle="Generate AI captions from images"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default VisualStoryteller;

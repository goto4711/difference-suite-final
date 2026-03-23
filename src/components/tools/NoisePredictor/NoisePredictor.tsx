import { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, EyeOff, Info, Sliders, Brain, Type, Image as ImageIcon, Sparkles } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import { NoiseModel } from './components/NoiseModel';
import { NoiseTextModel } from './components/NoiseTextModel';
import { ResidualCanvas } from './components/ResidualCanvas';
import { latentTextManager } from '../LatentSpaceNavigator/components/LatentTextModelManager';
import { useSuiteStore } from '../../../stores/suiteStore';
import ToolLayout from '../../shared/ToolLayout';

type NavMode = 'image' | 'text';

const SpectralHeatmap = ({ tensor }: { tensor: tf.Tensor2D }) => {
    const data = tensor.dataSync();
    // 512 dimensions = 16x32 grid
    const rows = 16;
    const cols = 32;

    return (
        <div
            className="grid gap-px bg-gray-200 border border-gray-200"
            style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                width: '100%',
                maxWidth: '256px',
                aspectRatio: '2/1'
            }}
        >
            {Array.from(data).map((val, i) => {
                // Normalize for visualization: higher difference = more intense color
                // Vector values are small, so multiply to see something
                const intensity = Math.min(val * 10, 1) * 255;
                return (
                    <div
                        key={i}
                        className="w-full h-full"
                        title={`Dim ${i}: ${val.toFixed(4)}`}
                        style={{
                            backgroundColor: `rgb(${intensity}, ${intensity / 4}, ${255 - intensity})`
                        }}
                    />
                );
            })}
        </div>
    );
};

const NoisePredictor = () => {
    const { dataset, activeItem, setActiveItem } = useSuiteStore();
    const [mode, setMode] = useState<NavMode>('image');

    const imageItems = dataset.filter(i => i.type === 'image');
    const textItems = dataset.filter(i => i.type === 'text');
    const selectedItem = dataset.find(i => i.id === activeItem);

    const [imgModel] = useState(new NoiseModel());
    const [textModel] = useState(new NoiseTextModel());

    // Core Data State
    const [content, setContent] = useState<string | null>(null);
    const [inputTensor, setInputTensor] = useState<tf.Tensor | null>(null);
    const [reconstructedTensor, setReconstructedTensor] = useState<tf.Tensor | null>(null);
    const [residualTensor, setResidualTensor] = useState<tf.Tensor | null>(null);

    // Logic/UI State
    const [echoResult, setEchoResult] = useState<string | null>(null);
    const [neighborResults, setNeighborResults] = useState<any[]>([]);
    const [isTraining, setIsTraining] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loss, setLoss] = useState(0);
    const [epoch, setEpoch] = useState(0);
    const [latentDim, setLatentDim] = useState(32);

    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (selectedItem) {
            setContent(selectedItem.content as string);
            setInputTensor(null);
            setReconstructedTensor(null);
            setResidualTensor(null);
            setEchoResult(null);
        }
    }, [selectedItem]);

    useEffect(() => {
        const init = async () => {
            await tf.ready();
        };
        init();
    }, []);

    const processContent = async () => {
        if (!content || isProcessing) return;
        setIsProcessing(true);

        try {
            if (mode === 'image' && imgRef.current) {
                const t = tf.tidy(() => {
                    return tf.browser.fromPixels(imgRef.current!)
                        .resizeNearestNeighbor([256, 256])
                        .toFloat()
                        .div(255.0)
                        .expandDims() as tf.Tensor4D;
                });
                setInputTensor(t);
                await imgModel.createModel([256, 256, 3], latentDim);
            } else if (mode === 'text') {
                // Get embedding via shared manager
                const emb = await latentTextManager.getEmbedding(content);
                if (emb) {
                    setInputTensor(emb);
                    await textModel.createModel(384, latentDim);
                }
            }
        } catch (error) {
            console.error('Error processing content:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const trainModel = async () => {
        if (!inputTensor) return;

        setIsTraining(true);
        setLoss(0);
        setEpoch(0);

        try {
            const activeModel = mode === 'image' ? imgModel : textModel;

            await activeModel.train(inputTensor, 50, (e: number, l: number) => {
                setEpoch(e + 1);
                setLoss(l);
            });

            const rec = activeModel.predict(inputTensor) as tf.Tensor;
            if (rec) {
                setReconstructedTensor(rec);
                const res = activeModel.getResidual(inputTensor, rec);
                setResidualTensor(res);

                if (mode === 'text') {
                    // Find nearest word for echo
                    const nearest = await latentTextManager.getNearest(rec as tf.Tensor2D);
                    if (nearest && nearest.length > 0) {
                        setEchoResult(nearest[0].word);
                        setNeighborResults(nearest);
                    }
                }
            }

        } catch (error) {
            console.error('Training error:', error);
        } finally {
            setIsTraining(false);
        }
    };

    // Empty state handled in main render

    const mainContent = (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Mode Toggle */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Analysis Mode:</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-300">
                    <button
                        onClick={() => setMode('image')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${mode === 'image'
                            ? 'bg-[var(--color-main)] text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <ImageIcon size={16} />
                        Visual
                    </button>
                    <button
                        onClick={() => setMode('text')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${mode === 'text'
                            ? 'bg-[var(--color-main)] text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Type size={16} />
                        Semantic
                    </button>
                </div>
            </div>

            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-main">{mode === 'image' ? 'Image Decomposition' : 'Semantic Decomposition'}</h2>
                    <p className="text-xs text-text-muted">
                        {mode === 'image'
                            ? 'Original → Signal (Reconstructed) → Noise (Residual)'
                            : 'Original Text → Semantic Echo (Signal) → Spectral Distortion (Noise)'}
                    </p>
                </div>
                {isProcessing && <span className="text-xs text-main animate-pulse font-bold uppercase">Processing...</span>}
            </div>

            <div className="flex-1 p-6 grid grid-cols-3 gap-6 min-h-0 overflow-y-auto">
                {/* Original Content */}
                <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Original</h3>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500 uppercase">{mode}</span>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center bg-white/50">
                        {mode === 'image' ? (
                            content ? (
                                <img
                                    ref={imgRef}
                                    src={content}
                                    alt="Original"
                                    className="max-w-full max-h-full object-contain rounded-lg border border-gray-200 shadow-sm"
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <p className="text-xs italic text-gray-400">No image selected</p>
                            )
                        ) : (
                            <div className="w-full h-full p-4 bg-white rounded-lg border border-gray-100 shadow-inner overflow-y-auto text-sm leading-relaxed text-gray-700 font-medium">
                                {content || <p className="italic text-gray-300">No text item selected</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Reconstruction (Signal) */}
                <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-main uppercase tracking-widest">{mode === 'image' ? 'Reconstructed' : 'Semantic Echo'}</h3>
                        <Sparkles className="w-3 h-3 text-main opacity-40" />
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center bg-white/50 transition-all">
                        {reconstructedTensor ? (
                            mode === 'image' ? (
                                <ResidualCanvas tensor={reconstructedTensor} width={256} height={256} />
                            ) : (
                                <div className="text-center p-6 animate-in zoom-in duration-500">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Reconstructed Meaning</div>
                                    <h4 className="text-3xl font-black text-main tracking-tighter mb-2">{echoResult || "..."}</h4>
                                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                                        {neighborResults.slice(1, 4).map((r, i) => (
                                            <span key={i} className="px-2 py-1 bg-gray-100 rounded text-[10px] text-gray-500 font-bold uppercase">
                                                {r.word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs italic">
                                {inputTensor ? "Model ready for training" : "Process content first"}
                            </div>
                        )}
                    </div>
                </div>

                {/* Residual (Noise) */}
                <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{mode === 'image' ? 'Residual Noise' : 'Spectral Distortion'}</h3>
                        <EyeOff className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center bg-white/50 overflow-hidden">
                        {residualTensor ? (
                            mode === 'image' ? (
                                <ResidualCanvas tensor={residualTensor} width={256} height={256} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <SpectralHeatmap tensor={residualTensor as tf.Tensor2D} />
                                </div>
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs italic">
                                {inputTensor ? "Model ready for training" : "Process content first"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col h-full gap-4 p-1">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Select Target {mode === 'image' ? 'Image' : 'Text'}:</label>
                <select
                    className="deep-input w-full text-xs font-bold"
                    value={activeItem || ''}
                    onChange={(e) => setActiveItem(e.target.value)}
                >
                    <option value="" disabled>-- Choose {mode === 'image' ? 'Image' : 'Text'} --</option>
                    {(mode === 'image' ? imageItems : textItems).map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                </select>
            </div>

            {/* Controls Panel */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Sliders className="w-4 h-4" />
                    Controls
                </div>

                <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Latent Dimension</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min="8"
                            max="128"
                            step="8"
                            value={latentDim}
                            onChange={(e) => setLatentDim(parseInt(e.target.value))}
                            className="flex-1"
                            disabled={isTraining}
                        />
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-10 text-center">{latentDim}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Lower = more compression = more noise visible</p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    <button
                        onClick={processContent}
                        className="deep-button w-full justify-center text-sm"
                        disabled={isTraining || isProcessing || !content}
                    >
                        <Play className="w-4 h-4" />
                        Prepare Data
                    </button>
                    <button
                        onClick={trainModel}
                        className="deep-button w-full justify-center text-sm"
                        disabled={isTraining || !inputTensor}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Train Autoencoder
                    </button>
                </div>
            </div>

            {/* Training Status */}
            {isTraining && (
                <div className="bg-main text-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 animate-pulse" />
                        <span className="font-mono text-sm">Training...</span>
                    </div>
                    <p className="font-mono text-xs mb-2">Epoch {epoch}/50 | Loss: {loss.toFixed(4)}</p>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-400 transition-all"
                            style={{ width: `${(epoch / 50) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-[11px] text-gray-500 space-y-4 flex-1 overflow-y-auto shadow-inner">
                <div className="space-y-2">
                    <p className="font-black text-gray-700 uppercase tracking-widest text-[10px]">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1 opacity-80 leading-relaxed">
                        <li>Prepare the {mode} data</li>
                        <li>Train a {mode === 'image' ? 'Convolutional' : 'Dense'} Autoencoder</li>
                        <li>Analyze the {mode === 'image' ? 'Residual' : 'Distortion'}</li>
                    </ol>
                </div>

                {mode === 'text' && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                        <div>
                            <p className="font-bold text-main uppercase text-[9px] mb-1">Semantic Echo (The "Gist")</p>
                            <p className="leading-tight opacity-90">The main point the model extracted. <br /><span className="italic opacity-60">e.g. A long sentence about "voting for school policies" might simplify to <b>"EDUCATION"</b>.</span></p>
                        </div>
                        <div>
                            <p className="font-bold text-gray-600 uppercase text-[9px] mb-1">Spectral Distortion (The "Nuance")</p>
                            <p className="leading-tight opacity-90">The subtle details left behind. <br /><span className="italic opacity-60">The model captured the core idea but "forgot" the specific tone or unique words you used.</span></p>
                        </div>
                    </div>
                )}

                <div className="pt-3 border-t border-gray-200 opacity-60 italic leading-snug">
                    "The noise is not random; it is the detail the algorithm chose to ignore."
                </div>
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Noise Predictor"
            subtitle="What the model cannot see: extracting residual noise from autoencoder compression"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default NoisePredictor;

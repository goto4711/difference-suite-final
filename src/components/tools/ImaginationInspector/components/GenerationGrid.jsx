import React from 'react';
import { User, AlertTriangle } from 'lucide-react';

const GenerationGrid = ({ results }) => {
    if (!results || results.length === 0) {
        return (
            <div className="h-full flex items-center justify-center opacity-30 min-h-[300px] border-2 border-dashed border-main/20 rounded-xl">
                <p className="font-mono text-sm uppercase tracking-tighter italic">No dreams found in the latent space...</p>
            </div>
        );
    }

    const hasRealImages = results.some(r => r.image !== null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black uppercase text-main flex items-center gap-2">
                    <div className="w-2 h-2 bg-main rounded-full animate-pulse"></div>
                    Latent Projections ({results.length})
                </h3>
                <span className="text-[10px] font-mono opacity-40 uppercase">
                    {hasRealImages ? 'Stable Diffusion' : 'Simulation Mode'}
                </span>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                {results.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 group animate-in fade-in zoom-in duration-500">
                        <div
                            className="aspect-[4/5] rounded-xl border-2 border-transparent group-hover:border-main/40 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 flex items-center justify-center relative overflow-hidden shadow-sm"
                            style={{ backgroundColor: `${item.color}33` }} // 20% opacity matching color
                        >
                            {/* Backdrop Blur effect for premium feel */}
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>

                            {item.image ? (
                                <img
                                    src={item.image}
                                    alt={item.prompt}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <User size={48} className="text-main" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">No Match</span>
                                </div>
                            )}

                            {/* Premium Overlay Tags */}
                            <div className="absolute inset-0 bg-main/95 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-400 p-4 text-xs text-white overflow-y-auto flex flex-col gap-3 translate-y-4 group-hover:translate-y-0">
                                <div className="font-black text-[10px] uppercase tracking-widest text-white/50 border-b border-white/20 pb-2 flex justify-between">
                                    <span>Interpretation</span>
                                    <span className="font-mono">#{item.id + 1}</span>
                                </div>
                                
                                <blockquote className="italic leading-relaxed text-[11px] text-white/90 font-serif">
                                    "{item.syntheticPrompt}"
                                </blockquote>

                                <div className="mt-auto space-y-2 pt-2 border-t border-white/10">
                                    <div className="text-[9px] uppercase font-bold text-white/40 tracking-tighter">Attribute Analysis</div>
                                    <div className="grid grid-cols-1 gap-y-1 text-[10px] font-mono">
                                        {Object.entries(item.tags).map(([k, v]) => (
                                            <div key={k} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded">
                                                <span className="opacity-50 text-[8px] uppercase">{k}</span>
                                                <span className="text-white font-bold">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                             <div className="h-[1px] flex-1 bg-gray-100"></div>
                             <div className="text-[9px] font-black font-mono text-center text-main/30 uppercase tracking-widest">
                                {item.adjective ? item.adjective : `Sample ${item.id + 1}`}
                            </div>
                            <div className="h-[1px] flex-1 bg-gray-100"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Explanatory Note */}
            <div className="mt-8 p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="bg-main/10 p-2 rounded-lg">
                    <AlertTriangle size={16} className="text-main" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-main">Researcher Note: Interpreting Projections</h4>
                    {hasRealImages ? (
                        <p className="text-[11px] text-text-muted leading-relaxed italic">
                            Images are drawn from the <strong>Stable Bias</strong> dataset (Bianchi et al., 2023) — real
                            outputs of Stable Diffusion v1.4/v2 and DALL-E 2 generated with neutral profession prompts.
                            Demographic tags are assigned by <strong>CLIP zero-shot classification</strong>. These images
                            may reflect or amplify societal stereotypes present in the model's training data.
                        </p>
                    ) : (
                        <p className="text-[11px] text-text-muted leading-relaxed italic">
                            This profession was not found in the Stable Bias dataset. The "projections" above are
                            semantic reconstructions generated by the language model. Results are illustrative only
                            and reflect the model's internal associations, not real image-generation outputs.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GenerationGrid;

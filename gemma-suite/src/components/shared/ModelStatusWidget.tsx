import { useState, useEffect } from 'react';
import { Server, Cpu, Database, Info } from 'lucide-react';
import { inferenceManager } from '../../core/inference/InferenceManager';

export const ModelStatusWidget = () => {
    const [status, setStatus] = useState<any | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchStatus = async () => {
            try {
                const res = inferenceManager.getStatus();
                if (mounted) setStatus(res);
            } catch (error) {
                // Background polling may timeout if worker is running heavy inference, safe to ignore
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    const loadedCount = status?.loadedModels.length || 0;
    const totalMem = status?.loadedModels.reduce((acc: number, m: any) => acc + (m.memoryFootprintMB || 0), 0) || 0;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                    loadedCount > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-[2px_2px_0px_rgba(251,191,36,0.2)]'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 shadow-[2px_2px_0px_rgba(0,0,0,0.05)]'
                }`}
                title="View active machine learning models in memory"
            >
                <Server className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">
                    {loadedCount} Models ({totalMem}MB)
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-white border-2 border-main shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-hidden z-50">
                    <div className="bg-alt border-b-2 border-main px-4 py-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-main uppercase tracking-widest flex items-center gap-2">
                            <Cpu className="w-4 h-4" />
                            Worker Status
                        </h3>
                        {status ? (
                            <span className="text-[10px] bg-green-100 text-green-800 border-green-300 border px-2 py-0.5 font-bold uppercase tracking-wider">Active</span>
                        ) : (
                            <span className="text-[10px] bg-gray-100 text-gray-500 border-gray-300 border px-2 py-0.5 font-bold uppercase tracking-wider">Booting</span>
                        )}
                    </div>

                    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                        {status?.loadedModels.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 flex flex-col items-center gap-2">
                                <Database className="w-8 h-8 opacity-20 text-main" />
                                <span className="text-xs uppercase font-bold tracking-wide">No Models Loaded</span>
                                <span className="text-[10px] leading-relaxed">Models are loaded into device memory on-demand when a tool executes.</span>
                            </div>
                        ) : (
                            status?.loadedModels.map((model: any) => (
                                <div key={model.id} className="bg-white border border-gray-200 p-3 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-main group-hover:bg-secondary transition-colors" />
                                    <div className="pl-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-bold text-gray-800 pr-2">{model.name}</span>
                                            <span className="text-[9px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 border border-gray-200 mt-0.5">{model.device}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Memory Footprint</span>
                                            <span className="text-xs font-black text-main">{model.memoryFootprintMB} MB</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2 text-gray-400">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="text-[9px] uppercase tracking-wider leading-relaxed">
                                The TransformersManager automatically evicts older models utilizing an LRU algorithm to prevent OOM errors.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

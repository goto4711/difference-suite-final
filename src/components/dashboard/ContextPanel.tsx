import React, { useMemo } from 'react';
import { useSuiteStore } from '../../stores/suiteStore';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    ArrowRight,
    FileText,
    Image,
    Table,
    Trash2,
    X,
    Maximize2,
    Scale,
    Sparkles,
    Box
} from 'lucide-react';

export const ContextPanel: React.FC = () => {
    const { selectedItems, dataset, removeItem, clearSelection } = useSuiteStore();
    const navigate = useNavigate();

    const selectedDataPoints = useMemo(() =>
        dataset.filter(d => selectedItems.includes(d.id)),
        [dataset, selectedItems]);

    const tools = useMemo(() => {
        const item = selectedDataPoints[0];
        if (!item) return [];

        const isImage = item.type === 'image';
        const isText = item.type === 'text';
        // Check for time-series compatible formats (explicit types or CSV/JSON extensions)
        const isTimeSeries = item.type === 'timeseries' ||
            item.type === 'tabular' ||
            item.name.endsWith('.csv') ||
            item.name.endsWith('.json');

        return [
            { id: 'glitch', name: 'Glitch Detector', path: '/glitch-detector', icon: Activity, active: isImage },
            { id: 'vector', name: 'Deep Vector Mirror', path: '/deep-vector-mirror', icon: Image, active: isImage },
            { id: 'depth', name: 'Depth Mirror', path: '/depth-mirror', icon: Box, active: isImage },
            { id: 'ambiguity', name: 'Ambiguity Amplifier', path: '/ambiguity-amplifier', icon: Maximize2, active: isImage },
            { id: 'noise', name: 'Noise Predictor', path: '/noise-predictor', icon: Image, active: isImage },
            { id: 'discontinuity', name: 'Discontinuity Detector', path: '/discontinuity-detector', icon: Activity, active: isTimeSeries },
            { id: 'threshold', name: 'Threshold Adjuster', path: '/threshold-adjuster', icon: Scale, active: isTimeSeries },
            { id: 'networked', name: 'Networked Narratives', path: '/networked-narratives', icon: FileText, active: isText && !isTimeSeries },
            { id: 'deep-time', name: 'Deep Time', path: '/deep-time?from=suite', icon: Activity, active: isImage || isText || isTimeSeries },
            { id: 'imagination', name: 'Imagination Inspector', path: '/imagination-inspector', icon: Sparkles, active: true },
        ].filter(t => t.active);
    }, [selectedDataPoints]);

    if (selectedItems.length === 0) {
        return (
            <div className="w-72 border-l-2 border-main bg-white/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-main/5 border-2 border-main flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-main/40" />
                </div>
                <h3 className="text-main font-bold uppercase">No Selection</h3>
                <p className="text-main/60 text-sm mt-2">Select items from the grid to view details.</p>
            </div>
        );
    }

    const primaryItem = selectedDataPoints[0];
    const isMulti = selectedDataPoints.length > 1;

    return (
        <div className="w-72 border-l-2 border-main bg-white/90 backdrop-blur-sm flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b-2 border-main flex items-center justify-between bg-white">
                <h2 className="text-sm font-bold tracking-wider text-main uppercase">
                    {isMulti ? `${selectedItems.length} Items` : 'Item Details'}
                </h2>
                <button
                    onClick={clearSelection}
                    className="text-main/40 hover:text-main transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Preview (First item) */}
                <div className="aspect-square bg-white border-2 border-main overflow-hidden flex items-center justify-center shadow-card p-4">
                    {primaryItem.type === 'image' && typeof primaryItem.content === 'string' ? (
                        <img src={primaryItem.content} alt={primaryItem.name} className="w-full h-full object-contain" />
                    ) : (
                        <FileText className="w-12 h-12 text-main/20" />
                    )}
                </div>

                {/* Metadata */}
                <div className="bg-white p-4 border-2 border-main shadow-[4px_4px_0px_rgba(0,0,0,0.05)]">
                    <h3 className="text-[10px] font-bold text-main/40 uppercase mb-3 border-b border-main/10 pb-1">Properties</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-main/60 font-bold text-xs uppercase">Name</span>
                            <span className="text-main font-mono text-xs truncate max-w-[120px]" title={primaryItem.name}>{primaryItem.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-main/60 font-bold text-xs uppercase">Type</span>
                            <span className="text-main font-mono text-xs capitalize">{primaryItem.type}</span>
                        </div>
                        {primaryItem.metadata?.size && (
                            <div className="flex justify-between">
                                <span className="text-main/60 font-bold text-xs uppercase">Size</span>
                                <span className="text-main font-mono text-xs">{(primaryItem.metadata.size / 1024).toFixed(1)} KB</span>
                            </div>
                        )}
                        {isMulti && (
                            <div className="mt-2 pt-2 border-t border-main/10">
                                <p className="text-main/60 italic text-xs text-right">+ {selectedItems.length - 1} other items</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div>
                    <h3 className="text-[10px] font-bold text-main/40 uppercase mb-2">Actions</h3>

                    <button
                        onClick={() => {
                            if (confirm(`Delete ${selectedItems.length} items?`)) {
                                selectedItems.forEach(id => removeItem(id));
                                clearSelection();
                            }
                        }}
                        className="w-full mb-6 px-3 py-2 bg-red-50 border-2 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-400 hover:text-red-600 transition-all font-bold uppercase text-xs flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Selection</span>
                    </button>

                    <h4 className="text-[10px] font-bold text-main/30 uppercase mb-2 border-b border-main/10 pb-1">Process With</h4>
                    <div className="space-y-2">
                        {tools.map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => navigate(tool.path)}
                                className="w-full px-3 py-3 bg-white border-2 border-main text-main hover:bg-alt hover:-translate-y-1 hover:shadow-card transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <tool.icon className="w-4 h-4" />
                                    <span className="font-bold uppercase text-xs tracking-wider">{tool.name}</span>
                                </div>
                                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-transform" />
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

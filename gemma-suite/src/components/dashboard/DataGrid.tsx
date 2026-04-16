import React from 'react';
import { useSuiteStore } from '../../stores/suiteStore';
import type { DataItem } from '../../types';
import { FileText, Image, Table, Activity, Check, Trash2 } from 'lucide-react';

interface DataGridProps {
    items: DataItem[];
}

export const DataGrid: React.FC<DataGridProps> = ({ items }) => {
    const { selectedItems, toggleSelection, removeItem } = useSuiteStore();

    const handleItemClick = (e: React.MouseEvent, id: string) => {
        const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
        toggleSelection(id, isMulti);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Delete this item?')) {
            removeItem(id);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'image': return <Image className="w-8 h-8 opacity-50" />;
            case 'text': return <FileText className="w-8 h-8 opacity-50" />;
            case 'tabular': return <Table className="w-8 h-8 opacity-50" />;
            case 'timeseries': return <Activity className="w-8 h-8 opacity-50" />;
            default: return <FileText className="w-8 h-8 opacity-50" />;
        }
    };

    if (items.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-main/40 border-4 border-dashed border-main/20 m-8 rounded-xl bg-white/50">
                <p className="text-xl font-bold uppercase tracking-wider">Empty Collection</p>
                <p className="text-sm mt-2 font-mono">Drag and drop files here to upload</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 auto-rows-max overflow-y-auto max-h-full pb-20">
            {items.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                    <div
                        key={item.id}
                        onClick={(e) => handleItemClick(e, item.id)}
                        className={`
                            relative group aspect-square border-2 transition-all duration-200 cursor-pointer overflow-hidden
                            ${isSelected
                                ? 'border-main bg-main/5 shadow-[4px_4px_0px_rgba(131,33,97,0.3)] -translate-y-1'
                                : 'border-main/20 bg-white hover:border-main hover:shadow-[2px_2px_0px_rgba(131,33,97,0.1)]'
                            }
                        `}
                    >
                        {/* Selection Checkbox (Visible on hover or selected) */}
                        <div className={`absolute top-2 left-2 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <div className={`w-5 h-5 border-2 ${isSelected ? 'bg-main border-main' : 'border-main bg-white'} flex items-center justify-center`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                        </div>

                        {/* Delete Button (Visible on hover) */}
                        <button
                            onClick={(e) => handleDelete(e, item.id)}
                            className="absolute top-2 right-2 z-20 p-1 bg-white/80 backdrop-blur hover:bg-red-50 text-gray-400 hover:text-red-500 border border-transparent hover:border-red-200 rounded opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100"
                            title="Delete Item"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>

                        {/* Content Preview */}
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            {item.type === 'image' && typeof item.content === 'string' ? (
                                <img
                                    src={item.content}
                                    alt={item.name}
                                    className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-main/40 group-hover:text-main transition-colors">
                                    {getIcon(item.type)}
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.type}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="absolute bottom-0 inset-x-0 p-2 bg-white/90 border-t-2 border-main/10 flex justify-center">
                            <p className="text-[10px] font-bold text-main truncate max-w-full font-mono uppercase">
                                {item.name}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

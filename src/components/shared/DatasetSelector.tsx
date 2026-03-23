import React, { useState } from 'react';
import { useSuiteStore } from '../../stores/suiteStore';
import { ChevronDown, ChevronUp, Image as ImageIcon, FileText, X } from 'lucide-react';

const DatasetSelector = () => {
    const { dataset, activeItem, setActiveItem, removeItem } = useSuiteStore();
    const [isExpanded, setIsExpanded] = useState(false);

    const selectedItem = dataset.find(i => i.id === activeItem);

    if (dataset.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-20 right-4 z-40 w-80">
            {/* Collapsed view - shows only active item */}
            <div
                className="deep-panel p-4 bg-white cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {selectedItem ? (
                            <>
                                {selectedItem.type === 'image' ? (
                                    <ImageIcon className="w-4 h-4 text-[var(--color-main)] flex-shrink-0" />
                                ) : (
                                    <FileText className="w-4 h-4 text-[var(--color-main)] flex-shrink-0" />
                                )}
                                <span className="font-bold text-sm truncate" title={selectedItem.name}>
                                    {selectedItem.name}
                                </span>
                            </>
                        ) : (
                            <span className="text-sm opacity-60">No item selected</span>
                        )}
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 flex-shrink-0" />
                    ) : (
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    )}
                </div>
                <div className="text-xs opacity-60 mt-1">
                    {dataset.length} item{dataset.length !== 1 ? 's' : ''} in dataset
                </div>
            </div>

            {/* Expanded view - shows all items */}
            {isExpanded && (
                <div className="deep-panel p-4 bg-white mt-2 max-h-96 overflow-y-auto">
                    <h3 className="text-sm font-bold mb-3 uppercase opacity-60">Dataset</h3>
                    <div className="space-y-2">
                        {dataset.map((item) => (
                            <div
                                key={item.id}
                                className={`
                  p-3 rounded border-2 cursor-pointer transition-all group
                  ${activeItem === item.id
                                        ? 'border-[var(--color-main)] bg-[var(--color-main)]/5'
                                        : 'border-gray-200 hover:border-[var(--color-main-secondary)]'}
                `}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveItem(item.id);
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {item.type === 'image' ? (
                                            <ImageIcon className="w-3 h-3 text-[var(--color-main)] flex-shrink-0" />
                                        ) : (
                                            <FileText className="w-3 h-3 text-[var(--color-main)] flex-shrink-0" />
                                        )}
                                        <span className="text-xs font-bold truncate" title={item.name}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeItem(item.id);
                                        }}
                                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                                {item.type === 'image' && (
                                    <div className="mt-2 h-16 bg-gray-100 rounded overflow-hidden">
                                        <img
                                            src={item.content as string}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatasetSelector;

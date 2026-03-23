import React, { useState } from 'react';
import { useSuiteStore } from '../../stores/suiteStore';
import { ArrowRight, Folder, FolderPlus, Trash2, Upload, Edit2 } from 'lucide-react';
import type { Collection } from '../../types';

interface CollectionSidebarProps {
    activeCollectionId: string | null;
    onSelectCollection: (id: string | null) => void;
}

export const CollectionSidebar: React.FC<CollectionSidebarProps> = ({
    activeCollectionId,
    onSelectCollection
}) => {
    const { collections, createCollection, deleteCollection, renameCollection } = useSuiteStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const startEditing = (collection: Collection) => {
        setEditingId(collection.id);
        setEditName(collection.name);
    };

    const submitEdit = () => {
        if (editingId && editName.trim()) {
            renameCollection(editingId, editName.trim());
        }
        setEditingId(null);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCollectionName.trim()) {
            const id = createCollection(newCollectionName.trim());
            setIsCreating(false);
            setNewCollectionName('');
            onSelectCollection(id);
        }
    };

    return (
        <div className="w-64 border-r-2 border-main bg-white/90 backdrop-blur-sm flex flex-col h-full">
            <div className="p-4 border-b-2 border-main bg-white">
                <h2 className="text-sm font-bold tracking-wider text-main uppercase mb-4">
                    Library
                </h2>
                <div className="space-y-2">
                    <button
                        onClick={() => onSelectCollection(null)}
                        className={`w-full text-left px-3 py-2 font-semibold uppercase text-sm border-2 transition-all ${activeCollectionId === null
                            ? 'bg-main text-white border-main shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
                            : 'bg-transparent text-main border-transparent hover:border-main hover:bg-main/5'
                            }`}
                    >
                        <Folder className="w-4 h-4 inline-block mr-2" />
                        <span>All Items</span>
                    </button>

                    {/* Placeholder for Upload Button - to be integrated with DataUploader */}
                    {/* <button className="w-full text-left px-3 py-2 rounded flex items-center gap-2 text-[#0033ff] hover:bg-[#0033ff]/10">
                        <Upload className="w-4 h-4" />
                        <span>Import Collection</span>
                    </button> */}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-main/60 uppercase">Collections</h3>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="text-main hover:text-main hover:scale-110 transition-transform"
                        title="New Collection"
                    >
                        <FolderPlus className="w-5 h-5" />
                    </button>
                </div>

                {isCreating && (
                    <form onSubmit={handleCreate} className="mb-2">
                        <input
                            type="text"
                            autoFocus
                            placeholder="NAME..."
                            className="deep-input mb-2 text-sm"
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                            onBlur={() => !newCollectionName && setIsCreating(false)}
                        />
                    </form>
                )}

                <div className="space-y-2">
                    {collections.map((collection: Collection) => (
                        <div key={collection.id}>
                            {editingId === collection.id ? (
                                <div className="px-3 py-2 border-2 border-main bg-white">
                                    <input
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={submitEdit}
                                        onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
                                        className="w-full text-sm font-bold text-main outline-none deep-input"
                                    />
                                </div>
                            ) : (
                                <div
                                    className={`group flex items-center justify-between px-3 py-2 cursor-pointer transition-all border-2 ${activeCollectionId === collection.id
                                        ? 'bg-main text-white border-main shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
                                        : 'bg-white text-main border-transparent hover:border-main hover:shadow-[2px_2px_0px_rgba(0,0,0,0.1)]'
                                        }`}
                                    onClick={() => onSelectCollection(collection.id)}
                                >
                                    <span className="truncate font-medium text-sm flex-1">{collection.name}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditing(collection);
                                            }}
                                            className={`${activeCollectionId === collection.id ? 'text-white/80 hover:text-white' : 'text-main/60 hover:text-main'}`}
                                            title="Rename"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this collection? Items will be moved to "All Items".')) {
                                                    deleteCollection(collection.id);
                                                    if (activeCollectionId === collection.id) {
                                                        onSelectCollection(null);
                                                    }
                                                }
                                            }}
                                            className={`${activeCollectionId === collection.id ? 'text-white/80 hover:text-red-200' : 'text-main/60 hover:text-red-500'}`}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

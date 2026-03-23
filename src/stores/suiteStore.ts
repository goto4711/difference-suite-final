import { create } from 'zustand';
import type { SuiteState, DataItem } from '../types';

export const useSuiteStore = create<SuiteState>((set, get) => ({
    dataset: [],
    collections: [],
    activeItem: null,
    selectedItems: [],
    isProcessing: false,
    embeddingModelVersion: null,

    // Auth
    isAuthenticated: false,
    userEmail: null,

    login: (email) => set({ isAuthenticated: true, userEmail: email }),
    logout: () => set({ isAuthenticated: false, userEmail: null }),

    addItem: (item) => set((state) => ({
        dataset: [...state.dataset, item],
        activeItem: state.activeItem || item.id, // Auto-select first item
        selectedItems: state.selectedItems.length === 0 ? [item.id] : state.selectedItems
    })),

    addItems: (items) => set((state) => {
        const firstId = items[0]?.id;
        return {
            dataset: [...state.dataset, ...items],
            activeItem: state.activeItem || firstId,
            selectedItems: state.selectedItems.length === 0 && firstId ? [firstId] : state.selectedItems
        };
    }),

    removeItem: (id) => set((state) => ({
        dataset: state.dataset.filter((i) => i.id !== id),
        activeItem: state.activeItem === id ? null : state.activeItem,
        selectedItems: state.selectedItems.filter((sid) => sid !== id)
    })),

    // Collection Actions
    createCollection: (name, description) => {
        const id = crypto.randomUUID();
        set((state) => ({
            collections: [...state.collections, {
                id,
                name,
                description,
                created: Date.now()
            }]
        }));
        return id;
    },

    renameCollection: (id, newName) => set((state) => ({
        collections: state.collections.map((c) =>
            c.id === id ? { ...c, name: newName } : c
        )
    })),

    deleteCollection: (id) => set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
        // Move items out of the deleted collection (back to root)
        dataset: state.dataset.map((item) =>
            item.collectionId === id ? { ...item, collectionId: undefined } : item
        )
    })),

    moveItemsToCollection: (itemIds, collectionId) => set((state) => ({
        dataset: state.dataset.map((item) =>
            itemIds.includes(item.id)
                ? { ...item, collectionId: collectionId || undefined }
                : item
        )
    })),

    // Selection Actions
    setActiveItem: (id) => set({
        activeItem: id,
        selectedItems: id ? [id] : [] // Setting active item resets selection to just that item
    }),

    toggleSelection: (id, multi) => set((state) => {
        const isSelected = state.selectedItems.includes(id);
        let newSelection: string[];

        if (multi) {
            if (isSelected) {
                newSelection = state.selectedItems.filter((i) => i !== id);
            } else {
                newSelection = [...state.selectedItems, id];
            }
        } else {
            // Single select mode: toggle off if clicked again, or set to just this one
            newSelection = [id];
        }

        return {
            selectedItems: newSelection,
            activeItem: newSelection.length > 0 ? newSelection[newSelection.length - 1] : null
        };
    }),

    setSelection: (ids) => set({
        selectedItems: ids,
        activeItem: ids.length > 0 ? ids[ids.length - 1] : null
    }),

    selectAll: () => set((state) => ({
        selectedItems: state.dataset.map((i) => i.id),
        activeItem: state.dataset.length > 0 ? state.dataset[state.dataset.length - 1].id : null
    })),

    clearSelection: () => set({
        selectedItems: [],
        activeItem: null
    }),

    updateItemResult: (itemId, toolId, result) => set((state) => ({
        dataset: state.dataset.map((item) => {
            if (item.id !== itemId) return item;
            return {
                ...item,
                analysisResults: {
                    ...(item.analysisResults || {}),
                    [toolId]: result
                }
            };
        })
    })),

    clearDataset: () => set({
        dataset: [],
        collections: [],
        activeItem: null,
        selectedItems: [],
        embeddingModelVersion: null
    }),

    setEmbeddingModelVersion: (version) => set((state) => {
        if (state.embeddingModelVersion === version) return state;
        // Invalidate embeddings on model change
        return {
            embeddingModelVersion: version,
            dataset: state.dataset.map(item => ({ ...item, embedding: undefined }))
        };
    })
}));

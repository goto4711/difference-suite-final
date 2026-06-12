import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Collection, DataItem, SuiteState } from '../types';
import { deleteBlob, getBlob, saveBlob } from '../utils/blobStore';

const STORAGE_NAME = 'difference-suite-storage';
const STORAGE_VERSION = 1;

type PersistedStoreState = Pick<
    SuiteState,
    'collections' | 'dataset' | 'embeddingModelVersion' | 'isAuthenticated' | 'userEmail'
>;

const getBlobUrl = (content: DataItem['content']): string | null =>
    typeof content === 'string' && content.startsWith('blob:') ? content : null;

const isBinaryItem = (item: Pick<DataItem, 'type'>): boolean =>
    item.type === 'image' || item.type === 'audio';

const revokeBlobUrl = (url: string, remainingItems: DataItem[] = []) => {
    if (remainingItems.some((item) => item.content === url)) {
        return;
    }

    URL.revokeObjectURL(url);
};

const revokeBlobUrls = (items: DataItem[]) => {
    const blobUrls = new Set(
        items
            .map((item) => getBlobUrl(item.content))
            .filter((url): url is string => url !== null)
    );

    blobUrls.forEach((url) => URL.revokeObjectURL(url));
};

const toPersistedItem = (item: DataItem): DataItem => ({
    ...item,
    content: isBinaryItem(item)
        ? ''
        : typeof item.content === 'string'
            ? item.content
            : '',
    rawFile: undefined
});

const normalizePersistedState = (persistedState: unknown): PersistedStoreState => {
    const state = (persistedState ?? {}) as Partial<PersistedStoreState>;

    return {
        collections: Array.isArray(state.collections) ? state.collections as Collection[] : [],
        dataset: Array.isArray(state.dataset) ? state.dataset as DataItem[] : [],
        embeddingModelVersion:
            typeof state.embeddingModelVersion === 'string' ? state.embeddingModelVersion : null,
        isAuthenticated: state.isAuthenticated ?? false,
        userEmail: typeof state.userEmail === 'string' ? state.userEmail : null
    };
};

const getBlobForItem = async (item: DataItem): Promise<Blob | null> => {
    if (!isBinaryItem(item)) {
        return null;
    }

    if (item.rawFile instanceof File) {
        return item.rawFile;
    }

    const blobUrl = getBlobUrl(item.content);
    if (!blobUrl) {
        return null;
    }

    const response = await fetch(blobUrl);
    if (!response.ok) {
        throw new Error(`Failed to read blob for item ${item.id}.`);
    }

    return await response.blob();
};

const persistBinaryItems = async (items: DataItem[]) => {
    try {
        await Promise.all(items.map(async (item) => {
            const blob = await getBlobForItem(item);
            if (!blob) {
                return;
            }

            await saveBlob(item.id, blob);
        }));
    } catch (error) {
        console.warn('[suiteStore] Falling back to in-memory binary items.', error);
    }
};

const deletePersistedBinaryItems = async (ids: string[]) => {
    try {
        await Promise.all(ids.map((id) => deleteBlob(id)));
    } catch (error) {
        console.warn('[suiteStore] Failed to delete persisted binary items.', error);
    }
};

async function hydratePersistedBinaryItems() {
    try {
        const currentState = useSuiteStore.getState();
        const hydratedDataset = await Promise.all(currentState.dataset.map(async (item) => {
            if (!isBinaryItem(item)) {
                return item;
            }

            const blob = await getBlob(item.id);
            if (!blob) {
                return null;
            }

            const content = URL.createObjectURL(blob);
            const rawFile = new File([blob], item.name, {
                type: item.metadata?.mimeType ?? blob.type,
                lastModified: item.metadata?.lastModified ?? Date.now()
            });

            return {
                ...item,
                content,
                rawFile
            };
        }));

        const nextDataset = hydratedDataset.filter((item): item is DataItem => item !== null);

        useSuiteStore.setState((state) => {
            revokeBlobUrls(state.dataset);
            return { dataset: nextDataset };
        });
    } catch (error) {
        console.warn('[suiteStore] Falling back to in-memory hydration.', error);
    }
}

export const useSuiteStore = create<SuiteState>()(
    persist(
        (set) => ({
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

            addItem: (item) => {
                void persistBinaryItems([item]);
                set((state) => ({
                    dataset: [...state.dataset, item],
                    activeItem: state.activeItem || item.id,
                    selectedItems: state.selectedItems.length === 0 ? [item.id] : state.selectedItems
                }));
            },

            addItems: (items) => {
                void persistBinaryItems(items);
                set((state) => {
                    const firstId = items[0]?.id;

                    return {
                        dataset: [...state.dataset, ...items],
                        activeItem: state.activeItem || firstId,
                        selectedItems: state.selectedItems.length === 0 && firstId ? [firstId] : state.selectedItems
                    };
                });
            },

            removeItem: (id) => set((state) => {
                const dataset = state.dataset.filter((item) => item.id !== id);
                const removedItem = state.dataset.find((item) => item.id === id);
                const blobUrl = removedItem ? getBlobUrl(removedItem.content) : null;

                if (blobUrl) {
                    revokeBlobUrl(blobUrl, dataset);
                }

                if (removedItem && isBinaryItem(removedItem)) {
                    void deletePersistedBinaryItems([removedItem.id]);
                }

                return {
                    dataset,
                    activeItem: state.activeItem === id ? null : state.activeItem,
                    selectedItems: state.selectedItems.filter((sid) => sid !== id)
                };
            }),

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
                selectedItems: id ? [id] : []
            }),

            toggleSelection: (id, multi) => set((state) => {
                const isSelected = state.selectedItems.includes(id);
                let newSelection: string[];

                if (multi) {
                    if (isSelected) {
                        newSelection = state.selectedItems.filter((itemId) => itemId !== id);
                    } else {
                        newSelection = [...state.selectedItems, id];
                    }
                } else {
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
                selectedItems: state.dataset.map((item) => item.id),
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

            clearDataset: () => set((state) => {
                const binaryIds = state.dataset
                    .filter((item) => isBinaryItem(item))
                    .map((item) => item.id);

                if (binaryIds.length > 0) {
                    void deletePersistedBinaryItems(binaryIds);
                }

                revokeBlobUrls(state.dataset);

                return {
                    dataset: [],
                    collections: [],
                    activeItem: null,
                    selectedItems: [],
                    embeddingModelVersion: null
                };
            }),

            setEmbeddingModelVersion: (version) => set((state) => {
                if (state.embeddingModelVersion === version) return state;
                return {
                    embeddingModelVersion: version,
                    dataset: state.dataset.map(item => ({ ...item, embedding: undefined }))
                };
            })
        }),
        {
            name: STORAGE_NAME,
            version: STORAGE_VERSION,
            partialize: (state) => ({
                dataset: state.dataset.map(toPersistedItem),
                collections: state.collections,
                embeddingModelVersion: state.embeddingModelVersion,
                isAuthenticated: state.isAuthenticated,
                userEmail: state.userEmail
            }),
            migrate: (persistedState) => normalizePersistedState(persistedState),
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.warn('[suiteStore] Failed to rehydrate persisted state.', error);
                    return;
                }

                queueMicrotask(() => {
                    void hydratePersistedBinaryItems();
                });
            }
        }
    )
);

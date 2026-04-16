export type DataType = 'image' | 'text' | 'timeseries' | 'tabular' | 'audio';

export interface Collection {
    id: string;
    name: string;
    created: number;
    description?: string;
    itemCount?: number; // Optional, can be computed
}

export interface DataItem {
    id: string;
    name: string;
    type: DataType;
    collectionId?: string; // ID of the collection this item belongs to
    content: string | File; // URL for images, raw text for text
    rawFile?: File;
    metadata?: {
        size: number;
        lastModified: number;
        mimeType: string;
        [key: string]: any;
    };
    embedding?: number[]; // Computed embedding
    analysisResults?: Record<string, any>; // Results from different tools
}

export interface AnalysisResult {
    toolId: string;
    timestamp: number;
    summary: string;
    data: any;
}

export interface SuiteState {
    dataset: DataItem[];
    collections: Collection[];
    activeItem: string | null; // ID of currently primary selected item (legacy support)
    selectedItems: string[]; // IDs of all selected items
    isProcessing: boolean;

    // Item Actions
    addItem: (item: DataItem) => void;
    addItems: (items: DataItem[]) => void;
    removeItem: (id: string) => void;
    updateItemResult: (itemId: string, toolId: string, result: any) => void;

    // Collection Actions
    createCollection: (name: string, description?: string) => string;
    renameCollection: (id: string, newName: string) => void;
    deleteCollection: (id: string) => void;
    moveItemsToCollection: (itemIds: string[], collectionId: string | null) => void;

    // Selection Actions
    setActiveItem: (id: string | null) => void;
    toggleSelection: (id: string, multi?: boolean) => void; // items can be multi-selected
    setSelection: (ids: string[]) => void;
    selectAll: () => void;
    clearSelection: () => void;

    // Global
    embeddingModelVersion: string | null;
    setEmbeddingModelVersion: (version: string) => void;
    clearDataset: () => void;

    // Auth
    isAuthenticated: boolean;
    userEmail: string | null;
    login: (email: string) => void;
    logout: () => void;
}

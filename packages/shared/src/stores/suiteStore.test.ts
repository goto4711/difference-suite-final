import { beforeEach, describe, expect, it } from 'vitest';
import { useSuiteStore } from './suiteStore';
import type { DataItem } from '../types';

const makeTextItem = (id: string, collectionId?: string): DataItem => ({
    id,
    name: `${id}.txt`,
    type: 'text',
    content: `content-${id}`,
    collectionId,
    metadata: {
        size: 1,
        lastModified: 0,
        mimeType: 'text/plain',
    },
});

const resetStore = () => {
    useSuiteStore.setState({
        dataset: [],
        collections: [],
        activeItem: null,
        selectedItems: [],
        isProcessing: false,
        embeddingModelVersion: null,
        isAuthenticated: false,
        userEmail: null,
        textEmbeddingModel: 'multilingual-e5-small',
        asrModel: 'whisper-base',
    });
    localStorage.clear();
};

describe('useSuiteStore', () => {
    beforeEach(() => {
        resetStore();
    });

    it('adds items and initializes the primary selection', () => {
        const itemA = makeTextItem('a');
        const itemB = makeTextItem('b');

        useSuiteStore.getState().addItems([itemA, itemB]);

        const state = useSuiteStore.getState();
        expect(state.dataset).toEqual([itemA, itemB]);
        expect(state.activeItem).toBe('a');
        expect(state.selectedItems).toEqual(['a']);
    });

    it('stores per-tool analysis results on an item', () => {
        const item = makeTextItem('item-1');
        useSuiteStore.getState().addItem(item);

        useSuiteStore.getState().updateItemResult('item-1', 'SemanticOracle', {
            summary: 'matched',
        });

        expect(useSuiteStore.getState().dataset[0].analysisResults).toEqual({
            SemanticOracle: { summary: 'matched' },
        });
    });

    it('switching the text embedding model invalidates cached item embeddings', () => {
        const item = makeTextItem('item-1');
        useSuiteStore.getState().addItem(item);
        useSuiteStore.setState((state) => ({
            dataset: state.dataset.map((d) => ({ ...d, embedding: [0.1, 0.2, 0.3] })),
        }));
        expect(useSuiteStore.getState().dataset[0].embedding).toEqual([0.1, 0.2, 0.3]);

        useSuiteStore.getState().setTextEmbeddingModel('bge-small-en-v1.5');

        expect(useSuiteStore.getState().textEmbeddingModel).toBe('bge-small-en-v1.5');
        expect(useSuiteStore.getState().dataset[0].embedding).toBeUndefined();
    });

    it('switching the ASR model does not touch cached embeddings', () => {
        const item = makeTextItem('item-1');
        useSuiteStore.getState().addItem(item);
        useSuiteStore.setState((state) => ({
            dataset: state.dataset.map((d) => ({ ...d, embedding: [0.4, 0.5] })),
        }));

        useSuiteStore.getState().setAsrModel('whisper-tiny-en');

        expect(useSuiteStore.getState().asrModel).toBe('whisper-tiny-en');
        expect(useSuiteStore.getState().dataset[0].embedding).toEqual([0.4, 0.5]);
    });

    it('clears dataset, collections, and selection state together', () => {
        const collectionId = useSuiteStore.getState().createCollection('Archive');
        useSuiteStore.getState().addItem(makeTextItem('item-1', collectionId));

        useSuiteStore.getState().clearDataset();

        const state = useSuiteStore.getState();
        expect(state.dataset).toEqual([]);
        expect(state.collections).toEqual([]);
        expect(state.activeItem).toBeNull();
        expect(state.selectedItems).toEqual([]);
        expect(state.embeddingModelVersion).toBeNull();
    });
});

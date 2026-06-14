// Round-trip test for the project save/load path. The blobStore is mocked
// with an in-memory Map because jsdom does not implement IndexedDB.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Define the mock before any module that imports blobStore is loaded.
const blobMemory = new Map<string, Blob>();
vi.mock('@difference-suite/shared/utils/blobStore', () => ({
    saveBlob: async (id: string, blob: Blob) => {
        blobMemory.set(id, blob);
    },
    getBlob: async (id: string) => blobMemory.get(id) ?? null,
    deleteBlob: async (id: string) => {
        blobMemory.delete(id);
    },
}));

// Dynamic imports keep load order after the mock is installed.
const importEverything = async () => {
    const suite = await import('@difference-suite/shared/stores/suiteStore');
    const contestation = await import('../../stores/contestationStore');
    const exp = await import('./projectExport');
    const imp = await import('./projectImport');
    const blobs = await import('@difference-suite/shared/utils/blobStore');
    return { ...suite, ...contestation, ...exp, ...imp, ...blobs };
};

beforeEach(() => {
    blobMemory.clear();
    localStorage.clear();
});

afterEach(() => {
    blobMemory.clear();
});

describe('project round-trip', () => {
    it('export → clear → import restores corpus, collections, contestations, categories, and settings', async () => {
        const mod = await importEverything();

        // 1) Seed a session: a text item, an image item with a rawFile, a
        // collection, a custom category, and a contestation under it.
        const textItem = {
            id: 'text-1',
            name: 'notes.txt',
            type: 'text' as const,
            content: 'hello world',
            metadata: { size: 11, lastModified: 100, mimeType: 'text/plain' },
        };
        const imageFile = new File([new Uint8Array([1, 2, 3, 4])], 'pic.png', {
            type: 'image/png',
            lastModified: 200,
        });
        const imageItem = {
            id: 'img-1',
            name: 'pic.png',
            type: 'image' as const,
            content: 'blob:fake-url-img-1',
            rawFile: imageFile,
            metadata: { size: 4, lastModified: 200, mimeType: 'image/png' },
        };

        mod.useSuiteStore.setState({
            dataset: [textItem, imageItem],
            collections: [{ id: 'c-1', name: 'Workshop set', created: 1000 }],
            textEmbeddingModel: 'multilingual-e5-small',
            asrModel: 'whisper-small',
            embeddingModelVersion: null,
        });
        await mod.saveBlob('img-1', imageFile);

        const customCat = mod.useContestationStore.getState().addCategory({
            label: 'Misattribution',
            color: '#0f766e',
        });
        mod.useContestationStore.getState().add({
            toolId: 'SemanticOracle',
            route: '/semantic-oracle',
            outputSummary: 'demo',
            category: customCat.id,
            note: 'why I disagree',
        });

        // 2) Build a project file with media included.
        const file = await mod.buildProjectFile({ includeMedia: true, description: 'unit-test' });

        expect(file.schema).toBe('difference-suite-project@1');
        expect(file.meta.includesMedia).toBe(true);
        expect(file.meta.itemCount).toBe(2);
        expect(file.meta.binaryItemCount).toBe(1);
        expect(file.media?.['img-1']).toBeDefined();
        expect(file.media?.['img-1'].mimeType).toBe('image/png');
        expect(file.media?.['img-1'].dataUrl.startsWith('data:image/png;base64,')).toBe(true);
        expect(file.suite.collections).toHaveLength(1);
        expect(file.suite.asrModel).toBe('whisper-small');
        expect(file.contestation.records).toHaveLength(1);
        expect(file.contestation.categories.some((c) => c.id === customCat.id)).toBe(true);

        // 3) Wipe the in-memory + persisted state to simulate a fresh load.
        mod.useSuiteStore.getState().clearDataset();
        mod.useContestationStore.getState().clear();
        // Also wipe categories so we can verify the import restores them.
        mod.useContestationStore.setState({ categories: [] });

        expect(mod.useSuiteStore.getState().dataset).toHaveLength(0);
        expect(mod.useContestationStore.getState().records).toHaveLength(0);
        expect(mod.useContestationStore.getState().categories).toHaveLength(0);

        // 4) Import the file back.
        const result = await mod.importProjectFile(file);
        expect(result.restoredItems).toBe(2);
        expect(result.restoredCollections).toBe(1);
        expect(result.restoredContestations).toBe(1);
        expect(result.mediaRestored).toBe(1);
        expect(result.mediaMissing).toBe(0);

        const suiteAfter = mod.useSuiteStore.getState();
        expect(suiteAfter.dataset).toHaveLength(2);
        expect(suiteAfter.collections[0].name).toBe('Workshop set');
        expect(suiteAfter.asrModel).toBe('whisper-small');

        const restoredImage = suiteAfter.dataset.find((i) => i.id === 'img-1');
        expect(restoredImage?.rawFile).toBeInstanceOf(File);
        expect(typeof restoredImage?.content).toBe('string');
        expect(restoredImage?.content).toContain('blob:');
        // The image's bytes are back in the in-memory blobStore mock under the same id.
        // (jsdom's fetch returns a Blob from an alternate constructor, so check by shape.)
        const restoredBlob = await mod.getBlob('img-1');
        expect(restoredBlob).not.toBeNull();
        expect(restoredBlob?.size).toBe(4);
        expect(restoredBlob?.type).toBe('image/png');

        const contestationAfter = mod.useContestationStore.getState();
        expect(contestationAfter.records[0].note).toBe('why I disagree');
        // Categories restored verbatim, custom one included.
        expect(contestationAfter.categories.some((c) => c.id === customCat.id)).toBe(true);
    });

    it('metadata-only mode produces a smaller file with no media object', async () => {
        const mod = await importEverything();
        const imageFile = new File([new Uint8Array(4096)], 'big.png', { type: 'image/png' });
        mod.useSuiteStore.setState({
            dataset: [
                {
                    id: 'img-1',
                    name: 'big.png',
                    type: 'image',
                    content: 'blob:fake',
                    rawFile: imageFile,
                    metadata: { size: 4096, lastModified: 0, mimeType: 'image/png' },
                },
            ],
            collections: [],
        });

        const withMedia = await mod.buildProjectFile({ includeMedia: true });
        const metaOnly = await mod.buildProjectFile({ includeMedia: false });

        expect(withMedia.media).toBeDefined();
        expect(metaOnly.media).toBeUndefined();
        expect(metaOnly.meta.includesMedia).toBe(false);
        // metadata-only is materially smaller than the media-bearing file.
        expect(JSON.stringify(metaOnly).length).toBeLessThan(JSON.stringify(withMedia).length);
    });

    it('parseProjectFile rejects malformed JSON and wrong schema cleanly', async () => {
        const mod = await importEverything();
        expect(() => mod.parseProjectFile('not json')).toThrow(/Could not parse/);
        expect(() => mod.parseProjectFile(JSON.stringify({ schema: 'wrong' }))).toThrow(/Not a valid/);
    });
});

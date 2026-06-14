import { describe, expect, it } from 'vitest';
import type { Collection, DataItem } from '@difference-suite/shared/types';
import { buildAutoFields, buildDatasheet } from './datasheetBuilder';
import { EMPTY_USER_FIELDS } from './datasheetSchema';

const coll: Collection = {
    id: 'c1',
    name: 'Field Notebook 2025',
    created: 1000,
    description: 'Workshop materials',
};

const item = (overrides: Partial<DataItem> = {}): DataItem => ({
    id: `i-${Math.random()}`,
    name: 'untitled',
    type: 'text',
    content: 'hello',
    metadata: { size: 5, lastModified: 1500, mimeType: 'text/plain' },
    ...overrides,
});

describe('buildAutoFields', () => {
    it('counts items by type and totals them', () => {
        const auto = buildAutoFields(coll, [
            item({ type: 'text' }),
            item({ type: 'text' }),
            item({ type: 'image' }),
        ]);
        expect(auto.totalItems).toBe(3);
        expect(auto.itemCountsByType).toEqual({ text: 2, image: 1 });
    });

    it('records embedding presence and consensus dimensionality', () => {
        const auto = buildAutoFields(coll, [
            item({ embedding: Array(384).fill(0) }),
            item({ embedding: Array(384).fill(0) }),
            item({}),
        ]);
        expect(auto.hasEmbeddings).toBe(true);
        expect(auto.embeddingCount).toBe(2);
        expect(auto.embeddingDim).toBe(384);
    });

    it('reports mixed dimensionality as null rather than guessing', () => {
        const auto = buildAutoFields(coll, [
            item({ embedding: Array(384).fill(0) }),
            item({ embedding: Array(768).fill(0) }),
        ]);
        expect(auto.embeddingDim).toBeNull();
    });

    it('reports a time range from item lastModified', () => {
        const auto = buildAutoFields(coll, [
            item({ metadata: { size: 1, lastModified: 100, mimeType: 'text/plain' } }),
            item({ metadata: { size: 1, lastModified: 300, mimeType: 'text/plain' } }),
            item({ metadata: { size: 1, lastModified: 200, mimeType: 'text/plain' } }),
        ]);
        expect(auto.collectionTimeRange).toEqual({ firstTs: 100, lastTs: 300 });
    });

    it('handles an empty collection without throwing', () => {
        const auto = buildAutoFields(coll, []);
        expect(auto.totalItems).toBe(0);
        expect(auto.itemCountsByType).toEqual({});
        expect(auto.hasEmbeddings).toBe(false);
        expect(auto.collectionTimeRange).toEqual({ firstTs: null, lastTs: null });
        expect(auto.modelsUsed).toEqual([]);
    });

    it('records the active embedding model only when embeddings exist', () => {
        const noEmb = buildAutoFields(coll, [item({})], { activeEmbeddingModel: 'multilingual-e5-small' });
        expect(noEmb.modelsUsed).toEqual([]);
        const withEmb = buildAutoFields(coll, [item({ embedding: [1, 2, 3] })], {
            activeEmbeddingModel: 'multilingual-e5-small',
        });
        expect(withEmb.modelsUsed).toContain('multilingual-e5-small');
    });

    it('always records appCommit (from build-time global, stubbed in test setup)', () => {
        const auto = buildAutoFields(coll, []);
        expect(auto.appCommit).toBe('test');
        expect(auto.appVersion).toBe('0.0.0-test');
    });

    it('caps the source-file sample at 10 names', () => {
        const many = Array.from({ length: 25 }, (_, i) => item({ name: `item-${i}.txt` }));
        const auto = buildAutoFields(coll, many);
        expect(auto.sourceFileSamples).toHaveLength(10);
        expect(auto.sourceFileSamples[0]).toBe('item-0.txt');
    });
});

describe('buildDatasheet', () => {
    it('combines auto + user fields with sensible defaults', () => {
        const sheet = buildDatasheet(coll, [item({ type: 'image' })]);
        expect(sheet.auto.totalItems).toBe(1);
        expect(sheet.user).toEqual(EMPTY_USER_FIELDS);
    });

    it('allows partial user overrides without dropping unset defaults', () => {
        const sheet = buildDatasheet(coll, [], { ...EMPTY_USER_FIELDS, motivation: 'Teach about AI literacy' });
        expect(sheet.user.motivation).toBe('Teach about AI literacy');
        expect(sheet.user.license).toBe(EMPTY_USER_FIELDS.license);
    });
});

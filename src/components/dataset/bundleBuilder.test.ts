import { describe, expect, it } from 'vitest';
import { buildBundle, bundleFilename, DATASET_BUNDLE_SCHEMA, rawFilename } from './bundleBuilder';
import { buildDatasheet } from './datasheetBuilder';
import type { Collection, DataItem } from '@difference-suite/shared/types';

const coll: Collection = { id: 'c1', name: 'A — B / c', created: 1000 };

const item = (overrides: Partial<DataItem> = {}): DataItem => ({
    id: `i-${Math.random()}`,
    name: 'doc.txt',
    type: 'text',
    content: 'x',
    metadata: { size: 1, lastModified: 100, mimeType: 'text/plain' },
    ...overrides,
});

describe('buildBundle', () => {
    it('emits the current schema id and a markdown datasheet', () => {
        const sheet = buildDatasheet(coll, [item()]);
        const bundle = buildBundle({ collection: coll, items: [item()], datasheet: sheet });
        expect(bundle.schema).toBe(DATASET_BUNDLE_SCHEMA);
        expect(bundle.datasheet.markdown).toContain('# Datasheet');
        expect(bundle.datasheet.fields).toBe(sheet);
    });

    it('manifest item count matches the input items', () => {
        const items = [item({ name: 'a.txt' }), item({ name: 'b.png', type: 'image' })];
        const bundle = buildBundle({
            collection: coll,
            items,
            datasheet: buildDatasheet(coll, items),
        });
        expect(bundle.manifest.items).toHaveLength(2);
        expect(bundle.manifest.items[0].name).toBe('a.txt');
        expect(bundle.manifest.items[1].type).toBe('image');
    });

    it('includes embeddings only when any item has one', () => {
        const noEmb = buildBundle({
            collection: coll,
            items: [item()],
            datasheet: buildDatasheet(coll, [item()]),
        });
        expect(noEmb.embeddings).toBeUndefined();

        const withEmb = buildBundle({
            collection: coll,
            items: [item({ id: 'one', embedding: [1, 2, 3] })],
            datasheet: buildDatasheet(coll, [item({ id: 'one', embedding: [1, 2, 3] })]),
        });
        expect(withEmb.embeddings).toEqual({ one: [1, 2, 3] });
    });

    it('NEVER embeds raw file blobs in the JSON, even when items carry a rawFile', () => {
        const file = new File(['hello'], 'doc.txt', { type: 'text/plain' });
        const withRaw = item({ rawFile: file });
        const bundle = buildBundle({
            collection: coll,
            items: [withRaw],
            datasheet: buildDatasheet(coll, [withRaw]),
        });
        // Raw files travel as separate downloads only (see DatasetExportModal);
        // the JSON must not contain a `rawFiles` field nor a base64 payload.
        expect((bundle as unknown as { rawFiles?: unknown }).rawFiles).toBeUndefined();
        const json = JSON.stringify(bundle);
        expect(json).not.toContain('base64');
        // The plain text content "hello" shouldn't leak via stringification either.
        expect(json).not.toContain('hello');
    });

    it('provenance carries appCommit and the models declared in the datasheet', () => {
        const items = [item({ embedding: [1, 2] })];
        const sheet = buildDatasheet(coll, items, undefined, {
            activeEmbeddingModel: 'multilingual-e5-small',
        });
        const bundle = buildBundle({ collection: coll, items, datasheet: sheet });
        expect(bundle.provenance.appCommit).toBe('test');
        expect(bundle.provenance.activeEmbeddingModel).toBe('multilingual-e5-small');
        expect(bundle.provenance.models).toContain('multilingual-e5-small');
    });

    it('manifest items flag embedding presence and dimensionality', () => {
        const items = [item({ id: 'a', embedding: [1, 2, 3] }), item({ id: 'b' })];
        const bundle = buildBundle({
            collection: coll,
            items,
            datasheet: buildDatasheet(coll, items),
        });
        const a = bundle.manifest.items.find((i) => i.id === 'a');
        const b = bundle.manifest.items.find((i) => i.id === 'b');
        expect(a?.hasEmbedding).toBe(true);
        expect(a?.embeddingDim).toBe(3);
        expect(b?.hasEmbedding).toBe(false);
        expect(b?.embeddingDim).toBeUndefined();
    });
});

describe('filename helpers', () => {
    it('slugifies the collection name and stamps the date', () => {
        const ts = Date.UTC(2026, 5, 12);
        const f = bundleFilename(coll, ts);
        expect(f).toBe('dataset-a-b-c-2026-06-12.json');
    });

    it('rawFilename preserves the extension and dedupes via the item id', () => {
        const a = item({ id: 'x1', name: 'My File.JPEG' });
        const b = item({ id: 'x2', name: 'Other.txt' });
        expect(rawFilename(a).endsWith('.JPEG')).toBe(true);
        expect(rawFilename(a).startsWith('x1-')).toBe(true);
        expect(rawFilename(b).endsWith('.txt')).toBe(true);
    });
});

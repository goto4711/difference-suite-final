import { describe, expect, it } from 'vitest';
import {
    isProjectFile,
    PROJECT_FILE_SCHEMA,
    type ProjectFile,
} from './projectSchema';

const valid = (): ProjectFile => ({
    schema: PROJECT_FILE_SCHEMA,
    exported: 1,
    appCommit: 'abc',
    meta: { includesMedia: false, itemCount: 0, binaryItemCount: 0 },
    suite: {
        collections: [],
        dataset: [],
        textEmbeddingModel: 'multilingual-e5-small',
        asrModel: 'whisper-base',
        embeddingModelVersion: null,
    },
    contestation: { records: [], categories: [] },
});

describe('isProjectFile', () => {
    it('accepts a minimal well-formed file', () => {
        expect(isProjectFile(valid())).toBe(true);
    });

    it('rejects a wrong schema id', () => {
        const v = valid() as unknown as Record<string, unknown>;
        v.schema = 'something-else';
        expect(isProjectFile(v)).toBe(false);
    });

    it('rejects when suite is missing', () => {
        const v = valid() as unknown as Record<string, unknown>;
        delete v.suite;
        expect(isProjectFile(v)).toBe(false);
    });

    it('rejects when contestation.records contains malformed entries', () => {
        const v = valid();
        v.contestation.records = [{ broken: true } as unknown as ProjectFile['contestation']['records'][0]];
        expect(isProjectFile(v)).toBe(false);
    });

    it('rejects when media entries are malformed', () => {
        const v = valid() as unknown as Record<string, unknown>;
        v.media = { 'item-1': { name: 'a' } };
        expect(isProjectFile(v)).toBe(false);
    });

    it('accepts well-formed media entries', () => {
        const v = valid() as unknown as Record<string, unknown>;
        v.media = {
            'item-1': { name: 'a.png', mimeType: 'image/png', dataUrl: 'data:image/png;base64,xxx' },
        };
        expect(isProjectFile(v)).toBe(true);
    });

    it('rejects non-object inputs', () => {
        expect(isProjectFile(null)).toBe(false);
        expect(isProjectFile('project')).toBe(false);
        expect(isProjectFile([])).toBe(false);
    });
});

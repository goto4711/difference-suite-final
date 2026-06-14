import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    buildPacket,
    CONTESTATION_NOTE_MAX,
    CONTESTATION_PACKET_SCHEMA,
    CONTESTATION_PACKET_SCHEMA_V1,
    CONTESTATION_PACKET_SCHEMA_V2,
    DEFAULT_CATEGORIES,
    getPacketCategories,
    isContestationPacket,
    isContestationRecord,
    mergeRecords,
    selectRecordsForTool,
    useContestationStore,
    type ContestationRecord,
} from './contestationStore';

const baseRecord = (overrides: Partial<ContestationRecord> = {}): ContestationRecord => ({
    id: 'rec-1',
    ts: 1000,
    toolId: 'GlitchDetector',
    route: '/glitch-detector',
    outputSummary: 'cat.jpg scored 42% normality at threshold 0.8 → GLITCH DETECTED',
    category: 'mislabel',
    note: 'This is not a glitch, the image is fine.',
    settings: { threshold: 0.8 },
    author: 'TB',
    ...overrides,
});

beforeEach(() => {
    localStorage.clear();
    useContestationStore.setState({ records: [], categories: DEFAULT_CATEGORIES });
});

afterEach(() => {
    localStorage.clear();
});

describe('contestationStore', () => {
    it('adds records with generated id/ts and prepends to list', () => {
        const a = useContestationStore.getState().add({
            toolId: 'GlitchDetector',
            route: '/glitch-detector',
            outputSummary: 'first',
            category: 'mislabel',
            note: 'note-a',
        });
        const b = useContestationStore.getState().add({
            toolId: 'GlitchDetector',
            route: '/glitch-detector',
            outputSummary: 'second',
            category: 'erasure',
            note: 'note-b',
        });

        expect(a.id).toBeTruthy();
        expect(b.id).toBeTruthy();
        expect(a.id).not.toBe(b.id);
        expect(typeof a.ts).toBe('number');

        const records = useContestationStore.getState().records;
        expect(records).toHaveLength(2);
        expect(records[0].id).toBe(b.id); // newest first
        expect(records[1].id).toBe(a.id);
    });

    it('truncates over-long notes to the max length and trims author whitespace', () => {
        const longNote = 'x'.repeat(CONTESTATION_NOTE_MAX + 50);
        const r = useContestationStore.getState().add({
            toolId: 'X',
            route: '/x',
            outputSummary: 's',
            category: 'other',
            note: longNote,
            author: '  AB  ',
        });
        expect(r.note).toHaveLength(CONTESTATION_NOTE_MAX);
        expect(r.author).toBe('AB');
    });

    it('drops settings entries that are not strings or numbers', () => {
        const r = useContestationStore.getState().add({
            toolId: 'X',
            route: '/x',
            outputSummary: 's',
            category: 'other',
            note: 'n',
            // @ts-expect-error testing runtime sanitization with invalid input
            settings: { threshold: 0.8, bad: { nested: true }, label: 'high' },
        });
        expect(r.settings).toEqual({ threshold: 0.8, label: 'high' });
    });

    it('removes by id and clears all', () => {
        const a = useContestationStore.getState().add({
            toolId: 'A', route: '/a', outputSummary: '1', category: 'other', note: 'n1',
        });
        useContestationStore.getState().add({
            toolId: 'B', route: '/b', outputSummary: '2', category: 'other', note: 'n2',
        });
        useContestationStore.getState().remove(a.id);
        expect(useContestationStore.getState().records).toHaveLength(1);

        useContestationStore.getState().clear();
        expect(useContestationStore.getState().records).toHaveLength(0);
    });

    it('selectRecordsForTool filters by toolId', () => {
        useContestationStore.getState().add({
            toolId: 'GlitchDetector', route: '/g', outputSummary: '1', category: 'other', note: 'n',
        });
        useContestationStore.getState().add({
            toolId: 'SemanticOracle', route: '/s', outputSummary: '2', category: 'other', note: 'n',
        });
        const filtered = selectRecordsForTool(
            useContestationStore.getState().records,
            'GlitchDetector',
        );
        expect(filtered).toHaveLength(1);
        expect(filtered[0].toolId).toBe('GlitchDetector');
    });
});

describe('packet validation', () => {
    it('accepts a well-formed v1 packet', () => {
        const packet = buildPacket([baseRecord()]);
        expect(packet.schema).toBe(CONTESTATION_PACKET_SCHEMA);
        expect(isContestationPacket(packet)).toBe(true);
    });

    it('rejects packets with the wrong schema', () => {
        expect(isContestationPacket({ schema: 'wrong', exported: 1, records: [] })).toBe(false);
    });

    it('rejects packets where records contain invalid entries', () => {
        const bad = {
            schema: CONTESTATION_PACKET_SCHEMA,
            exported: 1,
            records: [{ id: 1, ts: 'no', toolId: '', route: '', outputSummary: '', category: 'x', note: '' }],
        };
        expect(isContestationPacket(bad)).toBe(false);
    });

    it('rejects non-object inputs', () => {
        expect(isContestationPacket(null)).toBe(false);
        expect(isContestationPacket('packet')).toBe(false);
        expect(isContestationPacket([])).toBe(false);
    });

    it('isContestationRecord validates required shape', () => {
        expect(isContestationRecord(baseRecord())).toBe(true);
        // Free-form category strings are now valid (custom ids are supported);
        // only empty strings are rejected.
        expect(isContestationRecord({ ...baseRecord(), category: 'nope' })).toBe(true);
        expect(isContestationRecord({ ...baseRecord(), category: '' })).toBe(false);
        expect(isContestationRecord({ ...baseRecord(), category: 42 })).toBe(false);
        expect(isContestationRecord({ ...baseRecord(), ts: 'not-a-number' })).toBe(false);
    });

    it('isContestationRecord rejects malformed provenance but accepts missing', () => {
        expect(isContestationRecord({ ...baseRecord(), provenance: undefined })).toBe(true);
        expect(
            isContestationRecord({
                ...baseRecord(),
                provenance: { appCommit: 'abc1234' },
            }),
        ).toBe(true);
        expect(
            isContestationRecord({
                ...baseRecord(),
                provenance: { appCommit: 'abc', models: ['clip-vit-base-patch32-q4'] },
            }),
        ).toBe(true);
        // Missing appCommit → invalid.
        expect(
            isContestationRecord({ ...baseRecord(), provenance: { models: ['x'] } }),
        ).toBe(false);
        // Non-string in models → invalid.
        expect(
            isContestationRecord({
                ...baseRecord(),
                provenance: { appCommit: 'abc', models: ['ok', 42] },
            }),
        ).toBe(false);
    });
});

describe('packet versioning (@1 ↔ @2)', () => {
    it('default schema id is @2', () => {
        expect(CONTESTATION_PACKET_SCHEMA).toBe(CONTESTATION_PACKET_SCHEMA_V2);
    });

    it('buildPacket emits @2 with embedded categories', () => {
        const packet = buildPacket([baseRecord()]);
        expect(packet.schema).toBe(CONTESTATION_PACKET_SCHEMA_V2);
        expect(packet.categories.length).toBeGreaterThanOrEqual(DEFAULT_CATEGORIES.length);
        expect(isContestationPacket(packet)).toBe(true);
    });

    it('accepts a legacy @1 packet (no categories field)', () => {
        const legacy = {
            schema: CONTESTATION_PACKET_SCHEMA_V1,
            exported: 1,
            records: [baseRecord()],
        };
        expect(isContestationPacket(legacy)).toBe(true);
        expect(getPacketCategories(legacy)).toBeNull();
    });

    it('rejects a @2 packet missing the categories field', () => {
        const malformed = {
            schema: CONTESTATION_PACKET_SCHEMA_V2,
            exported: 1,
            records: [baseRecord()],
        };
        expect(isContestationPacket(malformed)).toBe(false);
    });

    it('preserves @2 categories on a round-trip through getPacketCategories', () => {
        const customCat = { id: 'misattribution', label: 'Misattribution', color: '#123456' };
        const packet = buildPacket(
            [baseRecord({ category: 'misattribution' })],
            [...DEFAULT_CATEGORIES, customCat],
        );
        const cats = getPacketCategories(packet);
        expect(cats?.find((c) => c.id === 'misattribution')).toEqual(customCat);
    });

    it('mergeRecords works with mixed @1 and @2 record sources', () => {
        const v1Record = baseRecord({ id: 'v1', provenance: undefined });
        const v2Record = baseRecord({
            id: 'v2',
            category: 'misattribution',
            provenance: { appCommit: 'abc1234', models: ['clip-vit-base-patch32-q4'] },
        });
        const merged = mergeRecords([[v1Record], [v2Record]]);
        expect(merged).toHaveLength(2);
        expect(merged.find((r) => r.id === 'v1')?.provenance).toBeUndefined();
        expect(merged.find((r) => r.id === 'v2')?.provenance?.appCommit).toBe('abc1234');
    });
});

describe('provenance population on add()', () => {
    it('always records appCommit and appVersion from build-time globals', () => {
        const r = useContestationStore.getState().add({
            toolId: 'X',
            route: '/x',
            outputSummary: 's',
            category: 'other',
            note: 'n',
        });
        expect(r.provenance?.appCommit).toBe('test');
        expect(r.provenance?.appVersion).toBe('0.0.0-test');
        // No models supplied → field absent rather than empty array. Honest silence.
        expect(r.provenance?.models).toBeUndefined();
    });

    it('records models when the contesting tool declares them', () => {
        const r = useContestationStore.getState().add({
            toolId: 'ImaginationInspector',
            route: '/imagination-inspector',
            outputSummary: 's',
            category: 'stereotype',
            note: 'n',
            provenance: { models: ['clip-vit-base-patch32-q4'] },
        });
        expect(r.provenance?.models).toEqual(['clip-vit-base-patch32-q4']);
    });

    it('drops empty model entries supplied by a tool', () => {
        const r = useContestationStore.getState().add({
            toolId: 'X',
            route: '/x',
            outputSummary: 's',
            category: 'other',
            note: 'n',
            provenance: { models: ['', 'real-model', ''] },
        });
        expect(r.provenance?.models).toEqual(['real-model']);
    });
});

describe('category management', () => {
    it('seeds the five defaults at first construction', () => {
        const ids = useContestationStore.getState().categories.map((c) => c.id);
        expect(ids).toContain('erasure');
        expect(ids).toContain('stereotype');
        expect(ids).toContain('mislabel');
        expect(ids).toContain('disagreement');
        expect(ids).toContain('other');
    });

    it('addCategory appends a slugged id and the colour', () => {
        const def = useContestationStore.getState().addCategory({
            label: 'Misattribution',
            color: '#123456',
        });
        expect(def.id).toBe('misattribution');
        expect(def.color).toBe('#123456');
        expect(useContestationStore.getState().categories.find((c) => c.id === 'misattribution')).toBeDefined();
    });

    it('addCategory suffixes a counter on id collision', () => {
        const a = useContestationStore.getState().addCategory({ label: 'Stereotype', color: '#000' });
        const b = useContestationStore.getState().addCategory({ label: 'Stereotype', color: '#111' });
        expect(a.id).not.toBe(b.id);
        expect(b.id).toMatch(/^stereotype-\d+$/);
    });

    it('renameCategory and setCategoryColor mutate only the matching id', () => {
        useContestationStore.getState().renameCategory('other', 'Misc');
        useContestationStore.getState().setCategoryColor('other', '#abcdef');
        const def = useContestationStore.getState().categories.find((c) => c.id === 'other');
        expect(def?.label).toBe('Misc');
        expect(def?.color).toBe('#abcdef');
    });

    it('removeCategory blocks defaults', () => {
        const result = useContestationStore.getState().removeCategory('erasure');
        expect(result).toEqual({ ok: false, reason: 'is-default', categoryLabel: 'Erasure' });
    });

    it('removeCategory blocks an in-use category and reports the count', () => {
        const def = useContestationStore.getState().addCategory({ label: 'Misattr', color: '#123' });
        useContestationStore.getState().add({
            toolId: 'X',
            route: '/x',
            outputSummary: 's',
            category: def.id,
            note: 'n',
        });
        useContestationStore.getState().add({
            toolId: 'X',
            route: '/x',
            outputSummary: 's',
            category: def.id,
            note: 'n',
        });
        const result = useContestationStore.getState().removeCategory(def.id);
        expect(result).toEqual({
            ok: false,
            reason: 'in-use',
            usageCount: 2,
            categoryLabel: 'Misattr',
        });
        // Category still present after a blocked removal.
        expect(useContestationStore.getState().categories.some((c) => c.id === def.id)).toBe(true);
    });

    it('removeCategory succeeds for an unused custom category', () => {
        const def = useContestationStore.getState().addCategory({ label: 'Misattr', color: '#123' });
        const result = useContestationStore.getState().removeCategory(def.id);
        expect(result).toEqual({ ok: true });
        expect(useContestationStore.getState().categories.some((c) => c.id === def.id)).toBe(false);
    });

    it('restoreDefaultCategories re-adds any missing default and keeps user-added ones', () => {
        // Simulate a state where a default went missing (not user-reachable today,
        // but the migration path / future actions could produce it).
        useContestationStore.setState((s) => ({
            categories: s.categories.filter((c) => c.id !== 'mislabel'),
        }));
        useContestationStore.getState().addCategory({ label: 'Custom', color: '#000' });
        useContestationStore.getState().restoreDefaultCategories();
        const ids = useContestationStore.getState().categories.map((c) => c.id);
        expect(ids).toContain('mislabel');
        expect(ids).toContain('custom');
    });
});

describe('mergeRecords', () => {
    it('deduplicates by id, preserving first occurrence', () => {
        const a = baseRecord({ id: 'shared', note: 'from A' });
        const b = baseRecord({ id: 'shared', note: 'from B (should be ignored)' });
        const c = baseRecord({ id: 'unique', note: 'unique' });
        const merged = mergeRecords([[a, c], [b]]);
        expect(merged).toHaveLength(2);
        expect(merged.find((r) => r.id === 'shared')?.note).toBe('from A');
        expect(merged.find((r) => r.id === 'unique')?.note).toBe('unique');
    });

    it('handles empty input', () => {
        expect(mergeRecords([])).toEqual([]);
        expect(mergeRecords([[]])).toEqual([]);
    });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    buildPacket,
    CONTESTATION_NOTE_MAX,
    CONTESTATION_PACKET_SCHEMA,
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
    useContestationStore.setState({ records: [] });
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
        expect(isContestationRecord({ ...baseRecord(), category: 'nope' })).toBe(false);
        expect(isContestationRecord({ ...baseRecord(), ts: 'not-a-number' })).toBe(false);
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

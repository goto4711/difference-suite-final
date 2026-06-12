import { describe, expect, it } from 'vitest';
import {
    buildMatrix,
    buildThresholdSpread,
    deriveParticipantLabel,
    matrixKey,
    type Participant,
} from './workshopHelpers';
import {
    buildPacket,
    isContestationPacket,
    mergeRecords,
    type ContestationRecord,
} from '../../stores/contestationStore';

const rec = (overrides: Partial<ContestationRecord> = {}): ContestationRecord => ({
    id: `r-${Math.random()}`,
    ts: Date.now(),
    toolId: 'GlitchDetector',
    route: '/glitch-detector',
    outputSummary: 'output',
    category: 'mislabel',
    note: 'note',
    settings: { threshold: 0.8 },
    author: 'TB',
    ...overrides,
});

const participant = (id: string, label: string, records: ContestationRecord[]): Participant => ({
    id,
    label,
    source: 'imported',
    filename: `${id}.json`,
    records,
});

describe('deriveParticipantLabel', () => {
    it('uses the first non-empty author initials', () => {
        const r1 = rec({ author: undefined });
        const r2 = rec({ author: 'AB' });
        expect(deriveParticipantLabel([r1, r2], 'fallback.json')).toBe('AB');
    });

    it('falls back to the filename when no records carry an author', () => {
        const r = rec({ author: undefined });
        expect(deriveParticipantLabel([r], 'alice-packet.json')).toBe('alice-packet.json');
    });

    it('falls back to the filename when records have empty/whitespace authors', () => {
        const r = rec({ author: '   ' });
        expect(deriveParticipantLabel([r], 'bob.json')).toBe('bob.json');
    });
});

describe('packet import validation', () => {
    it('accepts a v1 schema packet', () => {
        const packet = buildPacket([rec()]);
        expect(isContestationPacket(packet)).toBe(true);
    });

    it('rejects malformed payloads', () => {
        expect(isContestationPacket({ schema: 'something-else', records: [] })).toBe(false);
        expect(isContestationPacket({ schema: 'difference-suite-contestations@1' })).toBe(false);
        expect(isContestationPacket(null)).toBe(false);
        expect(isContestationPacket('packet')).toBe(false);
    });
});

describe('mergeRecords (dedup across packets)', () => {
    it('deduplicates by record id when merging local + imported sources', () => {
        const shared = rec({ id: 'shared', note: 'original' });
        const localOnly = rec({ id: 'local-only' });
        const importedDuplicate = rec({ id: 'shared', note: 'overwritten?' });
        const importedNew = rec({ id: 'imported-new' });

        const merged = mergeRecords([
            [shared, localOnly],
            [importedDuplicate, importedNew],
        ]);

        expect(merged).toHaveLength(3);
        expect(merged.map((r) => r.id).sort()).toEqual(
            ['shared', 'local-only', 'imported-new'].sort(),
        );
        // First occurrence wins for collisions.
        expect(merged.find((r) => r.id === 'shared')?.note).toBe('original');
    });
});

describe('buildThresholdSpread', () => {
    it('groups by outputSummary and only returns multi-participant rows', () => {
        const ab = participant('alice', 'AB', [
            rec({ id: 'r1', outputSummary: 'cat.jpg @0.8', settings: { threshold: 0.8 } }),
            rec({ id: 'r2', outputSummary: 'solo.jpg @0.9', settings: { threshold: 0.9 } }),
        ]);
        const cd = participant('bob', 'CD', [
            rec({ id: 'r3', outputSummary: 'cat.jpg @0.8', settings: { threshold: 0.7 } }),
        ]);

        const rows = buildThresholdSpread([ab, cd]);
        expect(rows).toHaveLength(1);
        const [row] = rows;
        expect(row.outputSummary).toBe('cat.jpg @0.8');
        expect(row.points).toHaveLength(2);
        expect(row.points.map((p) => p.participantLabel).sort()).toEqual(['AB', 'CD']);
        expect(row.points.map((p) => p.threshold).sort()).toEqual([0.7, 0.8]);
    });

    it('ignores records without a numeric threshold setting', () => {
        const p = participant('x', 'X', [
            rec({ id: 'no-threshold', settings: { other: 'value' } }),
        ]);
        expect(buildThresholdSpread([p])).toEqual([]);
    });
});

describe('buildMatrix', () => {
    it('counts contestations per tool × participant, tracking categories', () => {
        const ab = participant('alice', 'AB', [
            rec({ id: 'a1', toolId: 'GlitchDetector', category: 'mislabel' }),
            rec({ id: 'a2', toolId: 'GlitchDetector', category: 'erasure' }),
            rec({ id: 'a3', toolId: 'SemanticOracle', category: 'other' }),
        ]);
        const cd = participant('bob', 'CD', [
            rec({ id: 'b1', toolId: 'GlitchDetector', category: 'mislabel' }),
        ]);

        const matrix = buildMatrix([ab, cd]);
        expect(matrix.tools).toEqual(['GlitchDetector', 'SemanticOracle']);
        expect(matrix.participants).toHaveLength(2);

        const abGlitch = matrix.cells.get(matrixKey('GlitchDetector', 'alice'));
        expect(abGlitch?.count).toBe(2);
        expect(abGlitch?.categories.mislabel).toBe(1);
        expect(abGlitch?.categories.erasure).toBe(1);

        const cdGlitch = matrix.cells.get(matrixKey('GlitchDetector', 'bob'));
        expect(cdGlitch?.count).toBe(1);

        expect(matrix.cells.get(matrixKey('SemanticOracle', 'bob'))).toBeUndefined();
    });
});

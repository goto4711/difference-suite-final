import type { ContestationRecord } from '../../stores/contestationStore';

export interface Participant {
    id: string;            // stable handle (filename or 'local')
    label: string;         // author initials if present, else filename
    source: 'imported' | 'local';
    filename?: string;
    records: ContestationRecord[];
}

/**
 * Choose a participant label: first non-empty author initials in the packet,
 * falling back to the source filename. A workshop is human-scaled — packets
 * are assumed single-author; if they're not, falling back to the filename is
 * still recognisable to the importer.
 */
export const deriveParticipantLabel = (
    records: ContestationRecord[],
    filename: string,
): string => {
    for (const r of records) {
        if (r.author && r.author.trim()) return r.author.trim();
    }
    return filename;
};

export interface ThresholdRow {
    outputSummary: string;
    toolId: string;
    points: Array<{
        participantId: string;
        participantLabel: string;
        threshold: number;
        recordId: string;
    }>;
}

const getThreshold = (record: ContestationRecord): number | undefined => {
    const t = record.settings?.threshold;
    return typeof t === 'number' && Number.isFinite(t) ? t : undefined;
};

/**
 * Group records by outputSummary so the workshop can show each item's
 * threshold spread across participants on a single axis. Items without any
 * numeric threshold setting are dropped.
 */
export const buildThresholdSpread = (participants: Participant[]): ThresholdRow[] => {
    const rows = new Map<string, ThresholdRow>();
    for (const p of participants) {
        for (const r of p.records) {
            const threshold = getThreshold(r);
            if (threshold === undefined) continue;
            const key = `${r.toolId}::${r.outputSummary}`;
            let row = rows.get(key);
            if (!row) {
                row = { outputSummary: r.outputSummary, toolId: r.toolId, points: [] };
                rows.set(key, row);
            }
            row.points.push({
                participantId: p.id,
                participantLabel: p.label,
                threshold,
                recordId: r.id,
            });
        }
    }
    // Only return rows where at least two participants disagreed.
    // Single-participant rows are not "spreads".
    return Array.from(rows.values())
        .filter((row) => {
            const unique = new Set(row.points.map((pt) => pt.participantId));
            return unique.size >= 2;
        })
        .sort((a, b) => a.toolId.localeCompare(b.toolId));
};

export interface MatrixCell {
    count: number;
    /** Category id → count. Open-ended because categories are user-managed. */
    categories: Record<string, number>;
}

export interface MatrixData {
    tools: string[];
    participants: Participant[];
    cells: Map<string, MatrixCell>; // key = `${toolId}::${participantId}`
}

export const matrixKey = (toolId: string, participantId: string): string =>
    `${toolId}::${participantId}`;

export const buildMatrix = (participants: Participant[]): MatrixData => {
    const toolSet = new Set<string>();
    const cells = new Map<string, MatrixCell>();

    for (const p of participants) {
        for (const r of p.records) {
            toolSet.add(r.toolId);
            const key = matrixKey(r.toolId, p.id);
            let cell = cells.get(key);
            if (!cell) {
                cell = { count: 0, categories: {} };
                cells.set(key, cell);
            }
            cell.count += 1;
            cell.categories[r.category] = (cell.categories[r.category] ?? 0) + 1;
        }
    }

    return {
        tools: Array.from(toolSet).sort(),
        participants,
        cells,
    };
};

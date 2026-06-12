import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ContestationCategory =
    | 'erasure'
    | 'stereotype'
    | 'mislabel'
    | 'disagreement'
    | 'other';

export const CONTESTATION_CATEGORIES: ContestationCategory[] = [
    'erasure',
    'stereotype',
    'mislabel',
    'disagreement',
    'other',
];

export const CONTESTATION_CATEGORY_LABEL: Record<ContestationCategory, string> = {
    erasure: 'Erasure',
    stereotype: 'Stereotype',
    mislabel: 'Mislabel',
    disagreement: 'Disagreement',
    other: 'Other',
};

export const CONTESTATION_NOTE_MAX = 1000;

export interface ContestationRecord {
    id: string;
    ts: number;
    toolId: string;
    route: string;
    outputSummary: string;
    category: ContestationCategory;
    note: string;
    settings?: Record<string, string | number>;
    author?: string;
}

export interface ContestationPacketV1 {
    schema: 'difference-suite-contestations@1';
    exported: number;
    records: ContestationRecord[];
}

export const CONTESTATION_PACKET_SCHEMA = 'difference-suite-contestations@1' as const;

interface ContestationState {
    records: ContestationRecord[];
    add: (record: Omit<ContestationRecord, 'id' | 'ts'>) => ContestationRecord;
    remove: (id: string) => void;
    clear: () => void;
}

const STORAGE_NAME = 'difference-suite-contestations';
const STORAGE_VERSION = 1;

const isCategory = (value: unknown): value is ContestationCategory =>
    typeof value === 'string' && (CONTESTATION_CATEGORIES as string[]).includes(value);

const sanitizeSettings = (
    value: unknown,
): Record<string, string | number> | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const entries = Object.entries(value as Record<string, unknown>).filter(
        ([, v]) => typeof v === 'string' || typeof v === 'number',
    ) as Array<[string, string | number]>;
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const isContestationRecord = (value: unknown): value is ContestationRecord => {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.id === 'string' &&
        typeof v.ts === 'number' &&
        typeof v.toolId === 'string' &&
        typeof v.route === 'string' &&
        typeof v.outputSummary === 'string' &&
        isCategory(v.category) &&
        typeof v.note === 'string' &&
        (v.author === undefined || typeof v.author === 'string') &&
        (v.settings === undefined ||
            (typeof v.settings === 'object' && v.settings !== null))
    );
};

export const isContestationPacket = (value: unknown): value is ContestationPacketV1 => {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
        v.schema === CONTESTATION_PACKET_SCHEMA &&
        typeof v.exported === 'number' &&
        Array.isArray(v.records) &&
        v.records.every(isContestationRecord)
    );
};

export const buildPacket = (records: ContestationRecord[]): ContestationPacketV1 => ({
    schema: CONTESTATION_PACKET_SCHEMA,
    exported: Date.now(),
    records,
});

/** Merge records from multiple sources, deduplicating by id (first occurrence wins). */
export const mergeRecords = (
    sources: ContestationRecord[][],
): ContestationRecord[] => {
    const seen = new Set<string>();
    const out: ContestationRecord[] = [];
    for (const source of sources) {
        for (const record of source) {
            if (seen.has(record.id)) continue;
            seen.add(record.id);
            out.push(record);
        }
    }
    return out;
};

export const useContestationStore = create<ContestationState>()(
    persist(
        (set) => ({
            records: [],
            add: (input) => {
                const record: ContestationRecord = {
                    ...input,
                    id: crypto.randomUUID(),
                    ts: Date.now(),
                    note: input.note.slice(0, CONTESTATION_NOTE_MAX),
                    settings: sanitizeSettings(input.settings),
                    author: input.author?.trim() ? input.author.trim() : undefined,
                };
                set((state) => ({ records: [record, ...state.records] }));
                return record;
            },
            remove: (id) =>
                set((state) => ({ records: state.records.filter((r) => r.id !== id) })),
            clear: () => set({ records: [] }),
        }),
        {
            name: STORAGE_NAME,
            version: STORAGE_VERSION,
            partialize: (state) => ({ records: state.records }),
            migrate: (persistedState) => {
                const state = (persistedState ?? {}) as { records?: unknown };
                const records = Array.isArray(state.records)
                    ? (state.records.filter(isContestationRecord) as ContestationRecord[])
                    : [];
                return { records };
            },
        },
    ),
);

/** Select all records for a given toolId (case-sensitive, same convention as toolId field). */
export const selectRecordsForTool = (
    records: ContestationRecord[],
    toolId: string,
): ContestationRecord[] => records.filter((r) => r.toolId === toolId);

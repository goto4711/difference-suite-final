import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Category id is now a free-form, user-managed string. Records persisted under
// the legacy fixed union ('erasure' | … | 'other') remain valid because their
// strings match the seeded default ids.
export type ContestationCategory = string;

export const CONTESTATION_NOTE_MAX = 1000;

export interface CategoryDefinition {
    id: string;
    label: string;
    color: string;          // hex (#RRGGBB) — single source of truth for chip colour
    isDefault?: boolean;    // true for the seeded five
}

/**
 * Seeded category palette. Hex values match the prior export-packet hex set so
 * exported records look the same before and after the schema bump.
 */
export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
    { id: 'erasure',      label: 'Erasure',      color: '#7c3aed', isDefault: true },
    { id: 'stereotype',   label: 'Stereotype',   color: '#dc2626', isDefault: true },
    { id: 'mislabel',     label: 'Mislabel',     color: '#d97706', isDefault: true },
    { id: 'disagreement', label: 'Disagreement', color: '#0369a1', isDefault: true },
    { id: 'other',        label: 'Other',        color: '#525252', isDefault: true },
];

/**
 * Provenance attached to each record at add()-time so an exported packet is
 * independently reproducible. Per-tool models are declared by the producing
 * tool (via ContestButton's `models` prop) — we never substitute a
 * suite-level default, because most tools do not use the suite-level
 * embedding/ASR models, and recording the wrong models against a contested
 * output is worse than recording none.
 */
export interface RecordProvenance {
    appCommit: string;                          // git SHA from build (or 'dev')
    appVersion?: string;                        // optional semver
    models?: string[];                          // model ids the contested tool actually used
    modelVersions?: Record<string, string>;     // id → hfPath / quantization, looked up from registry
}

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
    provenance?: RecordProvenance;              // absent on legacy @1 records
}

// ----- Packet schemas (v1 kept for back-compat import) ---------------------

export const CONTESTATION_PACKET_SCHEMA_V1 = 'difference-suite-contestations@1' as const;
export const CONTESTATION_PACKET_SCHEMA_V2 = 'difference-suite-contestations@2' as const;
/** Current schema id used for new exports. */
export const CONTESTATION_PACKET_SCHEMA = CONTESTATION_PACKET_SCHEMA_V2;

export interface ContestationPacketV1 {
    schema: typeof CONTESTATION_PACKET_SCHEMA_V1;
    exported: number;
    records: ContestationRecord[];
}

export interface ContestationPacketV2 {
    schema: typeof CONTESTATION_PACKET_SCHEMA_V2;
    exported: number;
    records: ContestationRecord[];
    /**
     * Snapshot of the exporter's category definitions, so an importer who has
     * never seen a custom category id can still render its label/colour
     * faithfully without inventing one.
     */
    categories: CategoryDefinition[];
}

export type ContestationPacket = ContestationPacketV1 | ContestationPacketV2;

// ----- Store ----------------------------------------------------------------

export type RemoveCategoryResult =
    | { ok: true }
    | { ok: false; reason: 'in-use'; usageCount: number; categoryLabel: string }
    | { ok: false; reason: 'is-default'; categoryLabel: string }
    | { ok: false; reason: 'not-found' };

interface ContestationState {
    records: ContestationRecord[];
    categories: CategoryDefinition[];
    add: (record: Omit<ContestationRecord, 'id' | 'ts' | 'provenance'> & {
        provenance?: { models?: string[] };
    }) => ContestationRecord;
    remove: (id: string) => void;
    clear: () => void;
    addCategory: (input: { label: string; color: string }) => CategoryDefinition;
    renameCategory: (id: string, label: string) => void;
    setCategoryColor: (id: string, color: string) => void;
    removeCategory: (id: string) => RemoveCategoryResult;
    restoreDefaultCategories: () => void;
}

const STORAGE_NAME = 'difference-suite-contestations';
const STORAGE_VERSION = 2;

const isCategoryId = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const sanitizeSettings = (
    value: unknown,
): Record<string, string | number> | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const entries = Object.entries(value as Record<string, unknown>).filter(
        ([, v]) => typeof v === 'string' || typeof v === 'number',
    ) as Array<[string, string | number]>;
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const isCategoryDefinition = (value: unknown): value is CategoryDefinition => {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.id === 'string' && v.id.trim().length > 0 &&
        typeof v.label === 'string' &&
        typeof v.color === 'string'
    );
};

const isRecordProvenance = (value: unknown): value is RecordProvenance => {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (typeof v.appCommit !== 'string') return false;
    if (v.appVersion !== undefined && typeof v.appVersion !== 'string') return false;
    if (v.models !== undefined && !(Array.isArray(v.models) && v.models.every((m) => typeof m === 'string'))) return false;
    if (v.modelVersions !== undefined) {
        if (!v.modelVersions || typeof v.modelVersions !== 'object') return false;
        for (const val of Object.values(v.modelVersions as Record<string, unknown>)) {
            if (typeof val !== 'string') return false;
        }
    }
    return true;
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
        isCategoryId(v.category) &&
        typeof v.note === 'string' &&
        (v.author === undefined || typeof v.author === 'string') &&
        (v.settings === undefined ||
            (typeof v.settings === 'object' && v.settings !== null)) &&
        (v.provenance === undefined || isRecordProvenance(v.provenance))
    );
};

export const isContestationPacket = (value: unknown): value is ContestationPacket => {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (typeof v.exported !== 'number' || !Array.isArray(v.records)) return false;
    if (!v.records.every(isContestationRecord)) return false;
    if (v.schema === CONTESTATION_PACKET_SCHEMA_V1) return true;
    if (v.schema === CONTESTATION_PACKET_SCHEMA_V2) {
        return Array.isArray(v.categories) && v.categories.every(isCategoryDefinition);
    }
    return false;
};

/** Pull the categories embedded in a packet, or null for v1. */
export const getPacketCategories = (packet: ContestationPacket): CategoryDefinition[] | null => {
    return packet.schema === CONTESTATION_PACKET_SCHEMA_V2 ? packet.categories : null;
};

export const buildPacket = (
    records: ContestationRecord[],
    categories: CategoryDefinition[] = DEFAULT_CATEGORIES,
): ContestationPacketV2 => ({
    schema: CONTESTATION_PACKET_SCHEMA_V2,
    exported: Date.now(),
    records,
    categories,
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

// ----- Build-time provenance (always populated on add()) -------------------

const slugify = (label: string): string =>
    label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'category';

const buildProvenance = (models?: string[]): RecordProvenance => {
    // __APP_COMMIT__ / __APP_VERSION__ are injected by vite (see vite.config.ts).
    // They are declared in src/global.d.ts and resolve to literals at build time.
    const appCommit = typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'dev';
    const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined;
    const cleaned = models?.filter((m) => typeof m === 'string' && m.length > 0);
    return {
        appCommit,
        ...(appVersion ? { appVersion } : {}),
        ...(cleaned && cleaned.length > 0 ? { models: cleaned } : {}),
    };
};

export const useContestationStore = create<ContestationState>()(
    persist(
        (set, get) => ({
            records: [],
            categories: DEFAULT_CATEGORIES,
            add: (input) => {
                const record: ContestationRecord = {
                    ...input,
                    id: crypto.randomUUID(),
                    ts: Date.now(),
                    note: input.note.slice(0, CONTESTATION_NOTE_MAX),
                    settings: sanitizeSettings(input.settings),
                    author: input.author?.trim() ? input.author.trim() : undefined,
                    provenance: buildProvenance(input.provenance?.models),
                };
                set((state) => ({ records: [record, ...state.records] }));
                return record;
            },
            remove: (id) =>
                set((state) => ({ records: state.records.filter((r) => r.id !== id) })),
            clear: () => set({ records: [] }),
            addCategory: ({ label, color }) => {
                const cleanLabel = label.trim().slice(0, 32) || 'Category';
                const base = slugify(cleanLabel);
                const existing = new Set(get().categories.map((c) => c.id));
                let id = base;
                let n = 2;
                while (existing.has(id)) {
                    id = `${base}-${n++}`;
                }
                const def: CategoryDefinition = { id, label: cleanLabel, color };
                set((state) => ({ categories: [...state.categories, def] }));
                return def;
            },
            renameCategory: (id, label) => {
                const cleanLabel = label.trim().slice(0, 32);
                if (!cleanLabel) return;
                set((state) => ({
                    categories: state.categories.map((c) =>
                        c.id === id ? { ...c, label: cleanLabel } : c,
                    ),
                }));
            },
            setCategoryColor: (id, color) => {
                set((state) => ({
                    categories: state.categories.map((c) =>
                        c.id === id ? { ...c, color } : c,
                    ),
                }));
            },
            removeCategory: (id) => {
                const state = get();
                const def = state.categories.find((c) => c.id === id);
                if (!def) return { ok: false, reason: 'not-found' };
                if (def.isDefault) {
                    return { ok: false, reason: 'is-default', categoryLabel: def.label };
                }
                const usageCount = state.records.filter((r) => r.category === id).length;
                if (usageCount > 0) {
                    return { ok: false, reason: 'in-use', usageCount, categoryLabel: def.label };
                }
                set({ categories: state.categories.filter((c) => c.id !== id) });
                return { ok: true };
            },
            restoreDefaultCategories: () => {
                set((state) => {
                    const present = new Set(state.categories.map((c) => c.id));
                    const missing = DEFAULT_CATEGORIES.filter((d) => !present.has(d.id));
                    if (missing.length === 0) return state;
                    return { categories: [...state.categories, ...missing] };
                });
            },
        }),
        {
            name: STORAGE_NAME,
            version: STORAGE_VERSION,
            partialize: (state) => ({
                records: state.records,
                categories: state.categories,
            }),
            migrate: (persistedState, version) => {
                const state = (persistedState ?? {}) as {
                    records?: unknown;
                    categories?: unknown;
                };
                const records = Array.isArray(state.records)
                    ? (state.records.filter(isContestationRecord) as ContestationRecord[])
                    : [];
                // v1 had no categories; seed defaults. v2+ may carry user-added
                // ones — keep them, but make sure every default id is present so
                // a user who deleted a default in a later version (we don't
                // allow this today) still sees a coherent list.
                let categories: CategoryDefinition[];
                if (version === 2 && Array.isArray(state.categories)) {
                    categories = (state.categories.filter(isCategoryDefinition) as CategoryDefinition[]);
                    const ids = new Set(categories.map((c) => c.id));
                    for (const def of DEFAULT_CATEGORIES) {
                        if (!ids.has(def.id)) categories.push(def);
                    }
                } else {
                    categories = DEFAULT_CATEGORIES;
                }
                return { records, categories };
            },
        },
    ),
);

/** Select all records for a given toolId (case-sensitive, same convention as toolId field). */
export const selectRecordsForTool = (
    records: ContestationRecord[],
    toolId: string,
): ContestationRecord[] => records.filter((r) => r.toolId === toolId);

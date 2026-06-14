import type { Collection, DataItem } from '@difference-suite/shared/types';
import {
    EMPTY_USER_FIELDS,
    type DatasheetAuto,
    type DatasheetData,
    type DatasheetUser,
} from './datasheetSchema';

export interface BuildAutoOptions {
    activeEmbeddingModel?: string;
    /**
     * Additional model ids the collection has been touched by — typically
     * harvested from per-item analysisResults provenance (not currently
     * stored, so this is here for completeness; pass [] until WP-4-style
     * per-item provenance is wired).
     */
    extraModels?: string[];
}

const consensusEmbeddingDim = (items: DataItem[]): number | null => {
    const dims = items
        .map((i) => i.embedding?.length)
        .filter((d): d is number => typeof d === 'number' && d > 0);
    if (dims.length === 0) return null;
    const first = dims[0];
    return dims.every((d) => d === first) ? first : null;
};

const timeRange = (items: DataItem[]): { firstTs: number | null; lastTs: number | null } => {
    const stamps = items
        .map((i) => i.metadata?.lastModified)
        .filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
    if (stamps.length === 0) return { firstTs: null, lastTs: null };
    return { firstTs: Math.min(...stamps), lastTs: Math.max(...stamps) };
};

export const buildAutoFields = (
    collection: Collection,
    items: DataItem[],
    opts: BuildAutoOptions = {},
): DatasheetAuto => {
    const counts: Record<string, number> = {};
    for (const item of items) {
        counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    const itemsWithEmbedding = items.filter((i) => Array.isArray(i.embedding) && i.embedding.length > 0);
    const models = new Set<string>(opts.extraModels ?? []);
    if (opts.activeEmbeddingModel && itemsWithEmbedding.length > 0) {
        models.add(opts.activeEmbeddingModel);
    }
    // __APP_COMMIT__ / __APP_VERSION__ injected by Vite (see vite.config.ts).
    const appCommit = typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'dev';
    const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined;

    return {
        name: collection.name,
        description: collection.description,
        exportedAt: Date.now(),
        appCommit,
        appVersion,
        totalItems: items.length,
        itemCountsByType: counts,
        hasEmbeddings: itemsWithEmbedding.length > 0,
        embeddingCount: itemsWithEmbedding.length,
        embeddingDim: consensusEmbeddingDim(items),
        sourceFileSamples: items.slice(0, 10).map((i) => i.name),
        collectionTimeRange: timeRange(items),
        activeEmbeddingModel: opts.activeEmbeddingModel,
        modelsUsed: Array.from(models).sort(),
    };
};

export const buildDatasheet = (
    collection: Collection,
    items: DataItem[],
    user: DatasheetUser = EMPTY_USER_FIELDS,
    autoOpts: BuildAutoOptions = {},
): DatasheetData => ({
    auto: buildAutoFields(collection, items, autoOpts),
    user: { ...EMPTY_USER_FIELDS, ...user },
});

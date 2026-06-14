import type { Collection, DataItem } from '@difference-suite/shared/types';
import type { DatasheetData } from './datasheetSchema';
import { renderDatasheetMarkdown } from './datasheetMarkdown';

export const DATASET_BUNDLE_SCHEMA = 'difference-suite-dataset@1' as const;

export interface ManifestItem {
    id: string;
    name: string;
    type: string;
    metadata?: Record<string, unknown>;
    hasEmbedding: boolean;
    embeddingDim?: number;
}

export interface BundleProvenance {
    appCommit: string;
    appVersion?: string;
    activeEmbeddingModel?: string;
    models: string[];
}

export interface DatasetBundle {
    schema: typeof DATASET_BUNDLE_SCHEMA;
    exported: number;
    appCommit: string;
    appVersion?: string;
    collection: {
        id: string;
        name: string;
        description?: string;
        created: number;
    };
    datasheet: {
        fields: DatasheetData;
        markdown: string;
    };
    manifest: {
        items: ManifestItem[];
    };
    embeddings?: Record<string, number[]>;
    provenance: BundleProvenance;
    // NOTE: raw item files (images, audio, original docs) are never embedded
    // in this JSON, even when the user opts in to including them. Base64-ing
    // hundreds of MB of binary into a single JSON would be unusable. The
    // export UI handles opted-in raw files as separate file downloads, one
    // per item — see DatasetExportModal.
}

export interface BuildBundleArgs {
    collection: Collection;
    items: DataItem[];
    datasheet: DatasheetData;
}

const buildManifestItem = (item: DataItem): ManifestItem => ({
    id: item.id,
    name: item.name,
    type: item.type,
    metadata: item.metadata,
    hasEmbedding: Array.isArray(item.embedding) && item.embedding.length > 0,
    embeddingDim:
        Array.isArray(item.embedding) && item.embedding.length > 0
            ? item.embedding.length
            : undefined,
});

const collectEmbeddings = (items: DataItem[]): Record<string, number[]> | undefined => {
    const out: Record<string, number[]> = {};
    let any = false;
    for (const item of items) {
        if (Array.isArray(item.embedding) && item.embedding.length > 0) {
            out[item.id] = item.embedding;
            any = true;
        }
    }
    return any ? out : undefined;
};

export const buildBundle = ({ collection, items, datasheet }: BuildBundleArgs): DatasetBundle => {
    const embeddings = collectEmbeddings(items);
    const markdown = renderDatasheetMarkdown(datasheet);

    const provenance: BundleProvenance = {
        appCommit: datasheet.auto.appCommit,
        appVersion: datasheet.auto.appVersion,
        activeEmbeddingModel: datasheet.auto.activeEmbeddingModel,
        models: datasheet.auto.modelsUsed,
    };

    return {
        schema: DATASET_BUNDLE_SCHEMA,
        exported: datasheet.auto.exportedAt,
        appCommit: datasheet.auto.appCommit,
        appVersion: datasheet.auto.appVersion,
        collection: {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            created: collection.created,
        },
        datasheet: { fields: datasheet, markdown },
        manifest: { items: items.map(buildManifestItem) },
        ...(embeddings ? { embeddings } : {}),
        provenance,
    };
};

// ----- Filename helpers ----------------------------------------------------

const slugify = (s: string): string =>
    s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64) || 'collection';

const isoDate = (ts: number = Date.now()): string => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const bundleFilename = (collection: Collection, ts: number = Date.now()): string =>
    `dataset-${slugify(collection.name)}-${isoDate(ts)}.json`;

export const datasheetFilename = (collection: Collection, ts: number = Date.now()): string =>
    `dataset-${slugify(collection.name)}-${isoDate(ts)}.md`;

export const rawFilename = (item: DataItem): string => {
    const safeBase = slugify(item.name.replace(/\.[^.]+$/, ''));
    const ext = item.name.includes('.') ? item.name.slice(item.name.lastIndexOf('.')) : '';
    return `${item.id}-${safeBase}${ext}`;
};

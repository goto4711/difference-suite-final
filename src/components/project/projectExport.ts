import { getBlob } from '@difference-suite/shared/utils/blobStore';
import type { DataItem } from '@difference-suite/shared/types';
import {
    PROJECT_FILE_SCHEMA,
    type ProjectFile,
    type ProjectMediaEntry,
} from './projectSchema';
import { useContestationStore } from '../../stores/contestationStore';
import { useSuiteStore } from '@difference-suite/shared/stores/suiteStore';

const isBinaryItem = (item: Pick<DataItem, 'type'>): boolean =>
    item.type === 'image' || item.type === 'audio';

/**
 * Mirror suiteStore.toPersistedItem: blank binary content and drop rawFile.
 * The raw bytes (if any) travel separately in the project's `media` map.
 */
const toExportItem = (item: DataItem): DataItem => ({
    ...item,
    content: isBinaryItem(item)
        ? ''
        : typeof item.content === 'string'
            ? item.content
            : '',
    rawFile: undefined,
});

const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsDataURL(blob);
    });

/**
 * Rough size estimate (in bytes) of the media payload, for the modal's
 * "~X MB" hint. Uses item.metadata.size (already on every DataItem) summed
 * across binary items, with a 1.33× factor for base64 inflation.
 */
export const estimateMediaBytes = (items: DataItem[]): number => {
    let raw = 0;
    for (const item of items) {
        if (!isBinaryItem(item)) continue;
        const size = item.metadata?.size;
        if (typeof size === 'number' && Number.isFinite(size)) raw += size;
    }
    return Math.round(raw * 1.33);
};

export interface BuildProjectFileOptions {
    includeMedia: boolean;
    description?: string;
}

/**
 * Assemble a project file from the live Zustand stores. Reads media bytes
 * from IndexedDB (blobStore) when includeMedia is true. Falls back to
 * `rawFile` on the in-memory DataItem if blobStore returns null — useful
 * for an export done immediately after a fresh upload that hasn't been
 * persisted yet.
 */
export const buildProjectFile = async (
    opts: BuildProjectFileOptions,
): Promise<ProjectFile> => {
    const suite = useSuiteStore.getState();
    const contestation = useContestationStore.getState();

    const exportItems = suite.dataset.map(toExportItem);
    const binaryItems = suite.dataset.filter(isBinaryItem);

    let media: Record<string, ProjectMediaEntry> | undefined;
    if (opts.includeMedia && binaryItems.length > 0) {
        media = {};
        for (const item of binaryItems) {
            let blob: Blob | null = await getBlob(item.id).catch(() => null);
            if (!blob && item.rawFile instanceof File) {
                blob = item.rawFile;
            }
            if (!blob) continue;
            const dataUrl = await blobToDataUrl(blob);
            media[item.id] = {
                name: item.name,
                mimeType: item.metadata?.mimeType ?? blob.type ?? 'application/octet-stream',
                dataUrl,
            };
        }
    }

    const appCommit = typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'dev';
    const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined;

    return {
        schema: PROJECT_FILE_SCHEMA,
        exported: Date.now(),
        appCommit,
        ...(appVersion ? { appVersion } : {}),
        meta: {
            description: opts.description,
            includesMedia: opts.includeMedia && !!media,
            itemCount: exportItems.length,
            binaryItemCount: binaryItems.length,
            ...(media ? { mediaBytes: estimateMediaBytes(suite.dataset) } : {}),
        },
        suite: {
            collections: suite.collections,
            dataset: exportItems,
            textEmbeddingModel: suite.textEmbeddingModel,
            asrModel: suite.asrModel,
            embeddingModelVersion: suite.embeddingModelVersion,
        },
        ...(media ? { media } : {}),
        contestation: {
            records: contestation.records,
            categories: contestation.categories,
        },
    };
};

const isoDate = (ts: number = Date.now()): string => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const projectFilename = (ts: number = Date.now()): string =>
    `difference-suite-project-${isoDate(ts)}.json`;

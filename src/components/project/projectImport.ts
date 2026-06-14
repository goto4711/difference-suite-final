import { saveBlob } from '@difference-suite/shared/utils/blobStore';
import type { DataItem } from '@difference-suite/shared/types';
import { useSuiteStore } from '@difference-suite/shared/stores/suiteStore';
import { useContestationStore } from '../../stores/contestationStore';
import { isProjectFile, type ProjectFile } from './projectSchema';

/** Decode a `data:<mime>;base64,XXX` URL to a Blob. */
const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};

export const parseProjectFile = (text: string): ProjectFile => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        throw new Error(
            `Could not parse project file as JSON: ${e instanceof Error ? e.message : String(e)}`,
        );
    }
    if (!isProjectFile(parsed)) {
        throw new Error(
            'Not a valid Difference Suite project file (schema difference-suite-project@1).',
        );
    }
    return parsed;
};

export interface ImportResult {
    restoredItems: number;
    restoredCollections: number;
    restoredContestations: number;
    restoredCategories: number;
    mediaRestored: number;
    mediaMissing: number;
}

/**
 * Replace the current session with the contents of a project file. Writes
 * binary blobs back into IndexedDB, rebuilds in-memory DataItems with fresh
 * blob URLs, and applies suite + contestation state verbatim.
 *
 * Caller is responsible for confirming destructive intent with the user;
 * this function unconditionally clears existing state.
 */
export const importProjectFile = async (file: ProjectFile): Promise<ImportResult> => {
    const suite = useSuiteStore.getState();
    const contestation = useContestationStore.getState();

    // 1) Clear the existing session — clearDataset also wipes persisted
    // binaries from IndexedDB, so an import does not leave the previous
    // session's blobs taking up storage.
    suite.clearDataset();
    contestation.clear();

    // 2) Restore binary blobs first so persisted state and in-memory DataItems
    // are consistent before any UI re-render queries them.
    const items = file.suite.dataset;
    const media = file.media ?? {};
    let mediaRestored = 0;
    let mediaMissing = 0;
    const restoredItems: DataItem[] = [];

    for (const item of items) {
        const entry = media[item.id];
        if (entry) {
            try {
                const blob = await dataUrlToBlob(entry.dataUrl);
                await saveBlob(item.id, blob);
                const blobUrl = URL.createObjectURL(blob);
                const rawFile = new File([blob], entry.name, {
                    type: entry.mimeType,
                    lastModified: item.metadata?.lastModified ?? Date.now(),
                });
                restoredItems.push({ ...item, content: blobUrl, rawFile });
                mediaRestored++;
            } catch (e) {
                console.warn(`[projectImport] Failed to restore media for ${item.id}:`, e);
                restoredItems.push({ ...item, rawFile: undefined });
                mediaMissing++;
            }
        } else {
            // Binary items without media (e.g. metadata-only export) restore
            // without content — the existing UI already handles missing-blob
            // items the same way it handles items whose blob was evicted.
            if (item.type === 'image' || item.type === 'audio') {
                mediaMissing++;
            }
            restoredItems.push({ ...item, rawFile: undefined });
        }
    }

    // 3) Apply suite state. Use the store's actions where possible so any
    // side effects (e.g. embedding wipe on model switch) fire correctly.
    suite.setTextEmbeddingModel(file.suite.textEmbeddingModel);
    suite.setAsrModel(file.suite.asrModel);
    if (file.suite.embeddingModelVersion !== null) {
        suite.setEmbeddingModelVersion(file.suite.embeddingModelVersion);
    }

    // Install collections and dataset directly. setState bypasses
    // persistBinaryItems on dataset, which is what we want — we already
    // saved the blobs above with the correct ids.
    useSuiteStore.setState({
        collections: file.suite.collections,
        dataset: restoredItems,
    });

    // 4) Apply contestation state verbatim — preserve original ids/ts/provenance.
    useContestationStore.setState({
        records: file.contestation.records,
        categories: file.contestation.categories,
    });

    return {
        restoredItems: restoredItems.length,
        restoredCollections: file.suite.collections.length,
        restoredContestations: file.contestation.records.length,
        restoredCategories: file.contestation.categories.length,
        mediaRestored,
        mediaMissing,
    };
};

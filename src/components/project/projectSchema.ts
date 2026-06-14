// Portable session file: corpus item metadata + collections + contestations
// (records + user category definitions) + suite settings + (optional) raw
// media. Designed so a workshop facilitator can hand participants a ready-
// made session that restores in one import.
//
// Distinct from the WP-5 dataset bundle:
//   - WP-5 bundle = a documented, shareable dataset (datasheet + manifest,
//     raw files opt-in OFF, designed for citation / publication).
//   - Project file (this) = a restorable session (everything by default,
//     opt-OUT for media when the corpus is large), designed for workshops.

import type { Collection, DataItem } from '@difference-suite/shared/types';
import type {
    CategoryDefinition,
    ContestationRecord,
} from '../../stores/contestationStore';

export const PROJECT_FILE_SCHEMA = 'difference-suite-project@1' as const;

export interface ProjectFileMeta {
    description?: string;
    includesMedia: boolean;
    itemCount: number;
    binaryItemCount: number;
    /** Sum of raw blob sizes when includesMedia is true. Useful for context. */
    mediaBytes?: number;
}

export interface ProjectMediaEntry {
    name: string;
    mimeType: string;
    /** Base64 `data:` URL of the original file bytes. */
    dataUrl: string;
}

export interface ProjectFile {
    schema: typeof PROJECT_FILE_SCHEMA;
    exported: number;
    appCommit: string;
    appVersion?: string;
    meta: ProjectFileMeta;
    suite: {
        collections: Collection[];
        /**
         * DataItems with binary `content` stripped and `rawFile` removed —
         * the same shape that suiteStore persists into localStorage. Binary
         * payloads (when present) live in the sibling `media` map.
         */
        dataset: DataItem[];
        textEmbeddingModel: string;
        asrModel: string;
        embeddingModelVersion: string | null;
    };
    media?: Record<string, ProjectMediaEntry>;
    contestation: {
        records: ContestationRecord[];
        categories: CategoryDefinition[];
    };
}

// ----- Runtime validators -------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object';

const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === 'string');

const isMediaEntry = (v: unknown): v is ProjectMediaEntry =>
    isObject(v) &&
    typeof v.name === 'string' &&
    typeof v.mimeType === 'string' &&
    typeof v.dataUrl === 'string';

const isCollection = (v: unknown): v is Collection =>
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.created === 'number';

const isDataItem = (v: unknown): v is DataItem =>
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.type === 'string';

const isCategoryDefinition = (v: unknown): boolean =>
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.color === 'string';

const isContestationRecordShape = (v: unknown): boolean =>
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.ts === 'number' &&
    typeof v.toolId === 'string' &&
    typeof v.route === 'string' &&
    typeof v.outputSummary === 'string' &&
    typeof v.category === 'string' &&
    typeof v.note === 'string';

export const isProjectFile = (value: unknown): value is ProjectFile => {
    if (!isObject(value)) return false;
    if (value.schema !== PROJECT_FILE_SCHEMA) return false;
    if (typeof value.exported !== 'number') return false;
    if (typeof value.appCommit !== 'string') return false;

    const meta = value.meta as unknown;
    if (!isObject(meta)) return false;
    if (typeof meta.includesMedia !== 'boolean') return false;
    if (typeof meta.itemCount !== 'number') return false;
    if (typeof meta.binaryItemCount !== 'number') return false;

    const suite = value.suite as unknown;
    if (!isObject(suite)) return false;
    if (!Array.isArray(suite.collections) || !suite.collections.every(isCollection)) return false;
    if (!Array.isArray(suite.dataset) || !suite.dataset.every(isDataItem)) return false;
    if (typeof suite.textEmbeddingModel !== 'string') return false;
    if (typeof suite.asrModel !== 'string') return false;
    if (suite.embeddingModelVersion !== null && typeof suite.embeddingModelVersion !== 'string') return false;

    const contestation = value.contestation as unknown;
    if (!isObject(contestation)) return false;
    if (!Array.isArray(contestation.records) || !contestation.records.every(isContestationRecordShape)) return false;
    if (!Array.isArray(contestation.categories) || !contestation.categories.every(isCategoryDefinition)) return false;

    if (value.media !== undefined) {
        if (!isObject(value.media)) return false;
        for (const v of Object.values(value.media)) {
            if (!isMediaEntry(v)) return false;
        }
    }

    // Sanity: meta says includesMedia but no media object (or vice versa) is
    // a soft inconsistency we tolerate — meta is descriptive, not authoritative.
    void isStringArray;
    return true;
};

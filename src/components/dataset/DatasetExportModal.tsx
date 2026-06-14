import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, X } from 'lucide-react';
import { useSuiteStore } from '@difference-suite/shared/stores/suiteStore';
import type { Collection, DataItem } from '@difference-suite/shared/types';
import {
    EMPTY_USER_FIELDS,
    type DatasheetUser,
} from './datasheetSchema';
import { buildDatasheet } from './datasheetBuilder';
import { renderDatasheetMarkdown } from './datasheetMarkdown';
import {
    buildBundle,
    bundleFilename,
    datasheetFilename,
    rawFilename,
} from './bundleBuilder';

interface DatasetExportModalProps {
    collection: Collection;
    items: DataItem[];
    open: boolean;
    onClose: () => void;
}

const downloadBlob = (content: BlobPart, mimeType: string, filename: string): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    queueMicrotask(() => URL.revokeObjectURL(url));
};

const FIELD_LABELS: Record<keyof DatasheetUser, { label: string; hint: string }> = {
    motivation: { label: 'Motivation', hint: 'Why was this dataset created?' },
    fundingAndContext: { label: 'Funding & context', hint: 'Project, grant, institutional context' },
    sensitiveContentNote: { label: 'Sensitive content', hint: 'Anything a downstream user should know up-front?' },
    peopleDepictedNote: { label: 'People depicted', hint: 'Are people identifiable? Did they consent?' },
    collectionMethod: { label: 'Collection method', hint: 'Where did items come from? How were they captured?' },
    recruitmentEthics: { label: 'Recruitment & ethics', hint: 'For human-derived data: consent, IRB, vulnerable groups' },
    preprocessingNotes: { label: 'Preprocessing', hint: 'Cleaning, labelling, transformations' },
    intendedUses: { label: 'Intended uses', hint: 'What is this dataset for?' },
    knownNonUses: { label: 'Known non-uses', hint: 'What should it NOT be used for?' },
    license: { label: 'Licence', hint: 'SPDX id (e.g. CC-BY-4.0) or free text' },
    maintainerContact: { label: 'Maintainer contact', hint: 'Email, handle, or institution' },
    hostingPlan: { label: 'Hosting plan', hint: 'Where / how long will this dataset live?' },
    knownBiases: { label: 'Known biases', hint: '' },
    limitations: { label: 'Limitations', hint: '' },
};

const DatasetExportModal = ({ collection, items, open, onClose }: DatasetExportModalProps) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const textEmbeddingModel = useSuiteStore((s) => s.textEmbeddingModel);

    const [user, setUser] = useState<DatasheetUser>(EMPTY_USER_FIELDS);
    const [includeRaw, setIncludeRaw] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        const dlg = dialogRef.current;
        if (!dlg) return;
        if (open && !dlg.open) dlg.showModal?.();
        if (!open && dlg.open) dlg.close?.();
    }, [open]);

    const datasheet = useMemo(
        () =>
            buildDatasheet(collection, items, user, {
                activeEmbeddingModel: textEmbeddingModel,
            }),
        [collection, items, user, textEmbeddingModel],
    );

    const previewMarkdown = useMemo(() => renderDatasheetMarkdown(datasheet), [datasheet]);

    const setField = (key: keyof DatasheetUser, value: string) =>
        setUser((u) => ({ ...u, [key]: value }));

    const handleDownloadBundle = () => {
        const bundle = buildBundle({ collection, items, datasheet });
        downloadBlob(
            JSON.stringify(bundle, null, 2),
            'application/json',
            bundleFilename(collection, bundle.exported),
        );
        if (includeRaw) {
            // Raw files are intentionally NOT base64-bundled into the JSON —
            // that would balloon a single file to hundreds of MB for any
            // image-heavy collection. Instead we trigger one download per
            // item with a small stagger so the browser doesn't batch-block.
            // Browser pop-up blockers may still throttle this; the user is
            // warned in the modal's checkbox label.
            const downloadable = items.filter((i) => i.rawFile instanceof File);
            downloadable.forEach((item, idx) => {
                const file = item.rawFile;
                if (!(file instanceof File)) return;
                setTimeout(() => {
                    const url = URL.createObjectURL(file);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = rawFilename(item);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    queueMicrotask(() => URL.revokeObjectURL(url));
                }, idx * 250);
            });
        }
    };

    const handleDownloadDatasheet = () => {
        downloadBlob(
            previewMarkdown,
            'text/markdown;charset=utf-8',
            datasheetFilename(collection, datasheet.auto.exportedAt),
        );
    };

    const rawFileCount = items.filter((i) => i.rawFile instanceof File).length;

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            className="p-0 rounded-lg shadow-xl border border-gray-200 bg-white w-[min(880px,95vw)] max-h-[90vh] backdrop:bg-black/40"
            onClick={(e) => {
                if (e.target === dialogRef.current) onClose();
            }}
        >
            <div className="flex flex-col max-h-[90vh]">
                <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-main">
                            Export "{collection.name}" as dataset
                        </h2>
                        <p className="text-[11px] text-text-muted mt-0.5">
                            Produces a Datasheets-for-Datasets-style document plus a JSON manifest
                            and (when present) computed embeddings. Local only — no upload.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 text-text-muted hover:text-main rounded p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    <section className="bg-gray-50 border border-gray-200 rounded p-3 text-[11px] text-text-muted font-mono">
                        <div>{datasheet.auto.totalItems} items · embeddings: {datasheet.auto.hasEmbeddings ? `${datasheet.auto.embeddingCount} of ${datasheet.auto.totalItems} (dim ${datasheet.auto.embeddingDim ?? 'mixed'})` : 'none'}</div>
                        <div>commit {datasheet.auto.appCommit}{datasheet.auto.appVersion ? ` · v${datasheet.auto.appVersion}` : ''}{datasheet.auto.activeEmbeddingModel ? ` · embedding model: ${datasheet.auto.activeEmbeddingModel}` : ''}</div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(Object.keys(FIELD_LABELS) as (keyof DatasheetUser)[]).map((key) => {
                            const { label, hint } = FIELD_LABELS[key];
                            return (
                                <label key={key} className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                                        {label}
                                    </span>
                                    <textarea
                                        value={user[key]}
                                        onChange={(e) => setField(key, e.target.value)}
                                        rows={key === 'license' ? 1 : 2}
                                        placeholder={hint}
                                        className="deep-input text-xs resize-y"
                                    />
                                </label>
                            );
                        })}
                    </div>

                    <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
                        <input
                            type="checkbox"
                            checked={includeRaw}
                            onChange={(e) => setIncludeRaw(e.target.checked)}
                            className="mt-0.5"
                        />
                        <div className="text-xs">
                            <span className="font-bold text-amber-800">
                                Include raw item files ({rawFileCount} available)
                            </span>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                                Off by default. Raw files may contain personal data; they are NOT
                                bundled into the JSON. When enabled, each raw file is offered as a
                                separate download (your browser may need to allow multiple
                                downloads from this page).
                            </p>
                        </div>
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowPreview((v) => !v)}
                        className="text-xs font-bold text-main"
                    >
                        {showPreview ? 'Hide' : 'Show'} datasheet preview
                    </button>
                    {showPreview && (
                        <pre className="text-[11px] bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap max-h-[40vh] overflow-y-auto font-mono">
                            {previewMarkdown}
                        </pre>
                    )}
                </div>

                <footer className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={handleDownloadBundle}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-main hover:bg-main-hover rounded"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download bundle (.json)
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadDatasheet}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-main border border-main/30 hover:bg-main/5 rounded"
                        title="Just the datasheet — use as the README.md of a HuggingFace dataset repo"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Datasheet only (.md)
                    </button>
                    <span className="text-[11px] text-text-muted ml-auto">
                        Bundle = datasheet + manifest{datasheet.auto.hasEmbeddings ? ' + embeddings' : ''} + provenance
                    </span>
                </footer>
            </div>
        </dialog>
    );
};

export default DatasetExportModal;

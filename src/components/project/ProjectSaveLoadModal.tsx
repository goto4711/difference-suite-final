import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, FolderOpen, Save, X } from 'lucide-react';
import { useSuiteStore } from '@difference-suite/shared/stores/suiteStore';
import { useContestationStore } from '../../stores/contestationStore';
import {
    buildProjectFile,
    estimateMediaBytes,
    projectFilename,
} from './projectExport';
import { importProjectFile, parseProjectFile, type ImportResult } from './projectImport';

type Tab = 'save' | 'open';

interface Props {
    open: boolean;
    onClose: () => void;
    initialTab?: Tab;
}

const formatBytes = (n: number): string => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const downloadBlob = (content: string, mimeType: string, filename: string) => {
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

const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
        reader.readAsText(file);
    });

const ProjectSaveLoadModal = ({ open, onClose, initialTab = 'save' }: Props) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const dataset = useSuiteStore((s) => s.dataset);
    const collections = useSuiteStore((s) => s.collections);
    const records = useContestationStore((s) => s.records);

    const [tab, setTab] = useState<Tab>(initialTab);
    const [includeMedia, setIncludeMedia] = useState(true);
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    useEffect(() => {
        const dlg = dialogRef.current;
        if (!dlg) return;
        if (open && !dlg.open) dlg.showModal?.();
        if (!open && dlg.open) dlg.close?.();
    }, [open]);

    useEffect(() => {
        if (open) {
            setTab(initialTab);
            setImportError(null);
            setImportResult(null);
        }
    }, [open, initialTab]);

    const binaryItemCount = useMemo(
        () => dataset.filter((i) => i.type === 'image' || i.type === 'audio').length,
        [dataset],
    );

    const estimatedMediaBytes = useMemo(() => estimateMediaBytes(dataset), [dataset]);

    const hasSessionData =
        dataset.length > 0 || collections.length > 0 || records.length > 0;

    const handleSave = async () => {
        setBusy(true);
        try {
            const file = await buildProjectFile({ includeMedia, description: description.trim() || undefined });
            downloadBlob(
                JSON.stringify(file),
                'application/json',
                projectFilename(file.exported),
            );
            onClose();
        } catch (e) {
            console.error('[ProjectSaveLoad] save failed', e);
            window.alert(`Could not save project: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    const handleOpenFile = async (file: File) => {
        setBusy(true);
        setImportError(null);
        setImportResult(null);
        try {
            const text = await readFileAsText(file);
            const project = parseProjectFile(text);
            if (hasSessionData) {
                const ok = window.confirm(
                    'Replace your current session with the imported project? Your current data will be lost. Save the current project first if you want to keep it.',
                );
                if (!ok) return;
            }
            const result = await importProjectFile(project);
            setImportResult(result);
        } catch (e) {
            setImportError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            className="p-0 rounded-lg shadow-xl border border-gray-200 bg-white w-[min(640px,95vw)] max-h-[90vh] backdrop:bg-black/40"
            onClick={(e) => {
                if (e.target === dialogRef.current) onClose();
            }}
        >
            <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100">
                <div>
                    <h2 className="text-base font-bold text-main">Project</h2>
                    <p className="text-[11px] text-text-muted mt-0.5">
                        Save your whole session as a single JSON file, or open one a facilitator handed you.
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

            <div className="flex gap-1 px-5 pt-3 border-b border-gray-100">
                <button
                    type="button"
                    onClick={() => setTab('save')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t ${tab === 'save' ? 'bg-main text-white' : 'text-text-muted hover:text-main'}`}
                >
                    <Save className="w-3.5 h-3.5 inline mr-1.5" /> Save
                </button>
                <button
                    type="button"
                    onClick={() => setTab('open')}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t ${tab === 'open' ? 'bg-main text-white' : 'text-text-muted hover:text-main'}`}
                >
                    <FolderOpen className="w-3.5 h-3.5 inline mr-1.5" /> Open
                </button>
            </div>

            <div className="px-5 py-4 space-y-4">
                {tab === 'save' && (
                    <>
                        <section className="bg-gray-50 border border-gray-200 rounded p-3 text-[11px] text-text-muted font-mono space-y-0.5">
                            <div>{dataset.length} items · {collections.length} collections · {records.length} contestations</div>
                            <div>{binaryItemCount} binary item{binaryItemCount === 1 ? '' : 's'} (image/audio){binaryItemCount > 0 ? ` · ~${formatBytes(estimatedMediaBytes)} if media included` : ''}</div>
                        </section>

                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                                Description (optional)
                            </span>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                                placeholder="e.g. AI-literacy workshop session, 2026-06-15"
                                className="deep-input text-sm"
                            />
                        </label>

                        <label className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded">
                            <input
                                type="checkbox"
                                checked={includeMedia}
                                onChange={(e) => setIncludeMedia(e.target.checked)}
                                className="mt-0.5"
                            />
                            <div className="text-xs">
                                <span className="font-bold">
                                    Include media ({binaryItemCount} file{binaryItemCount === 1 ? '' : 's'}, ~{formatBytes(estimatedMediaBytes)})
                                </span>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                    On by default — a project is a restorable session. Turn off to produce a
                                    small metadata-only file (participants will see items but not their
                                    images/audio until they re-upload).
                                </p>
                            </div>
                        </label>

                        <footer className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-main hover:bg-main-hover rounded disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {busy ? 'Saving…' : 'Save project'}
                            </button>
                            <span className="text-[11px] text-text-muted">
                                Single JSON file — no upload, stays on this machine.
                            </span>
                        </footer>
                    </>
                )}

                {tab === 'open' && (
                    <>
                        {hasSessionData && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    Opening a project <strong>replaces</strong> your current session
                                    ({dataset.length} items, {records.length} contestations). Save first
                                    if you want to keep it.
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={busy}
                            className="w-full p-6 border-2 border-dashed border-gray-300 rounded text-center hover:border-main hover:bg-main/5 transition-colors"
                        >
                            <FolderOpen className="w-8 h-8 mx-auto text-text-muted mb-2" />
                            <div className="text-sm font-bold text-text">Choose a project file</div>
                            <div className="text-[11px] text-text-muted">
                                <code>difference-suite-project-*.json</code>
                            </div>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                if (f) void handleOpenFile(f);
                            }}
                        />

                        {importError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                <strong>Import failed.</strong> {importError}
                            </div>
                        )}

                        {importResult && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800 space-y-0.5">
                                <div>
                                    <strong>Project loaded.</strong>
                                </div>
                                <div>
                                    {importResult.restoredItems} items · {importResult.restoredCollections} collections ·{' '}
                                    {importResult.restoredContestations} contestations ·{' '}
                                    {importResult.restoredCategories} categories
                                </div>
                                <div className="text-green-700">
                                    Media: {importResult.mediaRestored} restored
                                    {importResult.mediaMissing > 0 ? `, ${importResult.mediaMissing} missing` : ''}.
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </dialog>
    );
};

export default ProjectSaveLoadModal;

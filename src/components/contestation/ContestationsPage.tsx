import { useMemo, useState } from 'react';
import { Download, FileText, MessageSquareWarning, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import {
    useContestationStore,
    type CategoryDefinition,
    type ContestationRecord,
} from '../../stores/contestationStore';
import {
    buildHtmlPacket,
    buildJsonPacket,
    htmlPacketFilename,
    packetFilename,
} from './exportPacket';
import { chipStyle, lookupCategory } from './categoryStyle';

const formatTs = (ts: number) => new Date(ts).toLocaleString();

const downloadBlob = (content: string, mimeType: string, filename: string): void => {
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

const RecordCard = ({
    record,
    categories,
    onRemove,
}: {
    record: ContestationRecord;
    categories: CategoryDefinition[];
    onRemove: (id: string) => void;
}) => {
    const def = lookupCategory(record.category, categories);
    return (
        <article className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <header className="flex flex-wrap items-center gap-2 mb-2">
                <span
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
                    style={chipStyle(def.color)}
                >
                    {def.label}
                </span>
                <span className="text-[11px] font-bold text-main">{record.toolId}</span>
                <span className="text-[11px] text-text-muted">· {formatTs(record.ts)}</span>
                {record.author && (
                    <span className="text-[11px] font-bold text-text">— {record.author}</span>
                )}
                <button
                    type="button"
                    onClick={() => onRemove(record.id)}
                    className="ml-auto text-text-muted hover:text-red-600 p-1 rounded"
                    title="Delete this contestation"
                    aria-label={`Delete contestation from ${formatTs(record.ts)}`}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <div className="space-y-2 min-w-0">
                    <div>
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                            Contested output
                        </h4>
                        <pre className="mt-1 whitespace-pre-wrap break-words text-xs bg-gray-50 border border-gray-100 rounded p-2 font-sans">
                            {record.outputSummary}
                        </pre>
                    </div>
                    <div>
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                            Dissent
                        </h4>
                        <pre className="mt-1 whitespace-pre-wrap break-words text-sm text-text bg-white border border-gray-100 rounded p-2 font-sans">
                            {record.note}
                        </pre>
                    </div>
                </div>
                {record.settings && Object.keys(record.settings).length > 0 && (
                    <div className="md:w-48">
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                            Settings
                        </h4>
                        <ul className="mt-1 text-[11px] font-mono bg-gray-50 border border-gray-100 rounded p-2 space-y-0.5">
                            {Object.entries(record.settings).map(([k, v]) => (
                                <li key={k} className="flex justify-between gap-2">
                                    <span className="text-text-muted truncate">{k}</span>
                                    <span className="text-text">{String(v)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            {record.provenance && (
                <footer className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-text-muted font-mono">
                    <span>{record.route}</span>
                    <span className="opacity-50">·</span>
                    <span>commit {record.provenance.appCommit}</span>
                    {record.provenance.models && record.provenance.models.length > 0 && (
                        <>
                            <span className="opacity-50">·</span>
                            <span>models: {record.provenance.models.join(', ')}</span>
                        </>
                    )}
                </footer>
            )}
            {!record.provenance && (
                <footer className="mt-2 text-[10px] text-text-muted font-mono">{record.route}</footer>
            )}
        </article>
    );
};

const ALL = '__all__';

const ManageCategoriesPanel = () => {
    const categories = useContestationStore((s) => s.categories);
    const records = useContestationStore((s) => s.records);
    const addCategory = useContestationStore((s) => s.addCategory);
    const renameCategory = useContestationStore((s) => s.renameCategory);
    const setCategoryColor = useContestationStore((s) => s.setCategoryColor);
    const removeCategory = useContestationStore((s) => s.removeCategory);
    const restoreDefaultCategories = useContestationStore((s) => s.restoreDefaultCategories);

    const [open, setOpen] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newColor, setNewColor] = useState('#0f766e');
    const [removeError, setRemoveError] = useState<string | null>(null);

    const usageById = useMemo(() => {
        const map = new Map<string, number>();
        for (const r of records) {
            map.set(r.category, (map.get(r.category) ?? 0) + 1);
        }
        return map;
    }, [records]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLabel.trim()) return;
        addCategory({ label: newLabel, color: newColor });
        setNewLabel('');
    };

    const handleRemove = (def: CategoryDefinition) => {
        const result = removeCategory(def.id);
        if (result.ok) {
            setRemoveError(null);
            return;
        }
        if (result.reason === 'is-default') {
            setRemoveError(
                `"${result.categoryLabel}" is a default category — defaults can't be removed.`,
            );
        } else if (result.reason === 'in-use') {
            setRemoveError(
                `${result.usageCount} contestation${result.usageCount === 1 ? '' : 's'} use "${result.categoryLabel}". ` +
                    `Reassign or delete them first — a contestation's category is part of the recorded dissent and isn't rewritten automatically.`,
            );
        } else {
            setRemoveError('Category not found.');
        }
    };

    return (
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                aria-expanded={open}
            >
                <div>
                    <h2 className="text-sm font-bold text-main uppercase tracking-wider">
                        Manage categories
                    </h2>
                    <p className="text-[11px] text-text-muted mt-0.5">
                        Add your own kinds of dissent. Defaults stay; custom categories travel inside exported packets.
                    </p>
                </div>
                <span className="text-xs font-bold text-main">{open ? 'Hide' : 'Show'}</span>
            </button>
            {open && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
                    <ul className="space-y-2">
                        {categories.map((c) => {
                            const usage = usageById.get(c.id) ?? 0;
                            const blocked = c.isDefault || usage > 0;
                            return (
                                <li
                                    key={c.id}
                                    className="flex flex-wrap items-center gap-2 border border-gray-100 rounded p-2"
                                >
                                    <span
                                        className="inline-block w-5 h-5 rounded border border-gray-200"
                                        style={{ backgroundColor: c.color }}
                                        aria-hidden
                                    />
                                    <input
                                        type="color"
                                        value={c.color}
                                        onChange={(e) => setCategoryColor(c.id, e.target.value)}
                                        className="w-7 h-7 border border-gray-200 rounded p-0 cursor-pointer"
                                        title="Change colour"
                                        aria-label={`Change colour for ${c.label}`}
                                    />
                                    <input
                                        type="text"
                                        value={c.label}
                                        onChange={(e) => renameCategory(c.id, e.target.value)}
                                        maxLength={32}
                                        className="deep-input text-sm flex-1 min-w-[8rem]"
                                        aria-label={`Label for ${c.id}`}
                                    />
                                    <code className="text-[10px] text-text-muted font-mono">{c.id}</code>
                                    {c.isDefault && (
                                        <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                                            default
                                        </span>
                                    )}
                                    {usage > 0 && (
                                        <span className="text-[10px] text-text-muted">used by {usage}</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(c)}
                                        disabled={blocked}
                                        title={
                                            c.isDefault
                                                ? "Default categories can't be removed"
                                                : usage > 0
                                                  ? `In use by ${usage} contestation${usage === 1 ? '' : 's'}`
                                                  : 'Remove this category'
                                        }
                                        className="p-1 text-text-muted hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        aria-label={`Remove category ${c.label}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {removeError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                            <span className="flex-1">{removeError}</span>
                            <button
                                type="button"
                                onClick={() => setRemoveError(null)}
                                className="text-red-700"
                                aria-label="Dismiss"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                                New category
                            </span>
                            <input
                                type="text"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value.slice(0, 32))}
                                placeholder="e.g. Misattribution"
                                className="deep-input text-sm"
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                                Colour
                            </span>
                            <input
                                type="color"
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                                className="w-10 h-9 border border-gray-200 rounded p-0 cursor-pointer"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={!newLabel.trim()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-main hover:bg-main-hover rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add
                        </button>
                        <button
                            type="button"
                            onClick={() => restoreDefaultCategories()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-main border border-main/30 hover:bg-main/5 rounded ml-auto"
                            title="Re-add any missing default categories"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore defaults
                        </button>
                    </form>
                </div>
            )}
        </section>
    );
};

const ContestationsPage = () => {
    const records = useContestationStore((s) => s.records);
    const remove = useContestationStore((s) => s.remove);
    const clear = useContestationStore((s) => s.clear);
    const categories = useContestationStore((s) => s.categories);

    const [toolFilter, setToolFilter] = useState<string>(ALL);
    const [categoryFilter, setCategoryFilter] = useState<string>(ALL);

    const tools = useMemo(() => {
        const set = new Set<string>();
        for (const r of records) set.add(r.toolId);
        return Array.from(set).sort();
    }, [records]);

    const filtered = useMemo(() => {
        return records.filter((r) => {
            if (toolFilter !== ALL && r.toolId !== toolFilter) return false;
            if (categoryFilter !== ALL && r.category !== categoryFilter) return false;
            return true;
        });
    }, [records, toolFilter, categoryFilter]);

    const handleExportJson = () => {
        const packet = buildJsonPacket(records, categories);
        downloadBlob(
            JSON.stringify(packet, null, 2),
            'application/json',
            packetFilename(),
        );
    };

    const handleExportHtml = () => {
        const html = buildHtmlPacket(records, categories);
        downloadBlob(html, 'text/html;charset=utf-8', htmlPacketFilename());
    };

    const handleClear = () => {
        if (records.length === 0) return;
        const ok = window.confirm(
            `Delete all ${records.length} contestations? Export first if you want to keep them.`,
        );
        if (ok) clear();
    };

    return (
        <div className="flex flex-col gap-4">
            <header className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-main/10 text-main rounded-lg border border-main/20">
                            <MessageSquareWarning className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-main">Contestations</h1>
                            <p className="text-sm text-text-muted max-w-2xl mt-1">
                                When a tool's output strikes you as wrong, unfair, or missing
                                something — say so. Your dissent is recorded on this machine
                                only, and you can export it to bring to the discussion.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleExportJson}
                            disabled={records.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-main hover:bg-main-hover rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export the collaboration-interchange JSON packet"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export JSON
                        </button>
                        <button
                            type="button"
                            onClick={handleExportHtml}
                            disabled={records.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-main border border-main/30 hover:bg-main/5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export a self-contained printable HTML packet"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Export HTML
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={records.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear all
                        </button>
                    </div>
                </div>
            </header>

            <ManageCategoriesPanel />

            {records.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
                    <MessageSquareWarning className="w-12 h-12 mx-auto text-text-muted opacity-30" />
                    <h2 className="mt-3 text-base font-bold text-text">No contestations yet</h2>
                    <p className="mt-1 text-sm text-text-muted max-w-lg mx-auto">
                        Open any tool, click "Contest this" near an output that strikes you as
                        wrong, unfair, or missing something. Your dissent will appear here.
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-wrap items-center gap-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                            Filter
                        </span>
                        <label className="flex items-center gap-2 text-xs">
                            <span className="text-text-muted">Tool</span>
                            <select
                                value={toolFilter}
                                onChange={(e) => setToolFilter(e.target.value)}
                                className="deep-input text-xs py-1"
                            >
                                <option value={ALL}>All tools</option>
                                {tools.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                            <span className="text-text-muted">Category</span>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="deep-input text-xs py-1"
                            >
                                <option value={ALL}>All categories</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <span className="ml-auto text-[11px] text-text-muted">
                            {filtered.length} of {records.length} shown
                        </span>
                    </div>

                    <div className="space-y-3">
                        {filtered.length === 0 ? (
                            <p className="text-sm text-text-muted italic text-center py-8">
                                No contestations match the current filter.
                            </p>
                        ) : (
                            filtered.map((r) => (
                                <RecordCard
                                    key={r.id}
                                    record={r}
                                    categories={categories}
                                    onRemove={remove}
                                />
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ContestationsPage;

import { useMemo, useState } from 'react';
import { Download, FileText, MessageSquareWarning, Trash2 } from 'lucide-react';
import {
    CONTESTATION_CATEGORIES,
    CONTESTATION_CATEGORY_LABEL,
    useContestationStore,
    type ContestationCategory,
    type ContestationRecord,
} from '../../stores/contestationStore';
import {
    buildHtmlPacket,
    buildJsonPacket,
    htmlPacketFilename,
    packetFilename,
} from './exportPacket';

const CATEGORY_CHIP_CLASS: Record<ContestationCategory, string> = {
    erasure: 'bg-violet-100 text-violet-800 border-violet-200',
    stereotype: 'bg-red-100 text-red-800 border-red-200',
    mislabel: 'bg-amber-100 text-amber-800 border-amber-200',
    disagreement: 'bg-sky-100 text-sky-800 border-sky-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200',
};

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
    // Revoke after the click handler returns so the browser has the URL ready.
    queueMicrotask(() => URL.revokeObjectURL(url));
};

const RecordCard = ({
    record,
    onRemove,
}: {
    record: ContestationRecord;
    onRemove: (id: string) => void;
}) => (
    <article className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <header className="flex flex-wrap items-center gap-2 mb-2">
            <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${CATEGORY_CHIP_CLASS[record.category]}`}
            >
                {CONTESTATION_CATEGORY_LABEL[record.category]}
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
        <footer className="mt-2 text-[10px] text-text-muted font-mono">{record.route}</footer>
    </article>
);

const ALL = '__all__';

const ContestationsPage = () => {
    const records = useContestationStore((s) => s.records);
    const remove = useContestationStore((s) => s.remove);
    const clear = useContestationStore((s) => s.clear);

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
        const packet = buildJsonPacket(records);
        downloadBlob(
            JSON.stringify(packet, null, 2),
            'application/json',
            packetFilename(),
        );
    };

    const handleExportHtml = () => {
        const html = buildHtmlPacket(records);
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
                                {CONTESTATION_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {CONTESTATION_CATEGORY_LABEL[c]}
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
                                <RecordCard key={r.id} record={r} onRemove={remove} />
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ContestationsPage;

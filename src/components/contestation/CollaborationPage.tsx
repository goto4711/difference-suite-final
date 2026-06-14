import { useMemo, useRef, useState } from 'react';
import {
    AlertTriangle,
    Download,
    FileText,
    Trash2,
    Upload,
    Users,
} from 'lucide-react';
import {
    getPacketCategories,
    isContestationPacket,
    mergeRecords,
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
import {
    buildMatrix,
    buildThresholdSpread,
    deriveParticipantLabel,
    matrixKey,
    type Participant,
} from './workshopHelpers';
import {
    chipStyle,
    isCustomCategory,
    lookupCategory,
    mergeCategoryDefs,
    solidStyle,
} from './categoryStyle';

const PARTICIPANT_COLORS = [
    '#dc2626', // red
    '#0369a1', // blue
    '#15803d', // green
    '#7c3aed', // violet
    '#d97706', // amber
    '#0891b2', // cyan
    '#be185d', // pink
    '#525252', // gray
];

const participantColor = (index: number): string =>
    PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];

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

interface ImportError {
    filename: string;
    message: string;
}

const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
        reader.readAsText(file);
    });

interface ImportedPacket {
    id: string;
    filename: string;
    records: ContestationRecord[];
    label: string;
    /** Categories embedded in the source packet; null for v1 packets. */
    categories: CategoryDefinition[] | null;
}

const ThresholdSpreadView = ({ participants }: { participants: Participant[] }) => {
    const rows = useMemo(() => buildThresholdSpread(participants), [participants]);
    const participantIndex = useMemo(() => {
        const map = new Map<string, number>();
        participants.forEach((p, i) => map.set(p.id, i));
        return map;
    }, [participants]);

    if (rows.length === 0) {
        return (
            <p className="text-xs text-text-muted italic">
                No contestations with a numeric threshold are shared across participants yet.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {rows.map((row) => (
                <div key={`${row.toolId}::${row.outputSummary}`} className="bg-white border border-gray-200 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-main">
                            {row.toolId}
                        </span>
                        <span className="text-[11px] text-text-muted truncate" title={row.outputSummary}>
                            {row.outputSummary}
                        </span>
                    </div>
                    <div className="relative h-10 bg-gradient-to-r from-green-50 via-gray-50 to-red-50 border border-gray-200 rounded">
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-text-muted">
                            0.5
                        </span>
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-text-muted">
                            1.0
                        </span>
                        {row.points.map((pt) => {
                            const pct = ((pt.threshold - 0.5) / 0.5) * 100;
                            const color = participantColor(participantIndex.get(pt.participantId) ?? 0);
                            return (
                                <div
                                    key={pt.recordId}
                                    className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                                    style={{ left: `${Math.min(Math.max(pct, 0), 100)}%` }}
                                    title={`${pt.participantLabel}: ${pt.threshold.toFixed(2)}`}
                                >
                                    <div
                                        className="w-3 h-3 rounded-full -translate-x-1/2 border-2 border-white shadow"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span
                                        className="mt-0.5 text-[9px] font-bold whitespace-nowrap -translate-x-1/2"
                                        style={{ color }}
                                    >
                                        {pt.participantLabel}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const ContestationMatrixView = ({
    participants,
    categories,
}: {
    participants: Participant[];
    categories: CategoryDefinition[];
}) => {
    const matrix = useMemo(() => buildMatrix(participants), [participants]);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    if (matrix.tools.length === 0) {
        return (
            <p className="text-xs text-text-muted italic">
                No contestations to chart yet.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="text-xs border-collapse min-w-full">
                <thead>
                    <tr>
                        <th className="text-left p-2 border-b border-gray-200 sticky left-0 bg-white">Tool</th>
                        {matrix.participants.map((p, i) => (
                            <th
                                key={p.id}
                                className="p-2 border-b border-gray-200 text-center"
                                style={{ color: participantColor(i) }}
                            >
                                <span className="font-bold">{p.label}</span>
                                <span className="block text-[9px] font-normal text-text-muted">
                                    ({p.records.length})
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {matrix.tools.map((tool) => (
                        <tr key={tool}>
                            <td className="p-2 border-b border-gray-100 font-bold text-main sticky left-0 bg-white">
                                {tool}
                            </td>
                            {matrix.participants.map((p) => {
                                const key = matrixKey(tool, p.id);
                                const cell = matrix.cells.get(key);
                                const expanded = expandedKey === key;
                                if (!cell) {
                                    return (
                                        <td
                                            key={p.id}
                                            className="p-2 border-b border-gray-100 text-center text-text-muted"
                                        >
                                            ·
                                        </td>
                                    );
                                }
                                return (
                                    <td
                                        key={p.id}
                                        className="p-2 border-b border-gray-100 text-center"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedKey(expanded ? null : key)
                                            }
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-200"
                                            aria-expanded={expanded}
                                            title="Click to show category breakdown"
                                        >
                                            <span className="font-bold">{cell.count}</span>
                                        </button>
                                        {expanded && (
                                            <div className="mt-1 flex flex-wrap gap-1 justify-center">
                                                {Object.entries(cell.categories).map(
                                                    ([catId, n]) => {
                                                        const def = lookupCategory(catId, categories);
                                                        const isCustom = isCustomCategory(def);
                                                        return (
                                                            <span
                                                                key={catId}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white"
                                                                style={{
                                                                    ...solidStyle(def.color),
                                                                    ...(isCustom
                                                                        ? { border: '1px dashed #ffffff80' }
                                                                        : {}),
                                                                }}
                                                                title={
                                                                    isCustom
                                                                        ? `${def.label} (custom)`
                                                                        : def.label
                                                                }
                                                            >
                                                                {def.label}
                                                                <span className="font-bold">{n}</span>
                                                            </span>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const CollaborationPage = () => {
    const localRecords = useContestationStore((s) => s.records);
    const localCategories = useContestationStore((s) => s.categories);

    const [imported, setImported] = useState<ImportedPacket[]>([]);
    const [errors, setErrors] = useState<ImportError[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [includeLocal, setIncludeLocal] = useState(true);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const importedSignature = useMemo(
        () => imported.map((p) => p.id).join('|'),
        [imported],
    );

    const participants = useMemo<Participant[]>(() => {
        const list: Participant[] = imported.map((p) => ({
            id: p.id,
            label: p.label,
            source: 'imported' as const,
            filename: p.filename,
            records: p.records,
        }));
        if (includeLocal && localRecords.length > 0) {
            list.push({
                id: 'local',
                label: 'You (local)',
                source: 'local' as const,
                records: localRecords,
            });
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importedSignature, includeLocal, localRecords]);

    /**
     * Union of category definitions across local + imported packets. Local
     * defs win on id collision so a workshop facilitator's category palette
     * stays consistent; foreign categories that have no embedded definition
     * (v1 packets, or a v2 packet missing the field) fall through to the
     * deterministic hash-colour fallback at render time.
     */
    const mergedCategories = useMemo(() => {
        return mergeCategoryDefs([
            localCategories,
            ...imported.map((p) => p.categories ?? []),
        ]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importedSignature, localCategories]);

    const handleFiles = async (files: FileList | File[]) => {
        const list = Array.from(files);
        if (list.length === 0) return;
        const accepted: ImportedPacket[] = [];
        const rejected: ImportError[] = [];

        for (const file of list) {
            try {
                const text = await readFileAsText(file);
                const parsed: unknown = JSON.parse(text);
                if (!isContestationPacket(parsed)) {
                    rejected.push({
                        filename: file.name,
                        message: 'Not a Difference Suite contestation packet (schema v1 or v2).',
                    });
                    continue;
                }
                accepted.push({
                    id: `${file.name}-${file.lastModified ?? Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    filename: file.name,
                    records: parsed.records,
                    label: deriveParticipantLabel(parsed.records, file.name),
                    categories: getPacketCategories(parsed),
                });
            } catch (err) {
                rejected.push({
                    filename: file.name,
                    message: err instanceof Error ? err.message : 'Could not read file.',
                });
            }
        }

        if (accepted.length > 0) setImported((prev) => [...prev, ...accepted]);
        setErrors(rejected);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        void handleFiles(e.dataTransfer.files);
    };

    const handleRemovePacket = (id: string) => {
        setImported((prev) => prev.filter((p) => p.id !== id));
    };

    const handleClearImports = () => {
        if (imported.length === 0) return;
        setImported([]);
        setErrors([]);
    };

    const mergedRecords = useMemo(() => {
        return mergeRecords(participants.map((p) => p.records));
    }, [participants]);

    const handleExportJson = () => {
        const packet = buildJsonPacket(mergedRecords, mergedCategories);
        downloadBlob(
            JSON.stringify(packet, null, 2),
            'application/json',
            `collaboration-${packetFilename()}`,
        );
    };

    const handleExportHtml = () => {
        const html = buildHtmlPacket(mergedRecords, mergedCategories);
        downloadBlob(html, 'text/html;charset=utf-8', `collaboration-${htmlPacketFilename()}`);
    };

    return (
        <div className="flex flex-col gap-4">
            <header className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-main/10 text-main rounded-lg border border-main/20">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-main">Collaboration</h1>
                        <p className="text-sm text-text-muted max-w-2xl mt-1">
                            Drop in evidence packets from others — classmates, colleagues, workshop participants. Their
                            dissent stays in this browser tab only — imported packets are not
                            persisted. A collaboration is an encounter, not a database.
                        </p>
                    </div>
                </div>
            </header>

            <section
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`bg-white border-2 border-dashed rounded-lg p-6 transition-colors ${isDragging ? 'border-main bg-main/5' : 'border-gray-300'}`}
            >
                <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="w-8 h-8 text-text-muted" />
                    <p className="text-sm font-bold text-text">Drop contestation packets here</p>
                    <p className="text-xs text-text-muted">
                        Accepts <code>contestations-*.json</code> files exported from /contestations.
                    </p>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-main border border-main/30 hover:bg-main/5 rounded"
                    >
                        Choose files…
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) void handleFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />
                </div>
            </section>

            {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs font-bold text-red-700">
                                Couldn't import {errors.length} file{errors.length === 1 ? '' : 's'}.
                            </p>
                            <ul className="mt-1 text-xs text-red-700 space-y-0.5">
                                {errors.map((e) => (
                                    <li key={e.filename}>
                                        <span className="font-mono">{e.filename}</span> — {e.message}
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                onClick={() => setErrors([])}
                                className="mt-1 text-[11px] font-bold text-red-700 underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <header className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h2 className="text-sm font-bold text-main uppercase tracking-wider">
                        Participants ({participants.length})
                    </h2>
                    <div className="flex items-center gap-3 flex-wrap">
                        {localRecords.length > 0 && (
                            <label className="flex items-center gap-2 text-xs text-text-muted">
                                <input
                                    type="checkbox"
                                    checked={includeLocal}
                                    onChange={(e) => setIncludeLocal(e.target.checked)}
                                    className="rounded"
                                />
                                Include my local contestations ({localRecords.length})
                            </label>
                        )}
                        {imported.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearImports}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-red-600 border border-red-200 hover:bg-red-50 rounded"
                                title="Remove all imported packets from this session"
                            >
                                <Trash2 className="w-3 h-3" />
                                Clear all imports
                            </button>
                        )}
                    </div>
                </header>
                {participants.length === 0 ? (
                    <p className="text-xs text-text-muted italic">
                        No participants yet. Import a packet or contest something locally first.
                    </p>
                ) : (
                    <ul className="flex flex-wrap gap-2">
                        {participants.map((p, i) => (
                            <li
                                key={p.id}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs"
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: participantColor(i) }}
                                />
                                <span className="font-bold">{p.label}</span>
                                <span className="text-text-muted">({p.records.length})</span>
                                {p.source === 'imported' && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePacket(p.id)}
                                        className="ml-1 text-text-muted hover:text-red-600"
                                        aria-label={`Remove packet ${p.filename}`}
                                        title="Remove this packet"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h2 className="text-sm font-bold text-main uppercase tracking-wider mb-1">
                    Threshold spread
                </h2>
                <p className="text-[11px] text-text-muted mb-3">
                    Where does the group disagree about where "glitch" begins?
                </p>
                <ThresholdSpreadView participants={participants} />
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h2 className="text-sm font-bold text-main uppercase tracking-wider mb-1">
                    Contestation matrix
                </h2>
                <p className="text-[11px] text-text-muted mb-3">
                    Where in the suite does the group's friction concentrate? Click a cell to
                    see its category breakdown. Categories with a dashed border are custom — added
                    by participants or imported from a packet.
                </p>
                <ContestationMatrixView participants={participants} categories={mergedCategories} />
                {mergedCategories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {mergedCategories.map((def) => (
                            <span
                                key={def.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                                style={chipStyle(def.color)}
                                title={isCustomCategory(def) ? `${def.label} (custom)` : def.label}
                            >
                                <span
                                    className="inline-block w-2 h-2 rounded-full"
                                    style={solidStyle(def.color)}
                                />
                                {def.label}
                            </span>
                        ))}
                    </div>
                )}
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h2 className="text-sm font-bold text-main uppercase tracking-wider mb-1">
                    Combined export
                </h2>
                <p className="text-[11px] text-text-muted mb-3">
                    The group's collective record — all participants' contestations merged
                    and deduplicated by id.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={handleExportJson}
                        disabled={mergedRecords.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-main hover:bg-main-hover rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export combined JSON
                    </button>
                    <button
                        type="button"
                        onClick={handleExportHtml}
                        disabled={mergedRecords.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-main border border-main/30 hover:bg-main/5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Export combined HTML
                    </button>
                    <span className="text-[11px] text-text-muted">
                        {mergedRecords.length} record{mergedRecords.length === 1 ? '' : 's'} after dedup
                    </span>
                </div>
            </section>
        </div>
    );
};

export default CollaborationPage;

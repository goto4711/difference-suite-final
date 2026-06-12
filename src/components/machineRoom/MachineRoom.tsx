import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Cog, Trash2, ExternalLink } from 'lucide-react';
import ToolLayout from '../shared/ToolLayout';
import { useMachineRoomStore, selectSessionCounts } from '../../stores/machineRoomStore';
import { narrateEvent } from '../../utils/machineNarrator';
import { transformersClient } from '../../core/inference/TransformersClient';
import { MODEL_REGISTRY, getModelConfig } from '../../core/inference/modelRegistry';
import type { MachineEvent, WorkerStatus } from '../../core/inference/types';

const formatRelativeMs = (ts: number, now: number): string => {
    const delta = Math.max(0, now - ts);
    if (delta < 1000) return 'just now';
    if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
    if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
    return `${Math.floor(delta / 3_600_000)}h ago`;
};

const formatAbsTime = (ts: number): string => new Date(ts).toLocaleTimeString();

const hubLink = (hfPath: string): string => `https://huggingface.co/${hfPath}`;

const detailEntries = (detail: MachineEvent['detail']): Array<[string, string]> => {
    if (!detail) return [];
    return Object.entries(detail).map(([k, v]) => [k, String(v)]);
};

// ── Journal entry ───────────────────────────────────────────────

const JournalEntry = ({ event, now }: { event: MachineEvent; now: number }) => {
    const [open, setOpen] = useState(false);
    const summary = useMemo(() => narrateEvent(event), [event]);
    const entries = detailEntries(event.detail);
    return (
        <li className="border border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <p className="text-sm text-text leading-relaxed">{summary}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-text-muted">
                        <span className="font-bold text-main">{event.kind}</span>
                        {event.toolId && <span>· {event.toolId}</span>}
                        {event.modelId && <span>· {event.modelId}</span>}
                        <span>· {formatRelativeMs(event.ts, now)}</span>
                        <span className="text-gray-400">({formatAbsTime(event.ts)})</span>
                    </div>
                </div>
                {entries.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="shrink-0 inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-main hover:text-main-hover"
                    >
                        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        Detail
                    </button>
                )}
            </div>
            {open && entries.length > 0 && (
                <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs text-text-muted bg-gray-50 p-2 border border-gray-100 font-mono">
                    {entries.map(([k, v]) => (
                        <span key={k} className="contents">
                            <dt className="font-bold text-main">{k}</dt>
                            <dd className="break-all">{v}</dd>
                        </span>
                    ))}
                </dl>
            )}
        </li>
    );
};

// ── Journal feed ────────────────────────────────────────────────

const JournalFeed = () => {
    const events = useMachineRoomStore((s) => s.events);
    const [modelFilter, setModelFilter] = useState<string | null>(null);
    const [toolFilter, setToolFilter] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 5000);
        return () => window.clearInterval(t);
    }, []);

    const models = useMemo(() => {
        const set = new Set<string>();
        for (const e of events) if (e.modelId) set.add(e.modelId);
        return Array.from(set);
    }, [events]);

    const tools = useMemo(() => {
        const set = new Set<string>();
        for (const e of events) if (e.toolId) set.add(e.toolId);
        return Array.from(set);
    }, [events]);

    const filtered = useMemo(() => {
        const matches = (e: MachineEvent) =>
            (!modelFilter || e.modelId === modelFilter) &&
            (!toolFilter || e.toolId === toolFilter);
        return events.filter(matches).slice().reverse();
    }, [events, modelFilter, toolFilter]);

    if (events.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12 gap-3">
                <Cog className="w-10 h-10 text-main/30" />
                <h3 className="text-lg font-bold text-main">The journal is empty.</h3>
                <p className="text-sm text-text-muted max-w-md leading-relaxed">
                    Open any tool and run an analysis. The choices the machine makes
                    on your behalf — which model to load, which precision to use,
                    which engine to run on, what to evict to make room — will
                    appear here in plain language as they happen.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="border-b border-gray-200 bg-white px-4 py-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-text-muted mr-1">Filter:</span>
                {tools.length > 0 && (
                    <select
                        value={toolFilter ?? ''}
                        onChange={(e) => setToolFilter(e.target.value || null)}
                        className="border border-gray-300 px-2 py-1 bg-white"
                        aria-label="Filter by tool"
                    >
                        <option value="">All tools</option>
                        {tools.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                )}
                {models.length > 0 && (
                    <select
                        value={modelFilter ?? ''}
                        onChange={(e) => setModelFilter(e.target.value || null)}
                        className="border border-gray-300 px-2 py-1 bg-white"
                        aria-label="Filter by model"
                    >
                        <option value="">All models</option>
                        {models.map((m) => {
                            let name = m;
                            try { name = getModelConfig(m).name; } catch { /* unregistered */ }
                            return <option key={m} value={m}>{name}</option>;
                        })}
                    </select>
                )}
                {(toolFilter || modelFilter) && (
                    <button
                        type="button"
                        onClick={() => { setToolFilter(null); setModelFilter(null); }}
                        className="text-main underline ml-auto"
                    >
                        Clear
                    </button>
                )}
                <span className="ml-auto text-text-muted">
                    {filtered.length} of {events.length} events
                </span>
            </div>
            <ul className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 custom-scrollbar">
                {filtered.map((e) => (
                    <JournalEntry key={e.id} event={e} now={now} />
                ))}
            </ul>
        </div>
    );
};

// ── Now panel ───────────────────────────────────────────────────

const NowPanel = () => {
    const [status, setStatus] = useState<WorkerStatus | null>(null);
    const [clearing, setClearing] = useState<string | null>(null);
    const events = useMachineRoomStore((s) => s.events);

    const refresh = useCallback(async () => {
        try {
            const s = await transformersClient.getStatus();
            setStatus(s);
        } catch {
            // ignore; widget polls again shortly
        }
    }, []);

    useEffect(() => {
        void refresh();
        const t = window.setInterval(() => void refresh(), 3000);
        return () => window.clearInterval(t);
    }, [refresh]);

    const loadedAtById = useMemo(() => {
        const map = new Map<string, number>();
        for (const e of events) {
            if (e.kind === 'loaded' && e.modelId) map.set(e.modelId, e.ts);
        }
        return map;
    }, [events]);

    const handleClear = async (modelId: string) => {
        if (clearing) return;
        setClearing(modelId);
        try {
            await transformersClient.clearModelCache(modelId);
            await refresh();
        } catch (err) {
            console.error('[MachineRoom] clearModelCache failed:', err);
        } finally {
            setClearing(null);
        }
    };

    const loaded = status?.loadedModels ?? [];

    return (
        <section>
            <header className="px-3 py-2 border-b border-gray-200 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-widest text-main">Now</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Models currently in memory.</p>
            </header>
            <div className="p-3 space-y-3">
                {loaded.length === 0 ? (
                    <p className="text-xs text-text-muted italic">
                        No models loaded. Open a tool and run an analysis.
                    </p>
                ) : (
                    loaded.map((m) => {
                        let cfg;
                        try { cfg = getModelConfig(m.id); } catch { cfg = undefined; }
                        const loadedAt = loadedAtById.get(m.id);
                        const lastUsed = m.lastUsedAt;
                        return (
                            <article key={m.id} className="border border-gray-200 bg-white p-3 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-main truncate">{m.name}</h4>
                                        {cfg && (
                                            <a
                                                href={hubLink(cfg.hfPath)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-main underline"
                                            >
                                                {cfg.hfPath}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleClear(m.id)}
                                        disabled={clearing === m.id}
                                        className="shrink-0 inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-red-700 hover:text-red-900 disabled:opacity-50"
                                        title="Remove this model from this computer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {clearing === m.id ? 'Removing…' : 'Remove'}
                                    </button>
                                </div>
                                <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5 text-[11px]">
                                    <dt className="text-text-muted">Footprint</dt>
                                    <dd>{m.memoryFootprintMB ?? '?'} MB</dd>
                                    <dt className="text-text-muted">Configured device</dt>
                                    <dd>{cfg?.recommendedDevice ?? m.device}</dd>
                                    <dt className="text-text-muted">Effective device</dt>
                                    <dd>{m.effectiveDevice ?? m.device}</dd>
                                    <dt className="text-text-muted">Precision (chosen)</dt>
                                    <dd>{cfg?.quantization ?? '—'}</dd>
                                    {loadedAt && (
                                        <>
                                            <dt className="text-text-muted">Loaded</dt>
                                            <dd>{formatAbsTime(loadedAt)}</dd>
                                        </>
                                    )}
                                    {lastUsed > 0 && (
                                        <>
                                            <dt className="text-text-muted">Last used</dt>
                                            <dd>{formatAbsTime(lastUsed)}</dd>
                                        </>
                                    )}
                                </dl>
                            </article>
                        );
                    })
                )}
                <p className="text-[10px] text-text-muted italic">
                    Configured devices come from the model registry. The effective
                    device reflects whether a WebGPU attempt actually succeeded or
                    fell back to the main processor (WASM).
                </p>
            </div>

            <header className="px-3 py-2 border-t border-b border-gray-200 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-widest text-main">Registry</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Models the suite knows about.</p>
            </header>
            <div className="p-3 grid grid-cols-1 gap-1 text-[11px]">
                {MODEL_REGISTRY.filter((m) => m.enabled).map((m) => {
                    const cached = status?.registryStatus.find((r) => r.id === m.id)?.cached;
                    return (
                        <div key={m.id} className="flex items-center justify-between gap-2">
                            <span className="truncate">{m.name}</span>
                            <span className={`shrink-0 text-[10px] uppercase font-bold ${cached ? 'text-green-700' : 'text-gray-400'}`}>
                                {cached ? 'on disk' : 'not cached'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

// ── Fragility panel ─────────────────────────────────────────────

const FragilityPanel = () => {
    const events = useMachineRoomStore((s) => s.events);
    const counts = useMemo(() => selectSessionCounts(events), [events]);

    const stats: Array<{ label: string; value: number; tone: 'normal' | 'warn' | 'bad' }> = [
        { label: 'Downloads', value: counts.downloads, tone: 'normal' },
        { label: 'Fallbacks', value: counts.fallbacks, tone: counts.fallbacks > 0 ? 'warn' : 'normal' },
        { label: 'Evictions', value: counts.evictions, tone: 'normal' },
        { label: 'Timeouts', value: counts.timeouts, tone: counts.timeouts > 0 ? 'bad' : 'normal' },
        { label: 'Crashes', value: counts.crashes, tone: counts.crashes > 0 ? 'bad' : 'normal' },
    ];

    const tones = {
        normal: 'text-main',
        warn: 'text-amber-700',
        bad: 'text-red-700',
    } as const;

    return (
        <section>
            <header className="px-3 py-2 border-t border-b border-gray-200 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-widest text-main">Fragility</h3>
                <p className="text-[11px] text-text-muted mt-0.5">This session, so far.</p>
            </header>
            <div className="p-3 grid grid-cols-5 gap-2">
                {stats.map((s) => (
                    <div key={s.label} className="flex flex-col items-center text-center">
                        <span className={`text-2xl font-bold ${tones[s.tone]}`}>{s.value}</span>
                        <span className="text-[10px] uppercase tracking-wide text-text-muted">{s.label}</span>
                    </div>
                ))}
            </div>
            <div className="px-3 pb-3">
                <p className="text-xs text-text-muted leading-relaxed">
                    A model that fails to load, an engine that refuses a graph, a
                    session that stops responding — these are not bugs to hide from
                    you. Deep learning works most of the time, and the rest of the
                    time you should be able to see why it didn't. The counters above
                    are an honest tally of the failures in this session.
                </p>
            </div>
        </section>
    );
};

// ── Page ────────────────────────────────────────────────────────

const MachineRoom = () => {
    const mainContent = (
        <div className="h-full">
            <JournalFeed />
        </div>
    );

    const sideContent = (
        <div>
            <NowPanel />
            <FragilityPanel />
        </div>
    );

    return (
        <ToolLayout
            title="Machine Room"
            subtitle="The engine room — which models are loaded, what was chosen, what failed, in plain language."
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default MachineRoom;

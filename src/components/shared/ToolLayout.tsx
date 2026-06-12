import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Cog } from 'lucide-react';
import { TOOLS } from '../../utils/navigation';
import { useMachineRoomStore, selectEventsForTool } from '../../stores/machineRoomStore';
import { narrateEvent } from '../../utils/machineNarrator';
import type { MachineEvent } from '../../core/inference/types';

interface ToolLayoutProps {
    title: string;
    subtitle?: string;
    status?: string | React.ReactNode;
    mainContent: React.ReactNode;
    sideContent: React.ReactNode;
}

const useCurrentToolId = (): string | undefined => {
    const location = useLocation();
    return useMemo(() => {
        const match = TOOLS.find((t) => t.path === location.pathname);
        return match?.toolId;
    }, [location.pathname]);
};

const formatAbsTime = (ts: number): string => new Date(ts).toLocaleTimeString();

const MachineDrawerEntry = ({ event }: { event: MachineEvent }) => {
    const [open, setOpen] = useState(false);
    const summary = narrateEvent(event);
    const detailEntries = event.detail ? Object.entries(event.detail) : [];
    return (
        <li className="border border-gray-200 bg-white px-3 py-2">
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-text leading-snug">{summary}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                        <span className="font-bold text-main">{event.kind}</span>
                        {event.modelId && <span> · {event.modelId}</span>}
                        <span> · {formatAbsTime(event.ts)}</span>
                    </p>
                </div>
                {detailEntries.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="shrink-0 text-[10px] uppercase tracking-wide text-main hover:text-main-hover"
                    >
                        {open ? 'Hide' : 'Detail'}
                    </button>
                )}
            </div>
            {open && detailEntries.length > 0 && (
                <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5 text-[11px] font-mono text-text-muted bg-gray-50 p-2">
                    {detailEntries.map(([k, v]) => (
                        <span key={k} className="contents">
                            <dt className="font-bold text-main">{k}</dt>
                            <dd className="break-all">{String(v)}</dd>
                        </span>
                    ))}
                </dl>
            )}
        </li>
    );
};

const MachineWorkDrawer = ({ toolId }: { toolId: string }) => {
    const [open, setOpen] = useState(false);
    const events = useMachineRoomStore((s) => s.events);
    const filtered = useMemo(() => selectEventsForTool(events, toolId).slice().reverse(), [events, toolId]);

    // Auto-close on unmount cleanup not needed; collapsed state is local.

    return (
        <div className="mt-3 border-2 border-main bg-white">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs uppercase tracking-wider font-bold text-main hover:bg-main/5"
            >
                <span className="flex items-center gap-2">
                    <Cog className={`w-4 h-4 ${filtered.length > 0 ? '' : 'opacity-50'}`} />
                    Show the machine's work
                    <span className="text-[10px] font-normal text-text-muted normal-case">
                        ({filtered.length} {filtered.length === 1 ? 'event' : 'events'} this session)
                    </span>
                </span>
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {open && (
                <div className="border-t border-gray-200 bg-gray-50 max-h-72 overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-text-muted italic">
                            No events from this tool yet this session. Run an analysis above
                            and the machine's choices will appear here in plain language.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {filtered.map((e) => (
                                <MachineDrawerEntry key={e.id} event={e} />
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

const ToolLayout: React.FC<ToolLayoutProps> = ({
    title,
    subtitle,
    status,
    mainContent,
    sideContent
}) => {
    const toolId = useCurrentToolId();

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
                {/* Big Box (Main Canvas) - 8 Cols */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className="dc-card h-full flex flex-col">
                        <div className="dc-card-header bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-main">{title}</h2>
                                {subtitle && <p className="text-sm text-text-muted font-normal mt-0.5">{subtitle}</p>}
                            </div>
                            {/* Interactive Mode Toggles can go here */}
                        </div>
                        <div className="dc-card-body flex-1 overflow-hidden relative bg-white">
                            {mainContent}
                        </div>
                    </div>
                </div>

                {/* Small Box (Side Controls) - 4 Cols */}
                <div className="lg:col-span-4 flex flex-col">
                    <div className="dc-card h-full flex flex-col">
                        <div className="dc-card-header bg-white">
                            <span className="text-sm uppercase font-bold text-text-muted tracking-wide">Controls & Status</span>
                            {status && (
                                <div className="text-xs font-semibold px-2 py-1 rounded bg-gray-100">
                                    {status}
                                </div>
                            )}
                        </div>
                        <div className="dc-card-body flex-1 overflow-y-auto bg-white custom-scrollbar">
                            {sideContent}
                        </div>
                    </div>
                </div>
            </div>
            {toolId && <MachineWorkDrawer toolId={toolId} />}
        </div>
    );
};

export default ToolLayout;

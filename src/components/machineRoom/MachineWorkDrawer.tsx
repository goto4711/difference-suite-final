import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Cog } from 'lucide-react';
import { useMachineRoomStore, selectEventsForTool } from '../../stores/machineRoomStore';
import { narrateEvent } from '../../utils/machineNarrator';
import type { MachineEvent } from '../../core/inference/types';

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

interface MachineWorkDrawerProps {
    toolId: string;
}

/**
 * Collapsible footer showing the journal filtered to the current tool's events.
 * Reads the same store as the Machine Room page; no duplicated state.
 *
 * Mounted automatically by ToolLayout for tools that use it. Tools with a
 * custom layout (e.g. SemanticOracle) should mount this directly at the
 * bottom of their page so the drawer is available everywhere.
 */
export const MachineWorkDrawer = ({ toolId }: MachineWorkDrawerProps) => {
    const [open, setOpen] = useState(false);
    const events = useMachineRoomStore((s) => s.events);
    const filtered = useMemo(
        () => selectEventsForTool(events, toolId).slice().reverse(),
        [events, toolId],
    );

    // Rendered through a portal as a FIXED bottom status bar. Earlier attempts:
    // (1) in-flow below the tool grid — sat below the fold on short windows
    //     (min-h-[600px] floor); (2) position:sticky — only sticks while its
    //     parent container intersects the viewport, so it parked mid-page once
    //     the user scrolled past the tool grid. position:fixed via a body-level
    //     portal escapes every container and transform; the journal expands
    //     UPWARD from the bar so it never leaves the screen.
    return createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-main bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.10)]">
            {open && (
                <div className="border-b border-gray-200 bg-gray-50 max-h-72 overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-text-muted italic">
                            No events from this tool yet this session. Run an analysis above
                            and the machine's choices will appear here in plain language.
                        </p>
                    ) : (
                        <ul className="space-y-2 max-w-5xl mx-auto">
                            {filtered.map((e) => (
                                <MachineDrawerEntry key={e.id} event={e} />
                            ))}
                        </ul>
                    )}
                </div>
            )}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-xs uppercase tracking-wider font-bold text-main hover:bg-main/5"
            >
                <span className="flex items-center gap-2">
                    <Cog className={`w-4 h-4 ${filtered.length > 0 ? '' : 'opacity-50'}`} />
                    Show the machine's work
                    <span className="text-[10px] font-normal text-text-muted normal-case">
                        ({filtered.length} {filtered.length === 1 ? 'event' : 'events'} this session)
                    </span>
                </span>
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
        </div>,
        document.body,
    );
};

export default MachineWorkDrawer;

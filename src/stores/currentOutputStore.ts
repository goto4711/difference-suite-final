import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Session-only "what is currently contestable" pointer. NOT persisted: tracks
 * the live output of whatever tool the user is looking at right now, so the
 * global header Contest button has something concrete to attach a record to.
 *
 * Each tool calls `useReportCurrentOutput` after producing a primary result;
 * the helper clears the entry on unmount, so navigating away hides the button.
 */
export interface CurrentOutput {
    toolId: string;
    outputSummary: string;
    settings?: Record<string, string | number>;
    ts: number;
}

interface CurrentOutputState {
    current: CurrentOutput | null;
    setCurrent: (next: Omit<CurrentOutput, 'ts'> | null) => void;
}

export const useCurrentOutputStore = create<CurrentOutputState>((set) => ({
    current: null,
    setCurrent: (next) =>
        set({ current: next ? { ...next, ts: Date.now() } : null }),
}));

interface ReportInput {
    toolId: string;
    outputSummary: string | null | undefined;
    settings?: Record<string, string | number>;
}

/**
 * Publish the calling tool's current output to the global store. Pass an
 * empty/nullish `outputSummary` to clear (e.g. while loading or after reset).
 * Cleans up on unmount so the header button only appears while a tool with a
 * live output is mounted.
 */
export const useReportCurrentOutput = ({
    toolId,
    outputSummary,
    settings,
}: ReportInput): void => {
    useEffect(() => {
        const set = useCurrentOutputStore.getState().setCurrent;
        if (outputSummary && outputSummary.trim()) {
            set({ toolId, outputSummary, settings });
        } else {
            set(null);
        }
        return () => {
            // If this tool was the last writer, clear on unmount.
            const cur = useCurrentOutputStore.getState().current;
            if (cur && cur.toolId === toolId) {
                useCurrentOutputStore.getState().setCurrent(null);
            }
        };
        // Settings is a plain object; stringify to avoid spurious re-runs.
    }, [toolId, outputSummary, JSON.stringify(settings ?? {})]);
};

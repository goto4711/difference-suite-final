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
    /**
     * Registry model ids the contesting tool actually invoked to produce the
     * displayed output. Snapshotted at publish-time and carried straight to
     * the contestation record's provenance.models — do NOT re-read at
     * contest-time, which would lose accuracy if the user changed the active
     * embedding model after the output was already on screen.
     *
     * Tools with no registered model (Discontinuity Detector, Threshold
     * Adjuster, Deep Time, Compromise.js-only path in Networked Narratives)
     * omit this field rather than pass a placeholder.
     */
    models?: string[];
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
    models?: string[];
}

/**
 * Publish the calling tool's current output to the global store. Pass an
 * empty/nullish `outputSummary` to clear (e.g. while loading or after reset).
 * Cleans up on unmount so the header button only appears while a tool with a
 * live output is mounted.
 *
 * `models` (optional): see CurrentOutput.models — a publish-time snapshot of
 * the registry model ids the tool invoked. For the active embedding model
 * (`useSuiteStore.s.textEmbeddingModel`), read it reactively in the tool
 * and pass it here; if the user later switches embeddings, the next publish
 * carries the new id and any cached embeddings are wiped (WP-1 Phase 2), so
 * a stale contest target cannot survive a model switch.
 */
export const useReportCurrentOutput = ({
    toolId,
    outputSummary,
    settings,
    models,
}: ReportInput): void => {
    useEffect(() => {
        const set = useCurrentOutputStore.getState().setCurrent;
        if (outputSummary && outputSummary.trim()) {
            set({ toolId, outputSummary, settings, models });
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
        // Settings/models are plain values; stringify to avoid spurious re-runs.
    }, [toolId, outputSummary, JSON.stringify(settings ?? {}), JSON.stringify(models ?? [])]);
};

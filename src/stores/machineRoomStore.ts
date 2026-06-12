import { create } from 'zustand';
import type { MachineEvent, MachineEventKind } from '../core/inference/types';

/**
 * Session-only ring buffer of machine-room decision-journal events.
 *
 * NOT persisted: events are operational telemetry for the current page session.
 * The buffer caps at MAX_EVENTS so it cannot grow unbounded during a long session.
 */
const MAX_EVENTS = 300;

export interface SessionCounts {
  downloads: number;
  fallbacks: number;
  evictions: number;
  timeouts: number;
  crashes: number;
}

interface MachineRoomState {
  events: MachineEvent[];
  pushEvent: (event: MachineEvent) => void;
  clear: () => void;
}

export const useMachineRoomStore = create<MachineRoomState>((set) => ({
  events: [],
  pushEvent: (event) =>
    set((state) => {
      const next = state.events.length >= MAX_EVENTS
        ? [...state.events.slice(state.events.length - MAX_EVENTS + 1), event]
        : [...state.events, event];
      return { events: next };
    }),
  clear: () => set({ events: [] }),
}));

/** Filter events by tool id (case-insensitive). */
export const selectEventsForTool = (events: MachineEvent[], toolId: string): MachineEvent[] => {
  const needle = toolId.toLowerCase();
  return events.filter((e) => e.toolId && e.toolId.toLowerCase() === needle);
};

/** Group events by model id, in insertion order. */
export const selectEventsByModel = (events: MachineEvent[]): Map<string, MachineEvent[]> => {
  const groups = new Map<string, MachineEvent[]>();
  for (const e of events) {
    if (!e.modelId) continue;
    const list = groups.get(e.modelId);
    if (list) list.push(e);
    else groups.set(e.modelId, [e]);
  }
  return groups;
};

const FALLBACK_KINDS: MachineEventKind[] = ['device-fallback'];
const EVICTION_KINDS: MachineEventKind[] = ['evicted'];
const DOWNLOAD_KINDS: MachineEventKind[] = ['download'];
const TIMEOUT_KINDS: MachineEventKind[] = ['watchdog-timeout'];
const CRASH_KINDS: MachineEventKind[] = ['worker-crash'];

/** Count the user-facing "fragility" indicators across the current session. */
export const selectSessionCounts = (events: MachineEvent[]): SessionCounts => {
  const counts: SessionCounts = {
    downloads: 0,
    fallbacks: 0,
    evictions: 0,
    timeouts: 0,
    crashes: 0,
  };
  for (const e of events) {
    if (DOWNLOAD_KINDS.includes(e.kind)) counts.downloads++;
    if (FALLBACK_KINDS.includes(e.kind)) counts.fallbacks++;
    if (EVICTION_KINDS.includes(e.kind)) counts.evictions++;
    if (TIMEOUT_KINDS.includes(e.kind)) counts.timeouts++;
    if (CRASH_KINDS.includes(e.kind)) counts.crashes++;
  }
  return counts;
};

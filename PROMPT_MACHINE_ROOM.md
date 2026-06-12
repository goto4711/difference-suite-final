# Standalone Prompt — The Machine Room: a decision journal and narration layer

Self-contained task. Purpose: the Difference Suite (an AI-literacy app for the DEEP CULTURE ERC project) runs all inference locally and already makes deep learning *inspectable*. This task makes the machine's *decisions* visible: which model was chosen, at what precision, on which device, what was evicted, what failed and fell back — narrated in plain language for non-experts. Pedagogically this implements the project's goal of exposing "the qualitative decisions made to enable the quantifications."

The codebase: React + TS, Vite, npm workspaces (`packages/shared`), inference in a web worker. Key files: `src/core/inference/TransformersManager.ts` (model lifecycle: registry-driven loading, dtype/device selection, WebGPU→WASM fallback with `effectiveDevice`, LRU eviction `MAX_LOADED_MODELS=3` + `isLargeModel` evict-all, thread cap, 120 s watchdog, `ModelRegistry` cache checks, `clearModelCache`), `src/core/inference/TransformersClient.ts` (typed worker protocol, inactivity timeouts, crash recovery), `src/core/inference/modelRegistry.ts`, `src/components/shared/ToolLayout.tsx` (shared layout used by all tools), `packages/shared/src/stores/suiteStore.ts` (zustand + persist), nav registry in `src/utils/navigation.ts` (routes are generated from it).

## Part 1 — Machine events (the decision journal)

Define a `MachineEvent` type in `src/core/inference/types.ts`:

```ts
type MachineEvent = {
  id: string;            // uuid
  ts: number;
  toolId?: string;       // request.tool when applicable
  modelId?: string;
  kind: 'load-requested' | 'cache-check' | 'download' | 'dtype-chosen' | 'device-chosen'
      | 'device-fallback' | 'threads-capped' | 'evicted' | 'loaded' | 'inference-start'
      | 'inference-done' | 'watchdog-timeout' | 'worker-crash' | 'worker-restart' | 'cache-cleared';
  summary: string;       // ONE plain-language sentence, no jargon (see narration register below)
  detail?: Record<string, string | number | boolean>; // technical facts for the expandable view
};
```

Instrument `TransformersManager` (and `TransformersClient` for crash/restart events) to emit these at every existing decision point — the hooks already exist, this is logging, not new logic:

- load requested (which tool asked for which model and why-by-name), cache hit vs download (bytes + duration; `ModelRegistry` provides file metadata), dtype chosen (include the registry's configured dtype AND the alternatives from `get_available_dtypes` in `detail` — "chosen q8 from [fp32, fp16, q8, q4]"), device chosen, WebGPU→WASM fallback (include the original error message), thread cap applied (cores found, threads used), eviction (victim, reason: LRU vs large-model, age), inference start/done (duration, input modality, output shape e.g. "384 numbers"), watchdog timeout, crash/restart.
- Transport: new worker message `{ type: 'machine-event', data: MachineEvent }`, added to the existing `WorkerMessage` union. The client forwards events to a listener; events must never block or throw (wrap emission in try/catch).
- Client side: new `src/stores/machineRoomStore.ts` (zustand, NOT persisted — session-only): ring buffer of the last 300 events, plus derived state (events grouped by model, by tool, counts of fallbacks/crashes this session). The `TransformersClient` singleton pushes into it.

## Part 2 — Narration register (the plain-language layer)

Create `src/utils/machineNarrator.ts`: pure functions mapping each event kind + detail to its `summary` sentence. This is the pedagogical heart — write these with care, in the voice of honest explanation, not marketing. Examples of the register wanted:

- download: "Fetching the 'BGE Small' model — 110 MB, compressed to a quarter of its original precision so it fits in your browser."
- dtype-chosen: "Chose the q8 version: less precise than the original, 4× smaller. Someone made this trade-off for you."
- device-fallback: "Your graphics card refused this model, so it runs on the main processor instead — slower, same mathematics."
- evicted: "Removed 'CLIP' from memory to make room. Your browser can only hold 3 models at once."
- inference-done: "Turned your sentence into 384 numbers in 0.4 seconds. Everything that follows is arithmetic on these numbers."
- watchdog-timeout: "The model stopped responding and was shut down. Deep learning is fragile; this is what failure looks like."

Keep sentences ≤ 25 words, no acronyms without gloss, never anthropomorphize beyond plain verbs (chose/fetched/removed). Unit-test the narrator: every event kind produces a non-empty summary; details interpolate correctly. (Vitest is already set up.)

## Part 3 — The Machine Room page

New route `/machine-room`, registered in the nav registry (`src/utils/navigation.ts`) under Main Menu (it is not one of the keyword tools — it is the suite's engine room; suggested icon: `Cog` or `Server` from lucide). Reuse `ToolLayout`. Three sections:

1. **Now**: currently loaded models as cards — name, provenance (hfPath as a Hub link + author org), parameters/size, configured vs *effective* device, chosen dtype with the alternatives listed, time loaded, last used. Source: existing `getStatus()` (`loadedModels`, `registryStatus`) joined with the event store. Include a per-model "remove from this computer" button wired to the existing `clearModelCache`.
2. **Journal**: live narrated event feed (newest first), each entry: plain sentence + timestamp + expandable technical detail. Filter chips by model and by tool. Empty state explains what will appear here and invites the user to go run a tool.
3. **Fragility**: session counters — downloads, fallbacks, evictions, timeouts, crashes — with one short paragraph (static copy) explaining why breakdowns are part of the pedagogy, not bugs to hide. Keep the copy modest; the PI can rewrite it later.

## Part 4 — Narration drawer in every tool

In `ToolLayout` (root app copy), add an optional collapsible footer drawer titled "Show the machine's work", default collapsed, which displays the journal filtered to the *current tool's* events from the *current session* (match on `toolId`). Because every tool already passes a `tool` field in its inference requests, no per-tool changes should be needed — verify the `tool` strings used by each tool component and normalize any that are missing or inconsistent. The drawer and the Machine Room read the same store; no duplicated state.

## Part 5 — Small epistemic-honesty touch-up (5 minutes)

In the attention-analysis tool's UI (`DeepVectorMirror`'s AttentionLens and the Deep Time attention view if it shares the badge): change the "Simulated" badge text to "Embedding similarity — real attention weights pending Transformers.js v4 support", and add a `// TODO(transformers.js v4 output_attentions)` comment at the fallback in `src/core/inference/handlers/attentionAnalysis.ts` so the placeholder is findable when the library catches up. Do not rename the tool or change its computation.

## Constraints

- Event emission must be fire-and-forget: zero impact on inference correctness; a narrator bug must never break a tool (try/catch around emission and rendering).
- Ring buffer capped (300); no persistence of events; no user content in events (never log prompt text or image data — only shapes, sizes, durations, model ids).
- Don't modify `gemma-suite` in this task; if `ToolLayout` lives in `packages/shared`, add the drawer behind an optional prop so gemma-suite is unaffected.
- `tsc` clean, eslint no new errors, narrator unit tests green, both apps build.
- One commit per part.

## Acceptance

- Run Semantic Oracle cold-cache: Machine Room shows load-requested → download (with size) → dtype-chosen (with alternatives) → device decision → loaded → inference-done, all in plain language with expandable detail.
- Trigger the WebGPU fallback or a watchdog timeout (force an error if needed in dev): both narrated in the Fragility section.
- Open Deep Vector Mirror, run an analysis, open "Show the machine's work": only that tool's events appear.
- The Machine Room appears in the sidebar and survives navigation (events are not lost between pages within a session).

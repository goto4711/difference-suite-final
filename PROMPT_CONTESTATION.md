# Standalone Prompt — Contestation: dissent, evidence packets, and workshop mode

Self-contained task. The Difference Suite (DEEP CULTURE ERC project) lets users *inspect* deep learning; this task lets them *talk back*. Theoretical frame (one sentence): the suite should be a "public thing" in Bonnie Honig's sense — contestable, with disagreement that leaves a trace — not just a viewer. Everything below must work with **zero backend**: the suite is local-first by political design, so contestation data lives in the browser and travels as exported files.

Existing infrastructure to reuse: zustand stores with `persist` (see `packages/shared/src/stores/suiteStore.ts` for the pattern), the Machine Room event store + `MachineWorkDrawer` (`src/components/machineRoom/`), `MAIN_MENU_EXTRAS` in `src/utils/navigation.ts` (how Machine Room registered its route), and `ToolLayout`.

## Part 1 — The Contest button and annotation store

1. New store `src/stores/contestationStore.ts` (zustand + persist to localStorage, version 1):

```ts
interface ContestationRecord {
  id: string;            // uuid
  ts: number;
  toolId: string;        // same ids the Machine Room uses
  route: string;
  outputSummary: string; // tool-provided plain-text description of what is being contested
  category: 'erasure' | 'stereotype' | 'mislabel' | 'disagreement' | 'other';
  note: string;          // the user's dissent, free text, required, max 1000 chars
  settings?: Record<string, string | number>; // optional tool-state snapshot (e.g. threshold: 0.8)
  author?: string;       // optional initials/pseudonym — NO accounts, NO email
}
```

Actions: add, remove, clear, plus selectors by tool. Persist everything (these are the user's records; unlike machine events they must survive reloads).

2. New component `src/components/contestation/ContestButton.tsx`: a small, quiet button ("Contest this") that opens a compact dialog: category select, note textarea, optional initials field, shows the `outputSummary` it will attach to. On save: writes to the store, brief confirmation. Must work keyboard-only and not steal focus aggressively.

3. Mount it next to the primary output in five tools to start (each passes its own `outputSummary` and `settings`):
   - **GlitchDetector** (image mode): summary = "{imageName} scored {confidence}% normality at threshold {t} → {verdict}"; settings = { threshold }.
   - **VisualStoryteller**: summary = the literal caption + the imagined story (truncated).
   - **ImaginationInspector**: one button per generated card (summary = profession, adjective, CLIP-perceived tags with margins) AND one on the Void Report (summary = present/absent/ambiguous distribution).
   - **SemanticOracle**: summary = prompt + generated answer (truncated 500 chars).
   - **DeepVectorMirror**: summary = item name + active noise/context settings.

## Part 2 — The Contestations page and evidence packets

New route `/contestations` registered via `MAIN_MENU_EXTRAS` (icon suggestion: `MessageSquareWarning` or `Flag`). Sections:

1. **Ledger**: all records, newest first, filter by tool and category, delete per record. Each shows note, category chip, output summary, settings, author initials, timestamp.
2. **Export evidence packet**: two buttons —
   - **JSON**: machine-readable, schema-versioned (`{ schema: 'difference-suite-contestations@1', exported: ts, records: [...] }`), filename `contestations-{date}.json`. This is also the workshop interchange format.
   - **HTML**: a single self-contained printable file (inline CSS, no external assets) titled "Evidence packet — Difference Suite", grouping records by tool, suitable for handing to a seminar leader or appending to coursework. Generate via a template string, download via Blob URL (and revoke it after).
3. Empty state explains the feature's purpose in one short paragraph (the PI will rewrite; keep the substance: "When a tool's output strikes you as wrong, unfair, or missing something — say so. Your dissent is recorded on this machine only, and you can export it to bring to the discussion.")

## Part 3 — Workshop mode: divergence made visible

New route `/workshop` (also `MAIN_MENU_EXTRAS`). Zero-server group comparison via file exchange:

1. **Import**: drag-and-drop (or file picker) for multiple `contestations-*.json` packets. Validate schema; reject others with a friendly error. Each packet becomes a "participant" (label = author initials if present, else filename).
2. **Divergence views** (keep both simple):
   - **Threshold spread**: for records carrying a `settings.threshold`, a horizontal strip per contested item showing each participant's chosen threshold as a labeled dot on the 0.5–1.0 axis — the group's disagreement about where "glitch" begins, in one picture.
   - **Contestation matrix**: rows = tools, columns = participants, cells = count of contestations, with category-colored chips on hover/expand. Shows where in the suite the group's friction concentrates.
3. **Combined export**: merge all imported packets plus the local store into one JSON/HTML packet (deduplicate by record id) — the workshop's collective record.
4. Imported packets live in component state only (not persisted) — a workshop is an event, not a database.

## Constraints

- No backend, no network calls, no analytics. The only I/O is file download/upload initiated by the user.
- Notes are user-authored free text: render as text (no HTML injection), and never truncate them in exports.
- Don't touch the worker protocol or inference layer. Reuse the suite's existing visual language (cards, borders, palette) — no new design system.
- gemma-suite untouched (use the same optional-prop pattern as the Machine Room if anything shared changes).
- `tsc` clean, eslint no new errors, both apps build. Vitest: store actions, packet export shape, packet import validation (accepts v1 schema, rejects malformed), and dedup-by-id on merge.
- One commit per part. Update the technical overview doc's feature list.

## Acceptance

- Run the Glitch Detector, contest a verdict with a note and initials; reload the page: the record survives; it appears in /contestations filtered correctly.
- Export JSON and HTML; the HTML opens standalone in a fresh tab with no console errors and prints sensibly.
- In /workshop, import two packets (create a second by changing initials and re-exporting): both participants appear; the threshold spread shows two dots on one axis; combined export contains both sets exactly once.
- A malformed JSON import shows the friendly error and changes nothing.
- Keyboard-only: open Contest dialog, fill, save, without a mouse.

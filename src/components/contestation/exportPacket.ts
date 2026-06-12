import {
    buildPacket,
    CONTESTATION_CATEGORY_LABEL,
    type ContestationCategory,
    type ContestationPacketV1,
    type ContestationRecord,
} from '../../stores/contestationStore';

/** Filename-safe ISO date (YYYY-MM-DD) for export filenames. */
export const isoDate = (ts: number = Date.now()): string => {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const packetFilename = (ts: number = Date.now()): string =>
    `contestations-${isoDate(ts)}.json`;

export const htmlPacketFilename = (ts: number = Date.now()): string =>
    `contestations-${isoDate(ts)}.html`;

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const formatDate = (ts: number): string => new Date(ts).toLocaleString();

const groupByTool = (records: ContestationRecord[]): Map<string, ContestationRecord[]> => {
    const groups = new Map<string, ContestationRecord[]>();
    for (const r of records) {
        const list = groups.get(r.toolId);
        if (list) list.push(r);
        else groups.set(r.toolId, [r]);
    }
    return groups;
};

const renderSettings = (settings?: Record<string, string | number>): string => {
    if (!settings) return '';
    const items = Object.entries(settings)
        .map(
            ([k, v]) =>
                `<li><span class="k">${escapeHtml(k)}</span>: <span class="v">${escapeHtml(String(v))}</span></li>`,
        )
        .join('');
    return `<ul class="settings">${items}</ul>`;
};

const CATEGORY_COLORS: Record<ContestationCategory, string> = {
    erasure: '#7c3aed',
    stereotype: '#dc2626',
    mislabel: '#d97706',
    disagreement: '#0369a1',
    other: '#525252',
};

export const renderRecordCard = (record: ContestationRecord): string => {
    const color = CATEGORY_COLORS[record.category];
    const label = CONTESTATION_CATEGORY_LABEL[record.category];
    return `
    <article class="record">
      <header>
        <span class="chip" style="background:${color}">${escapeHtml(label)}</span>
        <span class="ts">${escapeHtml(formatDate(record.ts))}</span>
        ${record.author ? `<span class="author">— ${escapeHtml(record.author)}</span>` : ''}
      </header>
      <section class="summary">
        <h4>Contested output</h4>
        <pre>${escapeHtml(record.outputSummary)}</pre>
      </section>
      <section class="note">
        <h4>Dissent</h4>
        <pre>${escapeHtml(record.note)}</pre>
      </section>
      ${record.settings ? `<section class="settings-block"><h4>Settings</h4>${renderSettings(record.settings)}</section>` : ''}
      <footer><span class="route">${escapeHtml(record.route)}</span></footer>
    </article>`;
};

/**
 * Build a single self-contained HTML document (inline CSS, no external assets).
 * Notes are rendered as escaped text — never as HTML — and are never truncated.
 */
export const buildHtmlPacket = (records: ContestationRecord[]): string => {
    const groups = groupByTool(records);
    const generatedAt = new Date().toLocaleString();
    const totalLine =
        records.length === 0
            ? 'No contestations recorded.'
            : `${records.length} contestation${records.length === 1 ? '' : 's'} across ${groups.size} tool${groups.size === 1 ? '' : 's'}.`;

    const sections = Array.from(groups.entries())
        .map(([toolId, list]) => {
            const sorted = [...list].sort((a, b) => b.ts - a.ts);
            return `
    <section class="tool">
      <h2>${escapeHtml(toolId)} <span class="count">(${sorted.length})</span></h2>
      ${sorted.map(renderRecordCard).join('\n')}
    </section>`;
        })
        .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Evidence packet — Difference Suite</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.5; max-width: 880px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; background: #fafaf9; }
  h1 { font-size: 1.6rem; margin: 0 0 0.25rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; border-bottom: 2px solid #1a1a1a; padding-bottom: 0.25rem; }
  h4 { font-size: 0.75rem; margin: 0.75rem 0 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; color: #525252; }
  .meta { color: #525252; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .count { color: #525252; font-weight: normal; font-size: 0.85rem; }
  .record { border: 1px solid #d4d4d4; background: white; padding: 0.75rem 1rem; margin: 0.75rem 0; border-radius: 4px; page-break-inside: avoid; }
  .record header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem; }
  .chip { display: inline-block; color: white; font-size: 0.7rem; font-weight: bold; padding: 0.15rem 0.5rem; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
  .ts { color: #525252; font-size: 0.8rem; }
  .author { color: #1a1a1a; font-size: 0.8rem; font-weight: bold; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 0.9rem; margin: 0; background: #f5f5f4; padding: 0.5rem 0.6rem; border-radius: 3px; }
  .settings { margin: 0; padding: 0; list-style: none; font-size: 0.85rem; }
  .settings li { padding: 0.1rem 0; }
  .settings .k { color: #525252; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; }
  .settings .v { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  footer { margin-top: 0.5rem; font-size: 0.75rem; color: #737373; }
  .route { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  @media print {
    body { background: white; max-width: none; margin: 0; padding: 0.5in; }
    .record { box-shadow: none; }
  }
</style>
</head>
<body>
  <h1>Evidence packet — Difference Suite</h1>
  <p class="meta">Generated ${escapeHtml(generatedAt)}. ${escapeHtml(totalLine)}</p>
  ${sections}
</body>
</html>`;
};

export const buildJsonPacket = (records: ContestationRecord[]): ContestationPacketV1 =>
    buildPacket(records);

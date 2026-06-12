/**
 * Parses CSV text into structured data.
 * Accepts any numeric column as the value axis — no fixed column name required.
 */

const VALUE_SYNONYMS = [
    'count', 'score', 'amount', 'frequency', 'magnitude',
    'y', 'n', 'num', 'number', 'total', 'val', 'metric', 'data',
];
const TIMESTAMP_SYNONYMS = ['date', 'time', 'datetime', 'created_at', 'created', 'ts'];
const CONTENT_SYNONYMS = ['text', 'description', 'label', 'title', 'content', 'name'];

export const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // ── Find value column ──────────────────────────────────────────────────────
    let valueIdx = headers.indexOf('value');

    if (valueIdx === -1) {
        for (const syn of VALUE_SYNONYMS) {
            valueIdx = headers.indexOf(syn);
            if (valueIdx !== -1) break;
        }
    }

    if (valueIdx === -1) {
        // Last resort: first column in the first data row that parses as a finite number
        const firstRow = lines[1].split(',');
        valueIdx = firstRow.findIndex(v => Number.isFinite(parseFloat(v.trim())));
    }

    if (valueIdx === -1) {
        throw new Error(
            `CSV has no usable numeric column. Tried 'value', ${VALUE_SYNONYMS.slice(0, 5).map(s => `'${s}'`).join(', ')}, and auto-detection. ` +
            `Headers found: ${headers.join(', ')}.`
        );
    }

    // ── Find timestamp column ──────────────────────────────────────────────────
    let timestampIdx = headers.indexOf('timestamp');
    if (timestampIdx === -1) {
        for (const syn of TIMESTAMP_SYNONYMS) {
            timestampIdx = headers.indexOf(syn);
            if (timestampIdx !== -1) break;
        }
    }

    // ── Find content/description column ───────────────────────────────────────
    let contentIdx = -1;
    for (const syn of CONTENT_SYNONYMS) {
        contentIdx = headers.indexOf(syn);
        if (contentIdx !== -1) break;
    }

    return lines.slice(1).map((line, idx) => {
        const cols = line.split(',');
        const item = {};

        // Preserve all original columns
        headers.forEach((header, i) => {
            item[header] = cols[i]?.trim() ?? '';
        });

        // Normalise to fields expected by DiscontinuityDetector
        item.value = parseFloat(cols[valueIdx]?.trim());
        item.timestamp = timestampIdx !== -1
            ? (cols[timestampIdx]?.trim() || new Date().toISOString())
            : new Date().toISOString();
        item.content = contentIdx !== -1
            ? (cols[contentIdx]?.trim() || 'No description available.')
            : 'No description available.';
        item.id = idx;

        return item;
    });
};

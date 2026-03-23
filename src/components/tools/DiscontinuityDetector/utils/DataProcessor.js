/**
 * Parses CSV text into structured data.
 * Expected format: timestamp,value,content
 */
export const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Basic validation
    if (!headers.includes('value')) {
        throw new Error("CSV must contain a 'value' column.");
    }

    return lines.slice(1).map((line, idx) => {
        const values = line.split(',');
        const item = {};

        headers.forEach((header, i) => {
            let val = values[i]?.trim();
            if (header === 'value') val = parseFloat(val);
            item[header] = val;
        });

        // Fallbacks
        if (!item.timestamp) item.timestamp = new Date().toISOString();
        if (!item.content) item.content = "No description available.";
        item.id = idx;

        return item;
    });
};

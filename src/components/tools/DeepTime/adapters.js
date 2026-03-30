/**
 * Adapter utilities for connecting Suite DataItems to DEEP TIME modules.
 * Pure functions — no side effects, no component state.
 */

const CANVAS_SIZE = 320;

/**
 * Load an image from a URL (blob URL or data URL) into ImageData + noise buffer,
 * matching the shape DiffusionScrubber expects from its loadFile path.
 *
 * @param {string} url - blob URL or data URL from Suite DataItem.content
 * @param {function} generateNoiseFn - the generateNoise function from DeepTimeApp
 * @returns {Promise<{imageData: ImageData, noise: Float32Array, name: string}>}
 */
export function loadImageFromUrl(url, generateNoiseFn, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = off.height = CANVAS_SIZE;
      const s = Math.min(img.width, img.height);
      off.getContext("2d").drawImage(
        img,
        (img.width - s) / 2, (img.height - s) / 2, s, s,
        0, 0, CANVAS_SIZE, CANVAS_SIZE
      );
      const imageData = off.getContext("2d").getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      // Derive noise seed from URL hash for reproducibility
      let seed = 0;
      for (let i = 0; i < url.length; i++) seed = ((seed << 5) - seed + url.charCodeAt(i)) >>> 0;
      const noise = generateNoiseFn(CANVAS_SIZE, seed);
      resolve({ imageData, noise, name: name || "Suite image" });
    };
    img.onerror = () => reject(new Error("Failed to load image from URL"));
    img.src = url;
  });
}

/**
 * Attempt to convert a JSON timeseries string into newline-delimited event labels
 * suitable for MemoryAudit's textarea.
 *
 * Looks for arrays of objects with date/year + label/event/description fields.
 * Returns null if the JSON doesn't match a recognisable event pattern.
 *
 * @param {string} jsonString - raw JSON content from a Suite timeseries DataItem
 * @returns {string|null}
 */
export function timeseriesJsonToLabels(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const arr = Array.isArray(data) ? data : (data.events || data.data || data.items || null);
    if (!Array.isArray(arr) || arr.length === 0) return null;

    // Find the date and label field names from the first object
    const sample = arr[0];
    if (typeof sample !== "object" || sample === null) return null;

    const keys = Object.keys(sample);
    const dateKey = keys.find(k =>
      /^(year|date|time|timestamp|period|when)$/i.test(k)
    );
    const labelKey = keys.find(k =>
      /^(label|event|name|description|title|what|note)$/i.test(k)
    );

    if (!dateKey && !labelKey) return null;

    const lines = arr.map(item => {
      const date = item[dateKey] ?? "";
      const label = item[labelKey] ?? "";
      if (dateKey && labelKey) return `${date} — ${label}`;
      return String(date || label);
    }).filter(Boolean);

    return lines.length > 0 ? lines.join("\n") : null;
  } catch {
    return null;
  }
}

/**
 * Build a result payload for updateItemResult.
 *
 * @param {string} moduleKey - e.g. 'attention', 'diffusion', 'memory'
 * @param {object} data - module-specific output data
 * @returns {{ toolId: string, timestamp: number, summary: string, data: object }}
 */
export function makeResultPayload(moduleKey, data) {
  const summaries = {
    attention: "Attention weight matrix analysis",
    diffusion: "Diffusion noise process frame",
    memory: "RNN vs LSTM memory retention analysis",
  };
  return {
    toolId: `deep-time-${moduleKey}`,
    timestamp: Date.now(),
    summary: summaries[moduleKey] || "Deep Time analysis",
    data,
  };
}

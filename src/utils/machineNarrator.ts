import type { MachineEvent, MachineEventKind } from '../core/inference/types';
import { MODEL_REGISTRY } from '../core/inference/modelRegistry';

/**
 * Plain-language narration of machine events for the decision journal.
 *
 * Register: short sentences (<= 25 words), no unexplained acronyms, plain
 * verbs only (chose / fetched / removed), no marketing tone. The pedagogy
 * is that each event names a *qualitative* choice the machine made on your
 * behalf — the layer normally invisible behind quantification.
 */

const lookupModelName = (modelId?: string, fromDetail?: unknown): string => {
  if (typeof fromDetail === 'string' && fromDetail.length > 0) return fromDetail;
  if (!modelId) return 'an unnamed model';
  const m = MODEL_REGISTRY.find((entry) => entry.id === modelId);
  return m ? m.name : modelId;
};

const detailString = (detail: MachineEvent['detail'], key: string): string | undefined => {
  if (!detail) return undefined;
  const v = detail[key];
  if (typeof v === 'string' && v.length > 0) return v;
  if (typeof v === 'number') return String(v);
  return undefined;
};

const detailNumber = (detail: MachineEvent['detail'], key: string): number | undefined => {
  if (!detail) return undefined;
  const v = detail[key];
  return typeof v === 'number' ? v : undefined;
};

const detailBool = (detail: MachineEvent['detail'], key: string): boolean | undefined => {
  if (!detail) return undefined;
  const v = detail[key];
  return typeof v === 'boolean' ? v : undefined;
};

const formatMs = (ms?: number): string => {
  if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) return 'a moment';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)} seconds`;
  return `${Math.round(seconds)} seconds`;
};

const DTYPE_DESCRIPTIONS: Record<string, string> = {
  fp32: 'the original 32-bit floating-point version',
  fp16: 'the 16-bit half-precision version, half as large',
  q8: 'the 8-bit quantized version, four times smaller',
  q4: 'the 4-bit quantized version, eight times smaller',
  q4f16: 'a mixed 4-bit / 16-bit version',
};

const describeDtype = (dtype?: string): string => {
  if (!dtype) return 'a compressed version';
  return DTYPE_DESCRIPTIONS[dtype] ?? `the ${dtype} version`;
};

type Narrator = (e: MachineEvent) => string;

const NARRATORS: Record<MachineEventKind, Narrator> = {
  'load-requested': (e) => {
    const name = lookupModelName(e.modelId, e.detail?.modelName);
    const toolId = e.toolId;
    const who = toolId ? `${toolId} asked for` : 'Asked for';
    return `${who} the "${name}" model. Loading it next.`;
  },

  'cache-check': (e) => {
    const name = lookupModelName(e.modelId);
    const cached = detailBool(e.detail, 'cached');
    if (cached === true) {
      return `Found "${name}" already on this computer. No download needed.`;
    }
    return `Did not find "${name}" on this computer. Will fetch it from the network.`;
  },

  download: (e) => {
    const name = lookupModelName(e.modelId);
    const sizeMB = detailNumber(e.detail, 'approxSizeMB');
    if (typeof sizeMB === 'number' && sizeMB > 0) {
      return `Fetching the "${name}" model — about ${sizeMB} MB to download into your browser.`;
    }
    return `Fetching the "${name}" model from the network into your browser.`;
  },

  'dtype-chosen': (e) => {
    const chosen = detailString(e.detail, 'chosen');
    const available = detailString(e.detail, 'available');
    const description = describeDtype(chosen);
    if (available) {
      return `Chose ${description} (called "${chosen ?? 'unknown'}") from the available options: ${available}. Someone made this trade-off for you.`;
    }
    return `Chose ${description}. Smaller and less precise than the original — a trade-off someone made for you.`;
  },

  'device-chosen': (e) => {
    const preferred = detailString(e.detail, 'preferred');
    if (preferred === 'webgpu') {
      return 'Picked your graphics card as the engine — fastest, when it works.';
    }
    if (preferred === 'wasm') {
      return 'Picked the main processor as the engine — slower than a graphics card, more reliable.';
    }
    return 'Picked an engine for this model automatically.';
  },

  'device-fallback': (e) => {
    const from = detailString(e.detail, 'from') ?? 'one engine';
    const to = detailString(e.detail, 'to') ?? 'another';
    const error = detailString(e.detail, 'error');
    const fromName = from === 'webgpu' ? 'your graphics card' : from;
    const toName = to === 'wasm' ? 'the main processor' : to;
    const tail = error ? ` Reason it gave: "${error.slice(0, 80)}".` : '';
    return `${fromName.charAt(0).toUpperCase() + fromName.slice(1)} refused this model — running on ${toName} instead. Slower, same mathematics.${tail}`;
  },

  'threads-capped': (e) => {
    const cores = detailNumber(e.detail, 'cores');
    const threads = detailNumber(e.detail, 'threads');
    if (typeof cores === 'number' && typeof threads === 'number') {
      return `Your computer has ${cores} processor cores. Using ${threads} of them, leaving headroom so the page stays responsive.`;
    }
    return 'Limited the number of processor threads the model can use, so the page stays responsive.';
  },

  evicted: (e) => {
    const name = lookupModelName(e.modelId);
    const reason = detailString(e.detail, 'reason');
    const incoming = detailString(e.detail, 'incoming');
    const incomingName = incoming ? lookupModelName(incoming) : undefined;
    if (reason === 'large-model' && incomingName) {
      return `Removed "${name}" from memory: the incoming "${incomingName}" is too large to share space.`;
    }
    const max = detailNumber(e.detail, 'maxLoaded');
    if (max) {
      return `Removed "${name}" from memory to make room. Your browser only holds ${max} models at once.`;
    }
    return `Removed "${name}" from memory to make room for the next one.`;
  },

  loaded: (e) => {
    const name = lookupModelName(e.modelId);
    const durationMs = detailNumber(e.detail, 'durationMs');
    const device = detailString(e.detail, 'effectiveDevice');
    const where = device === 'webgpu' ? 'your graphics card' : device === 'wasm' ? 'the main processor' : 'this computer';
    return `"${name}" is ready in memory on ${where} after ${formatMs(durationMs)}.`;
  },

  'inference-start': (e) => {
    const name = lookupModelName(e.modelId);
    return `Asking "${name}" to think about your input now.`;
  },

  'inference-done': (e) => {
    const name = lookupModelName(e.modelId);
    const duration = formatMs(detailNumber(e.detail, 'durationMs'));
    const shape = detailString(e.detail, 'outputShape');
    if (shape) {
      return `"${name}" returned ${shape} in ${duration}. Everything you see next is arithmetic on these numbers.`;
    }
    return `"${name}" returned an answer in ${duration}. Everything you see next is arithmetic on these numbers.`;
  },

  'watchdog-timeout': (e) => {
    const name = lookupModelName(e.modelId);
    const seconds = detailNumber(e.detail, 'timeoutSeconds');
    const tail = typeof seconds === 'number' ? ` after ${seconds} seconds` : '';
    return `"${name}" stopped responding and was shut down${tail}. Deep learning is fragile; this is what failure looks like.`;
  },

  'worker-crash': () => 'The inference engine crashed. The page will try to restart it.',

  'worker-restart': (e) => {
    const restartCount = detailNumber(e.detail, 'restartCount');
    const maxRestarts = detailNumber(e.detail, 'maxRestarts');
    if (typeof restartCount === 'number' && typeof maxRestarts === 'number') {
      return `Restarted the inference engine (attempt ${restartCount} of ${maxRestarts}). Any in-flight work was lost.`;
    }
    return 'Restarted the inference engine. Any in-flight work was lost.';
  },

  'cache-cleared': (e) => {
    const name = lookupModelName(e.modelId);
    const filesDeleted = detailNumber(e.detail, 'filesDeleted');
    if (typeof filesDeleted === 'number') {
      return `Removed "${name}" from this computer (${filesDeleted} files). Next use will download it again.`;
    }
    return `Removed "${name}" from this computer. Next use will download it again.`;
  },
};

/** Produce a plain-language summary for a single machine event. Always returns a non-empty string. */
export const narrateEvent = (event: MachineEvent): string => {
  try {
    const fn = NARRATORS[event.kind];
    if (!fn) return `Machine event: ${event.kind}.`;
    const summary = fn(event);
    return summary && summary.length > 0 ? summary : `Machine event: ${event.kind}.`;
  } catch {
    return `Machine event: ${event.kind}.`;
  }
};

/** Return the event with its `summary` filled in via the narrator. */
export const narrate = (event: MachineEvent): MachineEvent => ({
  ...event,
  summary: narrateEvent(event),
});

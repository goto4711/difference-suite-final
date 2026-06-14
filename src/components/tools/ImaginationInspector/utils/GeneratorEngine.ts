import { transformersClient } from '../../../../core/inference/TransformersClient';
import { createIdbCache } from '../../../../core/cache/idbCache';
import {
    AMBIGUITY_MARGIN,
    AMBIGUOUS_TAG,
    clipProbabilities,
    confidenceColor,
    resolveTag,
    softmax,
    type TagDetail,
} from './clipUncertainty';

export {
    AMBIGUITY_MARGIN,
    AMBIGUOUS_TAG,
    confidenceColor,
    resolveTag,
    softmax,
    type TagDetail,
};

export interface GeneratedResult {
    id: number;
    prompt: string;
    syntheticPrompt: string;
    adjective: string;
    tags: Record<string, string>;
    tagDetails: Record<string, TagDetail>;
    image: string | null;
    color: string;
}

/**
 * Outcome of a generate() call.
 *  - matched   : the prompt matched a Stable Bias profession and the grid is real.
 *  - unmatched : no profession match; the UI renders an honest empty state with chips.
 *  - offline   : the image archive could not be reached and there is no cache to
 *                serve the request. Includes the case where the upstream API
 *                returns an unexpected shape — we treat schema drift as the
 *                same honest "unavailable" condition rather than fabricating
 *                output. The UI renders a clear message; no cards are shown.
 */
export type GenerateOutcome =
    | { kind: 'matched'; results: GeneratedResult[] }
    | { kind: 'unmatched'; prompt: string; suggestions: string[] }
    | { kind: 'offline'; prompt: string; reason: string };

interface StableBiasRow {
    row?: {
        image?: {
            src?: string;
        };
        adjective?: string;
    };
}

interface StableBiasResponse {
    rows?: StableBiasRow[];
}

type StableBiasImageRow = StableBiasRow & {
    row: {
        image: {
            src: string;
        };
        adjective?: string;
    };
};

const isStableBiasImageRow = (row: StableBiasRow | undefined): row is StableBiasImageRow =>
    typeof row?.row?.image?.src === 'string';

// ------------------------------------------------------------------
// Stable Bias caches (IndexedDB)
// ------------------------------------------------------------------
//
// Two caches, both keyed by deterministic query-derived strings so a
// repeat of the exact same fetch can be served entirely from disk:
//
//   rows store    key = <full datasets-server request URL>
//                  value = StableBiasRow[]  (parsed JSON)
//   images store  key = <image URL>
//                  value = string  (data: URL — base64-encoded image bytes)
//
// Each cache lives in its own IndexedDB database. The thin IDB adapter
// creates an object store only on `onupgradeneeded`, so two
// createIdbCache() calls sharing a dbName at the same version would not
// register the second store. Versioning is per-cache via createIdbCache({version}).
//
// Only public Stable Bias dataset data is cached. No user input, no
// personal data ever enters either cache. The data URL transport keeps
// `GeneratedResult.image` a plain string and avoids object-URL lifecycle
// concerns; for large blobs (e.g. WP-8 model weights) the cache helper
// accepts Blob values too — that decision is per call site, not baked
// into the helper.
const rowCache = createIdbCache<StableBiasRow[]>({
    dbName: 'difference-suite-stable-bias-rows',
    storeName: 'rows',
    version: 1,
});

const imageCache = createIdbCache<string>({
    dbName: 'difference-suite-stable-bias-images',
    storeName: 'images',
    version: 1,
});

/**
 * Fetch Stable Bias rows for a URL, cache-first. On success, populate the
 * cache. On failure with no cache hit, throw — the caller turns this into
 * an honest `offline` outcome.
 */
const fetchStableBiasRowsCached = async (url: string): Promise<StableBiasRow[]> => {
    const cached = await rowCache.get(url).catch(() => null);
    if (cached) return cached.value;

    const response = await fetch(url);
    if (!response.ok) {
        // Upstream is reachable but rejecting us — treat like schema drift
        // upstream (the caller will downgrade to `offline` if all fetches
        // come back empty).
        return [];
    }
    const data = (await response.json()) as StableBiasResponse;
    const rows = data.rows ?? [];
    // Persist even an empty result so a follow-up offline reload behaves the
    // same as the original fetch instead of failing differently.
    await rowCache.set(url, rows).catch(() => undefined);
    return rows;
};

/**
 * Return a `data:` URL for a Stable Bias image. Cache-first; on miss, fetch
 * the bytes and store the encoded form so the image renders offline next time.
 * Throws on a fetch failure with no cache entry.
 */
const fetchImageAsDataUrlCached = async (imageUrl: string): Promise<string> => {
    const cached = await imageCache.get(imageUrl).catch(() => null);
    if (cached) return cached.value;

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    await imageCache.set(imageUrl, dataUrl).catch(() => undefined);
    return dataUrl;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed.'));
        reader.readAsDataURL(blob);
    });

// Full profession list from the stable-bias/professions dataset (stable-bias/professions, CC BY-SA 4.0)
// Note: dataset stores 'CEO' in uppercase; all others are lowercase with underscores.
const STABLE_BIAS_PROFESSIONS = [
    'accountant', 'aerospace_engineer', 'aide', 'air_conditioning_installer', 'architect',
    'artist', 'author', 'baker', 'bartender', 'bus_driver', 'butcher', 'career_counselor',
    'carpenter', 'carpet_installer', 'cashier', 'CEO', 'childcare_worker', 'civil_engineer',
    'claims_appraiser', 'cleaner', 'clergy', 'clerk', 'coach', 'community_manager',
    'compliance_officer', 'computer_programmer', 'computer_support_specialist',
    'computer_systems_analyst', 'construction_worker', 'cook', 'correctional_officer',
    'courier', 'credit_counselor', 'customer_service_representative', 'data_entry_keyer',
    'dental_assistant', 'dental_hygienist', 'dentist', 'designer', 'detective', 'director',
    'dishwasher', 'dispatcher', 'doctor', 'drywall_installer', 'electrical_engineer',
    'electrician', 'engineer', 'event_planner', 'executive_assistant', 'facilities_manager',
    'farmer', 'fast_food_worker', 'file_clerk', 'financial_advisor', 'financial_analyst',
    'financial_manager', 'firefighter', 'fitness_instructor', 'graphic_designer',
    'groundskeeper', 'hairdresser', 'head_cook', 'health_technician', 'host', 'hostess',
    'industrial_engineer', 'insurance_agent', 'interior_designer', 'interviewer',
    'inventory_clerk', 'it_specialist', 'jailer', 'janitor', 'laboratory_technician',
    'language_pathologist', 'lawyer', 'librarian', 'logistician', 'machinery_mechanic',
    'machinist', 'maid', 'manager', 'manicurist', 'market_research_analyst',
    'marketing_manager', 'massage_therapist', 'mechanic', 'mechanical_engineer',
    'medical_records_specialist', 'mental_health_counselor', 'metal_worker', 'mover',
    'musician', 'network_administrator', 'nurse', 'nursing_assistant', 'nutritionist',
    'occupational_therapist', 'office_clerk', 'office_worker', 'painter', 'paralegal',
    'payroll_clerk', 'pharmacist', 'pharmacy_technician', 'photographer', 'physical_therapist',
    'pilot', 'plane_mechanic', 'plumber', 'police_officer', 'postal_worker',
    'printing_press_operator', 'producer', 'psychologist', 'public_relations_specialist',
    'purchasing_agent', 'radiologic_technician', 'real_estate_broker', 'receptionist',
    'repair_worker', 'roofer', 'sales_manager', 'salesperson', 'school_bus_driver',
    'scientist', 'security_guard', 'sheet_metal_worker', 'singer', 'social_assistant',
    'social_worker', 'software_developer', 'stocker', 'supervisor', 'taxi_driver',
    'teacher', 'teaching_assistant', 'teller', 'therapist', 'tractor_operator',
    'truck_driver', 'tutor', 'underwriter', 'veterinarian', 'waiter', 'waitress',
    'welder', 'wholesale_buyer', 'writer',
];

// CLIP zero-shot prompts per demographic category.
// Templates are made specific to each category to improve CLIP discriminability.
const DEMOGRAPHIC_CATEGORIES: Record<string, { labels: string[], template: (l: string) => string }> = {
    Gender: {
        labels: ['male', 'female', 'non-binary'],
        template: (l) => `a portrait photo of a ${l}`,
    },
    Race: {
        labels: ['white', 'black', 'asian', 'hispanic', 'middle eastern'],
        template: (l) => `a portrait photo of a ${l} person`,
    },
    Age: {
        labels: ['young', 'middle-aged', 'elderly'],
        template: (l) => `a portrait photo of an ${l} adult`,
    },
    Setting: {
        labels: ['office', 'outdoor', 'hospital', 'home', 'studio'],
        template: (l) => `a photo taken in ${l === 'outdoor' ? 'an outdoor' : l === 'office' ? 'an office' : `a ${l}`} setting`,
    },
};

// Curated pool for empty-state suggestion chips. Mixes high-status, care, and
// service work so the chips don't reinforce a "real professions are doctor /
// CEO / lawyer" framing.
const SUGGESTION_POOL = [
    'doctor', 'CEO', 'lawyer', 'pilot', 'software_developer', 'scientist',
    'teacher', 'nurse', 'firefighter', 'social_worker', 'therapist',
    'janitor', 'cashier', 'security_guard', 'waiter', 'fast_food_worker',
];

/**
 * Pick `n` shuffled suggestions from the curated pool. Exported for tests.
 */
export const sampleSuggestions = (n = 7): string[] => {
    const pool = [...SUGGESTION_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
};

/**
 * Normalize a user prompt to a profession slug in the dataset.
 * Returns the slug as stored (e.g. 'CEO', 'doctor', 'software_developer'), or null if no match.
 */
function matchProfession(prompt: string): string | null {
    const normalized = prompt.toLowerCase().replace(/\s+/g, '_').replace(/^(a_|an_|the_)/, '').trim();
    // Exact match (case-insensitive)
    const exact = STABLE_BIAS_PROFESSIONS.find(p => p.toLowerCase() === normalized);
    if (exact) return exact;
    // Partial: prompt contains or is contained by a known profession
    return STABLE_BIAS_PROFESSIONS.find(p =>
        normalized.includes(p.toLowerCase()) || p.toLowerCase().includes(normalized)
    ) ?? null;
}

interface ClassificationResult {
    tags: Record<string, string>;
    tagDetails: Record<string, TagDetail>;
}

const FAILED_CLASSIFICATION: ClassificationResult = {
    tags: { Gender: 'unknown', Race: 'unknown', Age: 'unknown', Setting: 'unknown' },
    tagDetails: {},
};

/**
 * Run one batched CLIP call (image → text) across all demographic categories.
 * Returns per-category labels plus uncertainty details (top-2 + softmax probs).
 * When the margin between top and runner-up is below AMBIGUITY_MARGIN the
 * category's label is reported as 'ambiguous'.
 */
async function classifyDemographicsWithCLIP(imageUrl: string): Promise<ClassificationResult> {
    const allPrompts: string[] = [];
    const categoryRanges: Record<string, [number, number]> = {};
    let offset = 0;

    for (const [cat, { labels, template }] of Object.entries(DEMOGRAPHIC_CATEGORIES)) {
        const prompts = labels.map(template);
        categoryRanges[cat] = [offset, offset + prompts.length];
        allPrompts.push(...prompts);
        offset += prompts.length;
    }

    try {
        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'ImaginationInspector',
            model: 'clip-vit-base-patch32-q4',
            task: 'multimodal-alignment',
            payload: {
                query: imageUrl,
                candidates: allPrompts,
                queryType: 'image',
                candidateType: 'text',
            },
        });

        const scores = result.output as { url: string; score: number }[];
        const scoreMap = new Map(scores.map(s => [s.url, s.score]));

        const tags: Record<string, string> = {};
        const tagDetails: Record<string, TagDetail> = {};

        for (const [cat, { labels }] of Object.entries(DEMOGRAPHIC_CATEGORIES)) {
            const [start, end] = categoryRanges[cat];
            const catPrompts = allPrompts.slice(start, end);
            const rawScores = catPrompts.map(p => scoreMap.get(p) ?? -Infinity);
            // clipProbabilities applies CLIP's logit scale before softmax —
            // raw cosine similarities are too close together for a meaningful margin.
            const probs = clipProbabilities(rawScores);
            const detail = resolveTag(labels, probs);

            tags[cat] = detail.label;
            tagDetails[cat] = detail;
        }
        return { tags, tagDetails };
    } catch (e) {
        console.error('[GeneratorEngine] CLIP classification failed:', e);
        return FAILED_CLASSIFICATION;
    }
}

export interface GenerateOptions {
    count?: number;
    fixedAdjective?: string | null;
}

const OFFLINE_MESSAGE =
    "Couldn't reach the image archive — you appear to be offline. Run this prompt once online and it'll work from cache after that.";

const OFFLINE_SCHEMA_MESSAGE =
    "The image archive returned an unexpected response. If this keeps happening the dataset API may have changed.";

/**
 * Main entry point.
 * If the prompt matches a profession in the Stable Bias dataset, fetches real
 * Stable Diffusion-generated images and classifies demographics via CLIP
 * zero-shot. Both row and image fetches are IndexedDB-cached so a repeat of
 * the same prompt works fully offline. Unmatched prompts return an honest
 * empty state; network or schema failure with no cache returns `offline` so
 * the UI can say so plainly rather than fabricating output.
 *
 * @param fixedAdjective - When set, all images use the same adjective (controls for adjective influence).
 *                         When null/undefined, each image gets a random different adjective.
 */
export const generateImages = async (prompt: string, opts: GenerateOptions = {}): Promise<GenerateOutcome> => {
    const { count = 5, fixedAdjective = null } = opts;
    const profession = matchProfession(prompt);

    if (!profession) {
        return { kind: 'unmatched', prompt, suggestions: sampleSuggestions(7) };
    }

    let selectedRows: StableBiasImageRow[];
    try {
        selectedRows = await selectStableBiasRows(profession, count, fixedAdjective);
    } catch (error) {
        console.error('[GeneratorEngine] Stable Bias rows unavailable:', error);
        return { kind: 'offline', prompt, reason: OFFLINE_MESSAGE };
    }

    if (selectedRows.length === 0) {
        return { kind: 'offline', prompt, reason: OFFLINE_SCHEMA_MESSAGE };
    }

    // Process images sequentially so CLIP loads once and stays resident.
    const results: GeneratedResult[] = [];
    for (const [i, row] of selectedRows.entries()) {
        const remoteUrl: string = row.row.image.src;
        const adjective: string = row.row.adjective || '';
        let dataUrl: string;
        try {
            dataUrl = await fetchImageAsDataUrlCached(remoteUrl);
        } catch (error) {
            console.error('[GeneratorEngine] Image unavailable:', error);
            return { kind: 'offline', prompt, reason: OFFLINE_MESSAGE };
        }
        const { tags, tagDetails } = await classifyDemographicsWithCLIP(dataUrl);

        results.push({
            id: i,
            prompt,
            syntheticPrompt: `Photo portrait of ${adjective ? `an ${adjective}` : 'a'} ${profession.replace(/_/g, ' ')}`,
            adjective,
            tags,
            tagDetails,
            image: dataUrl,
            color: confidenceColor(tagDetails),
        });
    }
    return { kind: 'matched', results };
};

// Tiny string hash → seed (FNV-1a, 32-bit). Deterministic across runs.
function hashString(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

// Mulberry32 — small seedable PRNG. Used only to pick which Stable Bias
// blocks to query; not security-sensitive.
function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickBlocksForProfession(profession: string, count: number, total: number): number[] {
    const rand = mulberry32(hashString(`varied:${profession}`));
    const all = Array.from({ length: total }, (_, i) => i);
    // Fisher-Yates with the seeded RNG.
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, count);
}

async function selectStableBiasRows(
    profession: string,
    count: number,
    fixedAdjective: string | null,
): Promise<StableBiasImageRow[]> {
    const BLOCK = 1500;
    const ROWS_PER_PROFESSION = 10;
    // 63 blocks total: 21 adjectives × 3 models (SD_14, SD_2, DALL-E 2)
    const TOTAL_ADJECTIVE_BLOCKS = 63;

    const sortedProfessions = [...STABLE_BIAS_PROFESSIONS].sort();
    const professionRank = sortedProfessions.indexOf(profession);
    const withinBlockOffset = professionRank >= 0 ? professionRank * ROWS_PER_PROFESSION : 0;

    const where = encodeURIComponent(`profession='${profession}'`);

    // Adjectives appear in alphabetical order, one block (1500 rows) each.
    // The 21 adjectives repeat 3 times (once per model: SD_14, SD_2, DALL-E 2).
    const ADJECTIVE_ORDER = [
        'ambitious', 'assertive', 'committed', 'compassionate', 'confident',
        'considerate', 'decisive', 'determined', 'emotional', 'gentle',
        'honest', 'intellectual', 'modest', 'no_adjective', 'outspoken',
        'pleasant', 'self-confident', 'sensitive', 'stubborn', 'supportive',
        'unreasonable',
    ];

    if (fixedAdjective) {
        // Fixed adjective mode: calculate exact block offset by adjective index.
        // HuggingFace API does not support AND in where= so we must use offsets.
        const adjIdx = ADJECTIVE_ORDER.indexOf(fixedAdjective);
        if (adjIdx === -1) throw new Error(`Unknown adjective: ${fixedAdjective}`);
        // Fetch from all 3 model cycles (adjIdx, adjIdx+21, adjIdx+42) for variety
        const modelCycles = [0, 21, 42].slice(0, count);
        const responses = await Promise.all(
            modelCycles.map(cycle =>
                fetchStableBiasRowsCached(`https://datasets-server.huggingface.co/rows?dataset=stable-bias/professions&config=default&split=train&where=${where}&offset=${(adjIdx + cycle) * BLOCK + withinBlockOffset}&length=3`)
            )
        );
        let selectedRows = responses
            .map(rows => rows.find((row): row is StableBiasImageRow => isStableBiasImageRow(row) && row.row.adjective === fixedAdjective))
            .filter(isStableBiasImageRow);
        // If we need more images than model cycles, fill from the first cycle
        if (selectedRows.length < count) {
            const extraRows = (await fetchStableBiasRowsCached(
                `https://datasets-server.huggingface.co/rows?dataset=stable-bias/professions&config=default&split=train&where=${where}&offset=${adjIdx * BLOCK + withinBlockOffset}&length=${count}`
            )).filter((row): row is StableBiasImageRow => isStableBiasImageRow(row) && row.row.adjective === fixedAdjective);
            selectedRows = [...selectedRows, ...extraRows].slice(0, count);
        }
        return selectedRows;
    }

    // Varied adjective mode: pick `count` blocks deterministically from the
    // profession slug. Determinism keeps repeat runs (and offline replays)
    // hitting the same cached block URLs; without it, a re-run with the same
    // prompt would pick fresh random blocks and miss the cache entirely.
    const blockIndices = pickBlocksForProfession(profession, count, TOTAL_ADJECTIVE_BLOCKS);

    const base = `https://datasets-server.huggingface.co/rows?dataset=stable-bias/professions&config=default&split=train&where=${where}&length=3`;

    const responses = await Promise.all(
        blockIndices.map(blockIdx =>
            fetchStableBiasRowsCached(`${base}&offset=${blockIdx * BLOCK + withinBlockOffset}`)
        )
    );

    return responses
        .map(rows => rows.find(isStableBiasImageRow))
        .filter(isStableBiasImageRow);
}

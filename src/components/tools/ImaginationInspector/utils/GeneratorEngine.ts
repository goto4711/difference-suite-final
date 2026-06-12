import { transformersClient } from '../../../../core/inference/TransformersClient';
import {
    AMBIGUITY_MARGIN,
    AMBIGUOUS_TAG,
    clipProbabilities,
    confidenceColor,
    NEUTRAL_GREY,
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

const SIMULATED_COLOR = NEUTRAL_GREY;

export interface GeneratedResult {
    id: number;
    prompt: string;
    syntheticPrompt: string;
    adjective: string;
    tags: Record<string, string>;
    tagDetails: Record<string, TagDetail>;
    image: string | null;
    color: string;
    // True for cards produced by the SmolLM2 text-only fallback (network-failure
    // path). Drives the prominent SIMULATED badge in GenerationGrid.
    simulated?: boolean;
}

/**
 * Outcome of a generate() call. The unmatched case never produces cards: the
 * UI renders an honest empty state with suggestion chips instead of passing
 * unreliable LM output off as a real image-generation result.
 *
 * NOTE TO PI: open question — for the network-failure path (matched profession
 * but HF fetch failed), should we prefer a static offline message over the
 * SmolLM2 simulation entirely? The simulation is still wired up and badged
 * 'SIMULATED', but it is unreliable noise. Easy switch in generateImages().
 */
export type GenerateOutcome =
    | { kind: 'matched'; results: GeneratedResult[] }
    | { kind: 'unmatched'; prompt: string; suggestions: string[] }
    | { kind: 'simulated'; results: GeneratedResult[]; reason: string };

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

const fetchStableBiasRows = async (url: string): Promise<StableBiasRow[]> => {
    const response = await fetch(url);
    if (!response.ok) {
        return [];
    }

    const data = await response.json() as StableBiasResponse;
    return data.rows ?? [];
};

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

/**
 * Legacy fallback: SmolLM2 text simulation for prompts with no Stable Bias match.
 */
const generateImagesLegacy = async (prompt: string, count: number): Promise<GeneratedResult[]> => {
    try {
        const oraclePrompt = `Imagine ${count} stereotypical visual representations of a "${prompt}". 
For each, provide:
- Description: (A one-sentence visual description)
- Gender: (e.g., male, female, non-binary)
- Race: (e.g., white, black, asian, hispanic)
- Age: (e.g., young, middle-aged, old)
- Setting: (e.g., office, street, hospital)

Format as a numbered list.`;

        const textResult = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'ImaginationInspector',
            model: 'smollm2-135m-instruct',
            task: 'text-generation',
            payload: {
                prompt: `<|im_start|>user\n${oraclePrompt}<|im_end|>\n<|im_start|>assistant\n`,
                options: { max_new_tokens: 600, temperature: 0.7, do_sample: true },
            },
        });

        const generatedText = (textResult.output as string) || '';
        const results: GeneratedResult[] = [];
        const blocks = generatedText.split(/\d+\.\s+/).filter(b => b.trim().length > 20);

        for (let i = 0; i < blocks.length && i < count; i++) {
            const block = blocks[i];
            const description = block.match(/Description:\s*(.*?)(?=\n|$|- )/i)?.[1] || 'A conceptual image';
            const gender = block.match(/Gender:\s*(.*?)(?=\n|$|- )/i)?.[1]?.trim().toLowerCase() || 'unknown';
            const race = block.match(/Race:\s*(.*?)(?=\n|$|- )/i)?.[1]?.trim().toLowerCase() || 'unknown';
            const age = block.match(/Age:\s*(.*?)(?=\n|$|- )/i)?.[1]?.trim().toLowerCase() || 'unknown';
            const setting = block.match(/Setting:\s*(.*?)(?=\n|$|- )/i)?.[1]?.trim().toLowerCase() || 'unknown';

            results.push({
                id: i,
                prompt,
                syntheticPrompt: description,
                adjective: '',
                tags: { Gender: gender, Race: race, Age: age, Setting: setting },
                tagDetails: {},
                image: null,
                color: SIMULATED_COLOR,
                simulated: true,
            });
        }

        if (results.length === 0) {
            results.push({
                id: 0,
                prompt,
                syntheticPrompt: generatedText.slice(0, 150) + '...',
                adjective: '',
                tags: { Status: 'Unstructured Output' },
                tagDetails: {},
                image: null,
                color: SIMULATED_COLOR,
                simulated: true,
            });
        }
        return results;
    } catch (error) {
        console.error('[GeneratorEngine] Legacy generation error:', error);
        throw error;
    }
};

export interface GenerateOptions {
    count?: number;
    fixedAdjective?: string | null;
}

/**
 * Main entry point.
 * If the prompt matches a profession in the Stable Bias dataset, fetches real
 * Stable Diffusion-generated images and classifies demographics via CLIP
 * zero-shot. Unmatched prompts now return an honest empty state — the SmolLM2
 * simulation is only used as a network-failure fallback, with every card
 * badged SIMULATED so it cannot be mistaken for real generative output.
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

    try {
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

        let selectedRows: StableBiasImageRow[];

        if (fixedAdjective) {
            // Fixed adjective mode: calculate exact block offset by adjective index.
            // HuggingFace API does not support AND in where= so we must use offsets.
            const adjIdx = ADJECTIVE_ORDER.indexOf(fixedAdjective);
            if (adjIdx === -1) throw new Error(`Unknown adjective: ${fixedAdjective}`);
            // Fetch from all 3 model cycles (adjIdx, adjIdx+21, adjIdx+42) for variety
            const modelCycles = [0, 21, 42].slice(0, count);
            const responses = await Promise.all(
                modelCycles.map(cycle =>
                    fetchStableBiasRows(`https://datasets-server.huggingface.co/rows?dataset=stable-bias/professions&config=default&split=train&where=${where}&offset=${(adjIdx + cycle) * BLOCK + withinBlockOffset}&length=3`)
                )
            );
            selectedRows = responses
                .map(rows => rows.find((row): row is StableBiasImageRow => isStableBiasImageRow(row) && row.row.adjective === fixedAdjective))
                .filter(isStableBiasImageRow);
            // If we need more images than model cycles, fill from the first cycle
            if (selectedRows.length < count) {
                const extraRows = (await fetchStableBiasRows(
                    `https://datasets-server.huggingface.co/rows?dataset=stable-bias/professions&config=default&split=train&where=${where}&offset=${adjIdx * BLOCK + withinBlockOffset}&length=${count}`
                )).filter((row): row is StableBiasImageRow => isStableBiasImageRow(row) && row.row.adjective === fixedAdjective);
                selectedRows = [...selectedRows, ...extraRows].slice(0, count);
            }
        } else {
            // Varied adjective mode: one random block per image
            const blockIndices = Array.from({ length: TOTAL_ADJECTIVE_BLOCKS }, (_, i) => i)
                .sort(() => Math.random() - 0.5)
                .slice(0, count);

            const base = `https://datasets-server.huggingface.co/rows?dataset=stable-bias/professions&config=default&split=train&where=${where}&length=3`;

            const responses = await Promise.all(
                blockIndices.map(blockIdx =>
                    fetchStableBiasRows(`${base}&offset=${blockIdx * BLOCK + withinBlockOffset}`)
                )
            );

            selectedRows = responses
                .map(rows => rows.find(isStableBiasImageRow))
                .filter(isStableBiasImageRow);
        }

        if (selectedRows.length === 0) {
            const results = await generateImagesLegacy(prompt, count);
            return { kind: 'simulated', results, reason: 'Stable Bias dataset returned no rows for this profession.' };
        }
        // Process images sequentially so CLIP loads once and stays resident
        const results: GeneratedResult[] = [];
        for (const [i, row] of selectedRows.entries()) {
            const imageUrl: string = row.row.image.src;
            const adjective: string = row.row.adjective || '';
            const { tags, tagDetails } = await classifyDemographicsWithCLIP(imageUrl);

            results.push({
                id: i,
                prompt,
                syntheticPrompt: `Photo portrait of ${adjective ? `an ${adjective}` : 'a'} ${profession.replace(/_/g, ' ')}`,
                adjective,
                tags,
                tagDetails,
                image: imageUrl,
                color: confidenceColor(tagDetails),
            });
        }
        return { kind: 'matched', results };
    } catch (error) {
        console.error('[GeneratorEngine] Stable Bias fetch failed, falling back to simulation:', error);
        const results = await generateImagesLegacy(prompt, count);
        return { kind: 'simulated', results, reason: 'Network or dataset error — falling back to SmolLM2 simulation.' };
    }
};

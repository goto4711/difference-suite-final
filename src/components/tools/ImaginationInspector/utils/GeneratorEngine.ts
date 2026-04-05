import { transformersClient } from '../../../../core/inference/TransformersClient';

export interface GeneratedResult {
    id: number;
    prompt: string;
    syntheticPrompt: string;
    adjective: string;
    tags: Record<string, string>;
    image: string | null;
    color: string;
}

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

/**
 * Run one batched CLIP call (image → text) across all demographic categories.
 * Returns the best-matching label per category.
 */
async function classifyDemographicsWithCLIP(imageUrl: string): Promise<Record<string, string>> {
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
        for (const [cat, { labels, template }] of Object.entries(DEMOGRAPHIC_CATEGORIES)) {
            const [start, end] = categoryRanges[cat];
            const catPrompts = allPrompts.slice(start, end);
            let bestLabel = labels[0];
            let bestScore = -Infinity;
            const debugScores: Record<string, number> = {};
            catPrompts.forEach((prompt, i) => {
                const score = scoreMap.get(prompt) ?? -Infinity;
                debugScores[labels[i]] = score;
                if (score > bestScore) {
                    bestScore = score;
                    bestLabel = labels[i];
                }
            });

            tags[cat] = bestLabel;
        }
        return tags;
    } catch (e) {
        console.error('[GeneratorEngine] CLIP classification failed:', e);
        return { Gender: 'unknown', Race: 'unknown', Age: 'unknown', Setting: 'unknown' };
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
                image: null,
                color: gender.includes('female') ? '#ffcccb' : '#add8e6',
            });
        }

        if (results.length === 0) {
            results.push({
                id: 0,
                prompt,
                syntheticPrompt: generatedText.slice(0, 150) + '...',
                adjective: '',
                tags: { Status: 'Unstructured Output' },
                image: null,
                color: '#e0e0e0',
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
 * Stable Diffusion-generated images and classifies demographics via CLIP zero-shot.
 * Falls back to SmolLM2 text simulation for unrecognised prompts.
 *
 * @param fixedAdjective - When set, all images use the same adjective (controls for adjective influence).
 *                         When null/undefined, each image gets a random different adjective.
 */
export const generateImages = async (prompt: string, opts: GenerateOptions = {}): Promise<GeneratedResult[]> => {
    const { count = 5, fixedAdjective = null } = opts;
    const profession = matchProfession(prompt);

    if (!profession) {
        return generateImagesLegacy(prompt, count);
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

        let selectedRows: any[];

        if (fixedAdjective) {
            // Fixed adjective mode: calculate exact block offset by adjective index.
            // HuggingFace API does not support AND in where= so we must use offsets.
            const adjIdx = ADJECTIVE_ORDER.indexOf(fixedAdjective);
            if (adjIdx === -1) throw new Error(`Unknown adjective: ${fixedAdjective}`);
            // Fetch from all 3 model cycles (adjIdx, adjIdx+21, adjIdx+42) for variety
            const modelCycles = [0, 21, 42].slice(0, count);
            const responses = await Promise.all(
                modelCycles.map(cycle =>
                    fetch(`https://datasets-server.huggingface.co/rows?dataset=stable-bias/professions&config=default&split=train&where=${where}&offset=${(adjIdx + cycle) * BLOCK + withinBlockOffset}&length=3`)
                        .then(r => r.ok ? r.json() : { rows: [] })
                )
            );
            selectedRows = responses
                .map(d => (d.rows ?? []).find((r: any) => r?.row?.image?.src && r?.row?.adjective === fixedAdjective))
                .filter(Boolean);
            // If we need more images than model cycles, fill from the first cycle
            if (selectedRows.length < count) {
                const extra = await fetch(
                    `https://datasets-server.huggingface.co/rows?dataset=stable-bias/professions&config=default&split=train&where=${where}&offset=${adjIdx * BLOCK + withinBlockOffset}&length=${count}`
                ).then(r => r.ok ? r.json() : { rows: [] });
                const extraRows = (extra.rows ?? []).filter((r: any) => r?.row?.image?.src && r?.row?.adjective === fixedAdjective);
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
                    fetch(`${base}&offset=${blockIdx * BLOCK + withinBlockOffset}`)
                        .then(r => r.ok ? r.json() : { rows: [] })
                )
            );

            selectedRows = responses
                .map(d => (d.rows ?? []).find((r: any) => r?.row?.image?.src))
                .filter(Boolean);
        }

        if (selectedRows.length === 0) {
            return generateImagesLegacy(prompt, count);
        }
        // Process images sequentially so CLIP loads once and stays resident
        const results: GeneratedResult[] = [];
        for (const [i, row] of selectedRows.entries()) {
            const imageUrl: string = row.row.image.src;
            const adjective: string = row.row.adjective || '';
            const tags = await classifyDemographicsWithCLIP(imageUrl);

            results.push({
                id: i,
                prompt,
                syntheticPrompt: `Photo portrait of ${adjective ? `an ${adjective}` : 'a'} ${profession.replace(/_/g, ' ')}`,
                adjective,
                tags,
                image: imageUrl,
                color: tags.Gender === 'female' ? '#ffcccb' : tags.Gender === 'non-binary' ? '#e8d5f5' : '#add8e6',
            });
        }
        return results;
    } catch (error) {
        console.error('[GeneratorEngine] Stable Bias fetch failed, falling back to simulation:', error);
        return generateImagesLegacy(prompt, count);
    }
};

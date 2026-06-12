// Pure helpers for CLIP zero-shot uncertainty. Kept separate from
// GeneratorEngine.ts so unit tests can import them without instantiating the
// transformers Worker.

// Confidence threshold below which a CLIP zero-shot classification is reported
// as 'ambiguous' instead of forcing the argmax. Probability margin is computed
// as (top softmax prob − second softmax prob) over each category's candidates.
// 0.15 is conservative: it flags only the cases where CLIP is genuinely
// undecided, not merely close.
export const AMBIGUITY_MARGIN = 0.15;

export const AMBIGUOUS_TAG = 'ambiguous';

export interface TagDetail {
    label: string;
    runnerUp: string;
    margin: number;
    probabilities: Record<string, number>;
}

/** Numerically stable softmax. */
export const softmax = (scores: number[]): number[] => {
    if (scores.length === 0) return [];
    const max = Math.max(...scores);
    const exps = scores.map(s => Math.exp(s - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return sum > 0 ? exps.map(e => e / sum) : scores.map(() => 1 / scores.length);
};

// CLIP's trained temperature (logit_scale ≈ exp(4.6052) ≈ 100). The worker
// returns RAW cosine similarities, which for CLIP cluster in ~[0.15, 0.35]
// with label gaps of only ~0.01–0.05. A plain softmax over such values is
// near-uniform, so EVERY classification falls below AMBIGUITY_MARGIN and the
// tool reports 100% ambiguous (observed live, 2026-06-12). CLIP zero-shot
// classification is defined as softmax(logit_scale × cosine) — apply the
// same scaling here to get calibrated probabilities.
export const CLIP_LOGIT_SCALE = 100;

/** Calibrated CLIP zero-shot probabilities from raw cosine similarities. */
export const clipProbabilities = (cosineSimilarities: number[]): number[] =>
    softmax(cosineSimilarities.map(s => s * CLIP_LOGIT_SCALE));

/**
 * Pick the top label, runner-up, and margin from a probability vector aligned
 * with labels. Returns AMBIGUOUS_TAG when (top − runner-up) < AMBIGUITY_MARGIN.
 */
export const resolveTag = (labels: string[], probs: number[]): TagDetail => {
    const ranked = labels
        .map((label, i) => ({ label, prob: probs[i] ?? 0 }))
        .sort((a, b) => b.prob - a.prob);
    const top = ranked[0];
    const runner = ranked[1] ?? { label: top.label, prob: 0 };
    const margin = top.prob - runner.prob;
    const probabilities: Record<string, number> = {};
    labels.forEach((label, i) => {
        probabilities[label] = probs[i] ?? 0;
    });
    return {
        label: margin < AMBIGUITY_MARGIN ? AMBIGUOUS_TAG : top.label,
        runnerUp: runner.label,
        margin,
        probabilities,
    };
};

// Card-tint palette. Tints are derived from the app's main brand colour
// (--color-main = #832161) at varying confidence levels. High classification
// confidence shows a saturated tint; low / ambiguous classifications fade
// toward neutral grey. NEVER encode demographic categories (gender, race,
// etc.) as colour — that would re-introduce the very stereotype the tool
// exists to expose.
const CONFIDENCE_HIGH = '#832161';
const CONFIDENCE_MID  = '#a8638e';
const CONFIDENCE_LOW  = '#bd9bab';
export const NEUTRAL_GREY = '#9ca3af';

/**
 * Average CLIP-classification margin across categories → card-tint hex.
 * Ambiguous classifications fall to neutral grey, not to a gender-coded tint.
 * tagDetails may be empty (legacy/failure paths) — that case also collapses
 * to neutral grey.
 */
export const confidenceColor = (tagDetails: Record<string, TagDetail>): string => {
    const margins = Object.values(tagDetails).map(d => d.margin);
    if (margins.length === 0) return NEUTRAL_GREY;
    const avg = margins.reduce((a, b) => a + b, 0) / margins.length;
    if (avg < AMBIGUITY_MARGIN) return NEUTRAL_GREY;
    if (avg < 0.30) return CONFIDENCE_LOW;
    if (avg < 0.50) return CONFIDENCE_MID;
    return CONFIDENCE_HIGH;
};

import { describe, expect, it } from 'vitest';
import {
    AMBIGUITY_MARGIN,
    AMBIGUOUS_TAG,
    CLIP_LOGIT_SCALE,
    clipProbabilities,
    confidenceColor,
    resolveTag,
    softmax,
} from './clipUncertainty';
import { analyzeBias } from './BiasAnalyzer';

describe('softmax', () => {
    it('sums to 1 and is monotonic in input', () => {
        const probs = softmax([1, 2, 3]);
        const sum = probs.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 6);
        expect(probs[2]).toBeGreaterThan(probs[1]);
        expect(probs[1]).toBeGreaterThan(probs[0]);
    });

    it('is numerically stable for large inputs', () => {
        const probs = softmax([1000, 1001, 1002]);
        const sum = probs.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 6);
        expect(probs.every(Number.isFinite)).toBe(true);
    });

    it('returns empty array for empty input', () => {
        expect(softmax([])).toEqual([]);
    });

    it('falls back to uniform when sum collapses', () => {
        // -Infinity inputs would make every exp() == 0 without max-shift; with
        // the shift, the max element gets exp(0) == 1 so the path is exercised
        // only when all inputs are -Infinity.
        const probs = softmax([-Infinity, -Infinity]);
        expect(probs).toEqual([0.5, 0.5]);
    });
});

describe('clipProbabilities', () => {
    // CLIP zero-shot is defined as softmax(logit_scale × cosine_similarity).
    // Without the logit_scale, raw CLIP cosines (~[0.20, 0.30]) softmax to
    // near-uniform — which made EVERY classification fall below
    // AMBIGUITY_MARGIN and the tool reported 100% 'ambiguous' (live regression
    // observed 2026-06-12). These tests pin that calibration in place.

    it('uses the CLIP logit_scale of 100', () => {
        expect(CLIP_LOGIT_SCALE).toBe(100);
    });

    it('produces a confident classification for separated cosines', () => {
        // Raw cosine gaps of 0.02 are large in CLIP space.
        const probs = clipProbabilities([0.28, 0.26, 0.24]);
        expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
        const detail = resolveTag(['a', 'b', 'c'], probs);
        expect(detail.label).toBe('a');
        expect(detail.margin).toBeGreaterThan(AMBIGUITY_MARGIN);
    });

    it('produces an ambiguous classification for near-equal cosines', () => {
        // Raw cosine gaps of 0.002 — CLIP genuinely cannot decide.
        const probs = clipProbabilities([0.27, 0.268, 0.266]);
        expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
        const detail = resolveTag(['a', 'b', 'c'], probs);
        expect(detail.label).toBe(AMBIGUOUS_TAG);
        expect(detail.margin).toBeLessThan(AMBIGUITY_MARGIN);
    });

    it('regression: plain softmax on raw CLIP cosines is near-uniform', () => {
        // This is the bug. Without CLIP_LOGIT_SCALE, even well-separated
        // cosines (gap = 0.04) softmax to roughly 1/n, the margin collapses,
        // and every category reads as 'ambiguous'.
        const uncalibrated = softmax([0.28, 0.26, 0.24]);
        const top = Math.max(...uncalibrated);
        const second = uncalibrated.sort((a, b) => b - a)[1];
        expect(top - second).toBeLessThan(AMBIGUITY_MARGIN);
    });
});

describe('resolveTag', () => {
    it('returns the argmax label when margin is above threshold', () => {
        const labels = ['a', 'b', 'c'];
        const probs = [0.7, 0.2, 0.1];
        const detail = resolveTag(labels, probs);
        expect(detail.label).toBe('a');
        expect(detail.runnerUp).toBe('b');
        expect(detail.margin).toBeCloseTo(0.5, 6);
        expect(detail.probabilities).toEqual({ a: 0.7, b: 0.2, c: 0.1 });
    });

    it("returns 'ambiguous' when margin is below threshold", () => {
        const labels = ['male', 'female', 'non-binary'];
        // Margin = 0.54 - 0.46 = 0.08 < AMBIGUITY_MARGIN (0.15)
        const probs = [0.46, 0.54, 0.0];
        const detail = resolveTag(labels, probs);
        expect(detail.label).toBe(AMBIGUOUS_TAG);
        expect(detail.runnerUp).toBe('male');
        expect(detail.margin).toBeLessThan(AMBIGUITY_MARGIN);
        // raw probabilities preserved for tooltip rendering
        expect(detail.probabilities.female).toBeCloseTo(0.54, 6);
        expect(detail.probabilities.male).toBeCloseTo(0.46, 6);
    });

    it('emits the actual argmax when margin is just above the threshold', () => {
        const labels = ['x', 'y'];
        const eps = 0.01;
        const probs = [0.5 + (AMBIGUITY_MARGIN + eps) / 2, 0.5 - (AMBIGUITY_MARGIN + eps) / 2];
        const detail = resolveTag(labels, probs);
        expect(detail.label).toBe('x');
        expect(detail.margin).toBeGreaterThanOrEqual(AMBIGUITY_MARGIN);
    });
});

describe('confidenceColor', () => {
    it('returns neutral grey when no tagDetails are available', () => {
        expect(confidenceColor({})).toBe('#9ca3af');
    });

    it('returns neutral grey when average margin is below threshold', () => {
        const ambiguous = {
            Gender: { label: AMBIGUOUS_TAG, runnerUp: 'male', margin: 0.05, probabilities: {} },
            Race: { label: AMBIGUOUS_TAG, runnerUp: 'white', margin: 0.02, probabilities: {} },
        };
        expect(confidenceColor(ambiguous)).toBe('#9ca3af');
    });

    it('returns the saturated brand colour for high-confidence cases', () => {
        const confident = {
            Gender: { label: 'female', runnerUp: 'male', margin: 0.8, probabilities: {} },
            Race: { label: 'white', runnerUp: 'asian', margin: 0.7, probabilities: {} },
        };
        expect(confidenceColor(confident)).toBe('#832161');
    });
});

describe('analyzeBias treats ambiguous as a real tag', () => {
    it('counts ambiguous labels into the present list, not absent', () => {
        const results = [
            { id: 0, prompt: 'doctor', tags: { Gender: 'female', Race: 'white', Age: 'middle-aged', Setting: 'hospital' } },
            { id: 1, prompt: 'doctor', tags: { Gender: AMBIGUOUS_TAG, Race: AMBIGUOUS_TAG, Age: 'young', Setting: 'office' } },
            { id: 2, prompt: 'doctor', tags: { Gender: 'male', Race: 'asian', Age: AMBIGUOUS_TAG, Setting: 'hospital' } },
        ];
        const report = analyzeBias(results);
        const gender = report.categories.Gender;
        const ambiguousEntry = gender.present.find(e => e.tag === AMBIGUOUS_TAG);
        expect(ambiguousEntry).toBeDefined();
        expect(ambiguousEntry?.count).toBe(1);
        expect(gender.absent).not.toContain(AMBIGUOUS_TAG);
    });

    it("lists 'ambiguous' as VOID when no classification was ambiguous", () => {
        const results = [
            { id: 0, prompt: 'doctor', tags: { Gender: 'female' } },
            { id: 1, prompt: 'doctor', tags: { Gender: 'male' } },
        ];
        const report = analyzeBias(results);
        expect(report.categories.Gender.absent).toContain(AMBIGUOUS_TAG);
    });
});

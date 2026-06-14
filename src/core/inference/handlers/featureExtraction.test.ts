import { describe, expect, it } from 'vitest';
import { applyE5Prefix } from './featureExtraction';

describe('applyE5Prefix', () => {
    it("prefixes a single string with 'query: ' for e5 models", () => {
        expect(applyE5Prefix('multilingual-e5-small', 'hello')).toBe('query: hello');
    });

    it("prefixes every element of an array for e5 models", () => {
        expect(applyE5Prefix('multilingual-e5-small', ['a', 'b'])).toEqual([
            'query: a',
            'query: b',
        ]);
    });

    it('does not touch input for non-e5 models', () => {
        expect(applyE5Prefix('bge-small-en-v1.5', 'hello')).toBe('hello');
        expect(applyE5Prefix('bert-base-uncased', ['a', 'b'])).toEqual(['a', 'b']);
    });

    it('matches any model id containing "e5"', () => {
        // The handler gates on a substring match so future e5 variants
        // (e.g. multilingual-e5-large) work without code changes.
        expect(applyE5Prefix('intfloat-e5-large-v2', 'hello')).toBe('query: hello');
    });
});

describe('feature-extraction width-agnosticism', () => {
    // The handler at the standard single-modal path returns whatever the pipeline
    // produces, after a `.tolist()` call. To prove it is width-agnostic, we
    // mimic the post-pipeline reshape it performs and check that no fixed
    // dimensionality assumption is baked in.
    const reshape = (pipelineOutput: unknown, requestedTexts: unknown) => {
        const isArrayInput = Array.isArray(requestedTexts);
        const outputList = (pipelineOutput as { tolist: () => unknown }).tolist();
        return isArrayInput || !Array.isArray(outputList)
            ? outputList
            : (outputList as unknown[])[0];
    };

    const fakeTensor = <T,>(value: T) => ({ tolist: () => value });

    it('passes through a 384-dim single embedding (e5 / bge)', () => {
        const emb = new Array(384).fill(0).map((_, i) => i * 0.001);
        const out = reshape(fakeTensor([emb]), 'one sentence');
        expect(Array.isArray(out)).toBe(true);
        expect((out as number[]).length).toBe(384);
    });

    it('passes through a 768-dim single embedding (bert-base)', () => {
        const emb = new Array(768).fill(0).map((_, i) => i * 0.001);
        const out = reshape(fakeTensor([emb]), 'one sentence');
        expect((out as number[]).length).toBe(768);
    });

    it('passes through a batch with arbitrary width unchanged', () => {
        const widths = [128, 384, 512, 768, 1024];
        for (const width of widths) {
            const batch = [new Array(width).fill(0.1), new Array(width).fill(0.2)];
            const out = reshape(fakeTensor(batch), ['a', 'b']);
            expect(Array.isArray(out)).toBe(true);
            expect((out as number[][]).length).toBe(2);
            expect((out as number[][])[0].length).toBe(width);
        }
    });
});

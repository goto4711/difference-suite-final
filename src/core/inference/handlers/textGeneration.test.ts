import { describe, expect, it } from 'vitest';
import { parseTextGenerationOutput } from './textGeneration';

describe('parseTextGenerationOutput', () => {
    it('parses array pipeline output', () => {
        expect(parseTextGenerationOutput([{ generated_text: 'array result' }])).toBe('array result');
    });

    it('parses object pipeline output', () => {
        expect(parseTextGenerationOutput({ generated_text: 'object result' })).toBe('object result');
    });

    it('throws on unsupported output shapes', () => {
        expect(() => parseTextGenerationOutput({ text: 'missing key' })).toThrow(
            'Text generation returned an unexpected format',
        );
    });
});

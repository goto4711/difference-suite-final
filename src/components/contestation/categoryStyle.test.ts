import { describe, expect, it } from 'vitest';
import {
    chipStyle,
    fallbackColor,
    isCustomCategory,
    lookupCategory,
    mergeCategoryDefs,
    solidStyle,
} from './categoryStyle';
import {
    DEFAULT_CATEGORIES,
    type CategoryDefinition,
} from '../../stores/contestationStore';

describe('lookupCategory', () => {
    it('returns the matching definition when present', () => {
        const def = lookupCategory('erasure', DEFAULT_CATEGORIES);
        expect(def.id).toBe('erasure');
        expect(def.label).toBe('Erasure');
    });

    it('synthesises a fallback for unknown ids and labels it with the raw id', () => {
        const def = lookupCategory('misattribution', DEFAULT_CATEGORIES);
        expect(def.id).toBe('misattribution');
        expect(def.label).toBe('misattribution');
        expect(def.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
});

describe('fallbackColor', () => {
    it('is deterministic for the same id', () => {
        expect(fallbackColor('mystery')).toBe(fallbackColor('mystery'));
    });

    it('returns hex values from the palette', () => {
        for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
            expect(fallbackColor(id)).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });
});

describe('isCustomCategory', () => {
    it('returns false for any seeded default', () => {
        for (const def of DEFAULT_CATEGORIES) {
            expect(isCustomCategory(def)).toBe(false);
        }
    });

    it('returns true for a user-added category', () => {
        const custom: CategoryDefinition = { id: 'misattribution', label: 'Misattribution', color: '#000' };
        expect(isCustomCategory(custom)).toBe(true);
    });
});

describe('mergeCategoryDefs', () => {
    it('preserves earlier-source priority on id collision', () => {
        const a: CategoryDefinition = { id: 'shared', label: 'A', color: '#111111' };
        const b: CategoryDefinition = { id: 'shared', label: 'B', color: '#222222' };
        const merged = mergeCategoryDefs([[a], [b]]);
        expect(merged).toHaveLength(1);
        expect(merged[0].label).toBe('A');
    });

    it('combines distinct ids from multiple sources', () => {
        const a: CategoryDefinition = { id: 'one', label: 'One', color: '#1' };
        const b: CategoryDefinition = { id: 'two', label: 'Two', color: '#2' };
        const c: CategoryDefinition = { id: 'three', label: 'Three', color: '#3' };
        const merged = mergeCategoryDefs([[a], [b, c]]);
        expect(merged.map((d) => d.id)).toEqual(['one', 'two', 'three']);
    });
});

describe('style helpers', () => {
    it('chipStyle returns a light tint with full-hex text and translucent border', () => {
        const s = chipStyle('#abcdef');
        expect(s.backgroundColor).toBe('#abcdef1a');
        expect(s.color).toBe('#abcdef');
        expect(s.border).toBe('1px solid #abcdef40');
    });

    it('solidStyle returns the full hex as background', () => {
        expect(solidStyle('#112233').backgroundColor).toBe('#112233');
    });
});

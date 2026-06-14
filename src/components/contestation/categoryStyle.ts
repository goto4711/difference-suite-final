import type { CSSProperties } from 'react';
import {
    DEFAULT_CATEGORIES,
    type CategoryDefinition,
} from '../../stores/contestationStore';

/**
 * Deterministic fallback colour for a category id we have never seen — used
 * when a packet from another participant carries a custom category and no
 * embedded definition for it. Stable across runs so a given id always paints
 * the same colour in the matrix.
 *
 * Picks from a small palette (HCL-ish hand-tuned hex) rather than a hashed
 * HSL because we want the fallbacks to coexist visually with the seeded
 * defaults; arbitrary HSL drifts into clashing pastels.
 */
const FALLBACK_PALETTE = [
    '#0f766e', // teal
    '#b45309', // amber-dark
    '#6d28d9', // violet-dark
    '#b91c1c', // red-dark
    '#1d4ed8', // blue-dark
    '#a16207', // yellow-dark
    '#7e22ce', // purple
    '#0e7490', // cyan-dark
];

const hashString = (s: string): number => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
};

export const fallbackColor = (id: string): string =>
    FALLBACK_PALETTE[hashString(id) % FALLBACK_PALETTE.length];

/**
 * Resolve a category id against a list of definitions. Always returns a
 * usable definition — synthesises a deterministic-colour fallback labelled
 * with the raw id when nothing matches.
 */
export const lookupCategory = (
    id: string,
    defs: CategoryDefinition[],
): CategoryDefinition => {
    const found = defs.find((d) => d.id === id);
    if (found) return found;
    return { id, label: id, color: fallbackColor(id) };
};

const DEFAULT_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

/**
 * True if a category id is not one of the seeded defaults — used by the
 * matrix to mark user-added or foreign-imported categories distinctly.
 */
export const isCustomCategory = (
    def: CategoryDefinition,
): boolean => !def.isDefault && !DEFAULT_IDS.has(def.id);

/**
 * Light tint + full-hex text/border, mirroring the look of the old
 * Tailwind chip palette (bg-violet-100 / text-violet-800 / border-violet-200)
 * without per-colour utility classes. `1a` ≈ 10% alpha, `40` ≈ 25%.
 */
export const chipStyle = (color: string): CSSProperties => ({
    backgroundColor: `${color}1a`,
    color,
    border: `1px solid ${color}40`,
});

/** Solid fill (for matrix dots and inline emphasis). */
export const solidStyle = (color: string): CSSProperties => ({
    backgroundColor: color,
});

/**
 * Merge category definitions from multiple sources, preferring earlier
 * sources on id collision. Use this to combine the local store's categories
 * with categories embedded in imported packets so the matrix can render any
 * id seen in any participant's records.
 */
export const mergeCategoryDefs = (
    sources: CategoryDefinition[][],
): CategoryDefinition[] => {
    const seen = new Set<string>();
    const out: CategoryDefinition[] = [];
    for (const list of sources) {
        for (const def of list) {
            if (seen.has(def.id)) continue;
            seen.add(def.id);
            out.push(def);
        }
    }
    return out;
};

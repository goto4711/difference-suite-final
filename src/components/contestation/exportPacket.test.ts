import { describe, expect, it } from 'vitest';
import {
    buildHtmlPacket,
    buildJsonPacket,
    htmlPacketFilename,
    isoDate,
    packetFilename,
} from './exportPacket';
import {
    CONTESTATION_PACKET_SCHEMA,
    isContestationPacket,
    type ContestationRecord,
} from '../../stores/contestationStore';

const rec = (overrides: Partial<ContestationRecord> = {}): ContestationRecord => ({
    id: 'r1',
    ts: Date.UTC(2026, 5, 12, 10, 0, 0),
    toolId: 'GlitchDetector',
    route: '/glitch-detector',
    outputSummary: 'cat.jpg scored 42% at 0.8 → GLITCH',
    category: 'mislabel',
    note: 'Counter-evidence: the image is fine.',
    settings: { threshold: 0.8 },
    author: 'TB',
    ...overrides,
});

describe('exportPacket — JSON', () => {
    it('produces a v1 packet that validates against the runtime guard', () => {
        const packet = buildJsonPacket([rec(), rec({ id: 'r2', toolId: 'SemanticOracle' })]);
        expect(packet.schema).toBe(CONTESTATION_PACKET_SCHEMA);
        expect(packet.records).toHaveLength(2);
        expect(typeof packet.exported).toBe('number');
        expect(isContestationPacket(packet)).toBe(true);
    });

    it('handles empty records list', () => {
        const packet = buildJsonPacket([]);
        expect(packet.records).toEqual([]);
        expect(isContestationPacket(packet)).toBe(true);
    });
});

describe('exportPacket — HTML', () => {
    it('renders a standalone document with no external assets', () => {
        const html = buildHtmlPacket([rec()]);
        expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
        // No external stylesheet, no external scripts, no remote images.
        expect(html).not.toMatch(/<link\b[^>]*href=/i);
        expect(html).not.toMatch(/<script\b/i);
        expect(html).not.toMatch(/https?:\/\//);
    });

    it('escapes HTML in user notes (no injection)', () => {
        const malicious = rec({
            note: '<script>alert(1)</script> & "quoted" \'apostrophe\'',
        });
        const html = buildHtmlPacket([malicious]);
        expect(html).not.toMatch(/<script>alert\(1\)<\/script>/);
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('&amp;');
        expect(html).toContain('&quot;');
        expect(html).toContain('&#39;');
    });

    it('does not truncate long notes in exports', () => {
        const long = 'A'.repeat(1000);
        const html = buildHtmlPacket([rec({ note: long })]);
        expect(html).toContain(long);
    });

    it('groups records by tool', () => {
        const html = buildHtmlPacket([
            rec({ toolId: 'GlitchDetector', id: 'a' }),
            rec({ toolId: 'SemanticOracle', id: 'b' }),
            rec({ toolId: 'GlitchDetector', id: 'c' }),
        ]);
        expect(html.indexOf('GlitchDetector')).toBeGreaterThan(-1);
        expect(html.indexOf('SemanticOracle')).toBeGreaterThan(-1);
        // (2) marks the GlitchDetector group count
        expect(html).toMatch(/GlitchDetector\s*<span class="count">\(2\)<\/span>/);
        expect(html).toMatch(/SemanticOracle\s*<span class="count">\(1\)<\/span>/);
    });

    it('renders an empty-state summary when there are no records', () => {
        const html = buildHtmlPacket([]);
        expect(html).toContain('No contestations recorded.');
    });
});

describe('exportPacket — filename helpers', () => {
    it('uses ISO date in filenames', () => {
        const ts = Date.UTC(2026, 5, 12, 10, 0, 0);
        expect(isoDate(ts)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(packetFilename(ts).endsWith('.json')).toBe(true);
        expect(packetFilename(ts).startsWith('contestations-')).toBe(true);
        expect(htmlPacketFilename(ts).endsWith('.html')).toBe(true);
    });
});

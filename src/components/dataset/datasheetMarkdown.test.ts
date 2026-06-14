import { describe, expect, it } from 'vitest';
import { renderDatasheetMarkdown } from './datasheetMarkdown';
import { buildDatasheet } from './datasheetBuilder';
import type { Collection, DataItem } from '@difference-suite/shared/types';
import { EMPTY_USER_FIELDS } from './datasheetSchema';

const coll: Collection = { id: 'c1', name: 'Test set', created: 1000 };

const item = (overrides: Partial<DataItem> = {}): DataItem => ({
    id: `i-${Math.random()}`,
    name: 'x.txt',
    type: 'text',
    content: 'x',
    metadata: { size: 1, lastModified: 100, mimeType: 'text/plain' },
    ...overrides,
});

describe('renderDatasheetMarkdown', () => {
    it('includes every Datasheets-for-Datasets section header', () => {
        const md = renderDatasheetMarkdown(buildDatasheet(coll, [item()]));
        for (const heading of [
            '## Header',
            '## Motivation',
            '## Composition',
            '## Collection Process',
            '## Preprocessing / Cleaning / Labeling',
            '## Uses',
            '## Distribution',
            '## Maintenance',
            '## Provenance',
            '## Caveats',
        ]) {
            expect(md).toContain(heading);
        }
    });

    it('documents the HuggingFace dataset repo layout', () => {
        const md = renderDatasheetMarkdown(buildDatasheet(coll, []));
        expect(md).toContain('Mapping to a HuggingFace dataset repository');
        expect(md).toContain('README.md');
        expect(md).toContain('data/manifest.json');
        expect(md).toContain('EU-SSHOC');
    });

    it('renders user fields when set and a "(not provided)" marker when blank', () => {
        const md = renderDatasheetMarkdown(
            buildDatasheet(coll, [], {
                ...EMPTY_USER_FIELDS,
                motivation: 'Workshop on bias',
                limitations: '',
            }),
        );
        expect(md).toContain('Workshop on bias');
        expect(md).toContain('_(not provided)_');
    });

    it('shows item-type counts in the composition section', () => {
        const md = renderDatasheetMarkdown(
            buildDatasheet(coll, [item({ type: 'image' }), item({ type: 'image' }), item({ type: 'text' })]),
        );
        expect(md).toMatch(/\*\*image\*\*:\s*2/);
        expect(md).toMatch(/\*\*text\*\*:\s*1/);
    });

    it('includes the appCommit in the provenance section', () => {
        const md = renderDatasheetMarkdown(buildDatasheet(coll, [item()]));
        // Build-time global is stubbed to 'test' in vitest.setup.ts.
        expect(md).toContain('`test`');
    });
});

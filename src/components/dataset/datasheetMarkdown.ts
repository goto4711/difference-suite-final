import { HF_REPO_LAYOUT, type DatasheetData } from './datasheetSchema';

const isoDateTime = (ts: number): string => new Date(ts).toISOString();

const fence = (s: string): string => s.replace(/\r?\n/g, '\n');

const fmtUserField = (heading: string, value: string): string => {
    const trimmed = value.trim();
    return `### ${heading}\n\n${trimmed ? fence(trimmed) : '_(not provided)_'}\n`;
};

const fmtCounts = (counts: Record<string, number>): string => {
    const entries = Object.entries(counts);
    if (entries.length === 0) return '- (none)';
    return entries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `- **${k}**: ${v}`)
        .join('\n');
};

const fmtRange = (range: { firstTs: number | null; lastTs: number | null }): string => {
    if (range.firstTs === null || range.lastTs === null) return '_(no timestamps available)_';
    return `${isoDateTime(range.firstTs)} → ${isoDateTime(range.lastTs)}`;
};

/**
 * Render a Datasheets-for-Datasets-style markdown document. The output is the
 * file an exporter would drop in as a HuggingFace dataset repo's README.md.
 */
export const renderDatasheetMarkdown = (data: DatasheetData): string => {
    const { auto, user } = data;
    const sample =
        auto.sourceFileSamples.length === 0
            ? '_(no items)_'
            : auto.sourceFileSamples.map((n) => `- \`${n}\``).join('\n');

    return [
        `# Datasheet — ${auto.name}`,
        '',
        auto.description ? `> ${auto.description}` : '',
        '',
        '## Header',
        '',
        `- **Name**: ${auto.name}`,
        `- **Exported**: ${isoDateTime(auto.exportedAt)}`,
        `- **App commit**: \`${auto.appCommit}\`${auto.appVersion ? ` (version ${auto.appVersion})` : ''}`,
        '',
        '## Motivation',
        '',
        fmtUserField('For what purpose was the dataset created?', user.motivation),
        fmtUserField('Who funded the creation of the dataset?', user.fundingAndContext),
        '## Composition',
        '',
        `**Total items**: ${auto.totalItems}`,
        '',
        '**Items by type:**',
        '',
        fmtCounts(auto.itemCountsByType),
        '',
        `**Embeddings**: ${auto.hasEmbeddings ? `present for ${auto.embeddingCount} item(s); dimensionality ${auto.embeddingDim ?? 'mixed'}` : 'none'}`,
        '',
        '**Item sample (first 10 names):**',
        '',
        sample,
        '',
        fmtUserField('Does the dataset contain sensitive content?', user.sensitiveContentNote),
        fmtUserField('Does the dataset depict identifiable people?', user.peopleDepictedNote),
        '## Collection Process',
        '',
        `**Item timestamp range**: ${fmtRange(auto.collectionTimeRange)}`,
        '',
        fmtUserField('How was the data collected?', user.collectionMethod),
        fmtUserField('If the data involves people: consent, recruitment, IRB?', user.recruitmentEthics),
        '## Preprocessing / Cleaning / Labeling',
        '',
        fmtUserField('What preprocessing was applied?', user.preprocessingNotes),
        '## Uses',
        '',
        fmtUserField('What are the intended uses?', user.intendedUses),
        fmtUserField('Are there known uses for which this dataset should NOT be used?', user.knownNonUses),
        '## Distribution',
        '',
        fmtUserField('Under what licence is the dataset distributed?', user.license),
        '',
        '```',
        HF_REPO_LAYOUT,
        '```',
        '',
        '## Maintenance',
        '',
        fmtUserField('Who is the maintainer / point of contact?', user.maintainerContact),
        fmtUserField('Where will the dataset be hosted, and for how long?', user.hostingPlan),
        '## Provenance',
        '',
        `- **App commit**: \`${auto.appCommit}\``,
        auto.appVersion ? `- **App version**: \`${auto.appVersion}\`` : '',
        auto.activeEmbeddingModel ? `- **Active embedding model**: \`${auto.activeEmbeddingModel}\`` : '',
        auto.modelsUsed.length > 0
            ? `- **Models referenced**: ${auto.modelsUsed.map((m) => `\`${m}\``).join(', ')}`
            : '- **Models referenced**: _(none recorded)_',
        '',
        '## Caveats',
        '',
        fmtUserField('What are the known biases of this dataset?', user.knownBiases),
        fmtUserField('What are the limitations?', user.limitations),
    ]
        .filter((line) => line !== null && line !== undefined)
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');
};

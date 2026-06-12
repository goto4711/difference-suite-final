// Display labels for demographic categories. Internal keys (Gender, Race, Age,
// Setting) must not change — BiasAnalyzer and GeneratorEngine key data by them.
// These labels surface CLIP as the measuring instrument: every demographic
// reading in this tool is a machine perception by CLIP, not a fact about the
// person depicted.
export const CATEGORY_DISPLAY: Record<string, string> = {
    Gender: 'CLIP-perceived gender',
    Race: 'CLIP-perceived race',
    Age: 'CLIP-perceived age',
    Setting: 'CLIP-perceived setting',
};

export const displayCategory = (key: string): string => CATEGORY_DISPLAY[key] ?? key;

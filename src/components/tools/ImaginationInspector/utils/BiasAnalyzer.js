/**
 * BiasAnalyzer.js
 * Analyzes the tags from generated images to find presence and absence.
 */

export const analyzeBias = (generatedResults) => {
    if (!generatedResults || generatedResults.length === 0) return null;

    const total = generatedResults.length;
    const categories = Object.keys(generatedResults[0].tags);

    const stats = {};

    // Initialize stats
    categories.forEach(cat => {
        stats[cat] = {};
    });

    // Count occurrences
    generatedResults.forEach(item => {
        for (const [cat, tag] of Object.entries(item.tags)) {
            if (!stats[cat][tag]) stats[cat][tag] = 0;
            stats[cat][tag]++;
        }
    });

    // Calculate percentages and identify absences
    const report = {
        totalImages: total,
        categories: {}
    };

    categories.forEach(cat => {
        const catStats = stats[cat];
        const presentTags = [];
        const allKnownTags = getAllKnownTags(cat); // Helper to know what *could* exist

        // Calculate presence
        for (const [tag, count] of Object.entries(catStats)) {
            presentTags.push({
                tag,
                count,
                percentage: (count / total) * 100
            });
        }

        // Identify absences (Known tags that have 0 count)
        const absentTags = allKnownTags.filter(known => !catStats[known]);

        report.categories[cat] = {
            present: presentTags.sort((a, b) => b.count - a.count),
            absent: absentTags
        };
    });

    return report;
};

// Helper to define the "Universe of Possibility" for demographic tags.
// Keys must match the capitalized tag keys produced by GeneratorEngine.
const getAllKnownTags = (category) => {
    const UNIVERSE = {
        Gender: ['male', 'female', 'non-binary'],
        Race: ['white', 'black', 'asian', 'hispanic', 'middle eastern'],
        Age: ['young', 'middle-aged', 'elderly'],
        Setting: ['office', 'outdoor', 'hospital', 'home', 'studio'],
    };
    return UNIVERSE[category] || [];
};

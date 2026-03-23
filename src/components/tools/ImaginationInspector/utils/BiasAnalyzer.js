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

// Helper to define the "Universe of Possibility" for our mock world
// In a real app, this would be a comprehensive ontology
const getAllKnownTags = (category) => {
    const UNIVERSE = {
        gender: ['male', 'female', 'non-binary'],
        race: ['white', 'black', 'asian', 'hispanic', 'middle_eastern', 'indigenous'],
        age: ['young', 'middle_aged', 'old', 'child'],
        style: ['casual', 'formal', 'suit', 'scrubs', 'military', 'traditional'],
        setting: ['indoors', 'outdoors', 'office', 'hospital', 'home', 'street', 'desert', 'urban_ruins']
    };
    return UNIVERSE[category] || [];
};

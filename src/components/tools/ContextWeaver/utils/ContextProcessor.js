import { transformersClient } from '../../../../core/inference/TransformersClient';

// Compute cosine similarity between two vectors
const cosineSimilarity = (a, b) => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
};

export const processContexts = async (queryText, contexts) => {
    // Embed the query using Transformers.js
    const queryResult = await transformersClient.run({
        id: crypto.randomUUID(),
        tool: 'ContextWeaver',
        model: 'bge-small-en-v1.5',
        task: 'feature-extraction',
        payload: { text: queryText }
    });
    const queryEmbedding = queryResult.output;

    // Process each context
    const results = [];

    for (const context of contexts) {
        // Embed all items in this context using batch processing
        const batchResult = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'ContextWeaver',
            model: 'bge-small-en-v1.5',
            task: 'feature-extraction',
            payload: { texts: context.items }
        });
        const contextEmbeddings = batchResult.output;

        // Compute similarities
        const similarities = contextEmbeddings.map((embedding, i) => ({
            text: context.items[i],
            similarity: cosineSimilarity(queryEmbedding, embedding),
            vector: embedding // Store raw vector
        }));

        // Sort by similarity (descending) and take top 5
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topMatches = similarities.slice(0, 5);

        results.push({
            contextName: context.name,
            color: context.color,
            matches: topMatches,
            queryVector: queryEmbedding // Store query vector for comparison
        });
    }

    return results;
};

export const extractSemanticKeywords = async (fullText, count = 30) => {
    if (!fullText || !fullText.trim()) return [];

    // 1. Tokenize and clean
    const words = fullText
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3) // Filter short words/stops
        .filter((w, i, arr) => arr.indexOf(w) === i); // Unique

    if (words.length === 0) return [];

    // Limit processing candidate pool
    const candidates = words.slice(0, 500);

    // 2. Embed the full text to get the "Topic Vector"
    const contextStr = fullText.slice(0, 5000);
    const textVectorResult = await transformersClient.run({
        id: crypto.randomUUID(),
        tool: 'ContextWeaver',
        model: 'bge-small-en-v1.5',
        task: 'feature-extraction',
        payload: { text: contextStr }
    });
    const textVector = textVectorResult.output;

    // 3. Embed all candidate words simultaneously using batching
    const candidateVectorsResult = await transformersClient.run({
        id: crypto.randomUUID(),
        tool: 'ContextWeaver',
        model: 'bge-small-en-v1.5',
        task: 'feature-extraction',
        payload: { texts: candidates }
    });
    const candidateVectors = candidateVectorsResult.output;

    // 4. Calculate similarity of each word to the topic vector
    const scoredWords = candidates.map((word, i) => ({
        word: word,
        score: cosineSimilarity(textVector, candidateVectors[i])
    }));

    // 5. Sort by semantic relevance (closest to the topic)
    scoredWords.sort((a, b) => b.score - a.score);

    return scoredWords.slice(0, count).map(dw => dw.word);
};

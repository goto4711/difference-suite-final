import { transformersClient } from '../../../../core/inference/TransformersClient';
import type { DataItem } from '@difference-suite/shared/types';

export interface AlignmentResult {
    id: string;
    name: string;
    url: string;
    score: number;
}

type AlignmentScore = {
    url: string;
    score: number;
};

export const alignDatasetToPrompt = async (prompt: string, dataset: DataItem[]): Promise<AlignmentResult[]> => {
    if (!prompt.trim()) return [];

    const imageItems = dataset.filter(item => item.type === 'image');
    if (imageItems.length === 0) return [];

    const imageUrls = imageItems.map(item => item.content as string);

    try {
        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'ImaginationInspector',
            model: 'clip-vit-base-patch32-q4',
            task: 'multimodal-alignment',
            payload: { 
                query: prompt, 
                candidates: imageUrls, 
                queryType: 'text', 
                candidateType: 'image' 
            }
        });

        const alignments = result.output as AlignmentScore[];

        // Map back to dataset items
        return alignments.map(a => {
            const item = imageItems.find(img => img.content === a.url);
            return {
                id: item?.id || '',
                name: item?.name || 'Unknown',
                url: a.url,
                score: a.score
            };
        });
    } catch (error) {
        console.error("Dataset alignment failed:", error);
        return [];
    }
};

export const findBestMatch = async (description: string, dataset: DataItem[]): Promise<string | null> => {
    try {
        const matches = await alignDatasetToPrompt(description, dataset);
        return matches.length > 0 ? matches[0].url : null;
    } catch (e) {
        console.error("Match failed:", e);
        return null;
    }
};

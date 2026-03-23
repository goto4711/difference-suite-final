import { transformersClient } from '../../../../core/inference/TransformersClient';

export interface GeneratedResult {
    id: number;
    prompt: string;
    syntheticPrompt: string;
    tags: Record<string, string>;
    image: string | null;
    color: string;
}

export const generateImages = async (prompt: string, count = 5): Promise<GeneratedResult[]> => {
    try {
        // 1. Ask SmolLM2 to imagine the prompt AND provide tags in a structured format
        const oraclePrompt = `Imagine ${count} stereotypical visual representations of a "${prompt}". 
For each, provide:
- Description: (A one-sentence visual description)
- Gender: (e.g., male, female, non-binary)
- Race: (e.g., white, black, asian, hispanic)
- Age: (e.g., young, middle-aged, old)
- Setting: (e.g., office, street, hospital)

Format as a numbered list.`;
        
        const textResult = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'ImaginationInspector',
            model: 'smollm2-135m-instruct',
            task: 'text-generation',
            payload: {
                prompt: `<|im_start|>user\n${oraclePrompt}<|im_end|>\n<|im_start|>assistant\n`,
                options: { max_new_tokens: 600, temperature: 0.7, do_sample: true }
            }
        });

        const generatedText = (textResult.output as string) || '';
        
        // 2. Parse the output into results
        const results: GeneratedResult[] = [];
        const blocks = generatedText.split(/\d+\.\s+/).filter(b => b.trim().length > 20);

        for (let i = 0; i < blocks.length && i < count; i++) {
            const block = blocks[i];
            
            // Extract fields using simple Regex
            const description = block.match(/Description:\s*(.*?)(?=\n|$|- )/i)?.[1] || "A conceptual image";
            const gender = block.match(/Gender:\s*(.*?)(?=\n|$|- )/i)?.[1] || "unknown";
            const race = block.match(/Race:\s*(.*?)(?=\n|$|- )/i)?.[1] || "unknown";
            const age = block.match(/Age:\s*(.*?)(?=\n|$|- )/i)?.[1] || "unknown";
            const setting = block.match(/Setting:\s*(.*?)(?=\n|$|- )/i)?.[1] || "unknown";

            results.push({
                id: i,
                prompt,
                syntheticPrompt: description,
                tags: {
                    Gender: gender.trim().toLowerCase(),
                    Race: race.trim().toLowerCase(),
                    Age: age.trim().toLowerCase(),
                    Setting: setting.trim().toLowerCase()
                },
                image: null,
                color: gender.toLowerCase().includes('female') ? '#ffcccb' : '#add8e6'
            });
        }

        // Fallback
        if (results.length === 0) {
            results.push({
                id: 0,
                prompt,
                syntheticPrompt: generatedText.slice(0, 150) + "...",
                tags: { Status: "Unstructured Output" },
                image: null,
                color: '#e0e0e0'
            });
        }

        return results;
    } catch (error) {
        console.error("GeneratorEngine error:", error);
        throw error;
    }
};

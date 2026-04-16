import {
    Sparkles,
    BrainCircuit,
    FileText,
    Image as ImageIcon
} from 'lucide-react';

export const TOOLS = [
    {
        path: '/semantic-oracle-pro',
        label: 'Semantic Oracle Pro',
        icon: BrainCircuit,
        description: 'Consult the local intelligence with Gemma 4.'
    },
    {
        path: '/imagination-inspector-pro',
        label: 'Imagination Inspector Pro',
        icon: Sparkles,
        description: 'Probe generative imagination with SD Turbo and Gemma 4.'
    },
    {
        path: '/visual-storyteller-pro',
        label: 'Visual Storyteller Pro',
        icon: FileText,
        description: 'Generate rich AI captions from images with Gemma 4.'
    },
    {
        path: '/sd-showcase',
        label: 'SD Turbo Showcase',
        icon: ImageIcon,
        description: 'Generate images directly in the browser.'
    }
];

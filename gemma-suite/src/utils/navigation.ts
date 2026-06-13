import {
    Sparkles,
    BrainCircuit,
    FileText,
    BookOpen
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
        description: 'Read the Stable Bias corpus with Gemma 4 commentary.'
    },
    {
        path: '/visual-storyteller-pro',
        label: 'Visual Storyteller Pro',
        icon: FileText,
        description: 'Generate rich AI captions from images with Gemma 4.'
    }
];

/**
 * Extra entries rendered under "Main Menu" in the sidebar, alongside the
 * Data Dashboard link. Use for non-tool pages (background docs, future
 * Machine Room, etc.).
 */
export const MAIN_MENU_EXTRAS = [
    {
        path: '/about',
        label: 'About this suite',
        icon: BookOpen,
        description: 'Background document — written June 2026.'
    }
];

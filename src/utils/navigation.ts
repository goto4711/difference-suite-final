import {
    Search,
    Share2,
    Clock,
    Zap,
    Layers,
    AlertTriangle,
    Image as ImageIcon,
    Sliders,
    FileText,
    Sparkles,
    BrainCircuit
} from 'lucide-react';

export const TOOLS = [
    {
        path: '/ambiguity-amplifier',
        label: 'Ambiguity Amplifier',
        icon: Zap,
        description: 'Amplify ambiguous elements in the data stream.'
    },
    {
        path: '/context-weaver',
        label: 'Context Weaver',
        icon: Share2,
        description: 'Weave together context from multiple sources.'
    },
    {
        path: '/deep-vector-mirror',
        label: 'Deep Vector Mirror',
        icon: Layers,
        description: ' Visualize deep learning vectorization.'
    },
    {
        path: '/detail-extractor',
        label: 'Detail Extractor',
        icon: Search,
        description: 'Analyze and extract fine-grained details from images.'
    },
    {
        path: '/discontinuity-detector',
        label: 'Discontinuity Detector',
        icon: Clock,
        description: 'Detect temporal and spatial discontinuities.'
    },
    {
        path: '/glitch-detector',
        label: 'Glitch Detector',
        icon: AlertTriangle,
        description: 'Identify and analyze system glitches.'
    },
    {
        path: '/imagination-inspector',
        label: 'Imagination Inspector',
        icon: Sparkles,
        description: 'Probe the boundaries of generative imagination.'
    },
    {
        path: '/latent-navigator',
        label: 'Latent Space Navigator',
        icon: Layers,
        description: 'Navigate through the latent space of the model.'
    },
    {
        path: '/networked-narratives',
        label: 'Networked Narratives',
        icon: FileText,
        description: 'Explore narrative structures in networked data.'
    },
    {
        path: '/noise-predictor',
        label: 'Noise Predictor',
        icon: ImageIcon,
        description: 'Predict and visualize noise patterns.'
    },
    {
        path: '/threshold-adjuster',
        label: 'Threshold Adjuster',
        icon: Sliders,
        description: 'Fine-tune detection thresholds.'
    },
    {
        path: '/semantic-oracle',
        label: 'Semantic Oracle',
        icon: BrainCircuit,
        description: 'Consult the local intelligence for definitions and ideas.'
    },
    {
        path: '/visual-storyteller',
        label: 'Visual Storyteller',
        icon: FileText,
        description: 'Generate AI captions from images.'
    },
];

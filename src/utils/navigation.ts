import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
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
    BrainCircuit,
    Timer,
    Cog,
    MessageSquareWarning,
    Users,
    type LucideIcon
} from 'lucide-react';

const MachineRoom = lazy(() => import('../components/machineRoom/MachineRoom'));
const ContestationsPage = lazy(() => import('../components/contestation/ContestationsPage'));
const CollaborationPage = lazy(() => import('../components/contestation/CollaborationPage'));
const AmbiguityAmplifier = lazy(() => import('../components/tools/AmbiguityAmplifier/AmbiguityAmplifier'));
const ContextWeaver = lazy(() => import('../components/tools/ContextWeaver/ContextWeaver'));
const DeepVectorMirror = lazy(() => import('../components/tools/DeepVectorMirror/DeepVectorMirror'));
const DeepTime = lazy(() => import('../components/tools/DeepTime/DeepTime'));
const DepthMirror = lazy(() => import('../components/tools/DepthMirror/DepthMirror'));
const DetailExtractor = lazy(() => import('../components/tools/DetailExtractor/DetailExtractor'));
const DiscontinuityDetector = lazy(() => import('../components/tools/DiscontinuityDetector/DiscontinuityDetector'));
const GlitchDetector = lazy(() => import('../components/tools/GlitchDetector/GlitchDetector'));
const ImaginationInspector = lazy(() => import('../components/tools/ImaginationInspector/ImaginationInspector'));
const LatentSpaceNavigator = lazy(() => import('../components/tools/LatentSpaceNavigator/LatentSpaceNavigator'));
const NetworkedNarratives = lazy(() => import('../components/tools/NetworkedNarratives/NetworkedNarratives'));
const NoisePredictor = lazy(() => import('../components/tools/NoisePredictor/NoisePredictor'));
const SemanticOracle = lazy(() => import('../components/tools/SemanticOracle/SemanticOracle'));
const ThresholdAdjuster = lazy(() => import('../components/tools/ThresholdAdjuster/ThresholdAdjuster'));
const VisualStoryteller = lazy(() => import('../components/tools/VisualStoryteller/VisualStoryteller'));

export interface ToolDefinition {
    path: string;
    label: string;
    icon: LucideIcon;
    description: string;
    component: LazyExoticComponent<ComponentType>;
    /**
     * String that this tool passes as `request.tool` to TransformersClient.
     * Drives the "Show the machine's work" drawer's per-tool filter.
     * Omit for tools that do not run inference.
     */
    toolId?: string;
}

/**
 * Entries rendered in the sidebar's "Main Menu" section, alongside Data
 * Dashboard. The Machine Room is the suite's engine room — it inspects
 * the inference layer itself rather than being a keyword tool.
 */
export const MAIN_MENU_EXTRAS: ToolDefinition[] = [
    {
        path: '/machine-room',
        label: 'Machine Room',
        icon: Cog,
        description: 'See which models are loaded, what was evicted, what failed, in plain language.',
        component: MachineRoom,
    },
    {
        path: '/contestations',
        label: 'Contestations',
        icon: MessageSquareWarning,
        description: 'Your recorded dissent against tool outputs. Export as an evidence packet.',
        component: ContestationsPage,
    },
    {
        path: '/collaboration',
        label: 'Collaboration',
        icon: Users,
        description: 'Import packets from other participants. Make group disagreement visible.',
        component: CollaborationPage,
    },
];

export const TOOLS: ToolDefinition[] = [
    {
        path: '/ambiguity-amplifier',
        label: 'Ambiguity Amplifier',
        icon: Zap,
        description: 'Amplify ambiguous elements in the data stream.',
        component: AmbiguityAmplifier,
        toolId: 'AmbiguityAmplifier'
    },
    {
        path: '/context-weaver',
        label: 'Context Weaver',
        icon: Share2,
        description: 'Weave together context from multiple sources.',
        component: ContextWeaver,
        toolId: 'ContextWeaver'
    },
    {
        path: '/deep-vector-mirror',
        label: 'Deep Vector Mirror',
        icon: Layers,
        description: 'Visualize deep learning vectorization.',
        component: DeepVectorMirror,
        toolId: 'DeepVectorMirror'
    },
    {
        path: '/deep-time',
        label: 'Deep Time',
        icon: Timer,
        description: 'Explore how AI architectures handle time and memory.',
        component: DeepTime,
        toolId: 'DeepTime'
    },
    {
        path: '/depth-mirror',
        label: 'Depth Mirror',
        icon: ImageIcon,
        description: 'Estimate and visualize depth cues in images.',
        component: DepthMirror,
        toolId: 'DepthMirror'
    },
    {
        path: '/detail-extractor',
        label: 'Detail Extractor',
        icon: Search,
        description: 'Analyze and extract fine-grained details from images.',
        component: DetailExtractor,
        toolId: 'DetailExtractor'
    },
    {
        path: '/discontinuity-detector',
        label: 'Discontinuity Detector',
        icon: Clock,
        description: 'Detect temporal and spatial discontinuities.',
        component: DiscontinuityDetector,
        toolId: 'DiscontinuityDetector'
    },
    {
        path: '/glitch-detector',
        label: 'Glitch Detector',
        icon: AlertTriangle,
        description: 'Identify and analyze system glitches.',
        component: GlitchDetector,
        toolId: 'GlitchDetector'
    },
    {
        path: '/imagination-inspector',
        label: 'Imagination Inspector',
        icon: Sparkles,
        description: 'Probe the boundaries of generative imagination.',
        component: ImaginationInspector,
        toolId: 'ImaginationInspector'
    },
    {
        path: '/latent-navigator',
        label: 'Latent Space Navigator',
        icon: Layers,
        description: 'Navigate through the latent space of the model.',
        component: LatentSpaceNavigator,
        toolId: 'LatentSpaceNavigator'
    },
    {
        path: '/networked-narratives',
        label: 'Networked Narratives',
        icon: FileText,
        description: 'Explore narrative structures in networked data.',
        component: NetworkedNarratives,
        toolId: 'NetworkedNarratives'
    },
    {
        path: '/noise-predictor',
        label: 'Noise Predictor',
        icon: ImageIcon,
        description: 'Predict and visualize noise patterns.',
        component: NoisePredictor,
        toolId: 'NoisePredictor'
    },
    {
        path: '/threshold-adjuster',
        label: 'Threshold Adjuster',
        icon: Sliders,
        description: 'Fine-tune detection thresholds.',
        component: ThresholdAdjuster,
        toolId: 'ThresholdAdjuster'
    },
    {
        path: '/semantic-oracle',
        label: 'Semantic Oracle',
        icon: BrainCircuit,
        description: 'Consult the local intelligence for definitions and ideas.',
        component: SemanticOracle,
        toolId: 'SemanticOracle'
    },
    {
        path: '/visual-storyteller',
        label: 'Visual Storyteller',
        icon: FileText,
        description: 'Generate AI captions from images.',
        component: VisualStoryteller,
        toolId: 'VisualStoryteller'
    },
];

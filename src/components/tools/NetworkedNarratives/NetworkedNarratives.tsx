import { useState, useMemo, useEffect } from 'react';
import { Share2, FileText, Search, Network, X, Image } from 'lucide-react';
import { NLPProcessor } from './components/NLPProcessor';
import { GraphViz } from './components/GraphViz';
import { useSuiteStore } from '../../../stores/suiteStore';
import ToolLayout from '../../shared/ToolLayout';
import { transformersClient } from '../../../core/inference/TransformersClient';

const DEFAULT_TEXT = "During World War II, the French Resistance played a critical role against the Nazi occupation. Jean Moulin was sent by Charles de Gaulle from London to unite the various movements. In Lyon, Moulin organized the secret army to fight the Gestapo. The Allies coordinated with the Resistance before the invasion of Normandy. General Eisenhower later praised the efforts of the French forces in liberating Paris.";

const NetworkedNarratives = () => {
    const { dataset, activeItem } = useSuiteStore();
    const selectedItem = dataset.find(i => i.id === activeItem);
    const textItems = useMemo(() => dataset.filter(i => i.type === 'text'), [dataset]);
    const imageItems = useMemo(() => dataset.filter(i => i.type === 'image'), [dataset]);

    const [text, setText] = useState(DEFAULT_TEXT);
    const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');
    const [enableVisualSynapse, setEnableVisualSynapse] = useState(false);

    const processor = useMemo(() => new NLPProcessor(), []);

    // Use selected text if available
    useEffect(() => {
        if (selectedItem?.type === 'text') {
            setText(selectedItem.content as string);
        }
    }, [selectedItem]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setProgress(0.1);
        setProgressStatus('Extracting entities...');

        try {
            // 1. Text NLP Extraction
            const data = processor.process(text);
            setProgress(0.4);

            // 2. Multimodal Injection (Visual Synapse) - OPTIONAL
            if (enableVisualSynapse && imageItems.length > 0 && data.nodes.length > 0) {
                setProgressStatus('Initializing CLIP synapse...');
                console.log('Starting Visual Synapse injection...');
                const imageUrls = imageItems.map(i => i.content as string);

                // Track used images to prevent duplicates
                const usedImageUrls = new Set<string>();

                // For each major entity, find matching images
                // Limit to top entities to save compute
                const entities = data.nodes.slice(0, 30);

                for (let i = 0; i < entities.length; i++) {
                    const entity = entities[i];
                    try {
                        const result = await transformersClient.run(
                            {
                                id: crypto.randomUUID(),
                                tool: 'NetworkedNarratives',
                                model: 'clip-vit-base-patch32-q4',
                                task: 'multimodal-alignment',
                                payload: { 
                                    query: entity.name, 
                                    candidates: imageUrls, 
                                    queryType: 'text', 
                                    candidateType: 'image' 
                                }
                            },
                            (p) => setProgressStatus(`Matching: ${entity.name}...`)
                        );

                        const matches = result.output as { url: string; score: number }[];

                        if (matches.length > 0) {
                            console.log(`Matching '${entity.name}'... Best: ${matches[0].score}`);
                        }

                        // Find best match that hasn't been used yet (RAISED THRESHOLD to 0.25)
                        const bestUnused = matches.find(m => m.score > 0.25 && !usedImageUrls.has(m.url));

                        if (bestUnused) {
                            usedImageUrls.add(bestUnused.url);

                            // Add Image Node
                            const imageNodeId = `img_${entity.id}`;
                            const imageNode = {
                                id: imageNodeId,
                                name: "Visual Match",
                                type: 'image',
                                val: 5,
                                img: bestUnused.url
                            };

                            data.nodes.push(imageNode);
                            data.links.push({
                                source: entity.id,
                                target: imageNodeId,
                                color: '#ADFC92'
                            });
                        }
                    } catch (e) {
                        console.warn('Visual Synapse failed for entity', entity.name, e);
                    }

                    setProgress(0.4 + ((i / entities.length) * 0.6));
                }
            }

            setGraphData({ ...data }); // Trigger update
            setSelectedNode(null);

        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
            setProgress(0);
        }
    };

    // Initial analysis
    useEffect(() => {
        handleAnalyze();
    }, [text]);

    const renderHighlightedText = () => {
        if (!graphData.nodes.length) return text;

        const entityMap = new Map();
        graphData.nodes.forEach((node: any) => {
            entityMap.set(node.name.toLowerCase(), node.type);
        });

        const escapedNames = graphData.nodes
            .map((n: any) => n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .sort((a: string, b: string) => b.length - a.length);

        if (escapedNames.length === 0) return text;

        const regex = new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, i) => {
            const lowerPart = part.toLowerCase();
            if (entityMap.has(lowerPart)) {
                const type = entityMap.get(lowerPart);
                const colorClass = type === 'person' ? 'bg-[var(--color-main-secondary)] text-[var(--color-main)]' :
                    type === 'place' ? 'bg-[var(--color-alt)] text-[var(--color-main)]' :
                        type === 'concept' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-[#ff4d4d] text-white';

                return (
                    <span key={i} className={`${colorClass} px-1 rounded font-bold border ${type === 'event' ? '' : 'border-current'} mx-0.5`}>
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    const mainContent = (
        <div className="flex flex-col gap-6 h-full p-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-main flex items-center gap-2">
                            <Share2 className="w-5 h-5" />
                            Relational Network
                        </h2>
                        <p className="text-xs text-text-muted">Interactive visualization of extracted entities</p>
                    </div>
                </div>
                <div className="flex-1 min-h-0 relative bg-[#D3D3D3]">
                    <GraphViz
                        data={graphData}
                        onNodeClick={setSelectedNode}
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-48 flex flex-col overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-main">Annotated Narrative</h3>
                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1 text-text-muted">
                            <span className="w-2 h-2 rounded-full bg-[var(--color-main-secondary)] border border-main"></span> Person
                        </span>
                        <span className="flex items-center gap-1 text-text-muted">
                            <span className="w-2 h-2 rounded-full bg-[var(--color-alt)] border border-main"></span> Place
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                            <span className="w-2 h-2 rounded-full bg-amber-400 border border-amber-600"></span> Concept
                        </span>
                        <span className="flex items-center gap-1 text-text-muted">
                            <span className="w-2 h-2 rounded-full bg-[#ff4d4d]"></span> Event
                        </span>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto text-sm leading-relaxed font-serif">
                    {renderHighlightedText()}
                </div>
            </div>
        </div>
    );

    const sideContent = (
        <div className="flex flex-col h-full gap-6 p-1">
            {/* Input Panel */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0">
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide text-text-muted">
                    <FileText className="w-4 h-4" />
                    Narrative Input
                </h2>

                {textItems.length > 0 && (
                    <div className="mb-4">
                        <label className="text-xs font-bold text-text-muted block mb-1">Load from Collection:</label>
                        <select
                            onChange={(e) => {
                                const item = textItems.find(i => i.id === e.target.value);
                                if (item && typeof item.content === 'string') {
                                    setText(item.content);
                                }
                            }}
                            className="w-full text-xs p-2 rounded border border-gray-300 focus:border-main focus:ring-1 focus:ring-main outline-none bg-white"
                            defaultValue=""
                        >
                            <option value="" disabled>Select a document...</option>
                            {textItems.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full flex-1 resize-none font-mono text-xs leading-relaxed p-3 mb-4 rounded border border-gray-300 focus:border-main focus:ring-1 focus:ring-main outline-none"
                    placeholder="Enter narrative text..."
                />
                {/* Visual Synapse Toggle */}
                <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={enableVisualSynapse}
                        onChange={(e) => setEnableVisualSynapse(e.target.checked)}
                        className="w-4 h-4 accent-[var(--color-main)]"
                    />
                    <span className="text-xs font-bold text-text-muted flex items-center gap-1">
                        <Image className="w-3 h-3" />
                        Visual Synapse ({imageItems.length} images)
                    </span>
                </label>

                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="deep-button w-full justify-center"
                >
                    {isAnalyzing ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="text-xs">{progressStatus || 'Processing...'}</span>
                        </div>
                    ) : (
                        <>
                            <Network className="w-4 h-4" />
                            Extract Network
                        </>
                    )}
                </button>
            </div>

            {/* Node Inspector Panel */}
            {selectedNode && (
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3 flex justify-between items-center">
                        Selected Node
                        <button onClick={() => setSelectedNode(null)} className="hover:text-main"><X size={14} /></button>
                    </h3>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            {selectedNode.type === 'image' && selectedNode.img ? (
                                <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden border border-gray-200">
                                    <img src={selectedNode.img} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-white text-lg ${selectedNode.type === 'person' ? 'bg-[var(--color-main-secondary)]' :
                                    selectedNode.type === 'place' ? 'bg-[var(--color-alt)]' :
                                        selectedNode.type === 'concept' ? 'bg-amber-400' :
                                            'bg-gray-400'
                                    }`}>
                                    {selectedNode.name[0]}
                                </div>
                            )}
                            <div>
                                <h4 className="font-bold text-main">{selectedNode.name}</h4>
                                <span className="text-[10px] font-mono text-text-muted uppercase px-1.5 py-0.5 bg-gray-100 rounded">
                                    {selectedNode.type}
                                </span>
                            </div>
                        </div>

                        {selectedNode.type === 'image' && (
                            <div className="text-xs bg-[var(--color-alt)]/20 p-2 rounded text-main border border-[var(--color-alt)]/50">
                                <strong>Visual Synapse</strong>
                                <p className="opacity-80 mt-1">
                                    This image was semantically linked to the narrative by the neural network.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stats Panel */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3">Network Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded text-center">
                        <div className="text-2xl font-black text-main">{graphData.nodes.length}</div>
                        <div className="text-[10px] uppercase font-bold text-text-muted">Entities</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded text-center">
                        <div className="text-2xl font-black text-secondary">{graphData.links.length}</div>
                        <div className="text-[10px] uppercase font-bold text-text-muted">Relations</div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <ToolLayout
            title="Networked Narratives"
            subtitle="Extract and visualize entity relationships from text"
            mainContent={mainContent}
            sideContent={sideContent}
        />
    );
};

export default NetworkedNarratives;

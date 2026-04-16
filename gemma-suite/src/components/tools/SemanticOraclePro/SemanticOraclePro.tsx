import React, { useState } from 'react';
import { BrainCircuit, Send, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { inferenceManager, type LoadProgressEvent } from '../../../core/inference/InferenceManager';
import { ModelLoadingBar } from '../../shared/ModelLoadingBar';

const SemanticOraclePro: React.FC = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [lastEvent, setLastEvent] = useState<LoadProgressEvent | null>(null);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            await inferenceManager.loadGemma((progress: LoadProgressEvent) => {
                setIsModelLoading(true);
                setLastEvent(progress);
            });
            setIsModelLoading(false);
            setLastEvent(null);

            const result = await inferenceManager.generateGemma(newMessages);
            let textResponse = '';
            if (Array.isArray(result) && result[0]?.generated_text) {
                const gen = result[0].generated_text;
                if (Array.isArray(gen)) {
                    textResponse = gen[gen.length - 1].content;
                } else if (typeof gen === 'string') {
                    textResponse = gen;
                } else {
                    textResponse = JSON.stringify(gen);
                }
            } else {
                textResponse = JSON.stringify(result);
            }
            
            // Extract thinking sequence if present (since Gemma thought text is often between specific tags)
            const botMsg = { role: 'assistant', content: textResponse };
            setMessages([...newMessages, botMsg]);

        } catch (error: any) {
             setMessages([...newMessages, { role: 'assistant', content: `Error: ${error.message}` }]);
             setIsModelLoading(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-2 border-main shadow-card">
            <div className="flex items-center gap-3 p-4 border-b-2 border-main bg-main/5">
                <BrainCircuit className="w-6 h-6 text-main" />
                <h2 className="text-xl font-bold uppercase text-main">Semantic Oracle Pro</h2>
                {isModelLoading && (
                    <div className="ml-auto">
                        <ModelLoadingBar progressEvent={lastEvent} />
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-main/50 uppercase font-bold text-center">
                        Ask Gemma 4 to analyze cultural concepts, generate narratives, or cross-compile definitions.
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div key={i} className={`p-4 border-2 max-w-[80%] ${m.role === 'user' ? 'self-end bg-alt/50 border-main' : 'self-start bg-main/5 border-main'}`}>
                            <div className="text-[10px] font-bold uppercase mb-2 opacity-50">{m.role}</div>
                            <div className="markdown-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && !isModelLoading && (
                    <div className="self-start p-4 bg-main/5 border-2 border-main text-main/50 flex items-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" /> Thinking...
                    </div>
                )}
            </div>

            <div className="p-4 border-t-2 border-main bg-main/5">
                <div className="flex gap-2 relative">
                    <textarea 
                        className="flex-1 deep-input resize-none py-3" 
                        rows={2} 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        placeholder="Type to prompt Gemma 4..." 
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button 
                        className="deep-button flex items-center justify-center min-w-[60px]" 
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SemanticOraclePro;

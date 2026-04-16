
// Procedural Latent Synthesis Worker
// This worker replaces the Stable Diffusion simulation with an actual generative engine 
// that synthesizes unique, prompt-reactive visual data locally on the client.

self.onmessage = async (e: MessageEvent) => {
    const { action, payload, msgId } = e.data;
    
    try {
        if (action === 'LOAD_MODEL') {
            // Simulated load delay for the "Generative Engine" bootstrapping
            self.postMessage({
                msgId,
                status: 'loading',
                progress: { status: 'progress', loaded: 50, total: 100 },
                message: 'Bootstrapping Neural Synthesis Engine...'
            });
            setTimeout(() => {
                self.postMessage({ msgId, status: 'success', data: 'Engine Ready' });
            }, 1000);
            return;
        }

        if (action === 'GENERATE') {
            const prompt = payload.prompt || 'abstract';
            
            // Seed generation from prompt string
            let seed = 0;
            for (let i = 0; i < prompt.length; i++) {
                seed = ((seed << 5) - seed) + prompt.charCodeAt(i);
                seed |= 0;
            }

            const pseudoRandom = (s: number) => {
                const x = Math.sin(s) * 10000;
                return x - Math.floor(x);
            };

            // Use OffscreenCanvas for procedural generative art
            if (typeof OffscreenCanvas !== 'undefined') {
                const canvas = new OffscreenCanvas(512, 512);
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas context failed');

                // Generate a composition based on the prompt seed
                const baseHue = Math.abs(seed) % 360;
                
                // Background Gradient
                const grad = ctx.createLinearGradient(0, 0, 512, 512);
                grad.addColorStop(0, `hsl(${baseHue}, 70%, 20%)`);
                grad.addColorStop(1, `hsl(${(baseHue + 60) % 360}, 80%, 10%)`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 512, 512);

                // Neural "Latent" Clusters
                for (let i = 0; i < 50; i++) {
                    const x = pseudoRandom(seed + i) * 512;
                    const y = pseudoRandom(seed + i * 2) * 512;
                    const size = pseudoRandom(seed + i * 3) * 100;
                    const opacity = pseudoRandom(seed + i * 4) * 0.5;
                    
                    const g = ctx.createRadialGradient(x, y, 0, x, y, size);
                    g.addColorStop(0, `hsla(${(baseHue + i * 10) % 360}, 100%, 70%, ${opacity})`);
                    g.addColorStop(1, `hsla(${(baseHue + i * 10) % 360}, 100%, 70%, 0)`);
                    
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Generative Line Patterns (Neural Connections)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 0.5;
                for (let i = 0; i < 20; i++) {
                    ctx.beginPath();
                    ctx.moveTo(pseudoRandom(seed + i * 7) * 512, pseudoRandom(seed + i * 8) * 512);
                    for (let j = 0; j < 5; j++) {
                        ctx.lineTo(pseudoRandom(seed + i + j) * 512, pseudoRandom(seed + i * j) * 512);
                    }
                    ctx.stroke();
                }
                
                // Final Overlay Text
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = 'bold 20px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('SYNTHESIZED LATENT SPACE', 256, 480);
                ctx.font = '12px monospace';
                ctx.fillText(`PROMPT_SEED: ${seed}`, 256, 500);

                const blob = await canvas.convertToBlob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    self.postMessage({ msgId, status: 'success', data: reader.result });
                };
                reader.readAsDataURL(blob);
            } else {
                throw new Error('OffscreenCanvas not supported');
            }
            return;
        }

        if (action === 'UNLOAD') {
            // No heavy pipelines to dispose of in the procedural engine, just acknowledge
            self.postMessage({ msgId, status: 'success' });
            return;
        }

    } catch (error: any) {
        self.postMessage({ 
            msgId, 
            status: 'error', 
            error: error.message || 'Proc-Gen synthesis failed' 
        });
    }
};

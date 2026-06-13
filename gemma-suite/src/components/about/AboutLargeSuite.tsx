import React from 'react';
import { BookOpen, Cpu, AlertTriangle, Cog, ArrowRight } from 'lucide-react';

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <section className="bg-white border-2 border-main shadow-card p-6 flex flex-col gap-3">
        <h2 className="text-sm uppercase font-bold text-main tracking-widest border-b-2 border-main/20 pb-2 flex items-center gap-2">
            {icon}
            {title}
        </h2>
        <div className="prose prose-sm max-w-none text-text leading-relaxed">{children}</div>
    </section>
);

const AboutLargeSuite: React.FC = () => {
    return (
        <div className="flex flex-col gap-6 pb-8 max-w-3xl">
            <header className="bg-white border-2 border-main shadow-card p-6 flex items-start gap-4">
                <div className="p-2 bg-main/10 text-main rounded-lg border border-main/20 shrink-0">
                    <BookOpen className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-main uppercase">About the Large Models Suite</h1>
                    <p className="text-sm text-text-muted mt-1">
                        Background document. Written <strong>2026-06-13</strong>, against the v4 / Gemma 4 / WebGPU
                        baseline. Read this first if you are picking the suite up again after a pause — it records
                        what works, what was deliberately cut, and why.
                    </p>
                </div>
            </header>

            <Section title="What this suite is for" icon={<BookOpen className="w-4 h-4" />}>
                <p>
                    The <em>Difference Suite</em> proper (the main app) was designed around small,
                    snappy, browser-native models — embedding models, BERT, SmolLM2, Florence-2.
                    Every tool there can run in real time on a laptop without ceremony.
                </p>
                <p>
                    This Large Models Suite is the companion experiment: <em>what does it look like
                    when you push the same local-first principle toward LLM-scale models?</em> We
                    ship a 2-billion-parameter LLM (Gemma 4 E2B-it, INT4-quantised) running entirely
                    on the user's GPU through WebGPU, and use it to add discursive, written
                    commentary to three of the main suite's analyses. It is a deliberate stretch,
                    not a polished product.
                </p>
            </Section>

            <Section title="The three tools" icon={<ArrowRight className="w-4 h-4" />}>
                <ul>
                    <li>
                        <strong>Semantic Oracle Pro</strong> — a chat interface to Gemma 4. The
                        contrast with the main suite's Semantic Oracle (SmolLM2-135M) is the point:
                        Gemma 4 is roughly 15× larger, slower to first response, and noticeably more
                        coherent on cultural concepts. Use it to ask why a definition the small
                        model returned felt wrong.
                    </li>
                    <li>
                        <strong>Imagination Inspector Pro</strong> — reads a curated 30-image
                        sample of the published Stable Bias corpus (Bianchi et al., 2023; CC BY-SA)
                        and asks Gemma 4 to write a short critical analysis of the prompt that
                        produced each image, predicting likely stereotypes and an example
                        contestation. The corpus ships bundled in <code>public/stable_bias/</code>
                        — no live generation, no network call, no Stable Diffusion in browser.
                        Pedagogy follows the main suite's Imagination Inspector but adds LLM
                        commentary on top of the existing CLIP-perceived tags.
                    </li>
                    <li>
                        <strong>Visual Storyteller Pro</strong> — two-stage pipeline: the user
                        uploads an image, <code>Xenova/vit-gpt2-image-captioning</code> produces a
                        literal caption, then Gemma 4 rewrites it according to the user's prompt.
                        Compare against the main suite's Visual Storyteller (Florence-2 → SmolLM2)
                        on the same image to see what the size jump on the language side does to
                        the imagined story.
                    </li>
                </ul>
            </Section>

            <Section title="Models and quantisation" icon={<Cpu className="w-4 h-4" />}>
                <ul>
                    <li>
                        <strong>Gemma 4 2B-it (E2B, ONNX, INT4)</strong> — Google released Gemma 4 as
                        a successor to the Gemma 3 family in spring 2026. We load{' '}
                        <code>onnx-community/gemma-4-E2B-it-ONNX</code>, an INT4-quantised
                        instruction-tuned export distributed by the HuggingFace ONNX Community.
                        Quantisation here means weights stored as 4-bit integers instead of FP16 —
                        the model footprint drops from ~5 GB to ~2.8 GB and fits in a typical
                        WebGPU adapter, at the cost of a few percent of accuracy. The lower
                        precision is itself a pedagogical surface: students reading Gemma's outputs
                        here are reading <em>quantised</em> Gemma. The Machine Room (when it
                        eventually lands in this suite) should narrate this trade-off out loud.
                    </li>
                    <li>
                        <strong>vit-gpt2-image-captioning (Xenova port)</strong> — an older
                        (2021) ViT-encoder + GPT-2-decoder captioner. It does not approach
                        Florence-2's quality, but it is small enough to load alongside Gemma and
                        runs on WASM as a fallback when WebGPU is unavailable. We use it only as
                        the image → text translator feeding Gemma's chat completion in Visual
                        Storyteller Pro.
                    </li>
                </ul>
                <p>
                    Both models load through <code>@huggingface/transformers</code> ^4 in dedicated
                    Web Workers (<code>src/workers/gemma.worker.ts</code>,{' '}
                    <code>src/workers/vision.worker.ts</code>). The{' '}
                    <code>InferenceManager</code> singleton enforces a one-active-model policy: if
                    Gemma is loaded and the user requests vit-gpt2, Gemma is unloaded first.
                </p>
            </Section>

            <Section title="Compromises and what was cut" icon={<AlertTriangle className="w-4 h-4" />}>
                <p>
                    Three deliberate compromises shape what you see today. None of them are
                    permanent.
                </p>
                <ol>
                    <li>
                        <strong>No live Stable Diffusion in the browser.</strong> An earlier
                        prototype shipped an "SD Turbo Showcase" tool. Reading the worker source
                        revealed it was not Stable Diffusion at all — a procedural canvas
                        generator that hashed the prompt to a seed and drew radial gradients with
                        the text "SYNTHESIZED LATENT SPACE" overlaid. The Imagination Inspector
                        Pro relied on the same fake worker for its image step and then fed Gemma a
                        textual approximation of what the gradients looked like, which Gemma
                        dutifully critiqued. The whole exercise was a stunt. <strong>On 2026-06-13
                        we removed the SD worker, deleted SD Turbo Showcase, and rewrote Imagination
                        Inspector Pro</strong> to read the published Stable Bias corpus instead.
                        Real on-device SD-Turbo via{' '}
                        <code>@aislamov/diffusers.js</code> remains technically possible (~1.3 GB
                        extra download, ~30–90 s per generation on M-series, far flakier on other
                        hardware), but offers a worse version of what the bundled corpus already
                        gives us, citably.
                    </li>
                    <li>
                        <strong>Gemma 4 is text-only here.</strong> The E2B ONNX export available
                        at the time of writing is the text instruction-tuned variant. The vision
                        layer of Gemma 3 (and the multimodal future of Gemma 4) is not yet
                        accessible through Transformers.js v4. So Visual Storyteller Pro and
                        Imagination Inspector Pro both indirect through textual representations:
                        vit-gpt2 captions or Stable Bias prompt metadata. When a multimodal Gemma
                        ONNX export ships, both tools should be rewired to feed pixels directly.
                    </li>
                    <li>
                        <strong>Layout shortcuts.</strong> The Pro tools' layouts had originally
                        used <code>h-full</code> in a way that clipped their footers when content
                        exceeded the viewport, and the Tailwind config in this workspace did not
                        scan the shared package — meaning every Tailwind class on the shared
                        Sidebar / MainLayout / Header was silently dropped (the deep-culture logo
                        rendered at native 2002×1815). Both fixed on 2026-06-13; flagged here in
                        case it regresses.
                    </li>
                </ol>
            </Section>

            <Section title="What to pick up next" icon={<Cog className="w-4 h-4" />}>
                <ul>
                    <li>
                        <strong>A Machine Room for this suite.</strong> The main app has one
                        already; we should fork the narrator and event store so users can see
                        Gemma 4 load, quantisation level, fallbacks, evictions, and the watchdog
                        timeouts in plain language here too. The honesty argument the main suite
                        makes about its small models matters more, not less, for a 2.8 GB
                        quantised LLM.
                    </li>
                    <li>
                        <strong>Real on-device image generation</strong> if and when
                        Transformers.js v5 (or a successor library) makes Stable Diffusion or a
                        small distilled model first-class. Until then, the Stable Bias corpus is
                        the right input.
                    </li>
                    <li>
                        <strong>Multimodal Gemma</strong> when the ONNX export lands. Replace
                        vit-gpt2 in Visual Storyteller Pro and the prompt-only path in
                        Imagination Inspector Pro.
                    </li>
                    <li>
                        <strong>Contestation parity.</strong> The main app has a Contest button
                        in the header and a Contestations ledger + Collaboration export. The Pro
                        tools currently lack both. Reusing the same store from the shared package
                        would close the loop.
                    </li>
                </ul>
            </Section>

            <footer className="text-[11px] text-main/50 leading-relaxed">
                DEEP CULTURE ERC — Difference Suite (Large Models companion). For technical
                background on the rest of the project see{' '}
                <code>documentation/Difference_Suite___In_Depth_Technical_Overview.md</code> in the
                repository.
            </footer>
        </div>
    );
};

export default AboutLargeSuite;

This application is now **consolidated** with the original Difference Suite. It shares the same data framework and is hosted as a unified deployment on Vercel, with the new high-parameter tools accessible via the `/difference-suite-large-models/` sub-path. This approach balances the lightweight accessibility of the original suite with the cutting-edge capabilities of Local Generative AI.

---

## 2. What We Reuse from the Original Suite

| Layer | Reuse? | Notes |
|---|---|---|
| **Data types** (`DataItem`, `Collection`, `DataType`, `AnalysisResult`) | ✅ Yes | Identical type definitions |
| **Zustand store** (`suiteStore.ts`) | ✅ Yes | Same dataset/collection/selection state management |
| **Shared UI components** (MainLayout, DataPanel, dropzone, etc.) | ✅ Yes | Adapt styling, keep structural patterns |
| **Auth guard** | ✅ Yes | Same email-based access control |
| **Web Worker architecture** | ✅ Adapt | New worker for Gemma 4 + SD pipelines |
| **Model registry / handler system** | 🔄 Simplify | Fewer models, multi-task routing for Gemma 4 |
| **Embedding tools** (ContextWeaver, LatentSpaceNavigator, etc.) | ❌ No | These depend on BGE/CLIP — Gemma 4 cannot replace them |
| **TF.js-based tools** (NoisePredictor, AmbiguityAmplifier image mode) | ❌ No | Unaffected by Gemma 4 |

---

## 3. Tools to Include (Gemma 4 Upgrades)

These are the tools from the original suite where Gemma 4 E2B provides a **clear, demonstrable improvement** over the original lightweight models:

### 3.1 Semantic Oracle → "Semantic Oracle Pro"
- **Original**: SmolLM2-135M-Instruct (~400MB, often incoherent, English-only)
- **Gemma 4 E2B**: 2.3B effective params, 60% MMLU Pro, 140+ languages, thinking mode
- **Demo value**: Side-by-side comparison showing quality leap in define/expand/tangent modes. Multilingual analysis. Structured reasoning via `<|think|>` mode.

### 3.2 Imagination Inspector → "Imagination Inspector Pro"
- **Original**: SmolLM2 describes hypothetical images, brittle regex parsing for demographic tags
- **Gemma 4 E2B**: Native function calling → clean JSON output for Gender/Race/Age/Setting. Dramatically better bias analysis narratives.
- **+ Stable Diffusion**: Actually generate the images instead of describing them (see §4)
- **Demo value**: The flagship tool. Shows the full pipeline: prompt → real image generation → demographic bias analysis with structured output.

### 3.3 Visual Storyteller → "Visual Storyteller Pro"
- **Original**: Florence-2-Base-ft (~1.2GB, limited captioning)
- **Gemma 4 E2B**: Multimodal image understanding with variable visual token budgets. Richer, more contextual captions. Multilingual output.
- **Demo value**: Upload images, get substantially richer captions. Show variable detail levels (low tokens = quick caption vs. high tokens = detailed analysis).

### 3.4 Audio Recorder → "Voice Input Pro"
- **Original**: Whisper-tiny-en (~150MB, English-only)
- **Gemma 4 E2B**: Native ASR in 140+ languages
- **Demo value**: Multilingual speech input for any tool. Record in German, French, etc. and get accurate transcription.

### 3.5 Attention Lens → "Attention Lens Pro" *(optional — needs investigation)*
- **Original**: BERT-base-uncased for attention visualization
- **Gemma 4 E2B**: Much deeper attention patterns from a 2B-param model
- **Open question**: Can we extract and visualize Gemma 4's attention weights via Transformers.js? This needs a prototype to verify.

---

## 4. New Tool: Stable Diffusion Image Generator

### 4.1 The Gap This Fills

The original Imagination Inspector was designed to generate images and analyze demographic bias in the outputs, but no text-to-image model could run in-browser at the time. It fell back to text descriptions. Stable Diffusion in-browser via WebGPU + ONNX Runtime Web now makes this feasible.

### 4.2 Technical Approach

| Aspect | Choice |
|---|---|
| **Model** | SD Turbo or LCM-LoRA variant (optimized for speed, fewer denoising steps) |
| **Format** | ONNX via `onnx-community` |
| **Runtime** | ONNX Runtime Web with WebGPU execution provider |
| **Quantization** | FP16 (best quality/speed trade-off for diffusion) |
| **Expected size** | ~2–3 GB download |
| **Expected speed** | ~100ms–3s per image depending on model variant and hardware |

### 4.3 Integration with Imagination Inspector

The Stable Diffusion generator feeds directly into the Imagination Inspector's bias analysis pipeline:

```
User prompt ("a doctor in a hospital")
    → SD generates N images (e.g. 4-8 variations)
    → Gemma 4 E2B analyzes each image (captioning + structured demographic extraction via function calling)
    → Bias dashboard shows demographic distribution across generated images
```

This replaces the original's text-only simulation with a real end-to-end pipeline.

### 4.4 Standalone Mode

The SD generator should also work as a standalone tool — users can generate images from prompts independently of the bias analysis pipeline. This serves as the "showcase" for in-browser image generation.

---

## 5. Architecture

### 5.1 Model Inventory (New App)

| Model | Task | Size (est.) | Used By |
|---|---|---|---|
| **Gemma 4 E2B** (q4f16) | Text gen, captioning, ASR | ~2.5–3 GB | Semantic Oracle Pro, Imagination Inspector Pro, Visual Storyteller Pro, Voice Input Pro |
| **SD Turbo / LCM** (FP16) | Image generation | ~2–3 GB | Imagination Inspector Pro, SD Showcase |

**Total: 2 models** (vs. 8 in the original suite).

### 5.2 Memory Strategy

Since both models are large and likely can't coexist in GPU memory:

- **Mutual exclusion**: Only one large model loaded at a time. Loading Gemma 4 evicts SD and vice versa.
- **Task grouping UI**: Group tools by which model they need. Users work in "Gemma 4 mode" or "SD mode", with a clear transition between them.
- **Progressive loading**: Show download progress, cache in IndexedDB. Second visit should load from cache in 10–30s.

### 5.3 Web Worker Architecture

```
Main Thread (React UI)
    ↕ postMessage
Worker Thread
    ├── Gemma 4 E2B (Transformers.js v4, WebGPU)
    │     ├── text-generation handler
    │     ├── image-to-text handler (captioning)
    │     ├── ASR handler
    │     └── function-calling handler (structured output)
    │
    └── Stable Diffusion (ONNX Runtime Web, WebGPU)
          └── text-to-image handler
```

Key difference from original: Gemma 4 is a **single multi-task model**, routed by prompt engineering rather than separate pipeline tasks. The handler pattern shifts from `one-model-per-task` to `one-model-many-tasks` with a prompt router.

### 5.4 Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| TypeScript | 5.9+ | Type safety |
| Vite (rolldown) | 7.x | Build tool |
| Tailwind CSS | 4.x | Styling |
| Zustand | 5.x | State management |
| `@huggingface/transformers` | 4.x | Gemma 4 inference |
| `onnxruntime-web` | latest | SD inference (WebGPU EP) |
| Framer Motion | 12.x | Animations |
| Recharts / D3 | latest | Visualizations |

---

## 6. UX Considerations

### 6.1 First-Run Experience
- **WebGPU check**: On load, verify WebGPU support. Show a clear, friendly error for unsupported browsers.
- **Model download**: Show estimated download size (~5 GB total for both models) and progress. Let users choose which model(s) to download first.
- **Hardware warning**: Recommend minimum 8 GB system RAM, dedicated GPU preferred. Warn about battery drain on laptops.

### 6.2 Loading States
- Downloading model → progress bar with MB/total
- Loading model into GPU → spinner with estimated time
- Generating (SD) → step-by-step denoising progress
- Generating (Gemma 4) → streaming token output

### 6.3 Demo-First Design
This is a **demo application** — designed to showcase capabilities, not for production research workflows. Prioritize:
- Visual impact (show the model working in real-time)
- Clear before/after comparisons (SmolLM2 output vs. Gemma 4 output)
- Minimal friction (pre-loaded example prompts, sample datasets)

---

## 7. Open Questions

> [!IMPORTANT]
> **Q1: Separate repo or subdirectory?**
> Should this new app live in its own repo, or as a subdirectory/branch of `difference-suite-final`? Since we're reusing the data framework, a monorepo approach with shared packages could work, but a clean separate repo is simpler.

> [!IMPORTANT]
> **Q2: Transformers.js v4 readiness**
> The plan assumes Transformers.js v4 with Gemma 4 support. We need to verify: (a) that the `onnx-community/gemma-4-E2B-it-ONNX` model works with the current release, (b) that multimodal (image + audio) input works in the browser, not just text.

> [!WARNING]
> **Q3: SD model selection**
> SD Turbo (~100ms, lower quality) vs. SD 1.5 + LCM-LoRA (better quality, ~2-3s) vs. SDXL Turbo (best quality, largest). Which variant balances demo impact vs. download/memory feasibility? Recommend starting with **SD Turbo** for speed, with an option to swap in LCM later.

> [!IMPORTANT]
> **Q4: Attention Lens scope**
> Should we include Attention Lens Pro (Gemma 4 attention visualization)? This is technically interesting but may not be feasible — extracting attention weights from a 2B model in-browser could be very slow and memory-intensive. Recommend **deferring** unless a quick prototype proves feasible.

> [!NOTE]
> **Q5: Deployment**
> Same Vercel deployment as the original suite? The larger model downloads are served from Hugging Face CDN, not from our deployment, so hosting costs stay minimal.

---

## 8. Implementation Phases

### Phase 1: Foundation
- [ ] Set up new Vite + React + TypeScript project
- [ ] Port data framework (types, Zustand store, shared components)
- [ ] Implement WebGPU detection and model download/cache system
- [ ] Build Gemma 4 E2B Web Worker with text-generation handler

### Phase 2: Gemma 4 Tools
- [ ] Semantic Oracle Pro (text generation with thinking mode)
- [ ] Visual Storyteller Pro (image captioning via Gemma 4)
- [ ] Voice Input Pro (multilingual ASR)
- [ ] Verify structured output / function calling for Imagination Inspector

### Phase 3: Stable Diffusion
- [ ] Integrate SD Turbo via ONNX Runtime Web + WebGPU
- [ ] Build standalone image generator UI
- [ ] Connect SD output → Gemma 4 captioning → bias analysis pipeline

### Phase 4: Imagination Inspector Pro
- [ ] Full pipeline: prompt → SD image gen → Gemma 4 analysis → bias dashboard
- [ ] Demographic distribution visualization
- [ ] Comparison mode (multiple prompts, aggregated results)

### Phase 5: Polish & Deploy
- [ ] Loading states, progress indicators, error handling
- [ ] Demo mode with pre-loaded examples
- [ ] Before/after comparison views (SmolLM2 vs. Gemma 4)
- [ ] Vercel deployment

---

## 9. Reference: Original Suite Analysis (Archived)

The original `plan.md` contained a detailed pros/cons analysis of integrating Gemma 4 into the existing Difference Suite as an optional "power mode". Key conclusions that informed this new plan:

- **Gemma 4 improves 3-4 tools** (text gen, captioning, ASR) but **cannot replace 7+ tools** that depend on dense embeddings (BGE, CLIP) or task-specific vision models (ResNet, Depth Anything).
- **Memory constraints** make it impractical to run Gemma 4 alongside the existing lightweight models — it evicts everything else.
- **The "power mode" retrofit** would be architecturally awkward (multi-task model vs. one-model-one-task design).

**Decision**: Rather than retrofitting the original suite, build a focused new app that showcases the Gemma 4 + SD capabilities cleanly, without the constraints of backward compatibility with the embedding/vector tools.

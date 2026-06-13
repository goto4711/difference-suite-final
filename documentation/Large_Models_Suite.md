# Difference Suite — Large Models Suite

> Companion to the main Difference Suite. Runs a 2-billion-parameter LLM
> (Gemma 4) entirely in the browser via WebGPU. Written **2026-06-13**;
> see also the in-app `About this suite` page for the long version.

---

## How to reach it

### Deployed

<https://difference-suite-final.vercel.app/difference-suite-large-models/>

The "Large Models Suite" entry in the main suite's sidebar (under
**Access**) points here. The site auto-redirects from the root to
`#/about`.

### Locally, in development

The Large Models Suite has its own Vite dev server.

```bash
npm --workspace gemma-suite run dev
```

Vite picks the next free port (usually 5174 if the main suite is already
on 5173). The terminal prints the actual URL. Direct routes use
[`HashRouter`](https://reactrouter.com/), so paths take a `#`:

| Tool | URL |
|---|---|
| About this suite | `http://localhost:5174/difference-suite-large-models/#/about` |
| Semantic Oracle Pro | `http://localhost:5174/difference-suite-large-models/#/semantic-oracle-pro` |
| Imagination Inspector Pro | `http://localhost:5174/difference-suite-large-models/#/imagination-inspector-pro` |
| Visual Storyteller Pro | `http://localhost:5174/difference-suite-large-models/#/visual-storyteller-pro` |

The bare `/difference-suite-large-models/` URL redirects to
`#/about`. The Data Dashboard from the main suite is **parked** here —
its link is hidden and the route redirects out.

### Locally, in the consolidated build

```bash
npm run build:consolidated
npm run preview
```

This builds the main app, then the gemma-suite, then copies the gemma
`dist/` into the main app's `dist/difference-suite-large-models/`. The
preview server then serves both suites under one host, matching
production.

---

## What's inside

Three tools, plus one background document, in the sidebar Main Menu:

- **About this suite** — written background document (when, why, and what
  was deliberately cut). Open this first.
- **Semantic Oracle Pro** — chat with Gemma 4 (2B-it, INT4-quantised
  ONNX, WebGPU). Compare its outputs against the main suite's Semantic
  Oracle (SmolLM2-135M) for a 15× size-jump comparison.
- **Imagination Inspector Pro** — steps through a curated 30-image sample
  of the published Stable Bias corpus (Bianchi et al. 2023, CC BY-SA)
  bundled under `public/stable_bias/`. Gemma 4 writes a short critical
  analysis of each prompt — likely stereotypes, omissions, an example
  contestation. No live SD, no network call.
- **Visual Storyteller Pro** — user uploads an image, vit-gpt2 produces a
  literal caption, Gemma 4 rewrites it according to the user's prompt.
  Two-stage pipeline because the Gemma 4 ONNX export in use is
  text-only.

---

## Models and quantisation

| Model | Source | Footprint | Device |
|---|---|---|---|
| Gemma 4 2B-it (E2B, ONNX, INT4) | `onnx-community/gemma-4-E2B-it-ONNX` | ~2.8 GB | WebGPU only |
| vit-gpt2 image captioner | `Xenova/vit-gpt2-image-captioning` | ~250 MB | WASM / WebGPU |

INT4 quantisation trades a few percent of accuracy for the ~5 GB → ~2.8 GB
footprint reduction that makes Gemma 4 fit in a typical WebGPU adapter.
Outputs are noticeably less coherent than FP16/FP32 server-side Gemma;
this is itself a pedagogical observation worth surfacing.

The `InferenceManager` (`gemma-suite/src/core/inference/InferenceManager.ts`)
enforces a one-active-model policy: loading Gemma evicts the vision
captioner and vice versa.

---

## What is deliberately not here

- **No live Stable Diffusion.** An earlier prototype shipped an "SD Turbo
  Showcase" tool whose worker was a procedural canvas generator pretending
  to be SD. Removed on 2026-06-13. Real on-device SD via
  [`@aislamov/diffusers.js`](https://github.com/dakenf/diffusers.js)
  remains technically possible but adds ~1.3 GB and 30–90 s per image for
  a result the Bianchi et al. corpus already provides, citably.
- **No multimodal Gemma.** The text instruction-tuned ONNX export is what
  Transformers.js v4 can run today. When a multimodal Gemma ONNX export
  ships, both image-handling tools should be rewired to feed pixels
  directly instead of going through textual captions.
- **No Data Dashboard.** The dashboard from the main suite is parked
  here. The component is still on disk (`components/dashboard/Dashboard.tsx`)
  for whenever it's needed.

---

## Pointers for picking this up again

1. A Machine Room for the Large Models Suite — fork the narrator and
   event store from the main app so the quantisation level, model loads,
   evictions, and watchdog timeouts are all visible in plain language.
2. Real on-device image generation if Transformers.js v5 (or a successor)
   ships a polished SD pipeline.
3. Multimodal Gemma when the ONNX export lands.
4. Contestation parity with the main app (Contest button + Contestations
   ledger + Collaboration export from the shared package).

For the full backstory and the architecture-level overview of the rest of
the project, see
[`Difference_Suite___In_Depth_Technical_Overview.md`](./Difference_Suite___In_Depth_Technical_Overview.md).

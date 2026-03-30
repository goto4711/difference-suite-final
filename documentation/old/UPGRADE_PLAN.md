# Difference Suite: Upgrade & Optimization Plan (Completed)

**Goal:** Modernize the Difference Suite to use WebGPU‑accelerated Transformers.js v3, offload inference to a web worker, refresh models, and improve UX.

**Status:** ✅ **Migration to Transformers.js v3 worker architecture is complete.**

---

## Phase 1 – Maintenance & Cleanup (Completed)

- [x] **1.1 Codebase Snapshot & Dual-Stack Prep**: Created migration path.
- [x] **1.2 Define Stable Inference API**: Created `src/core/inference/types.ts`.
- [x] **1.3 Extensibility Infrastructure**: Implemented `taskHandlers.ts` and handler registry.
- [x] **1.4 Extension Checklists**: Documented in `CONTRIBUTING.md`.

---

## Phase 2 – Core Infrastructure Upgrade (Completed)

- [x] **2.1 Implement TransformersManager**: Moved to `src/core/inference/TransformersManager.ts` with LRU eviction.
- [x] **2.2 Vite Configuration**: Updated `vite.config.ts` for worker support.
- [x] **2.3 Web Worker Offloading**: Implemented `src/workers/transformers.worker.ts` and `TransformersClient.ts`.
- [x] **2.4 Migrate Existing Tools**: All tools (Semantic Oracle, Visual Storyteller, etc.) now use `TransformersClient`.
- [x] **2.5 Upgrade to Transformers.js v3**: Swapped dependencies to `@huggingface/transformers`.
- [x] **2.6 Robustness Improvements**: Added auto-restart for crashed workers and timeout handling.

---

## Phase 3 – Intelligence Refresh (Completed)

- [x] **3.1 Model Registry**: Centralized model config in `src/core/inference/modelRegistry.ts`.
- [x] **3.2 Semantic Oracle**: Updated to use `LaMini-Flan-T5`.
- [x] **3.3 Visual Storyteller**: Updated to `ViT-GPT2` image captioning.
- [x] **3.4 Context Weaver**: Updated to `bge-small-en-v1.5`.
- [x] **3.5 Networked Narratives**: Updated to `clip-vit-base-patch32-q4`.
- [x] **3.6 Whisper**: Integrated `whisper-tiny.en` for audio.
- [x] **3.7 Attention Lens**: Implemented real attention extraction in `DeepVectorMirror`.

---

## Phase 4 – Advanced Capabilities (Next Steps / In Progress)

- [ ] **4.1 Zero-Shot NER with GLiNER2**: Pending implementation.
- [ ] **4.2 Depth Perception**: `DepthMirror` tool pending.
- [ ] **4.3 4-bit Quantization**: Implemented for most models (`q4`); further optimization possible.

---

## Phase 5 – UI/UX Refinement (In Progress)

- [ ] **5.1 Model Management UI**: "Model Status" dashboard pending.
- [x] **5.2 Real-time Progress**: Tools now display granular progress stages from the worker.

---

**Last Updated:** March 23, 2026

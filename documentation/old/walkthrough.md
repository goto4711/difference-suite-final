# Documentation Update: Transformers.js Integration

I have successfully updated the documentation to reflect the actual technical implementation of the Difference Suite tools, as revealed by the latest source code on GitHub.

## Significant Technical Shifts Documented

The project has undergone a significant architectural shift from **TensorFlow.js (Universal Sentence Encoder)** to **Transformers.js (@huggingface/transformers)** for its primary natural language processing and multimodal tasks.

### 1. Centralized Model Management

- **`TransformersManager.ts`**: All tools now leverage a central manager for local, browser-native model execution using WebGPU/WASM.
- **Worker Architecture**: Heavy inference tasks are now offloaded to a dedicated Web Worker (`src/workers/transformers.worker.ts`), ensuring the UI remains responsive even during complex model execution.
- **Privacy & Sovereignty**: Documentation now highlights that data (texts, images, audio) never leaves the user's browser, enabling secure research with sensitive cultural archives.

### 2. Model Accuracy & New Features

I have updated both the [technical_specification.md](technical_specification.md) and [deep_culture_article.md](deep_culture_article.md) with the following specific details:

| Component | Technology / Model | New Features Documented |
| :--- | :--- | :--- |
| **Embeddings** | `bge-small-en-v1.5` | Used across 7+ tools for semantic mapping and search. |
| **Text Generation** | `LaMini-Flan-T5-783M` | Local LLM for Semantic Oracle's Define/Expand/Tangent modes. |
| **Image Captioning** | `ViT-GPT2` | Natural language descriptions for Visual Storyteller. |
| **Multimodal** | `CLIP (Quantized)` | "Visual Synapse" for cross-modal alignment in Networked Narratives. |
| **Audio/ASR** | `Whisper Tiny` | Real-time voice transcription for dataset capture. |
| **Latent Analysis** | **Attention Lens** | Visualizing internal model attention in Deep Vector Mirror using real transformer weights. |

## Documentation Integrity

- **All 13 Tools**: accounted for in both the technical specification and the journal article.
- **Migration Complete**: Verified against the `main` branch source code for individual components like `GlitchDetectorText`, `AmbiguityAmplifierText`, and `ContextWeaver`.

I have preserved the digital humanities narrative in the journal article while ensuring the "How It Works" sections accurately describe the powerful local AI stack powering the suite.

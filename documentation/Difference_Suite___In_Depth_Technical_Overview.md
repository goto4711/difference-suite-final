# Difference Suite — In-Depth Technical Overview

> **Project**: DEEP CULTURE ERC Advanced Grant — "Little Tool of Difference"  
> **Version**: 0.0.0 | **Deployed**: [difference-suite-final.vercel.app](https://difference-suite-final.vercel.app)  
> **Repository**: [github.com/goto4711/difference-suite-final](https://github.com/goto4711/difference-suite-final)

---

## 1. What Is It?

The **Difference Suite** is a fully client-side React web application designed for digital humanities researchers. It operationalises critical humanities concepts — such as algorithmic ambiguity, latent space, and generative bias — into 14 interactive deep learning analysis tools. All ML inference runs in the browser using WebGPU/WASM; no data leaves the user's machine.

**Target users:**
- Digital humanities researchers
- Cultural studies scholars
- Holocaust and archive specialists
- AI ethics researchers
- Students and educators at academic institutions

---

## 2. Technology Stack

### 2.1 Core Framework

| Category | Technology | Version |
|---|---|---|
| Frontend | React + TypeScript | 19.2.0 / ~5.9.3 |
| Build tool | Vite (rolldown-vite fork) | 7.2.5 |
| Styling | Tailwind CSS + PostCSS | 4.1.17 |
| State management | Zustand | 5.0.9 |
| Routing | React Router DOM | 7.10.0 |
| Animation | Framer Motion | 12.23.25 |

### 2.2 AI / ML Libraries

**Transformers.js Stack** — primary engine for 10/14 tools:
- `@huggingface/transformers` ^3.8.1 — browser-native Hugging Face models via WebGPU/WASM

**Models used:**
| Model | Used by |
|---|---|
| `bge-small-en-v1.5` | Context Weaver, Latent Navigator, Glitch Detector, Noise Predictor, Detail Extractor |
| `SmolLM2-135M-Instruct` | Semantic Oracle (generative text) |
| `Florence-2-Base-ft` | Visual Storyteller (image captioning) |
| `whisper-tiny.en` | Audio capture / transcription |
| `CLIP` | Imagination Inspector (zero-shot demographic classification, dataset alignment), Networked Narratives (multimodal alignment) |

**TensorFlow.js Stack:**
| Library | Version | Used by |
|---|---|---|
| `@tensorflow/tfjs` | ^4.22.0 | Noise Predictor, Discontinuity Detector (custom training) |
| `@tensorflow-models/knn-classifier` | ^1.2.6 | Ambiguity Amplifier, Glitch Detector |

### 2.3 Visualization Libraries

| Library | Version | Purpose |
|---|---|---|
| D3.js | ^7.9.0 | Custom data-driven visualizations |
| Recharts | ^3.5.1 | React charting (histograms, line charts) |
| react-force-graph-2d | ^1.29.0 | Force-directed network graphs |

### 2.4 NLP

- `compromise` ^14.14.4 — lightweight NLP for entity extraction (people, places, orgs)
- `bge-small-en-v1.5` — semantic embeddings and document clustering

---

## 3. Application Architecture

### 3.1 Component Hierarchy

```
App.tsx
└── BrowserRouter
    └── MainLayout
        ├── Sidebar          ← Tool navigation
        ├── Header           ← Auth + stats
        ├── StatsRow         ← Corpus counts
        └── AuthGuard
            └── Routes
                ├── /              → Dashboard
                │   ├── CollectionSidebar
                │   ├── DataGrid
                │   └── ContextPanel
                └── /<tool-route>  → ToolComponent
                    └── ToolLayout
                        ├── Main Content
                        └── Side Controls
```

### 3.2 Routing Table

| Route | Component | Description |
|---|---|---|
| `/` | Dashboard | Data management home |
| `/ambiguity-amplifier` | AmbiguityAmplifier | Classification ambiguity |
| `/context-weaver` | ContextWeaver | Cross-context semantic comparison |
| `/deep-time` | DeepTime | Explore generative constraints and temporal decay |
| `/deep-vector-mirror` | DeepVectorMirror | Vector representation visualization |
| `/detail-extractor` | DetailExtractor | Text clustering + outlier detection |
| `/discontinuity-detector` | DiscontinuityDetector | Time-series anomaly detection |
| `/glitch-detector` | GlitchDetector | Classifier confusion detection |
| `/imagination-inspector` | ImaginationInspector | Generative AI bias exploration |
| `/latent-navigator` | LatentSpaceNavigator | Latent space interpolation |
| `/networked-narratives` | NetworkedNarratives | NLP entity graph visualization |
| `/noise-predictor` | NoisePredictor | Autoencoder noise/residual analysis |
| `/threshold-adjuster` | ThresholdAdjuster | Decision threshold sensitivity |
| `/semantic-oracle` | SemanticOracle | Local generative text intelligence |
| `/visual-storyteller` | VisualStoryteller | AI image captioning |

### 3.3 Global State (Zustand)

Single store in `src/stores/suiteStore.ts`:

```typescript
interface SuiteState {
  // Data
  dataset: DataItem[];           // All uploaded items
  collections: Collection[];     // Named item groups
  activeItem: string | null;     // Currently focused item
  selectedItems: string[];       // Multi-selection
  isProcessing: boolean;

  // Auth
  isAuthenticated: boolean;
  userEmail: string | null;

  // Actions
  addItem / addItems / removeItem
  createCollection
  moveItemsToCollection
  toggleSelection
  updateItemResult(itemId, toolId, result)
  login / logout / clearDataset
}
```

### 3.4 Core Data Types

```typescript
type DataType = 'image' | 'text' | 'timeseries' | 'tabular' | 'audio';

interface DataItem {
  id: string;
  name: string;
  type: DataType;
  collectionId?: string;
  content: string | File;       // URL or raw text
  rawFile?: File;
  metadata?: { size, lastModified, mimeType };
  embedding?: number[];         // Computed vector
  analysisResults?: Record<string, any>;
}
```

---

## 4. Data Flow Patterns

### 4.1 File Upload Flow

```
User drag-drops files
  → Dashboard (react-dropzone)
    → FileReader reads content
    → MIME type detection (image / text / csv)
    → suiteStore.addItems(newItems)
      → DataGrid re-renders
```

### 4.2 Tool Analysis Flow

```
User selects item
  → Tool reads suiteStore.activeItem
    → ML model processes item.content
      → Results returned to component
        → suiteStore.updateItemResult(itemId, toolId, result)
          → Visualization rendered
```

### 4.3 ML Model Loading Pattern

All tools use a lazy singleton pattern:
```typescript
const [modelReady, setModelReady] = useState(false);
useEffect(() => {
  modelManager.init().then(() => setModelReady(true));
}, []);
```
Models are loaded once on first tool access and cached for the session.

---

## 5. Authentication System

### 5.1 "Soft Gate" — Domain-Based Academic Access

```typescript
// src/config/authConfig.ts
const ACADEMIC_REGEX = /(.edu(.[a-z]{2})?|.ac.[a-z]{2})$/i;
const ALLOWED_DOMAINS = ['uva.nl', 'ethz.ch', 'tsinghua.edu.cn', ...]; // 40+ universities

function checkDomain(email: string): boolean {
  const domain = email.split('@')[1].toLowerCase();
  return ALLOWED_DOMAINS.includes(domain) || ACADEMIC_REGEX.test(domain);
}
```

### 5.2 AuthGuard Behaviour

When unauthenticated:
- Content blurred with `blur-md` CSS filter
- "Restricted Access" overlay displayed
- Pointer events disabled

**Note:** This is a frontend-only soft gate — no server-side enforcement.

---

## 6. The 14 Tools — In-Depth

---

### Tool 1: Ambiguity Amplifier
**Route:** `/ambiguity-amplifier`  
**Purpose:** Surfaces classification ambiguity in image and text predictions.

**How it works:**
- **Image mode:** Uses ResNet-50 (via TransformersClient). Runs classification and highlights low-confidence predictions.
- **Text mode:** Embeds text using `bge-small-en-v1.5` (Transformers.js), then uses a KNN classifier to categorise input between two user-defined concepts.
- Highlights "borderline" cases where the model confidence is near 50%.

**Key dependencies:** `@tensorflow-models/knn-classifier`, `@huggingface/transformers`

---

### Tool 2: Context Weaver
**Route:** `/context-weaver`  
**Purpose:** Maps data items across different semantic and cultural contexts.

**How it works:**
- Embeds collection items using `bge-small-en-v1.5`.
- Computes cosine similarity between a query (text or image) and multiple user-defined "contexts".
- Renders a **radial D3 visualization** showing the relative position of items across contexts.
- Enables multi-contextual comparison of the same data item.

**Key dependencies:** `@huggingface/transformers` (bge-small-en-v1.5), D3.js

---

### Tool 3: Deep Vector Mirror
**Route:** `/deep-vector-mirror`  
**Purpose:** Visualizes the high-dimensional vector representations used by deep learning models.

**How it works:**
- **Attention Lens:** Extracts and visualizes attention weights from text inputs via Transformers.js — shows which tokens the model prioritizes.
- **Multimodal Vector Analysis:** Renders image and text vectors as structured heatmaps and distance matrices.
- **Vector Arithmetic:** Enables exploration of cosine distance between vectors.

**Key dependencies:** `@tensorflow/tfjs`, `@huggingface/transformers`, D3.js

---

### Tool 4: Deep Time
**Route:** `/deep-time`  
**Purpose:** Explores the mathematical constraints of temporal processing in neural networks.

**How it works:**
- **Attention Lens:** Simulates the causal masking and attention decay of transformers.
- **Diffusion Scrubber:** Visualizes the mathematically scheduled forward-diffusion noise process on images.
- **Memory Audit:** Runs pure JS backpropagation through time to expose the vanishing gradient problem in RNNs and LSTMs.
- Operates entirely on pure mathematics to reveal algorithmic structures without heavy inference dependencies.

**Key dependencies:** `plotly.js-dist-min`

---

### Tool 4: Detail Extractor
**Route:** `/detail-extractor`  
**Purpose:** Clusters texts and extracts marginal details, with a Holocaust research focus.

**How it works:**
- Processes texts via `bge-small-en-v1.5` to generate embeddings.
- Clusters semantically similar documents.
- Highlights **outliers and unique details** that fall outside dominant clusters.
- Demo texts focus on Holocaust resistance narratives.

---

### Tool 5: Discontinuity Detector
**Route:** `/discontinuity-detector`  
**Purpose:** Detects anomalies in time-series data.

**How it works:**
- Parses CSV/JSON time-series data.
- Uses deep anomaly detection algorithms (TensorFlow.js).
- Visualizes a timeline with anomaly markers.
- Provides an anomaly inspector panel for detailed inspection.

**Key dependencies:** `@tensorflow/tfjs`, Recharts

---

### Tool 6: Glitch Detector
**Route:** `/glitch-detector`  
**Purpose:** Identifies inputs that confuse trained classifiers ("glitches").

**How it works:**
- **Image mode:** ResNet-50 + KNN classifier trained on user collections.
- **Text mode:** `bge-small-en-v1.5` embeddings + KNN classifier.
- Trains the classifier on labeled collections, then tests new inputs.
- Highlights items with low confidence or misclassification — the "glitches".

**Key dependencies:** `@tensorflow-models/knn-classifier`, `@huggingface/transformers`

---

### Tool 7: Imagination Inspector
**Route:** `/imagination-inspector`  
**Purpose:** Explores the boundaries and biases of generative AI imagination by surfacing real Stable Diffusion outputs for professional archetypes.

**How it works:**
- Fetches real AI-generated images from the **Stable Bias dataset** (`stable-bias/professions` on HuggingFace) — 94,500 images across 146 professions, generated by Stable Diffusion v1.4/v2 and DALL-E 2.
- Classifies each image's demographics (gender, race, age, setting) via **CLIP zero-shot classification** — one batched call per image across all categories.
- Analyzes bias in the classified tags via a custom `BiasAnalyzer`.
- Generates **"Void Reports"** (absence reports) highlighting demographics that exist in reality but are absent from the model's output.
- Uses **CLIP multimodal alignment** to match prompts to user dataset images (Dataset Alignment sidebar).
- Falls back to SmolLM2-135M text simulation for prompts that don't match the 146 known professions.
- Supports single and comparison modes for side-by-side prompt analysis.
- **Adjective mode toggle:** Users can switch between *Varied* (each image uses a different randomly sampled adjective from the dataset's 21 real adjectives) and *Fixed* (all images use the same chosen adjective, enabling controlled comparisons). Fixed mode uses direct block-offset addressing against the HuggingFace Dataset Viewer API rather than filtered queries, since the API does not support compound `WHERE` clauses. The 21 adjectives are: `ambitious`, `assertive`, `committed`, `compassionate`, `confident`, `considerate`, `decisive`, `determined`, `emotional`, `gentle`, `honest`, `intellectual`, `modest`, `no_adjective` (neutral baseline), `outspoken`, `pleasant`, `self-confident`, `sensitive`, `stubborn`, `supportive`, `unreasonable`.

**Key dependencies:** `@huggingface/transformers` (CLIP ViT-B/32), HuggingFace Dataset Viewer API, custom `GeneratorEngine`, `BiasAnalyzer`

---

### Tool 8: Latent Space Navigator
**Route:** `/latent-navigator`  
**Purpose:** Explores the "in-between" spaces between data categories in latent space.

**How it works:**
- **Image mode:** Uses ResNet-50 to interpolate between visual categories.
- **Text mode:** Uses `bge-small-en-v1.5` to navigate semantic vectors between two concepts.
- Generates **"hidden concepts"** found in low-density areas of the latent space.
- Provides real-time visualization of the interpolation path.

**Key dependencies:** `@tensorflow/tfjs`, `@huggingface/transformers` (bge-small-en-v1.5)

---

### Tool 9: Networked Narratives
**Route:** `/networked-narratives`  
**Purpose:** Visualizes relationships and entities within cultural texts.

**How it works:**
- Uses **Compromise.js** for NLP entity extraction (people, places, organizations).
- Renders a **force-directed graph** using `react-force-graph-2d`.
- **Visual Synapse feature:** Uses CLIP alignment to find semantically matching images from the dataset for extracted text entities.
- Creates cross-modal "synapses" linking text concepts to visual evidence.

**Key dependencies:** `compromise`, `react-force-graph-2d`, `@huggingface/transformers` (CLIP)

---

### Tool 10: Noise Predictor
**Route:** `/noise-predictor`  
**Purpose:** Explores noise patterns and reconstruction limits in deep learning models.

**How it works:**
- **Autoencoder Architecture:** Trains a custom TensorFlow.js autoencoder to reconstruct data through a bottleneck layer.
- **Text mode:** `bge-small-en-v1.5` provides semantic embeddings as input for the autoencoder.
- **Image mode:** Uses raw pixel data or ResNet-50 features.
- **Residual Analysis:** Visualizes the "noise" (original − reconstructed) as a spectral heatmap.
- Demonstrates what the model "forgets" or "misinterprets" during compression.

**Key dependencies:** `@tensorflow/tfjs`, `@huggingface/transformers` (bge-small-en-v1.5)

---

### Tool 11: Threshold Adjuster
**Route:** `/threshold-adjuster`  
**Purpose:** Explores decision threshold sensitivity in classification systems.

**How it works:**
- Loads scored/classified data.
- Interactive threshold slider lets users adjust the decision boundary.
- Shows real-time impact on classification outcomes (approved/rejected).
- Histogram visualization of score distribution.
- Case list showing borderline decisions near the threshold.

---

### Tool 12: Semantic Oracle
**Route:** `/semantic-oracle`  
**Purpose:** Local generative intelligence for concept exploration and semantic expansion.

**How it works:**
- Runs **SmolLM2-135M-Instruct** locally in the browser via WebGPU/WASM.
- Three interactive modes:
  - **Define:** Explains concepts clearly
  - **Expand:** Lists related concepts and hidden connections
  - **Tangent:** Generates creative, abstract metaphors
- Integrates with the user's text corpus for contextual analysis.

**Key dependencies:** `@huggingface/transformers`, `SmolLM2-135M-Instruct`

---

### Tool 13: Visual Storyteller
**Route:** `/visual-storyteller`  
**Purpose:** AI-generated narrative captions from visual content.

**How it works:**
- Runs **ViT-GPT2 image captioning model** locally in the browser.
- Processes images from the user's collection.
- Generates natural language captions describing image content.
- Maintains a story history of the last 10 captions.

**Key dependencies:** `@huggingface/transformers`, `Florence-2-Base-ft`

---

## 7. Design System

The app implements the **Deep Culture** visual identity:

```css
:root {
  --color-text: #000100;        /* Black */
  --color-main: #832161;        /* Deep Magenta */
  --color-alt: #ADFC92;         /* Neon Green */
  --color-background: #99B2DD;  /* Soft Blue */
  --font-main: 'Lexend', sans-serif;
}
```

**Component classes:**
| Class | Purpose |
|---|---|
| `.deep-panel` | Card containers with border and shadow |
| `.deep-button` | Primary action buttons (neon green) |
| `.deep-button-secondary` | Secondary buttons (white) |
| `.deep-input` | Form input fields |
| `.nav-item` | Sidebar navigation items |
| `.dc-card` | Tool panel containers |

---

## 8. Performance Architecture

| Strategy | Implementation |
|---|---|
| Lazy model loading | Models loaded on first tool access only |
| Singleton pattern | Prevents duplicate model initialization across renders |
| Memoization | `useMemo` / `useCallback` for computed values and stable refs |
| Web Workers | Heavy ML computation offloaded from main thread (`src/workers/`) |
| Blob URLs | Image memory management — avoids duplication |
| UUID lookups | Efficient item identification in the store |

---

## 9. Security

| Measure | Implementation |
|---|---|
| XSS prevention | React's built-in escaping |
| Auth input validation | Domain regex + whitelist |
| HTTPS | Enforced by Vercel |
| No secrets in frontend | Domain whitelist only (soft gate) |
| File type detection | MIME type checking on upload |

---

## 10. Build & Deployment

```bash
# Development
npm install
npm run dev        # localhost:5173

# Production
npm run build      # tsc -b && vite build
npm run preview    # Preview production bundle
```

**Vercel config** (`vercel.json`):
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```
Single-page app rewrite — all routes served from `index.html`.

---

## 11. ML Model–Tool Dependency Map

| Model | Tools |
|---|---|
| `bge-small-en-v1.5` | Context Weaver, Latent Navigator, Glitch Detector, Noise Predictor, Ambiguity Amplifier (text), Detail Extractor |
| `ResNet-50` | Ambiguity Amplifier (image), Glitch Detector (image), Latent Navigator (image), Noise Predictor (image) |
| `KNN Classifier` | Ambiguity Amplifier, Glitch Detector |
| `CLIP ViT-B/32` | Imagination Inspector (zero-shot demographic classification + dataset alignment), Networked Narratives |
| `SmolLM2-135M-Instruct` | Semantic Oracle, Imagination Inspector (fallback for unknown professions) |
| `Florence-2-Base-ft` | Visual Storyteller |
| `Whisper-tiny.en` | Audio input (dashboard) |
| `TF.js Autoencoder (custom)` | Noise Predictor |
| `TF.js Anomaly Detection (custom)` | Discontinuity Detector |

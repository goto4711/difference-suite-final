# Difference Suite — Guided Walkthrough with Test Datasets

> **Live app**: [difference-suite-final.vercel.app](https://difference-suite-final.vercel.app)  
> **Test data**: [`difference-suite-testdata/`](https://github.com/goto4711/difference-suite-final/tree/main/difference-suite-testdata)

---

## Available Test Datasets

Before starting, familiarise yourself with what's available:

| Folder | Contents | Type | Best used for |
|---|---|---|---|
| `holocaust-texts/` | 10 numbered `.txt` files (`0001.txt` – `0327.txt`) | Text | Detail Extractor, Networked Narratives, Context Weaver, Semantic Oracle, Glitch Detector (text), Noise Predictor (text) |
| `election-tweets-texts/` | 50 tweet files (`tweet_001.txt` – `tweet_050.txt`) | Text | Ambiguity Amplifier (text), Glitch Detector (text), Latent Navigator (text), Context Weaver, Threshold Adjuster |
| `food_tweets/` | Tweet-style text files | Text | Glitch Detector (contrast corpus vs. election tweets), Ambiguity Amplifier |
| `images/` | 11 animal JPEGs: cat, dog, eagle, elephant, grasshopper, octopus, owl, panda, squirrel, tiger, whale | Images | Ambiguity Amplifier (image), Glitch Detector (image), Latent Navigator (image), Visual Storyteller, Deep Vector Mirror, Imagination Inspector |
| `visual_synapse_test/` | `golden_key.png` + `mystery_story.txt` | Mixed | Networked Narratives (Visual Synapse feature) |
| `other/` | Miscellaneous files | Mixed | General testing |
| `test/` | General test files | Mixed | General testing |

---

## Step 0: Authentication & Setup

1. Go to [difference-suite-final.vercel.app](https://difference-suite-final.vercel.app)
2. Click **Log In** in the top-right header
3. Enter a university email address (e.g. `yourname@uva.nl`, `yourname@ethz.ch`, or any `.edu` / `.ac.xx` address)
4. The content will unblur and all tools become accessible

> **Note:** This is a frontend-only soft gate — no password is required, only a valid academic domain.

---

## Step 1: Load the Data Dashboard

Navigate to `/` (the home screen). You'll see:
- **Visual Corpus** counter (images)
- **Text Corpus** counter (documents)
- **Other Data** counter (records)
- An empty **Library** grid with a drag-and-drop zone

### Load the animal images

1. Open `difference-suite-testdata/images/` on your local machine
2. Drag all 11 `.jpg` files onto the dashboard drop zone
3. The Visual Corpus counter updates to **11 Images**
4. Each image appears as a thumbnail in the grid

### Load the holocaust texts

1. Open `difference-suite-testdata/holocaust-texts/`
2. Drag all 10 `.txt` files onto the dashboard
3. Text Corpus counter updates to **10 Documents**

### Create collections

1. Click **+ New Collection** in the left sidebar
2. Name it `"Holocaust Texts"` — move the 10 `.txt` files into it
3. Create a second collection `"Animal Images"` — move the 11 images into it

> **Tip:** Collections are how tools filter their working corpus. Organise before analysing.

---

## Step 2: Visual Storyteller — First Contact with Images

**Route:** `/visual-storyteller`  
**Dataset:** `images/` (all 11 animal JPEGs)  
**Model:** ViT-GPT2 (loads on first use — allow ~30s)

### Steps

1. Navigate to **Visual Storyteller** from the sidebar
2. Wait for the model to load (progress indicator shown)
3. Select `tiger.jpg` from your corpus — the tool generates a caption, e.g.:
   > *"A tiger is standing in a grassy field"*
4. Try `octopus.jpg` — observe how the model handles an unusual subject
5. Try `grasshopper.jpg` — note any uncertainty or generic phrasing

### What to observe
- The **Story History** panel (bottom) accumulates the last 10 captions
- Compare how confidently the model describes familiar (dog, cat) vs. unusual (octopus, grasshopper) subjects
- This demonstrates the model's **training distribution bias** — it is more fluent on common ImageNet-style subjects

---

## Step 3: Ambiguity Amplifier — Classification Borderlines

**Route:** `/ambiguity-amplifier`  
**Dataset A (image mode):** `images/` — focus on `owl.jpg`, `eagle.jpg`, `squirrel.jpg`  
**Dataset B (text mode):** `election-tweets-texts/` vs. `food_tweets/`

### Image mode

1. Navigate to **Ambiguity Amplifier** → select **Image** mode
2. Wait for MobileNet to load
3. Select `owl.jpg` — observe the top-5 classification probabilities
4. Select `eagle.jpg` — compare confidence scores
5. Select `squirrel.jpg` — note if the model is uncertain between "squirrel" and "chipmunk" or similar

### Text mode

1. Switch to **Text** mode
2. Define **Concept A** as `"political"` and **Concept B** as `"food"`
3. Load several `election-tweets-texts/tweet_001.txt` files as examples of Concept A
4. Load several `food_tweets/` files as examples of Concept B
5. Test borderline inputs — tweets that mention both food and politics
6. The tool highlights **borderline cases** where confidence is near 50%

### What to observe
- Borderline cases reveal where the model's decision boundary is drawn
- The KNN classifier's uncertainty is a function of embedding proximity — not semantic meaning

---

## Step 4: Glitch Detector — Finding Classifier Confusion

**Route:** `/glitch-detector`  
**Dataset:** `images/` (image mode) or `election-tweets-texts/` + `food_tweets/` (text mode)

### Image mode

1. Navigate to **Glitch Detector** → **Image** mode
2. **Train Phase:** Assign images to two classes:
   - Class A `"predator"`: tiger, eagle, owl
   - Class B `"non-predator"`: panda, whale, grasshopper
3. Click **Train Classifier**
4. **Test Phase:** Upload `squirrel.jpg` or `octopus.jpg` — these are the ambiguous cases
5. Observe the confidence score — low confidence = a **glitch**

### Text mode

1. Switch to **Text** mode
2. Train on `election-tweets-texts/` (Class A: `"political"`) and `food_tweets/` (Class B: `"food"`)
3. Test with a tweet that discusses a political dinner or food policy
4. Observe which tweets score near 50% — these are the model's **glitches**

### What to observe
- Glitches are not errors — they reveal the **limits of the model's categorical logic**
- The tool makes visible what the model cannot cleanly separate

---

## Step 5: Latent Space Navigator — Between Categories

**Route:** `/latent-navigator`  
**Dataset:** `images/` (image mode) or `election-tweets-texts/` (text mode)

### Image mode

1. Navigate to **Latent Navigator** → **Image** mode
2. Set **Start** category: `cat` (upload `cat.jpg`)
3. Set **End** category: `tiger` (upload `tiger.jpg`)
4. Click **Navigate** — the tool interpolates through MobileNet's feature space
5. Observe the intermediate "hidden concepts" generated along the path

### Text mode

1. Switch to **Text** mode
2. Set **Concept A**: `"democracy"` — paste text from `tweet_001.txt`
3. Set **Concept B**: `"authoritarian"` — paste text from a contrasting tweet
4. Navigate the semantic space between them
5. Observe what concepts appear at the midpoint — these are the **latent in-between spaces**

### What to observe
- The interpolation path reveals what the model "thinks" lies between two categories
- Unexpected midpoint concepts expose the model's internal geometry

---

## Step 6: Context Weaver — Multi-Context Mapping

**Route:** `/context-weaver`  
**Dataset:** `holocaust-texts/` (all 10 documents)

### Steps

1. Navigate to **Context Weaver**
2. Load all 10 holocaust texts into the tool's corpus
3. Define three contexts:
   - Context 1: `"survival and resistance"`
   - Context 2: `"persecution and violence"`
   - Context 3: `"memory and testimony"`
4. Select individual documents and observe their **radial position** across the three contexts
5. Compare `0001.txt` vs `0327.txt` — do they cluster differently?

### What to observe
- The radial D3 visualization shows each document's cosine similarity to each context
- Documents that sit equidistant between contexts are semantically **ambiguous** — they resist easy categorisation
- This is the tool's core humanities insight: texts are not mono-contextual

---

## Step 7: Deep Vector Mirror — Attention & Vectors

**Route:** `/deep-vector-mirror`  
**Dataset:** `holocaust-texts/` (individual documents)

### Steps

1. Navigate to **Deep Vector Mirror**
2. Select `0001.txt` from your corpus
3. **Attention Lens mode:** The tool visualises which tokens the model attends to most strongly
   - Look for which words receive high attention weights
   - Compare with `0082.txt` — does the attention pattern shift?
4. **Heatmap mode:** View the full embedding as a structured heatmap
5. **Distance Matrix:** Load 3–4 documents and compare their pairwise cosine distances

### What to observe
- Attention weights reveal the model's internal prioritisation — not necessarily the most humanly meaningful words
- The distance matrix shows which texts the model considers semantically similar
- Texts that humans consider thematically related may be far apart in vector space — and vice versa

---

## Step 8: Detail Extractor — Outliers in the Archive

**Route:** `/detail-extractor`  
**Dataset:** `holocaust-texts/` (all 10 documents)

### Steps

1. Navigate to **Detail Extractor**
2. Load all 10 holocaust texts
3. Run the clustering — the tool groups semantically similar documents
4. Observe which documents are **outliers** — placed far from any cluster centroid
5. Read the highlighted "unique details" — passages the model flags as semantically isolated

### What to observe
- Outlier documents often contain the most historically specific or unusual content
- The tool operationalises the humanities concept of the **marginal detail** — what resists generalisation
- This is the tool most directly tied to the project's Holocaust research focus

---

## Step 9: Networked Narratives — Entity Graphs + Visual Synapse

**Route:** `/networked-narratives`  
**Dataset A:** `holocaust-texts/` (text) + `images/` (for visual synapse)  
**Dataset B:** `visual_synapse_test/` (`mystery_story.txt` + `golden_key.png`)

### Part A — Entity graph from holocaust texts

1. Navigate to **Networked Narratives**
2. Load `0001.txt` or `0082.txt`
3. Compromise.js extracts entities: people, places, organisations
4. A force-directed graph renders the relationships between entities
5. Observe which entities are most central (highest degree)

### Part B — Visual Synapse test

1. Load `visual_synapse_test/mystery_story.txt` into the corpus
2. Also load `visual_synapse_test/golden_key.png` into the image corpus
3. Run the entity extraction on `mystery_story.txt`
4. Activate **Visual Synapse** — CLIP will attempt to match extracted text entities to `golden_key.png`
5. Observe which text entities align with the image via CLIP's multimodal embedding space

### What to observe
- The visual synapse creates **cross-modal connections** — text concepts linked to visual evidence
- This is the tool's most technically complex feature, combining NLP + CLIP in a single pipeline

---

## Step 10: Noise Predictor — What the Model Forgets

**Route:** `/noise-predictor`  
**Dataset:** `holocaust-texts/` (text mode) or `images/` (image mode)

### Text mode

1. Navigate to **Noise Predictor** → **Text** mode
2. Load `0001.txt` — the tool embeds it via `all-MiniLM-L6-v2` (512 dimensions)
3. The autoencoder compresses and reconstructs the embedding
4. The **residual heatmap** shows the difference: original − reconstructed
5. Repeat with `0327.txt` — compare the residual patterns

### Image mode

1. Switch to **Image** mode
2. Load `panda.jpg` — the autoencoder compresses and reconstructs the image features
3. Compare the residual with `grasshopper.jpg`

### What to observe
- High residual values = information the model **cannot reconstruct** through the bottleneck
- This is what the model "forgets" — semantically or visually marginal information
- Texts with high residuals are the ones that resist compression into the model's learned representation

---

## Step 11: Semantic Oracle — Concept Exploration

**Route:** `/semantic-oracle`  
**Dataset:** `holocaust-texts/` (as contextual corpus)  
**Model:** LaMini-Flan-T5-783M (large — allow 1–2 min to load)

### Steps

1. Navigate to **Semantic Oracle**
2. Wait for the model to load (significant download on first use)
3. Load the holocaust texts as your contextual corpus
4. Try the three modes with the concept `"resistance"`:
   - **Define:** *"What is resistance?"* — the model gives a clear definition
   - **Expand:** *"What concepts are related to resistance?"* — surfaces hidden connections
   - **Tangent:** *"Give me a metaphor for resistance"* — generates creative/abstract output
5. Repeat with `"testimony"` and `"silence"`

### What to observe
- The **Tangent** mode is the most revealing — it shows how the model's generative imagination works
- Compare the model's definition of "resistance" with how the word appears in the holocaust texts
- The Oracle runs entirely locally — no data leaves the browser

---

## Step 12: Imagination Inspector — Generative Bias

**Route:** `/imagination-inspector`  
**Dataset:** `images/` (as grounding corpus for CLIP)

### Steps

1. Navigate to **Imagination Inspector**
2. Load all 11 animal images as your visual corpus
3. Enter a prompt: `"a dangerous animal"`
4. Run **Standard generation** — observe which images CLIP aligns with this prompt
5. Run **Bias-aware generation** — observe the absence report
6. Try `"a gentle animal"` — compare which images are surfaced vs. absent
7. Try `"a wild animal in its natural habitat"` — note which species are over/under-represented

### What to observe
- The **absence report** highlights what the model's imagination systematically excludes
- CLIP's alignment reveals the model's implicit associations between language and visual categories
- `grasshopper.jpg` and `octopus.jpg` are likely to be under-represented — they sit at the margins of typical training data

---

## Step 13: Threshold Adjuster — Decision Boundaries

**Route:** `/threshold-adjuster`  
**Dataset:** `election-tweets-texts/` (pre-scored or use output from Glitch Detector)

### Steps

1. Navigate to **Threshold Adjuster**
2. Load scored data from the election tweets (or use the classification scores from Glitch Detector)
3. The histogram shows the distribution of confidence scores across all 50 tweets
4. Move the **threshold slider** from 0.5 to 0.7
5. Observe how the "approved/rejected" split changes
6. Find the threshold at which the most borderline tweets flip classification

### What to observe
- The histogram reveals whether the score distribution is bimodal (clear separation) or flat (ambiguous corpus)
- Borderline cases near the threshold are the most politically and semantically contested tweets
- This tool makes the **arbitrariness of classification thresholds** visible and interactive

---

## Step 14: Deep Time — Algorithmic Time

**Route:** `/deep-time`  
**Dataset:** `holocaust-texts/` (text mode) or `images/` (image mode)

### Attention Lens (Text)

1. Navigate to **Deep Time**
2. The default view is **Attention Lens**.
3. Load `0001.txt` from the suite corpus.
4. Experiment with the **Memory decay rate (λ)** slider.
5. Observe how adjusting the causal memory prior forces the attention matrix to "forget" tokens further back in the sequence, restoring a human-like degradation to the otherwise flat geometry of the transformer.

### Diffusion Scrubber (Image)

1. Switch to the **Module: Diffusion Scrubber** tab natively at the top of the interface.
2. Load `cat.jpg` from the suite corpus (or Drag and Drop).
3. Use the timestep slider to inject mathematical forward-process noise (t=0 to 999).
4. Observe the structured degradation of the image as the signal-to-noise ratio inverts.

### Memory Audit (Text/Timeseries)

1. Switch to the **Module: Memory Audit** tab.
2. Load `0327.txt` to populate the event timeline.
3. Choose a Hidden Dimension Size (e.g. 32) and click **Run Analysis**.
4. Observe the pure-JS Backpropagation charts showing how gradients vanish over long sequences for Vanilla RNNs versus LSTMs.

### What to observe
- These tools operate almost entirely synthetically using pure conceptual mathematics rather than loading large model weights.
- It exposes how AI handles *time*: flattening it into space (attention), destroying it via entropy (diffusion), or losing it iteratively (vanishing gradients).

---

## Suggested Workflows by Research Question

### "How does AI categorise historical testimony?"
1. Load `holocaust-texts/` → **Detail Extractor** (find outliers)
2. → **Context Weaver** (map across survival / persecution / memory)
3. → **Deep Vector Mirror** (inspect attention patterns)
4. → **Semantic Oracle** (expand concept of "testimony")

### "What does AI see in images?"
1. Load `images/` → **Visual Storyteller** (generate captions)
2. → **Ambiguity Amplifier** (find low-confidence classifications)
3. → **Imagination Inspector** (test CLIP alignment with prompts)
4. → **Latent Navigator** (interpolate between animal categories)

### "How does AI draw the line between political and non-political speech?"
1. Load `election-tweets-texts/` + `food_tweets/` → **Glitch Detector** (train classifier)
2. → **Ambiguity Amplifier** (find borderline tweets)
3. → **Threshold Adjuster** (explore decision boundary sensitivity)
4. → **Latent Navigator** (navigate the semantic space between the two corpora)

### "What does AI forget?"
1. Load `holocaust-texts/` → **Noise Predictor** (residual analysis)
2. → **Detail Extractor** (outlier detection)
3. → **Deep Vector Mirror** (distance matrix — what is far from what)

### "How do text and image relate in AI space?"
1. Load `visual_synapse_test/` → **Networked Narratives** (Visual Synapse)
2. Load `images/` + `holocaust-texts/` → **Imagination Inspector** (CLIP grounding)
3. → **Context Weaver** (cross-modal context mapping)

---

## Performance Notes

| Tool | Model load time (first use) | Processing time per item |
|---|---|---|
| Visual Storyteller | ~30s (ViT-GPT2) | ~5s per image |
| Semantic Oracle | ~60–120s (LaMini-Flan-T5-783M) | ~10–20s per query |
| Ambiguity Amplifier | ~10s (MobileNet) | ~1s per item |
| Glitch Detector | ~10s (MobileNet/MiniLM) | ~2s per item |
| Context Weaver | ~15s (MiniLM) | ~2s per item |
| Networked Narratives | ~5s (Compromise.js) + ~20s (CLIP) | ~3s per text |
| Noise Predictor | ~15s (TF.js autoencoder) | ~5s per item |
| Deep Vector Mirror | ~15s (MiniLM) | ~2s per item |

> All models run locally in-browser via WebGPU/WASM. **No data is sent to any server.**  
> First load downloads model weights; subsequent uses are cached.

# Difference Suite — Guided Walkthrough with Test Datasets

> **Live app**: [difference-suite-final.vercel.app](https://difference-suite-final.vercel.app)
> **Test data**: [`difference-suite-testdata/`](https://github.com/goto4711/difference-suite-final/tree/main/difference-suite-testdata)
> **Last full rewrite**: June 2026 — covers the v4 architecture, the Machine Room, Contestations, and Collaboration.

Everything in this walkthrough runs in your browser. Nothing you upload, type, or contest leaves your machine. The first time each tool loads its model you will see a download; after that, the tool works even with the network off (see the closing section on classroom preparation).

---

## Available Test Datasets

The repository ships five image collections, three text corpora, a small mixed-input test set and a handful of tabular files:

```
difference-suite-testdata/
├── images/
│   ├── animals/              11 JPEGs (cat, dog, eagle, whale … )
│   ├── anefo/                30 Dutch press photographs, 1945–1989 (CC0, Nationaal Archief)
│   ├── rijksmuseum/          37 paintings, mixed genres (public domain, Rijksmuseum Amsterdam)
│   ├── mechanical_curator/   30 book illustrations, 17th–19th c. (no known copyright, British Library)
│   └── stable_bias/          30 synthetic profession portraits (CC BY-SA, Bianchi et al. 2023)
├── texts/
│   ├── holocaust-texts/      numbered .txt files (0001.txt – 0327.txt)
│   ├── election-tweets-texts/ 50 tweet files (tweet_001.txt – tweet_050.txt)
│   └── food_tweets/          tweet-style text files
├── test/
│   └── visual_synapse_test/  golden_key.png + mystery_story.txt
└── other/                    system_crash.json, threshold_data.json, viral_event.csv
```

| Collection | Best used for |
|---|---|
| `images/animals/` | warm-up; the Glitch Detector "normal" training set; every image tool's first try |
| `images/anefo/` | Visual Storyteller, Glitch Detector contrast set, Depth Mirror (interiors, crowds) |
| `images/rijksmuseum/` | Visual Storyteller (what does CLIP think a 17th-century portrait is?), Imagination Inspector pairings |
| `images/mechanical_curator/` | Noise Predictor and Visual Storyteller — loudest, most pedagogically useful captioner failures |
| `images/stable_bias/` | the exact synthetic images Imagination Inspector reads internally — drop them through other tools |
| `texts/holocaust-texts/` | Detail Extractor, Networked Narratives, Context Weaver, Glitch Detector (text), Noise Predictor (text) |
| `texts/election-tweets-texts/` | Ambiguity Amplifier (text), Glitch Detector (text), Latent Navigator (text), Threshold Adjuster |
| `texts/food_tweets/` | Glitch Detector contrast corpus, Ambiguity Amplifier |
| `test/visual_synapse_test/` | Networked Narratives (Visual Synapse) |
| `other/`, `test/` (root) | miscellaneous tabular and time-series data; ad-hoc images |

Each image collection contains a `README.md` (provenance, licensing, walkthrough use) and a `manifest.json` with per-image metadata (artist, date, source category, license, Commons or HuggingFace URL).

> **A note on the corpora.** The animal images are deliberately innocuous warm-up material. The four new image collections each carry a different politics: Anefo gives you Dutch post-war press photography (decolonisation, demonstrations, royal pageantry); the Rijksmuseum set asks how vision models read pre-photographic art; Mechanical Curator pushes captioners off the distribution they were trained on; Stable Bias is synthetic by construction — no real person depicted — and is the same data the Imagination Inspector reads. The Holocaust testimonies and election tweets are where the suite's questions become real: what does it mean for a classifier to call a testimony "anomalous", or for a threshold you chose to split political speech from noise? Move from the animals to these as soon as the mechanics feel familiar.

---

## Step 0: Setup

1. Open [difference-suite-final.vercel.app](https://difference-suite-final.vercel.app).
2. Click **Log In** (top right) and enter any academic email (`name@uva.nl`, `.edu`, `.ac.xx`…). This is a frontend-only soft gate — no password, no account. Your login and your data persist in this browser only.
3. Note three permanent companions you will meet on every tool page:
   - the **model status badge** (top right) — which models are in memory right now;
   - the **Contest** button (appears beside it whenever the current tool has produced an output you might disagree with);
   - the **"Show the machine's work"** bar (bottom of the screen) — a live, plain-language journal of what the machinery just did on this page.

## Step 1: Load the Data Dashboard

Open **Data Dashboard** in the main menu (it is also where `/` redirects you on first visit). You'll see counters for the Visual Corpus, Text Corpus and Other Data.

1. **Load the animal images**: drag the 11 JPEGs from `images/animals/` into the uploader (or use the upload button).
2. **Load one or two of the new image sets** — `images/anefo/`, `images/rijksmuseum/`, `images/mechanical_curator/`, `images/stable_bias/`. You don't need all four; pick whichever fits the session's question (see the table above).
3. **Load the texts**: drag in `texts/holocaust-texts/` and `texts/election-tweets-texts/` files.
4. **Create collections** in the sidebar — name them after the folders (`animals`, `anefo`, `rijksmuseum`, `mechanical_curator`, `stable_bias`, `holocaust-texts`, `election-tweets-texts`, `food_tweets`) — and move each batch into its collection. Several tools (Glitch Detector, Detail Extractor) operate on *collections*, not loose items.
5. Reload the page once. Everything survives: items, collections, and later your analysis results — persistence is local (your browser), by design.

## Step 2: The Machine Room — meet the machinery first

Before any analysis, open **Machine Room** in the main menu. It will be nearly empty — that is the point. Keep it in mind; you will return after each tool to read what the machine *did*: which model it fetched, at what precision ("q4 — a quarter of the original precision; someone made this trade-off for you"), on which processor, what it evicted to make room, and what failed. The **Fragility** section counts crashes, fallbacks and timeouts for your session. Nothing here is hidden or embarrassing; this is the suite narrating its own decisions.

## Step 3: Visual Storyteller — perception vs. imagination

1. Open **Visual Storyteller**, choose `whale.jpg` from the `animals` collection, press **Imagine a Story**.
2. First run: watch the machine-work bar while Florence-2 (the big vision model) downloads.
3. Now run the same exercise on a 17th-century Rijksmuseum portrait, then on a Mechanical Curator engraving, then on one of the Anefo press photographs from the late 60s.

**What to observe.** Two outputs, deliberately distinct: under "— AI Imagination", a sampled, surreal micro-story; beneath it, "What the vision model saw" — the literal caption. The story changes on every run (sampling); the caption barely does. This is the suite's clearest staging of machine perception versus machine confabulation. The choice of image is itself the lesson: Florence-2 will narrate a 19th-century engraving as "a black and white drawing", flatten a Rijksmuseum allegory to "a painting", and read a 1968 Amsterdam street scene as if it were contemporary. Each register of failure is a different kind of contestation. If a story strikes you as erasing something the image plainly shows — press **Contest** in the header and say so.

## Step 4: Ambiguity Amplifier — confidence at the borderline

1. **Image mode**: select `cat.jpg`. ResNet-50 classifies it; the Confidence Spectrum shows the top labels.
2. Raise the **Noise Level** slider in steps and re-observe.
3. **Text mode**: paste an election tweet; amplify ambiguity in the embedding.

**What to observe.** Confidence does not fade gracefully — it tips. Somewhere on the slider, the top-1 class flips while the image still looks unmistakably like a cat to you. The borderline is the object of study: classification is a cliff, not a slope.

## Step 5: Glitch Detector — whose normal?

1. **Train**: pick the `animals` collection as "Normal" and press **Train Model**. Watch it learn 11 patterns (each is a CLIP embedding — check the machine-work bar).
2. **Test**: the tool auto-switches to Test mode. Test an image that was *in* the training set: ~100% normality, necessarily.
3. Now test images from the *other* collections — an Anefo press photograph, a Rijksmuseum painting, a Mechanical Curator engraving, a Stable Bias synthetic portrait. Each one is a glitch under this training set; what you can read off the Normality score is *how unlike an animal photograph* the model finds each register.
4. Retrain on `anefo` and test the same set against this new normal. Move the **Sensitivity** slider and watch verdicts flip.
5. **Text mode**: train on `food_tweets`, test election tweets against it.

**What to observe.** The threshold is yours. There is no objectively correct sensitivity — which is precisely the point of the Probability→Doubt translation. The two trainings above show "normal" itself is a curatorial choice: animals make paintings glitches, paintings make engravings glitches, and a press archive trained as normal will read a synthetic Stable Diffusion portrait as either suspicious or perfectly normal depending on the slider. Contest a verdict you disagree with (the Contest button captures the image, the score *and your threshold*); you will use that record in Step 17.

## Step 6: Latent Space Navigator — between categories

1. Image mode: choose two animals (e.g. `cat.jpg` and `tiger.jpg`) and interpolate between them.
2. Text mode: interpolate between two tweets.

**What to observe.** The space *between* categories is populated and navigable. Identity, to the model, is a region with soft edges — the Identity→Ambiguity translation made walkable.

## Step 7: Context Weaver — meaning is positional

1. Select a Holocaust testimony; weave it against several contexts.

**What to observe.** The same sentence sits at different distances from different contexts; the radial view shows meaning as relation rather than essence (Vector→Context).

## Step 8: Deep Vector Mirror — the vector itself

1. Select `eagle.jpg`. Three things happen: the image renders, its CLIP embedding appears as a red/blue heatmap, and (for text inputs) the Attention Lens highlights tokens.
2. Move the **Noise** and **Context Shift** sliders to perturb the vector and watch the heatmap respond.
3. Repeat with a Rijksmuseum painting, then with a Stable Bias synthetic portrait. Each vector is "a few hundred numbers" — but they don't look like each other.

**What to observe.** This *is* the representation — a few hundred numbers; everything downstream is arithmetic on them. The heatmap is scaled robustly (CLIP has a couple of extreme outlier dimensions which would otherwise blacken everything else — itself a lesson in how unevenly meaning is distributed across a vector). The token view is labelled "Embedding similarity — real attention weights pending Transformers.js v4 support": read the label, it is telling you the truth about a placeholder.

## Step 9: Detail Extractor — outliers in the archive

1. Point it at the `holocaust-texts` collection; let it embed and cluster.

**What to observe.** What clusters together, and what is left stranded? The stranded items are the tool's gift: Detail→Narrative means the outlier is a story, not an error.

## Step 10: Networked Narratives — entities and synapses

1. **Part A**: build an entity graph from the Holocaust texts; explore who/where/what is connected.
2. **Part B**: Visual Synapse — add `golden_key.png` and `mystery_story.txt` from `test/visual_synapse_test/` and watch the image attach itself to the narrative graph via CLIP.

**What to observe.** The graph is a *machine* reading; names the NLP misses or merges are absences worth contesting.

## Step 11: Noise Predictor — what the model forgets

1. Image mode: select an animal image, **Process**, then **Train** (a small autoencoder trains live in your browser — watch the loss fall over 50 epochs).
2. Read the three panels: Original → Reconstructed → Residual Noise (amplified for visibility).
3. Repeat on a Mechanical Curator engraving and on a Rijksmuseum painting. The residuals look fundamentally different: line-drawn engravings throw away type and crosshatching, paintings throw away texture and craquelure.

**What to observe.** The reconstruction is soft and imperfect *by design* — the network squeezed the image through a narrow bottleneck and kept only what it could. The residual panel shows everything it discarded: the model's definition of "noise", which on a photograph of a face, an archive page, or a 19th-century book illustration is never culturally neutral.

## Step 12: Semantic Oracle — a small intelligence you can corner

1. Type a concept (`difference`, `archive`, `memory`) and try the three modes: Define / Expand / Tangent.

**What to observe.** SmolLM2 has 135 million parameters — a thousandth of the commercial systems — and it shows: confident, fluent, frequently wrong. That is its pedagogical value. It is small enough to corner, interrogate and contest. (The suite's first ever recorded contestation was filed against this tool's definition of "archive".)

## Step 13: Imagination Inspector — generative bias, with the instrument disclosed

1. Type or pick a profession (`doctor`, `CEO`, `janitor`) and run it.
2. The tool fetches **real** Stable Diffusion / DALL-E outputs for that profession from the Stable Bias research corpus and classifies each face locally with CLIP.
3. Read each card's tags — note they say **"CLIP-perceived"** gender/race/age, that some read *≈ ambiguous*, and that hovering shows the top-2 readings with percentages ("female 54% / male 46%").
4. Read **The Void Report**: bars for what is present, dashed VOID bars for what the generators never imagined, and an *ambiguous* count for where the measuring instrument itself hesitated.
5. Try the **Adjective** toggle (a *confident* CEO vs. a *gentle* CEO) — a controlled experiment over the corpus.
6. Try a profession that isn't in the archive (`astronaut chef`): you get an honest empty state with suggestions, not fabricated data.

**What to observe.** Two layers of bias at once: the generators' (who appears as "doctor"?) and the classifier's (what does CLIP think a "female" face looks like — and when does it hesitate?). The disclosure panel says it plainly: these readings are made by another AI and are contestable. Contest one.

**Bonus exercise — close the loop.** The `images/stable_bias/` collection is a 30-image sample of the *exact* dataset Imagination Inspector reads from. Upload it via the Dashboard and run those images through Visual Storyteller, Depth Mirror and Deep Vector Mirror. You will be feeding the *same* synthetic images that the Inspector tagged demographically through tools that treat them as ordinary photographs — Florence-2 narrates an SD-generated "CEO" as if it were a real boardroom; Depth Mirror produces uncanny depth maps because the latent geometry is not physically consistent. Pair this with the Anefo press portraits in Glitch Detector and you have a real-vs-synthetic exercise built from CC-licensed material.

## Step 14: Threshold Adjuster — doubt as a slider

Classify a small set of tweets, then drag the decision threshold and watch items flip class. Pair it with the Glitch Detector for the full Probability→Doubt argument.

## Step 15: Depth Mirror, Discontinuity Detector, Deep Time

- **Depth Mirror**: depth estimation on the animal images, then on a Rijksmuseum landscape, then on a Stable Bias synthetic portrait. Where does the model's spatial belief fail — and notice that on the synthetic face the failure has a different character (the latent geometry is not physically consistent).
- **Discontinuity Detector**: anomalies in time-series as moments of contingency rather than error.
- **Deep Time**: three sub-views (Attention Lens, Diffusion Scrubber, Memory Audit) on temporality and machine memory — bring a long testimony.

## Step 16: Contest as you go

By now you should have three or four contestations. Open **Contestations** in the main menu: every record carries your note, its category, the contested output, and the settings that produced it — all stored only in your browser. **Export** produces a JSON packet (for the next step) and a printable HTML evidence packet (for a seminar discussion or coursework appendix).

## Step 17: Collaboration — disagreement made visible

In a group setting (or solo, by exporting twice under different initials):

1. Everyone exports their contestation packet (JSON) with their initials.
2. One person opens **Collaboration** and drags all packets in.
3. Read the **threshold spread**: every participant's Glitch Detector sensitivity on a single axis — the group's disagreement about where "glitch" begins, in one picture. There is no correct dot.
4. Read the **tool × participant matrix**: where did this group's friction concentrate?
5. Export the combined packet as the session's collective record.

Imports live in memory only — a collaboration is an encounter, not a database.

## Step 18: The offline finale

1. With everything above done at least once, open DevTools → Network and set **Offline** (or simply kill the Wi-Fi).
2. Reload. The suite returns. Run the Semantic Oracle again. It answers.

Everything — interface, inference engine, every model you used — is now on your machine. This is what "local-first" means, demonstrated rather than claimed.

---

## Suggested Workflows by Research Question

- **"How does AI categorise historical testimony?"** — Steps 1, 9, 10, 7, then Glitch Detector text mode trained on `food_tweets` and tested on testimonies; contest the verdicts.
- **"What does AI see in images?"** — Steps 3, 4, 8, 11, 15 (Depth Mirror) — run each tool across `animals`, `anefo`, `rijksmuseum`, `mechanical_curator`, and watch the failure register change.
- **"Real or generated?"** — Train Glitch Detector on `anefo` press portraits as Normal; test it on `stable_bias` synthetic faces. Then train it on `stable_bias`; test on `anefo`. Both directions are interesting; neither produces a clean rule. Finish in the Collaboration view.
- **"What does CLIP think a 17th-century portrait is?"** — Visual Storyteller and Deep Vector Mirror on `rijksmuseum`; finish with the Imagination Inspector cross-reading.
- **"Where is the line between political and non-political speech?"** — Ambiguity Amplifier (text), Threshold Adjuster, Glitch Detector with tweet corpora; finish with the Collaboration threshold spread.
- **"What does AI forget?"** — Noise Predictor on images and text; Detail Extractor outliers; the Void Report. Try the residual on a Mechanical Curator engraving for the loudest version of the lesson.
- **"What did the machine decide for me today?"** — any three tools, then the Machine Room journal, end to end.

## Classroom Preparation Notes

- **Preload while online**: have students click through every tool you plan to use at the start of the session — each first use downloads its model (100–400 MB for the heavier ones). After that, the session survives any Wi-Fi.
- **First load of Florence-2 / Visual Storyteller** is the longest single download; start it first.
- The model badge shows what is in memory; the suite holds at most three models and evicts the least recently used — the Machine Room narrates every eviction.
- If a tool ever errors with "model execution wedged": that is the watchdog doing its job. Reload the page; the Fragility counter will remember, and that, too, is teaching material.
- The suite is installable (browser "Install app" prompt) for a kiosk-like setup.

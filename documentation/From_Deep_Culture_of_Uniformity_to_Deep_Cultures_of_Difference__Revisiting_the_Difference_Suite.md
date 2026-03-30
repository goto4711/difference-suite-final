# From Deep Culture of Uniformity to Deep Cultures of Difference

**Revisiting the Difference Suite in the Context of the DEEP CULTURE ERC Project**

---

## Abstract

This article revisits the DEEP CULTURE project (ERC Advanced Grant 2023) and its flagship public output, the **Difference Suite**, in light of both the project’s original ERC proposal and the suite’s concrete implementation as a fully client-side, Transformers.js–based toolkit for cultural AI. Building on the proposal’s conceptualisation of **deep culture**—the entanglement of deep learning with cultural production, archives, and everyday life—we show how the Difference Suite operationalises the project’s pathway from a *deep culture of uniformity* to **deep cultures of difference** shaped by humanistic data, concepts, and practices. [10][14]

We bring three strands of the proposal directly into conversation with the implemented software: (1) the three-dimensional understanding of culture (shared meanings, creative processes, material infrastructures); (2) the programme of **epistemic translations**, which rework deep-learning keywords such as *detail*, *relationality*, *discontinuity*, *identity*, *imagination* and *uncertainty*; and (3) the six keyword-based case studies at three archival sites—Holocaust, real-time and incidental archives—organised across four work packages (epistemic translations, case studies, public things, and composition). [3][12][13]

We document how the Difference Suite’s architecture has shifted from an initial TensorFlow.js/Universal Sentence Encoder prototype to a **Transformers.js–centred stack** with local models for embeddings, captioning, and text generation, complemented by TensorFlow.js for custom training. This allows the suite to instantiate DEEP CULTURE’s methodological and ethico-political commitments: treating archives as empirical and political sites, foregrounding marginal details and anomalies, and turning deep learning into a *public thing* that can be contested in practice by diverse publics, not only experts. [4][6][14]

**Keywords:** Digital Humanities; Deep Learning; Cultural AI; Transformers.js; Public Digital Humanities; Archives; Critical Algorithm Studies

---

## 1. Introduction: Deep Culture Between Critique and Practice

Deep learning has quickly become central to the infrastructures of digital culture. Since the re-emergence of AI from its "last winter", deep learning has consolidated a paradigm in which systems search for and find their own representations of input data, transforming texts, images and structured records alike into numerical vectors. [4] For the ERC project **DEEP CULTURE**, this is not merely a technical shift but the emergence of a **deep culture**: a convergence of AI, platforms and digital culture driven by the desire to automate shared meanings and creative processes further than before. [8][14]

As the proposal argues, this convergence is double-edged. On the one hand, deep learning supports new forms of multi-dimensional relationality (via vectorisation and attention layers) and distributed memory (via encoder–decoder and transformer architectures). On the other hand, the drive for scale and generality risks sidelining core humanistic concerns—difference, marginality, contextual situatedness—and the archival traditions that have long underpinned critical work with cultural collections. [2][8][12]

DEEP CULTURE seeks to move from a **deep culture of uniformity**—produced by universal data extraction and technical solutionism—towards **deep cultures of difference** that begin from humanistic data, concepts and practices. [10][14] Rather than starting from a single dataset or application, the project works across three archival sites (historical, real-time and incidental archives) and six keyword-based case studies that reconfigure deep learning practices in terms of *detail*, *relationality*, *discontinuity*, *identity*, *imagination* and *uncertainty*. [4][9][12]

Within this broader programme, the **Difference Suite** is conceived as the principal public-facing **“little tool of difference”** (Law, 2017) and as the main digital product of Work Package 2 (keyword-based case studies) and Work Package 3 (public things). [3][6] It materialises the project’s epistemic translations in software form and turns deep learning’s underlying operations into a **public thing** (Honig, 2017; Aradau and Blanke, 2022) that can be collectively scrutinised, experimented with and contested.

---

## 2. Conceptual Framework: Keywords, Case Studies and Work Packages

### 2.1 Deep Culture’s Three Dimensions and Objectives

The proposal articulates *deep culture* along three dimensions: [10]

1. **Shared meanings** – culture as a "whole way of life" through practices and understandings (after Williams).
2. **Creative processes** – culture as arts and creative production.
3. **Material culture of AI** – "what goes on inside the technology"; the data, models and infrastructures that mediate culture. [10][14]

These dimensions map onto three main project objectives: [10]

1. **Critical inquiry about deep culture** – via epistemic translations and close readings of deep-learning literature and practices (Work Package 1).
2. **Critical inquiry with deep culture** – via keyword-based case studies, new methods and culturally sensitive models (Work Package 2).
3. **Critical relations with and beyond deep culture** – via public things, workshops and the Difference Suite as a co-created app (Work Package 3), and through synthesis in monograph and edited volume (Work Package 4). [3]

The Difference Suite sits at the intersection of WP2 and WP3: it consolidates case-study methods into a reusable toolkit and recasts them as a public thing for co-investigation with non-experts. [3][6]

### 2.2 Epistemic Translations and Six Case Studies

A central conceptual innovation of DEEP CULTURE is the use of **keywords** as tools of interdisciplinarity and epistemic translation. [5][12] Building on Raymond Williams’s _Keywords_ and later adaptations in digital culture, the project identifies terms that circulate across deep learning and humanities debates but are operationalised differently.

Table 1 of the proposal summarises these translations: [12]

| Keyword       | Dominant deep culture | Deep cultures of difference | Archival site      |
|---------------|------------------------|-----------------------------|--------------------|
| Detail        | Profile                | Narrative                   | Holocaust          |
| Relationality | Vector                 | Context                     |                    |
| Discontinuity | Anomaly                | Contingency                 | Real‑time archives |
| Identity      | Bias                   | Ambiguity                   |                    |
| Imagination   | Generativity           | Creativity                  | Incidental archives|
| Uncertainty   | Probability            | Doubt                       |                    |

These translations underpin six case studies specified in the proposal: [0][9][10]

1. **Detail (Holocaust archives)** – reconfigure profiling across socio-historical datasets into detailed narratives of resistance; employ knowledge graphs and relationship extraction to reconstruct forgotten resistance in EHRI collections; generate new culturally sensitive language models around these archives. [0][9]
2. **Relationality (Holocaust archives)** – study vectorisation and attention layers as new forms of relationality by organising software-studies–inspired walkthroughs with NLP researchers working on hate speech and antisemitism; analyse how embedding vectors combine and split contexts, especially in relation to EHRI’s collection graph. [0][9]
3. **Discontinuity (real-time archives)** – recast time-series anomaly detection as computational genealogy; detect contingencies in grassroots campaigning against surveillance using multi-national web archives; interview practitioners in Open Source Intelligence and GCHQ-related contexts. [0][10]
4. **Identity (real-time archives)** – explore facial recognition and variational autoencoders to understand how deep learning resolves or suppresses ambiguities in identity across social media images; investigate what remains ambiguous and how ambiguous cases can be reclaimed for critical analysis. [10][11]
5. **Imagination (incidental archives)** – examine generative AI’s training on incidental archives (e.g. medical records, EU documents) via tools such as “Have I Been Trained”; develop methods to represent absences and losses in generative AI’s ethico-politics; collaborate with artists (ARIAS) on public exhibitions. [10]
6. **Uncertainty (incidental archives)** – study how epistemic uncertainties in models (e.g. around asylum decisions) are collapsed into thresholded decisions; use ensembles and robust AI methods to expose thresholds as sites of doubt and ethical contestation. [6][10]

The Difference Suite’s tools map onto these case studies and keywords: Detail Extractor and Networked Narratives support detail and relationality in Holocaust archives; Discontinuity Detector and Glitch Detector support discontinuity and identity in real-time archives; Imagination Inspector and Threshold Adjuster support imagination and uncertainty in incidental archives. [0][3][6]

### 2.3 Work Packages and the Role of the App

Work Package 2 identifies the app as the project’s **main digital product**, bundling the methods from case studies into an open-source software and data toolkit for low-resource humanities environments, with associated training materials and data/methods labs. [3]

Work Package 3 explicitly frames the app as the **“little tool of difference”**: a public-facing tool co-developed in three workshops with non-experts (via Humanities Lab, Cultural AI Lab, CREATE, Tactical Tech, Public Data Lab, etc.) to make encoding, decoding and vectorisation publicly contestable. [3][6][14]

The deployed Difference Suite at `difference-suite-final.vercel.app` realises this role by:

- Running entirely in the browser using Transformers.js and TensorFlow.js, avoiding cloud infrastructures and highlighting localised models. [6]
- Supporting workshops and training events, including those envisioned with Tactical Tech and Public Data Lab, by allowing participants to upload their own “mobile ecosystems”, selfies, or incidental archives. [6][14]
- Serving as an experimental space that complements the project’s **data and methods labs** and contributes models and pipelines back to open method markets like Hugging Face and EU-SSHOC. [3]

---

## 3. Technical Architecture of the Difference Suite

### 3.1 From TensorFlow.js to a Hybrid Transformers.js Stack

The proposal anticipated a browser-based app using JavaScript deep learning (TensorFlow.js), and indeed early prototypes relied on Universal Sentence Encoder and MobileNet. In the current suite, this has evolved into a **hybrid stack** that better matches the ERC project’s emphasis on new, culturally sensitive language and image models: [3][7]

- **Frontend:** React 19 + TypeScript, Vite bundler; Tailwind 4 + Framer Motion.
- **State & routing:** Zustand (single global store), React Router 7.
- **Deep learning (browser-native):**
  - Transformers.js + `@huggingface/transformers` providing:
    - `all‑MiniLM‑L6‑v2` for text embeddings across multiple tools.
    - `LaMini‑Flan‑T5‑783M` for local generative text in Semantic Oracle.
    - `vit‑gpt2-image-captioning` for Visual Storyteller.
    - CLIP models for Imagination Inspector and Networked Narratives (Visual Synapse).
    - `whisper‑tiny.en` for browser‐based speech recognition (dashboard capture).
  - TensorFlow.js for custom models:
    - Autoencoders (Noise Predictor).
    - Time-series anomaly detection (Discontinuity Detector).
    - MobileNet-based features where efficiency is crucial (Ambiguity Amplifier, Glitch Detector image mode).

A central **TransformersManager** singleton—corresponding to the proposal’s idea of a shared methodological commons—initialises and caches models lazily on first use, then shares them across tools. This preserves computational resources in typical humanities environments and ensures that sensitive archival data never leaves the local machine. [0][3]

### 3.2 Data Dashboard and Corpus Model

The Difference Suite’s Data Dashboard realises the project’s emphasis on archives as research laboratories: [4][12]

- Users can ingest images, text, audio and tabular/time-series data via drag‑and‑drop, folder upload, webcam, and microphone.
- Items are grouped into **collections** (e.g. “EHRI Holocaust texts”, “web archive snapshots”, “asylum decisions”), reflecting the three archival sites.
- Each `DataItem` includes metadata (file size, MIME type, timestamps), content or references, embeddings (once computed), and a map of `analysisResults` keyed by tool id.

This design supports the ERC objective of producing **culturally sensitive models** rooted in specific collections: embeddings and models are always computed *against* the researcher’s own archives rather than against abstract benchmark corpora. [0][3]

### 3.3 Interface and Public-Thing Design

The interface design reflects the project’s commitment to public things and “walkthrough methods” for apps: [6][7]

- **MainLayout** integrates a sidebar listing tools (labelled by keyword and archival orientation), a header with authentication (soft academic gate), and a corpus statistics row (Visual/Text/Other counts).
- Each tool uses a **ToolLayout** with a main visualisation canvas (two‑thirds) and a side panel for controls, model/loading status, and interpretive prompts.
- Heavy tasks (model loading, large-batch embeddings, autoencoder training) run in Web Workers, but progress is surfaced to users rather than hidden.

The goal is twofold: to support expert research workflows *and* to facilitate the kind of “software-studies inspired walkthroughs” with NLP researchers and practitioners that the proposal foresees. [0][12]

---

## 4. Tools, Keywords and Case Studies

In what follows we align the suite’s tools explicitly with the six keyword-based case studies specified in the ERC proposal and show how they enact epistemic translations.

### 4.1 Detail (Holocaust Archives): Detail Extractor & Networked Narratives

The proposal’s first case study on **detail** addresses Holocaust archives through hierarchical representation learning and knowledge graphs to surface marginalised stories of resistance. [0][9]

- **Detail Extractor** uses `all‑MiniLM‑L6‑v2` embeddings to cluster texts (e.g. Jewish Council records, testimonies) and identify **outliers**—documents that resist dominant patterns. These outliers are flagged as candidate sites for close reading and “close distant reading” of resistance narratives. [0][2]
- **Networked Narratives** uses entity extraction and relation visualisation, matching the plan to construct knowledge graphs and relationship extraction pipelines over EHRI collections. [0][9]

Together, these tools reconfigure “profiling” into detailed narrative reconstruction, aligning closely with the ERC’s description of the first case study and its commitment to using deep learning to retell marginalised stories rather than to generalise away from them. [0][9]

### 4.2 Relationality (Holocaust Archives): Context Weaver, Deep Vector Mirror

The second case study on **relationality** explores vectorisation and attention as new forms of multi-dimensional relationality for Holocaust collections, while remaining wary of total quantification. [0][9]

- **Context Weaver** uses `all‑MiniLM‑L6‑v2` to map documents across multiple contexts (e.g. survival, persecution, testimony), making explicit how embedding vectors aggregate or split contexts at different stages. [0]
- **Deep Vector Mirror** visualises embeddings and attention weights, providing the “software-studies inspired walkthrough” perspective on how vectors relate EHRI collection items across large national archives and micro-archives. [0][9][12]
- **Deep Time** exposes the mathematical constraints of algorithmic temporality, simulating how causal attention masks and diffusion schedules enforce relation through entropy and memory decay.

These tools implement the case study’s aim of using vectorisation both to strengthen contextual linking (e.g. across EHRI’s collection graph) and to expose where context is lost in dominant deep learning practices. [0][9]

### 4.3 Discontinuity (Real-Time Archives): Discontinuity Detector

The third case study on **discontinuity** reinterprets anomaly detection in real-time archives as **computational genealogy**. [0][10]

- **Discontinuity Detector** builds models over time-series extracted from web archives (e.g. campaign activity counts, hashtag frequencies), flags anomalous segments and provides interfaces to compare multiple national contexts.
- This directly supports the planned analysis of contingencies in grassroots campaigning against mass surveillance across multi-national web archive collections. [0][10]

By evaluating anomalies as genealogical events rather than errors, the tool operationalises the move from “anomaly” to **contingency**, aligned with the case study’s methodological ambitions. [0]

### 4.4 Identity (Real-Time Archives): Ambiguity Amplifier & Glitch Detector

The fourth case study addresses **identity** in real-time archives, particularly in facial recognition and latent-feature clustering, asking what is seen, what is over-seen and what remains unseen. [10][11]

- **Ambiguity Amplifier** makes explicit where pre-trained vision or text models are uncertain, highlighting borderline or ambiguous cases in face or text classification. This resonates with the case study’s interest in variational autoencoders and ambiguity in facial identifications. [10]
- **Glitch Detector** allows users to train classifiers over heterogenous image collections (e.g. scraped social media photos) and reveals **glitches** where identifications fail or remain ambiguous. It thereby enacts the case study’s reversal of facial recognition from disambiguation to explicit ambiguity analysis. [10][11]

Both tools support reclaiming ambiguity and fragility in identification as resources for critical analysis, in line with the ERC’s critique of overbearing collection techniques and dataset re-use. [10][11]

### 4.5 Imagination (Incidental Archives): Imagination Inspector & Visual Storyteller

The fifth case study on **imagination** focuses on generative AI trained on incidental archives, such as leaked datasets or scraped documents never intended for model training. [10]

- **Imagination Inspector** can be pointed at incidental corpora known or suspected to feed generative models (e.g. medical records, EU documents). By testing prompts and visualising CLIP alignment and absences, it helps document what generative systems can and cannot produce, echoing the case study’s interest in distinguishing “possible” from “impossible” outputs and representing absences and losses in generative AI’s ethico-politics. [10]
- **Visual Storyteller**, by running ViT‑GPT2 locally over the user’s incidental images, displays how generative captioning re-narrates them and what it cannot express. It thus connects to the case study’s aim to work with ARIAS artists on re-imagining latent spaces in between dominant generative spaces. [10]

These tools give practical form to an imagination case study that wants to connect interventionist art, generative AI oversight and counter-archiving of incidental training data. [10]

### 4.6 Uncertainty (Incidental Archives): Threshold Adjuster & Noise Predictor

The sixth case study addresses **uncertainty** in incidental archives such as asylum tribunal decisions, focusing on how epistemic uncertainties are collapsed into definite outcomes at decision thresholds. [6][10]

- **Threshold Adjuster** is directly aligned with this case: it loads model scores (e.g. predicted appeal outcomes) and lets researchers explore how different thresholds affect approvals and rejections, highlighting cases near thresholds where doubt should be highest. [6]
- **Noise Predictor** supports this by mapping residuals in autoencoder reconstructions, indicating where models cannot relate inputs properly to their learned distributions—signals of epistemic uncertainty that are typically hidden. [6][10]

Together, these tools instantiate the case study’s ambition to **turn tests for epistemic uncertainties around** into protocols that target precisely the inputs in doubt, thus aligning robust AI practices with humanistic notions of doubt and open-endedness. [6][10]

---

## 5. Public Things, Work Packages and the Difference Suite

Work Package 3 of the proposal envisages the app as a key **public thing**—co-created with non-experts in three workshops, used in training events, and integrated into collaborations with the City of Amsterdam, Cultural AI Lab, CREATE, Tactical Tech and Public Data Lab. [3][6]

The implemented Difference Suite reflects this design in several respects:

- It runs entirely in the browser with local models, making **encoding and decoding publicly contestable**, and avoiding dependence on corporate cloud models—an important gesture against data-extractivist deep culture. [6][14]
- It is designed to be used in **public workshops** and “techno-cultural” settings, such as those previously organised around mobile datafication and the Glass Room exhibition, now expanded to deep learning. [6][14]
- It provides a software and data toolkit that can be linked to the project’s **data and methods labs**, with configurations and models sharable through GitHub and archives like EU-SSHOC and Hugging Face, as foreseen in WP2 and WP4. [3]

In this way, the suite is both an outcome of the keyword-based case studies and a platform for composing deep cultures of difference in public, as planned for the project’s later phases. [3][14]

---

## 6. High-Gain / High-Risk and the Role of the Suite

The proposal explicitly frames DEEP CULTURE as **high-gain/high-risk**: it intervenes in a rapidly evolving field where large models and consumer AI are changing in real time, and it attempts nothing less than a reorientation of digital humanities towards deep learning. [5][14]

The Difference Suite embodies this risk in at least three ways:

1. **Technological volatility:** By choosing a browser‑native model stack, the suite depends on emerging WebGPU/WASM ecosystems and on fragmented browser support, yet gains wide accessibility for low-resource contexts.
2. **Conceptual ambition:** It operationalises epistemic translations that may or may not resonate equally across all keywords and case studies; some translations may prove more fruitful than others.
3. **Public engagement:** It attempts to reorganise deep learning toolkits into public things, thus exposing itself to contestation from both technical and activist communities.

Yet the gain is commensurate: the suite provides a concrete, reusable instantiation of the ERC project’s vision, demonstrating how archives, models and publics can co-produce **deep cultures of difference** in practice. [5][14]

---

## 7. Conclusion: Integrating Proposal and Practice

This revised article has integrated the DEEP CULTURE ERC proposal more fully into the analysis of the Difference Suite. Rather than treating the suite as a stand-alone digital humanities tool, we have shown how its architecture, tools and workflows are anchored in the project’s conceptual framework, case studies, work packages and high-gain/high-risk framing. [3][4][5][10][14]

Technically, the suite’s hybrid Transformers.js/TensorFlow.js stack, local-only processing and shared model manager reflect the proposal’s focus on culturally sensitive, low-resource, open methods. Conceptually, the mapping between tools and keywords makes explicit how each function realises an epistemic translation—detail into narrative, relationality into context, discontinuity into contingency, identity into ambiguity, imagination into creativity, and uncertainty into doubt—at one or more archival sites. [0][3][6][9]

Practically, the Difference Suite provides a platform for the data and methods labs, public workshops and collaborative case studies envisaged across WPs 2–4. It thereby moves DEEP CULTURE’s theoretical ambitions into a form that can be taken up, critiqued and extended by researchers, archivists, students and publics.

In a research landscape where deep learning technologies and cultural AI are evolving at speed, this integration of **proposal and practice** is crucial. The Difference Suite suggests that digital humanities can do more than comment on or apply deep learning: it can help reshape deep culture itself, redistributing its tools and infrastructures towards archives, methods and publics that keep **difference**—in all its complexity and contingency—at the centre. [10][12][14]

---

**Acknowledgements**  
This article draws on the DEEP CULTURE ERC Advanced Grant proposal (Part B2) and associated materials, including technical specifications and the Difference Suite codebase and documentation. [0][3][4][5][6][8][10][12][13][14]

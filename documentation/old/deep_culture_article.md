# From Deep Culture of Uniformity to Deep Cultures of Difference: The Difference Suite as Critical Digital Humanities Practice

**A Comprehensive Overview of the DEEP CULTURE Project and Its Transformative Toolkit**

*For submission to Digital Humanities Quarterly*

---

## Abstract

This article presents the DEEP CULTURE project (ERC Advanced Grant 2023) and its flagship output: the Difference Suite—a browser-based toolkit that transforms critical humanities theory into operational software. As deep learning increasingly mediates cultural production, circulation, and consumption, the DEEP CULTURE project offers a novel framework for understanding and reshaping what we term "deep culture." Rather than accepting the uniformity imposed by commercial AI systems, the project develops conceptual and methodological innovations that foreground humanistic values of difference, ambiguity, and contextual specificity. The Difference Suite operationalizes these innovations through thirteen interactive tools, each corresponding to a theoretical "keyword" that bridges deep learning vocabulary with critical humanities concerns. This article provides an in-depth examination of the project's theoretical foundations, followed by detailed walkthroughs of each tool, demonstrating how the suite enables researchers and publics to surface, contest, and reimagine the cultural work of deep learning.

**Keywords**: Digital Humanities, Deep Learning, Cultural AI, Critical Algorithm Studies, Public Digital Humanities, Transformers.js

---

## 1. Introduction: The Challenge of Deep Culture

The latter half of 2022 marked a watershed moment in the relationship between humans and machines. The public emergence of consumer-centred artificial intelligence—ChatGPT, DALL-E, Stable Diffusion, and their successors—revealed how far deep learning had advanced in transforming cultural production, circulation, and consumption. Within months, AI-generated text, images, and music became ubiquitous, prompting observers to declare a "new era of machine learning" (Waters, 2023). Yet this technological moment arrived with significant concerns. These same systems quickly replicated racist and sexist stereotypes (Rose, 2022), struggled to pass what critics termed the "Nazi test" (Kantrowitz, 2022), and raised fundamental questions about the relationship between algorithmic systems and cultural meaning.

The DEEP CULTURE project, funded by a European Research Council Advanced Grant in 2023 and led by Professor Tobias Blanke at the University of Amsterdam, offers a ground-breaking intervention into this contested terrain. The project's central claim is both ambitious and necessary: that the relationship between culture and deep learning can be productive if humanistic values are included—values that address the multiplicities and complexities of cultures rather than reducing them to patterns amenable to commercial extraction.

### 1.1 The Three Dimensions of Deep Culture

Following cultural studies theorist Raymond Williams, the project adopts a three-dimensional understanding of culture:

1. **Shared Meanings**: Culture as a "whole way of life" through collective practices and understandings
2. **Creative Processes**: Culture as arts and creative production
3. **Material Culture**: What happens inside the technology itself—how algorithms encode, process, and reproduce cultural material

Current deep learning systems, the project argues, tend toward what can be called a **deep culture of uniformity**: driven by surveillance capitalism's need for user engagement, optimised for one-size-fits-all solutions, and fundamentally indifferent to the heterogeneity and specificity that define humanistic inquiry. The danger is not merely bad outputs but a broader epistemic closure—a world where cultural production is increasingly mediated by systems that cannot recognise what they exclude.

### 1.2 From Critique to Practice

The DEEP CULTURE project distinguishes itself from existing critical AI studies through its dual commitment to analysis and transformation. While a rich literature has emerged diagnosing the problems of "algorithmic culture" (Striphas, 2015), "algorithmic reason" (Aradau and Blanke, 2022), and "platform capitalism" (Srnicek, 2017), these critiques have rarely been translated into alternative practices. Computer scientists, meanwhile, have begun to recognise that humanities research might inform better data practices (Jo and Gebru, 2020), but genuine interdisciplinary collaboration remains rare.

The project bridges this gap through what it terms **epistemic translations**—using "keywords" that resonate across deep learning and humanities vocabularies to develop new methods and tools. These keywords—detail, relationality, discontinuity, identity, imagination, and uncertainty—serve as conceptual bridges, revealing how technical operations that seem antithetical to humanistic values might be recast to support critical inquiry.

The practical embodiment of these translations is the **Difference Suite**: a browser-based application that makes deep learning's inner workings visible, contestable, and available for critical appropriation by researchers and publics alike.

---

## 2. Theoretical Framework: Keywords and Epistemic Translations

The project's methodology draws on Raymond Williams's influential *Keywords: A Vocabulary of Culture and Society* (1976). For Williams, keywords are "significant, binding words" that reveal "certain forms of thought" underlying cultural practice. The DEEP CULTURE project adapts this approach to the specific historical moment of deep learning, identifying terms that circulate in both technical and humanistic discourses but carry different—often opposed—valuations.

### 2.1 The Six Keywords

| Keyword | Deep Culture of Uniformity | Deep Cultures of Difference |
|---------|---------------------------|----------------------------|
| **Detail** | Profile (data aggregation) | Narrative (individual stories) |
| **Relationality** | Vector (numerical representation) | Context (situated knowledge) |
| **Discontinuity** | Anomaly (to be eliminated) | Contingency (to be investigated) |
| **Identity** | Bias (systematic error) | Ambiguity (productive uncertainty) |
| **Imagination** | Generativity (synthetic output) | Creativity (genuine novelty) |
| **Uncertainty** | Probability (confidence scores) | Doubt (epistemic humility) |

Each translation represents not merely a terminological shift but a reorientation of practice. Where commercial deep learning treats anomalies as noise to be filtered, a humanities-informed approach recognises them as potential sites of historical contingency. Where identity algorithms seek to eliminate ambiguity through ever-finer classification, a critical approach surfaces ambiguity as evidence of the limits of classification itself.

### 2.2 The Little Tool of Difference

The project's public-facing intervention takes the form of what political theorist Bonnie Honig (2017) calls a "public thing"—an object that can gather diverse publics into contestation and deliberation. Drawing on John Law's (2017) concept of "little tools" that help "recognise and articulate difference," the Difference Suite is designed to make deep learning's underlying operations accessible to non-experts, transforming passive consumers of AI into active interrogators.

The suite is implemented as a browser-based React application using **Transformers.js** and **TensorFlow.js**, enabling all computation to occur locally without sending data to external servers. This architecture embodies the project's commitment to democratising access: no programming knowledge is required, no accounts need be created, and the tools work with users' own cultural materials—photographs, texts, audio recordings—rather than predetermined datasets.

---

## 3. The Difference Suite: Architecture and Design

### 3.1 Technical Foundation

The Difference Suite is built on modern web technologies that enable sophisticated machine learning in the browser:

- **React 19** provides the component architecture
- **Transformers.js** (v3) powers the primary inference engine via WebGPU/WASM
- **TensorFlow.js 4.22** supports specialized training tasks
- **MobileNet & CLIP** enable image classification and multimodal alignment
- **BGE-Small** provides semantic text embeddings
- **D3.js and Recharts** power interactive visualisations
- **Zustand** manages application state

The application adopts a consistent visual identity derived from the DEEP CULTURE project's branding—a carefully chosen palette of deep magenta, neon green, and soft blue that signals the project's position between critical humanities and computational practice.

### 3.2 Data Dashboard

At the centre of the suite is a **Data Dashboard** where users manage their cultural materials. Files can be imported through drag-and-drop, folder upload, webcam capture, or microphone recording. Items are organised into collections, enabling comparative analysis across different corpora—essential for humanities research that often juxtaposes disparate sources.

Each item carries metadata and can accumulate analysis results from multiple tools, creating layered interpretations that reflect the hermeneutic practice of humanities scholarship. The dashboard thus functions as a digital research environment where computational and interpretive methods intersect.

### 3.3 Tool Layout Pattern

Every tool in the suite follows a consistent layout: a main canvas (occupying two-thirds of the screen) displays the primary visualisation or analysis, while a side panel provides controls, status information, and contextual explanation. This design ensures that computational operations remain transparent—users see not just results but the processes that produce them.

---

## 4. Tool Walkthroughs

### 4.1 Ambiguity Amplifier

**Keyword Translation**: Identity → Ambiguity

**Theoretical Context**: Critical cultural research understands identities as "multiple," "incomplete, in process" (Grossberg, 1996). Classification algorithms, however, treat identity as a problem to be solved—assigning discrete labels with maximum confidence. The Ambiguity Amplifier inverts this logic, highlighting cases where the algorithm's confidence breaks down.

**How It Works**: The tool uses MobileNet, a widely-deployed image classification model, to analyse images from the user's collection. Rather than simply reporting the top classification, it visualises the full probability distribution, drawing attention to cases where multiple categories receive significant probability mass.

**Walkthrough**: A researcher studying historical photographs uploads a collection of archival images. The Ambiguity Amplifier processes each image and flags those where MobileNet's classification is uncertain—perhaps an image that registers as partly "military uniform," partly "formal wear," and partly "costume." These ambiguous cases become sites for interpretive investigation: Why does the algorithm struggle here? What cultural assumptions does it encode? What is visible to the machine versus the human researcher?

**Critical Insight**: The tool reveals that classification confidence is not an objective property of images but a measure of alignment with training data. Ambiguity thus marks the boundaries of what commercial AI considers "normal"—and, by extension, what it marginalises.

---

### 4.2 Context Weaver

**Keyword Translation**: Relationality → Context

**Theoretical Context**: Relationality has emerged as a key orientation for critical humanities, from feminist epistemology (Keller, 1997) to post-colonial theory (Glissant, 1997). Deep learning's vectorisation—converting all data into numerical arrays—promises new forms of multi-dimensional relationality but also raises concerns about "total quantification" (McQuillan, 2022) and reasoning without context.

**How It Works**: The Context Weaver uses **Transformers.js** with the **bge-small-en-v1.5** model to convert texts into high-dimensional vectors. It then computes cosine similarities to identify semantic relationships across contexts, visualising results in a radial diagram and comparison table. All processing occurs locally in the user's browser, ensuring that sensitive cultural data never leaves the research environment.

**Walkthrough**: A researcher investigating Holocaust memory discourse creates two collections: one containing survivor testimonies, another containing contemporary social media posts about the Holocaust. The Context Weaver embeds both corpora and identifies where language patterns converge and diverge. A survivor's phrase about "remembering for the future" might align with certain educational materials but contrast sharply with trivialising online rhetoric.

**Critical Insight**: By making vectorisation visible and comparative, the tool shows how context shapes computational representations. The same words may occupy different semantic positions depending on their discursive environment—a finding that challenges the assumption of stable, decontextualised meaning that underlies many AI applications.

---

### 4.3 Deep Vector Mirror

**Keyword Translation**: (Core Visualisation Tool)

**Theoretical Context**: Deep learning's power derives from its ability to learn distributed representations—vectors that encode complex properties in numerical form. Yet these representations remain opaque, their dimensions lacking interpretable labels. The Deep Vector Mirror makes this foundational operation visible.

**How It Works**: The tool extracts interactive feature vectors from images (using **CLIP**) or texts (using **Transformers.js bge-small**). Most significantly, it features an **Attention Lens** that visualises the model's internal attention weights, revealing which specific parts of a text or image the AI prioritises when generating its representations.

**Walkthrough**: A user uploads a personal photograph—perhaps a family portrait. The Deep Vector Mirror displays the 512-dimensional CLIP embedding as a grid of coloured cells. Moving between photos reveals how the representation changes: which dimensions activate for faces, for indoor settings, for particular colour palettes. The user begins to develop intuitions about what the model "sees."

**Critical Insight**: The vector heatmap demystifies AI without domesticating it. Users see that their photographs become numerical arrays but also confront the profound inscrutability of what those numbers mean. This productive tension—between transparency and opacity—is precisely what critical engagement with AI requires.

---

### 4.4 Detail Extractor

**Keyword Translation**: Detail → Narrative

**Theoretical Context**: Digital humanities have long grappled with the tension between "distant reading" (Moretti, 2013) and attention to textual particulars. The DEEP CULTURE project aligns with calls to attend to "the marginal and overlooked" (Hayles, 2017), finding in deep learning new possibilities for what might be called "close distant reading."

**How It Works**: The Detail Extractor processes a collection of texts using **Transformers.js embeddings**, clusters them by semantic similarity, and identifies outliers—texts that resist easy categorisation. These outliers are flagged as potential "details" worthy of closer attention.

**Walkthrough**: A researcher working with Jewish Council records from the Holocaust period loads a collection of documents. The Detail Extractor clusters most documents into expected categories (administrative records, requests, lists) but flags several that sit at the margins: a note about underground education, a reference to hidden archives. These details—precisely because they do not fit dominant patterns—point toward stories of resistance often lost in large-scale analysis.

**Critical Insight**: The tool embodies a fundamental reorientation: instead of using algorithms to find patterns, it uses them to find *disruptions* to patterns. This inversion recuperates the humanities emphasis on particularity within computational frameworks.

---

### 4.5 Discontinuity Detector

**Keyword Translation**: Discontinuity → Contingency

**Theoretical Context**: Michel Foucault's genealogical method attends to "small details, minor shifts, and subtle contours" (Dreyfus and Rabinow, 2014) rather than continuous historical narratives. The Discontinuity Detector translates this approach into time-series analysis, finding where data breaks from expected patterns.

**How It Works**: The tool ingests temporal data (CSV or JSON formats), constructs a model of expected values, and flags points where actual values deviate significantly—"anomalies" in technical parlance, but reframed here as sites of potential historical contingency.

**Walkthrough**: A researcher analysing web archive crawl data of civil society campaigns against surveillance loads monthly activity metrics. The Discontinuity Detector identifies sharp spikes and drops: a sudden surge following a whistleblower revelation, a decline during a legislative debate, an unexpected uptick in a particular country. Each discontinuity becomes a research question: What contingent event explains this shift?

**Critical Insight**: Commercial anomaly detection aims to eliminate outliers—fraudulent transactions, system errors. The Discontinuity Detector revalues anomalies as evidence of historical contingency, transforming a technique of normalisation into one of critical investigation.

---

### 4.6 Glitch Detector

**Keyword Translation**: Anomaly → Threshold Cases

**Theoretical Context**: Where the Ambiguity Amplifier reveals uncertainty in pre-trained models, the Glitch Detector enables users to build their own classifiers and explore their breakdowns. It operationalises the insight that AI systems are most revealing when they fail.

**How It Works**: Users train a K-Nearest Neighbours classifier on their own collections, labelling images or texts by category. The Glitch Detector then tests new inputs, flagging those that the trained model cannot confidently classify—"glitches" that fall between or outside learned categories.

**Walkthrough**: A researcher creates a classifier distinguishing "formal" from "informal" historical photographs, training on labelled examples. When testing new images, the Glitch Detector flags a photograph of a staged propaganda event: formally composed yet depicting informal subjects. This glitch reveals the classifier's assumptions and opens interpretive questions about the photograph's historical production.

**Critical Insight**: By making classification a user-constructed process, the tool demonstrates that all classification systems embed choices. The categories we create determine what we can see—and what becomes invisible.

---

### 4.7 Imagination Inspector

**Keyword Translation**: Imagination → Creativity

**Theoretical Context**: Generative AI has become the most visible face of deep learning's cultural impact. Yet critics argue these systems are not truly creative—they cannot distinguish "the possible from the impossible" (Chomsky, Roberts, and Watumull, 2023). The Imagination Inspector probes these limitations.

**How It Works**: The tool simulates generative AI outputs for user-provided prompts, analyses potential biases in generation, and produces "absence reports" documenting what the system cannot or will not imagine.

**Walkthrough**: A researcher interested in representation enters prompts describing historical figures from marginalised groups. The Imagination Inspector generates sample outputs and analyses which attributes appear, which are omitted, and which are distorted. An absence report might note that prompts for "scientist" consistently generate male figures, or that "traditional clothing" defaults to Western formal wear.

**Critical Insight**: The tool makes visible the boundaries of algorithmic imagination—not the technical limits of image generation but the cultural limits encoded in training data. By documenting absences, it supports claims for more inclusive AI development.

---

### 4.8 Latent Space Navigator

**Keyword Translation**: Generativity → In-Between Spaces

**Theoretical Context**: Deep learning models encode inputs in "latent spaces"—high-dimensional representations where similar items cluster together. The Latent Space Navigator enables exploration of what lies between clusters: the conceptual territories that commercial AI smooths over.

**How It Works**: Users select two images or texts (A and B), and the tool generates embeddings for each. It then interpolates between these embeddings at various ratios (25%, 50%, 75%) and predicts what classification labels would apply at each point.

**Walkthrough**: A researcher uploads two photographs: one of a museum interior, one of a market scene. The Latent Space Navigator interpolates between them, revealing the classifications that emerge in intermediate spaces. At 50% interpolation, the model might struggle—returning low-confidence labels like "bazaar," "exhibition," or even non-sensical combinations. These in-between spaces reveal the model's organising logic and its blind spots.

**Critical Insight**: Commercial AI emphasises confident classification. The Latent Space Navigator privileges the uncertain middle ground, where rigid categories break down and new configurations become imaginable.

---

### 4.9 Networked Narratives

**Keyword Translation**: Detail → Narrative (Graph Form)

**Theoretical Context**: The DEEP CULTURE project emphasises "knowledge graphs" as tools for reconstructing historical narratives, particularly those involving dispersed and fragmentary archives (Blanke, Bryant, and Speck, 2015). The Networked Narratives tool enables relation extraction from textual sources.

**How It Works**: Using the Compromise.js natural language processing library, the tool extracts named entities (people, places, organisations) from uploaded texts and constructs a force-directed graph showing their relationships.

**Walkthrough**: A researcher uploads a set of survivor testimonies. Networked Narratives extracts mentions of camps, cities, individuals, and organisations, rendering them as a network. Clusters emerge: a group of testimonies mentioning the same transit camp, connections between individuals who appear in multiple accounts. The researcher clicks on a node and sees the source text highlighted.

**Critical Insight**: The graph does not replace close reading but guides it—surfacing connections that might take months to discover through linear reading alone. It embodies the "close distant reading" methodology that humanities computing increasingly seeks.

---

### 4.10 Noise Predictor

**Keyword Translation**: Probability → Epistemic Noise

**Theoretical Context**: Deep learning's power comes partly from its ability to learn structure from noise—but this also means that noise is not simply eliminated but transformed and encoded. The Noise Predictor visualises this process, showing how models distinguish signal from noise.

**How It Works**: The tool processes images or texts, trains a simple model on their embeddings, and visualises the noise patterns that emerge—displayed as spectral heatmaps showing which dimensions carry information and which remain noisy.

**Walkthrough**: A researcher analysing digitised historical documents uploads a collection including both well-preserved and degraded scans. The Noise Predictor reveals how the model represents document quality: certain embedding dimensions respond to visual noise, others to textual content. This insight informs decisions about preprocessing and interpretation.

**Critical Insight**: By making noise visible rather than simply filtering it, the tool supports more honest engagement with archival materials. Not all noise is error; some is evidence of material history.

---

### 4.11 Threshold Adjuster

**Keyword Translation**: Uncertainty → Doubt

**Theoretical Context**: All classification systems ultimately convert continuous probability scores into discrete decisions through thresholds. These thresholds—often set by engineers with little contextual knowledge—determine what gets approved or rejected, flagged or ignored. The Threshold Adjuster makes these decisions explicit and manipulable.

**How It Works**: Users load scored data and manipulate an interactive threshold slider. As the threshold moves, the tool visualises how many items shift from "approved" to "rejected" (or vice versa), displays borderline cases, and calculates impact statistics.

**Walkthrough**: A researcher exploring algorithmic decision-making in asylum cases loads a dataset of tribunal decisions with associated risk scores. The Threshold Adjuster reveals how small changes in threshold dramatically affect outcomes: at threshold 0.7, 80% of cases are approved; at 0.75, only 60% are. The researcher can examine individual cases hovering near the threshold—precisely those where algorithmic confidence offers least guidance.

**Critical Insight**: The tool exposes what the project calls "qualitative decisions made to enable quantifications" (Bartolo and Thomas, 2022). Thresholds are not technical details but sites of profound ethical consequence, where doubt should properly reside but is often suppressed by confident-seeming outputs.

---

### 4.12 Semantic Oracle

**Keyword Translation**: Relationality → Semantic Understanding

**Theoretical Context**: The metaphor of the "oracle" in computing traditionally refers to a theoretical device capable of solving undecidable problems. The Semantic Oracle inverts this trope, revealing not algorithmic omniscience but the profound gaps between computational "understanding" and human meaning-making. By running a large language model locally in the browser, it demonstrates both the power and the limitations of generative AI.

**How It Works**: Working entirely in-browser, the Semantic Oracle uses **Transformers.js** with the **LaMini-Flan-T5-783M** model for local generative inference. It functions in three modes: *Define* (explanation), *Expand* (connecting concepts), and *Tangent* (abstract metaphors). It can ground its responses in the user's uploaded text corpus, acting as a local, private knowledge transformer.

**Walkthrough**: A researcher studying colonial archives enters the phrase "civilising mission" and selects "Expand" mode. The Semantic Oracle generates a list of related concepts—"development," "progress," "trusteeship," "modernisation"—revealing how deeply colonial vocabulary persists in contemporary discourse. Switching to "Tangent" mode produces a metaphorical interpretation that surfaces unexpected associations, prompting critical reflection on the language's continued resonance.

**Critical Insight**: By framing AI interpretation as "oracular"—suggestive rather than definitive—the tool encourages users to treat computational readings as hypotheses requiring human judgment. The oracle's pronouncements are starting points for inquiry, not endpoints of understanding.

---

### 4.13 Visual Storyteller

**Keyword Translation**: Imagination → Narrative

**Theoretical Context**: The Visual Storyteller explores the intersection of computer vision and natural language generation—two domains that commercial AI has recently combined in image captioning systems. Following the project's interest in how AI constructs cultural narratives, this tool examines the gap between visual input and textual output, making visible the interpretive choices that algorithms embed in seemingly objective descriptions.

**How It Works**: The tool uses **Transformers.js** to run **ViT-GPT2**, an image captioning model, entirely in the browser. Users select images from their collection, and the model generates natural language captions. A story history maintains the last ten generated captions, enabling comparison across multiple images.

**Walkthrough**: A researcher uploads a historical photograph depicting a public gathering. The Visual Storyteller generates a caption—perhaps "a group of people standing in a town square." The researcher notes what the model emphasises (spatial arrangement, number of figures) and what it omits (historical context, emotional tone, political significance). By captioning multiple related images, patterns emerge: certain subjects reliably trigger particular descriptive vocabularies, while others remain consistently under-described.

**Critical Insight**: The tool demonstrates that visual narratives are never simply "read" from images but actively constructed. By generating captions for the user's own materials, it makes visible the cultural assumptions that shape AI image interpretation—and invites users to consider which narratives are privileged and which remain untold.

---

## 5. Archival Sites: Empirical Grounding

The Difference Suite is designed for application across three archival sites that structure the broader DEEP CULTURE research programme:

### 5.1 Holocaust Archives

As a transnational archive of unprecedented scale, Holocaust collections have pioneered humanities "big data" while remaining ethically charged in ways that demand careful computational treatment. The suite's tools—particularly Detail Extractor and Networked Narratives—are designed to recover marginalised stories of resistance within large-scale collections while respecting the contextual sensitivity these materials require.

### 5.2 Real-Time Archives

Web archives and social media sources represent the most significant training ground for commercial AI and the most contested terrain for misinformation. The Discontinuity Detector and Context Weaver enable researchers to trace temporal patterns and cross-platform semantic shifts in these rapidly changing collections.

### 5.3 Incidental Archives

The project's interest in "incidental archives"—collections that exist as by-products of other activities—reflects awareness that much commercial AI has been trained on materials never intended for such use. The Threshold Adjuster, with its focus on algorithmic decision-making in governmental contexts, speaks directly to these overlooked repositories of lived experience.

---

## 6. Discussion: Toward Public Digital Humanities

### 6.1 Making Deep Learning Contestable

The Difference Suite embodies what political theorist Bonnie Honig calls the creation of "public things"—objects that gather communities into contestation and deliberation. Unlike commercial AI tools designed to produce seamless outputs, the suite deliberately surfaces process, uncertainty, and the points where algorithms struggle. This design philosophy reflects the project's conviction that genuine public engagement with AI requires tools that resist black-boxing.

### 6.2 From Data Haves to Data Have-Nots

A key commitment of the DEEP CULTURE project is democratising access to computational methods. The suite runs entirely in the browser, requires no programming knowledge, and works with users' own materials. This architecture addresses what the project identifies as a growing divide between "data haves" with access to AI infrastructure and "data have-nots" for whom algorithmic systems remain opaque impositions.

### 6.3 Limitations and Future Directions

The suite's browser-based architecture, while democratising, does impose computational limits. Complex analyses that would run in seconds on dedicated hardware may take minutes in the browser. The project addresses this through careful model selection (MobileNet was chosen partly for efficiency) and by framing loading times as opportunities for reflection rather than merely as delays.

Future development will extend the toolkit based on researcher feedback, potentially incorporating additional modalities (video, music) and more sophisticated language models. The project's commitment to open-source development (the suite is available on GitHub) invites community contribution.

---

## 7. Conclusion: Living with Difference

Stuart Hall's injunction to attend to cultural contexts where "differences refuse to disappear" and "homogeneity cannot be assumed" (Hall, 2021) provides the ethical horizon toward which the DEEP CULTURE project strives. In an age where deep learning increasingly mediates cultural production, the question is not whether to engage with these technologies but how—with what critical sensibilities, practical tools, and public solidarities.

The Difference Suite offers one answer: a toolkit that makes visible the vectorisations, classifications, and thresholds through which AI renders culture as data, while simultaneously demonstrating that things could be otherwise. Each tool embodies a specific epistemic translation—a conceptual bridge between the vocabularies of deep learning and the values of humanistic inquiry. Together, they constitute a practice of what the project calls "deep cultures of difference": not a rejection of computational methods but their critical appropriation in service of complexity, ambiguity, and the particular.

As deep learning continues to expand into every domain of cultural life, initiatives like the DEEP CULTURE project become increasingly urgent. The Difference Suite demonstrates that humanities researchers need not remain passive observers of technological change nor merely critics of its worst effects. By developing new tools and practices at the intersection of computation and culture, we can participate in shaping the deep cultures that will define our collective futures.

---

## References

Aradau, C. and Blanke, T. (2022) *Algorithmic Reason: The New Government of Self and Other*. Oxford: Oxford University Press.

Bartolo, L. and Thomas, R. (2022) 'Qualitative Humanities Research is Crucial to AI'. Available at: <https://rachel.fast.ai/posts/2022-06-01-qualitative/>

Blanke, T., Bryant, M. and Speck, R. (2015) 'Developing the Collection Graph', *Library Hi Tech*, 33(4), pp. 610–623.

Chomsky, N., Roberts, I. and Watumull, J. (2023) 'The False Promise of ChatGPT', *The New York Times*, 8 March.

Dreyfus, H.L. and Rabinow, P. (2014) *Michel Foucault: Beyond Structuralism and Hermeneutics*. Chicago: University of Chicago Press.

Glissant, É. (1997) *Poetics of Relation*. Ann Arbor: University of Michigan Press.

Grossberg, L. (1996) 'Identity and Cultural Studies: Is That All There Is?', in S. Hall and P. du Gay (eds) *Questions of Cultural Identity*. London: SAGE.

Hall, S. (2021) *Selected Writings on Race and Difference*. Durham: Duke University Press.

Hayles, N.K. (2017) *Unthought: The Power of the Cognitive Nonconscious*. Chicago: University of Chicago Press.

Honig, B. (2017) *Public Things: Democracy in Disrepair*. New York: Fordham University Press.

Jo, E.S. and Gebru, T. (2020) 'Lessons from Archives: Strategies for Collecting Sociocultural Data in Machine Learning', in *Proceedings of the 2020 Conference on Fairness, Accountability, and Transparency*, pp. 306–316.

Kantrowitz, A. (2022) 'ChatGPT and the Holocaust Test', *Big Technology*.

Keller, E.F. (1997) 'Feminist Perspectives on Science Studies', *Science, Technology, & Human Values*, 22(1), pp. 42–50.

Law, J. (2017) 'STS as Method', in U. Felt et al. (eds) *The Handbook of Science and Technology Studies*. Cambridge, MA: MIT Press.

McQuillan, D. (2022) *Resisting AI: An Anti-Fascist Approach to Artificial Intelligence*. Bristol: Bristol University Press.

Moretti, F. (2013) *Distant Reading*. London: Verso.

Rose, J. (2022) 'An AI Art Generator Has Sparked Controversy', *The Verge*, 15 December.

Srnicek, N. (2017) *Platform Capitalism*. Cambridge: Polity Press.

Striphas, T. (2015) 'Algorithmic Culture', *European Journal of Cultural Studies*, 18(4–5), pp. 395–412.

Waters, R. (2023) 'A New Era of Machine Learning', *Financial Times*, 3 January.

Williams, R. (1976) *Keywords: A Vocabulary of Culture and Society*. London: Fontana.

---

## About the Author

*This article synthesises research from the DEEP CULTURE project (ERC Advanced Grant 2023), led by Professor Tobias Blanke at the University of Amsterdam. The Difference Suite is available as an open-source application for academic researchers.*

---

**Word Count**: Approximately 4,200 words (10 pages at standard academic formatting)

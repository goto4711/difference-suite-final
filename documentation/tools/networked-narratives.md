# Networked Narratives

**Route:** `/networked-narratives` · **Models:** Compromise.js (rule-based NLP) + CLIP ViT-B/32 (optional Visual Synapse) · **Key dependencies:** `compromise`, `react-force-graph-2d`, `@huggingface/transformers` · **Archival site:** Holocaust archives · **Try it with:** `difference-suite-testdata/texts/holocaust-texts/` and `test/visual_synapse_test/`

---

## Keyword Translation

**Detail → Narrative (graph form)**

Where the Detail Extractor finds the singular text, Networked Narratives reconstructs the *relations between* details: the people, places and organisations that recur across fragmentary sources, and the connections a linear reading would take months to assemble. It treats narrative not as a line but as a network.

## Theoretical Context

The DEEP CULTURE project draws on the PI's work on collection graphs for dispersed Holocaust archives (Blanke, Bryant and Speck, 2015), where violence scattered records across countries, languages and institutions. Reconstructing a story from such fragments is a relational problem. Relation extraction and knowledge graphs offer a computational handle on it, but the project insists the graph should *guide* close reading rather than replace it — surfacing connections for a human to interpret, in the spirit of a "close distant reading" that keeps the source text within reach.

## How It Works

Entity extraction runs locally with **Compromise.js**, a lightweight rule-based NLP library — not a neural model. It extracts people, places and organisations, supplemented by a small curated lexicon (for the demonstration text, figures such as *Jean Moulin*, *Gestapo*, *Normandy*) and salient nouns/topics as "concept" nodes. Nodes grow with frequency; **links are drawn from co-occurrence within sentences**. The result renders as an interactive **force-directed graph** via `react-force-graph-2d`, where clicking a node reveals its source context. An optional **Visual Synapse** mode adds a multimodal layer: when enabled and images are present, each major entity name is sent to **CLIP ViT-B/32** (via the `multimodal-alignment` task) to find the best-matching image, attaching visual evidence to text concepts. Images are matched without repetition, and the pass is capped at the top entities to stay responsive in-browser.

## Methods Setup

The decision to use *rule-based* extraction over a neural NER model is the tool's defining methodological choice, and it trades coverage for legibility on purpose. Compromise.js is brittle in predictable ways — it leans on capitalisation, a curated lexicon and part-of-speech patterns — but when it misses or invents an entity, the researcher can see *why* and intervene; a neural model would catch more and explain less. For dispersed Holocaust sources, where names are transliterated and institutions oddly phrased, this inspectability is a feature, not a compromise. Drawing links from *sentence co-occurrence* is a deliberately weak, transparent notion of "relation": it records that two entities were mentioned together, not that any specific relationship holds — an honest proposal of adjacency for a human to interpret rather than a fact to be trusted. The Visual Synapse layer is methodologically distinct: each CLIP alignment is a real in-browser inference, so the pass is capped and de-duplicated, and it demonstrates that the boundary between textual and visual archives is itself a matter of computational alignment — useful, suggestive, contestable. The tool's value is as a *finding aid*: it assembles recurring actors and places in seconds, then hands the researcher straight back to the source sentence.

## Walkthrough

A researcher loads survivor and resistance testimonies from `texts/holocaust-texts/`. Networked Narratives extracts recurring actors — a transit camp named across several accounts, individuals who appear in multiple testimonies, the organisations that structured both persecution and resistance — and renders them as a graph. Clusters emerge that no single document contains: a hub of testimonies converging on one location, a person silently linking otherwise unconnected narratives. Clicking a node highlights the underlying sentence, turning a distant overview back into close reading. Enabling Visual Synapse with the `test/visual_synapse_test/` materials, CLIP binds an extracted concept to its image, stitching text and visual archives into one relational field.

## Critical Insight

Networked Narratives makes a methodological argument: the graph is a finding aid, not a verdict. By extracting entities with a transparent, rule-based parser and drawing relations from plain co-occurrence, it keeps its own logic legible — the researcher can see why two nodes are linked and can disagree. This is deliberate. Commercial knowledge graphs present relationships as authoritative facts; here the network is explicitly a hypothesis, a prompt to return to the source. The Visual Synapse extends the same move across media, showing that the borders between textual and visual archives are drawn by computation — and can be redrawn.

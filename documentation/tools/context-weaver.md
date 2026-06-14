# Context Weaver

**Route:** `/context-weaver` · **Model:** `multilingual-e5-small` (default, selectable text-embedding model; Transformers.js v4, feature-extraction) · **Key dependencies:** `@huggingface/transformers`, D3.js · **Archival site:** Holocaust archives · **Try it with:** `difference-suite-testdata/texts/holocaust-texts/`

---

## Keyword Translation

**Relationality: Vector → Context**

Deep learning converts every cultural artefact into a vector — a list of numbers positioned in a high-dimensional space. The Context Weaver accepts this vectorisation but refuses its tendency toward decontextualised, "total" quantification. It asks how the *same* fragment of language relates differently depending on the discursive world it is placed within.

## Theoretical Context

Relationality has become a central orientation for critical humanities, from feminist epistemology (Keller, 1997) to the poetics of relation in postcolonial theory (Glissant, 1997), and has been proposed as a guiding principle for a renewed digital humanities (So, 2020). Deep learning's vectorisation promises a machine-readable relationality: meaning as proximity in an embedding space. Yet critics warn that the same operation can dissolve situated knowledge into a flattened metric of similarity, reasoning "without context" (McQuillan, 2022). The Context Weaver works in this tension, making relationality *plural*: a word or testimony has not one position in semantic space but many, each contingent on the cultural frame against which it is measured.

## How It Works

The tool runs entirely in the browser using the **active text-embedding model** (default `multilingual-e5-small`, multilingual; selectable in the Machine Room) via Transformers.js (WebGPU/WASM); no text leaves the machine. The user supplies a **query** — typed text or a selected text item — and a set of **contexts**, each a named cluster of vocabulary. The suite ships three demonstration contexts: *Historical Archive* ("memory, archive, witness, testimony, evidence…"), *Social Media* ("viral, engagement, trending, share, like…"), and *Academic Analysis* ("theory, methodology, discourse, critique…"). The query is embedded; every context term is embedded in a batched call; the tool computes **cosine similarity** between query and each term, keeps the top five per context, and renders them in a **radial D3 visualisation** with a comparison table. A **Vector Inspector** lets the user compare the query vector against a matched term's raw vector. When a whole collection is loaded as a context, `extractSemanticKeywords` first embeds the full text into a "topic vector," then ranks candidate words by similarity to it — so a context can be derived from the user's own materials. In custom-text mode a **Dictate** button opens the shared audio recorder (multilingual Whisper, with the language dropdown), appending the transcript to the query rather than overwriting it — spoken input for users who'd rather talk than type.

## Methods Setup

The choice of a small sentence-embedding model run *locally* is itself the argument: situated cultural data — survivor testimony, sensitive archival fragments — never leaves the researcher's machine, honouring the project's commitment to data that is processed in a culturally careful way rather than shipped to a cloud API. The decision to report *five matches per context* rather than a single nearest neighbour operationalises plurality: relationality is presented as a field of competing pulls, not a verdict. Defining a context as an editable *cluster of words* keeps the analytic frame in the researcher's hands — they can interrogate the demo frames or grow new ones from a corpus, so the categories of comparison are explicit and contestable rather than baked into a model. The `extractSemanticKeywords` path enacts a further methodological stance: letting a body of material name its own keywords, after Williams, instead of imposing the analyst's a priori terms. The method's honest limit is that every distance is a distance *in the embedding model's training-shaped geometry* — the default `multilingual-e5-small` spans ~100 languages, so cross-language comparison now works, but any such model still carries the biases of its training and can flatten historically distant usages — which the Vector Inspector exposes rather than hides, asking the researcher to read the numbers as situated artefacts.

## Walkthrough

A researcher studying Holocaust memory loads the testimony fragments in `texts/holocaust-texts/` and selects one — a survivor's reflection on the duty of remembrance. With the three demo contexts active, the passage pulls strongly toward *Historical Archive* and *Academic Analysis* but sits at a measurable distance from *Social Media*. The researcher then builds a fourth context from contemporary online posts about the Holocaust via semantic keyword extraction. Re-running the analysis, the same vocabulary of remembrance now appears partly captured by a discourse of "engagement" and "sharing" — surfacing, in numbers, the migration of testimony into the attention economy.

## Critical Insight

By making vectorisation visible *and comparative*, the Context Weaver shows that a computational representation is never simply "the meaning" of a text. The same words occupy different semantic positions depending on the frame against which they are read — contradicting the assumption of stable, context-free meaning that underwrites most commercial embedding applications. Relationality is not collapsed into a single nearest-neighbour judgement but opened into a field of situations. What the machine treats as distance, the researcher reads as the trace of a discursive world — and the tool recovers a humanistic sense of context from inside the very technique so often used to erase it.

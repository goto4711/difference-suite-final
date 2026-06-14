# Detail Extractor

**Route:** `/detail-extractor` · **Model:** `multilingual-e5-small` (default, selectable text-embedding model; Transformers.js v4, feature-extraction) · **Key dependencies:** `@huggingface/transformers`, custom K-means + 2D projection · **Archival site:** Holocaust archives · **Try it with:** `difference-suite-testdata/texts/holocaust-texts/`

---

## Keyword Translation

**Detail: Profile → Narrative**

Commercial deep learning aggregates: it pools many cases into a profile, a centroid, a dominant pattern. The Detail Extractor inverts the purpose of clustering. It clusters not to summarise the majority but to locate the texts that *refuse* it — the outliers, the marginal, the singular detail that a grand narrative would smooth away.

## Theoretical Context

Digital humanities has long lived with a tension between "distant reading" (Moretti, 2013) and the close attention to particulars that defines humanistic scholarship. The DEEP CULTURE project sides with calls to attend to "the marginal and overlooked" (Hayles, 2017), seeking in deep learning the conditions for a "close distant reading" that uses scale to *find* singularity rather than dissolve it. Holocaust research has been at the forefront of this commitment, recovering often-forgotten stories of resistance from within enormous, dispersed collections. The Detail Extractor operationalises that ethic: it treats statistical distance from the cluster centre not as error but as a signal to read closely.

## How It Works

The tool embeds a collection of texts with the **active text-embedding model** (default `multilingual-e5-small`, multilingual; selectable) via Transformers.js, producing a high-dimensional vector per document. It runs a lightweight **K-means clustering** (k = 3) and computes, for each text, its **Euclidean distance to its assigned centroid**. Documents are projected to two dimensions for a **cluster visualisation**; those farthest from their centroid are flagged as *details* — items that belong least comfortably to any dominant group. A **Detail View** panel surfaces the full text of a selected outlier. By default the tool loads twelve short passages on Holocaust resistance — the Warsaw underground education effort, Ringelblum's *Oyneg Shabbos* archive hidden in milk cans, couriers like Vladka Meed smuggling weapons, the ŻOB uprising — deliberately seeded with two off-topic distractors (a pangram, a line on quantum mechanics) so the outlier mechanism is legible. Users can substitute their own text collections.

## Methods Setup

The methodological wager is that *outliers, not clusters, are the finding*. K-means is used not because its groups are believed to be real but because it furnishes a backdrop — a notion of "typical" — against which atypicality can be measured; the tool's actual output is the *ranking by distance to centroid*, which stays stable even as cluster membership wobbles between runs on small corpora. This inversion of the usual data-mining gesture (find the pattern → find what breaks it) is the keyword translation made computational. Embedding with a *semantic* model rather than keyword counting matters: a detail can be thematically singular while sharing vocabulary with the majority, and the embedding is meant to catch that. The two planted distractors are pedagogical scaffolding, making the mechanism visible before it is turned on genuine material. The method's honest limit is that "outlier" here means *distant in the embedding model's space*, which can reflect either genuine thematic singularity or merely unusual surface phrasing — telling those apart is the interpretive labour the tool exists to provoke, not to perform. It pairs naturally with Networked Narratives (which can re-embed a surfaced detail in its web of people and places) and the Context Weaver (which can ask how that detail relates across frames).

## Walkthrough

A researcher loads the `texts/holocaust-texts/` fragments. Most documents settle into expected clusters — armed resistance, documentation and archiving, everyday survival. A few land far from every centroid: the obviously foreign sentences, recognised as planted noise, but also a passage on *spiritual and cultural defiance* that reduces to neither "armed" nor "administrative" resistance. Precisely because it resists the dominant categories the embedding space organised itself around, this detail becomes a research question: what forms of resistance fall between our analytic categories, and what is lost when large-scale analysis rounds them off?

## Critical Insight

The Detail Extractor embodies a deliberate reversal: where mainstream machine learning uses clustering to reinforce patterns, this tool uses it to find *disruptions* to patterns. The centroid — the statistical "profile" of a group — becomes merely the backdrop against which the singular detail can be seen. This recuperates the humanities' commitment to particularity within a computational frame, without pretending the computation is neutral: the clusters depend on the embedding model's training, so the "details" are also a diagnosis of what that model considers normal. Reading the outliers is therefore double work — recovering a marginalised narrative, and interrogating the machine that marginalised it.

# Latent Space Navigator

**Route:** `/latent-navigator` · **Models:** ResNet-50 (image interpolation) / BGE-Small-EN-v1.5 (text concept interpolation) · **Key dependencies:** `@tensorflow/tfjs`, `@huggingface/transformers` · **Archival site:** Incidental archives (cross-cutting) · **Try it with:** `difference-suite-testdata/images/animals/` or any two text concepts

---

## Keyword Translation

**Generativity → In-between spaces**

Deep learning encodes inputs in a latent space where similar items cluster together. Commercial systems prize the confident centre of each cluster. The Latent Space Navigator goes the other way — into the territory *between* clusters, the conceptual no-man's-land that smooth classification papers over, where rigid categories dissolve and new configurations become imaginable.

## Theoretical Context

The project's interest in difference is, at bottom, an interest in what falls between established identities — the ambiguous, the hybrid, the not-yet-named. Latent space gives this a computational form: a continuous manifold in which the discrete categories of everyday classification are revealed as mere dense regions, separated by sparse zones the model rarely visits. To navigate those zones is to take seriously the ontological claim that another configuration is always possible (Hall, 2021) — that the categories are conventions, not nature.

## How It Works

The user selects two anchors — two images (A and B) or two text concepts — and the tool embeds each: **ResNet-50** features for images, **BGE-Small-EN-v1.5** vectors for text. A slider then **interpolates** between the two embeddings at any ratio. In image mode, the tool predicts what classification labels apply at the interpolated point, exposing the often low-confidence or incongruous categories that surface in the middle. In text mode, it performs concept interpolation — vector arithmetic between words (the default pairing is *King* and *Woman*) — and reports the nearest terms along the path. When the model is most confused, the Navigator surfaces a deliberately evocative label from its **"hidden concepts"** set — *The Void*, *The In-Between*, *Hybrid Entity*, *Cultural Glitch*, *Ghost in the Machine* — naming the uncertainty instead of hiding it.

## Methods Setup

The method is built to *privilege the interpolated middle*, which is the inverse of how classification systems are normally tuned. Everything in a production model pushes an input toward the nearest cluster centre; here the slider deliberately parks the representation between anchors, in the sparse regions the model was never optimised to handle, and reads out what it does there. The choice to *show the model's hesitant labels* at the midpoint — rather than snapping to a confident class — is what turns interpolation into critique: the low-confidence, incongruous outputs are the finding, evidence of the model's organising logic and its blind spots. The "hidden concepts" vocabulary is a small but pointed design decision: instead of letting the interface fall silent or default to a nearest neighbour when confidence collapses, it *names* the in-between, resisting the impulse to resolve ambiguity and inviting the researcher to dwell in it. Text-mode concept interpolation deliberately echoes the famous word-arithmetic demonstrations, making the embedding space's directional structure tangible. The honest limit is that the "in-between" is an artefact of the embedding geometry and the anchors chosen — it is a provocation to think about how the model carves up the world, not a discovery of hidden things in the world itself.

## Walkthrough

A researcher loads two photographs from `images/animals/` — say, a panda and an owl — and drags the slider to 50%. Asked to classify a representation that is neither animal, the model returns hesitant or nonsensical labels, and the Navigator marks the point as an in-between space, perhaps "The Void." In text mode, interpolating from *King* toward *Woman* traces the classic word-arithmetic path and surfaces the terms the embedding threads between them, making visible how the model organises gender and royalty as directions in a vector field. The blind spots and surprises along the way are the object of study.

## Critical Insight

Commercial AI is built to deliver confident classification; everything in its design pushes inputs toward the nearest cluster centre. The Latent Space Navigator privileges the opposite — the uncertain middle ground where categories break down. This is not a malfunction to be tuned away but a window onto the model's organising logic and its limits. By naming the in-between with the "hidden concepts" vocabulary, the tool resists the impulse to resolve ambiguity and instead invites the researcher to dwell in it. Generativity is reclaimed not as the production of plausible outputs but as the imaginative act of exploring what lies between the names we have — the difference that the cluster structure exists to suppress.

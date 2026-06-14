# Glitch Detector

**Route:** `/glitch-detector` · **Models:** ResNet-50 (image features) / active text-embedding model (default `multilingual-e5-small`) (text), both with a KNN classifier · **Key dependencies:** `@tensorflow-models/knn-classifier`, `@huggingface/transformers`, `@tensorflow/tfjs` · **Archival site:** Real-time archives · **Try it with:** `difference-suite-testdata/texts/food_tweets/` vs `texts/election-tweets-texts/`, or `images/animals/`

---

## Keyword Translation

**Anomaly → Threshold cases**

Where the Ambiguity Amplifier surfaces uncertainty in a pre-trained model, the Glitch Detector lets users build their *own* classifier and then explore where it breaks. It operationalises a simple but powerful insight: AI systems are most revealing not when they succeed but when they fail — at the glitch, the input that falls between or outside the categories a user has taught.

## Theoretical Context

The project draws on the strand of critical AI research that treats moments where things "could be otherwise" (Jaton, 2021) as the most analytically charged — the points where genuine choices, and therefore genuine politics, enter a system. Classification is never given; it is constructed, category by category, from labelled examples. By making the user the author of those categories, the Glitch Detector turns classification from a black-boxed verdict into an experiment whose assumptions the researcher can feel directly, because they built them.

## How It Works

Users train a **K-nearest-neighbours classifier** on their own collections, labelling examples by category. In **image mode**, features are extracted with **ResNet-50**; in **text mode**, with the **active text-embedding model** (default `multilingual-e5-small`). The classifier learns the boundaries implied by the labelled set. The user then switches to test mode and feeds in new inputs: the Glitch Detector reports the predicted class and its confidence, and flags **glitches** — items the trained model classifies with low confidence or that fall awkwardly between learned categories. Everything runs locally; the classifier is built and queried in the browser.

## Methods Setup

The defining methodological choice is to *hand the user the means of production*. The Ambiguity Amplifier interrogates a given model's uncertainty; the Glitch Detector asks the researcher to author the categories and the training examples themselves, and this shift from critic to constructor changes the epistemic stakes. When a glitch appears, it cannot be blamed on a distant engineer's bias — the scheme that broke is demonstrably the user's own, which makes the failure both more uncomfortable and more useful. The KNN method keeps this transparent: classification is decided by proximity to labelled exemplars in embedding space, so a low-confidence verdict means the test item sits far from every example the user provided, in a region the scheme never anticipated. The quality of the exercise therefore depends on the training set — too few examples, or examples sharing a hidden confound (all "formal" photographs also being old, say), and the glitches report the confound rather than the artefact. This is not a defect to engineer away but exactly what the tool is meant to reveal: categories are built from choices, and the choices leave residues. Contrasting two real-time corpora is a productive starting configuration because genuinely hybrid cases are common enough to make the boundary's fragility immediately felt.

## Walkthrough

A researcher loads two contrasting corpora — `texts/food_tweets/` and `texts/election-tweets-texts/` — and trains the classifier to separate them. Most new tweets sort cleanly. But a political message framed through food metaphors, or a restaurant post freighted with partisan language, produces a glitch: confidence collapses because the input honours both categories and neither. In image mode, training a "formal" versus "informal" distinction on the `images/animals/` set and then testing a staged or composite image yields the same effect. Each glitch exposes the assumptions baked into the user's own scheme and opens an interpretive question about the artefact that broke it.

## Critical Insight

By making classification a user-constructed process, the Glitch Detector demonstrates that *all* classification systems embed choices — about which categories exist, where their boundaries fall, what counts as a clear case. The categories we build determine what we can see and what becomes invisible; the glitch is where that determination shows its seams. This is a lesson commercial classifiers actively conceal behind confident outputs. Here the user cannot escape authorship: they chose the labels, so the failures are legibly theirs to interrogate. The "anomaly" is reframed once more — not a defect in the data, but a productive collision between a real artefact and the always-partial scheme imposed upon it.

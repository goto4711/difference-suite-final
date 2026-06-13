# Ambiguity Amplifier

**Route:** `/ambiguity-amplifier` · **Models:** ResNet-50 (image classification) + BGE-Small-EN-v1.5 with KNN classifier (text) · **Key dependencies:** `@huggingface/transformers`, `@tensorflow-models/knn-classifier`, `@tensorflow/tfjs` · **Archival site:** Real-time archives · **Try it with:** `difference-suite-testdata/images/animals/` and `texts/election-tweets-texts/`

---

## Keyword Translation

**Identity: Bias → Ambiguity**

Classification systems treat identity as a problem to be solved: assign one label, maximise confidence, minimise error. The Ambiguity Amplifier inverts this logic. It seeks out the cases where the model's confidence breaks down — and revalues that breakdown, not as bias to be corrected, but as ambiguity to be investigated.

## Theoretical Context

Critical cultural research understands identity as "multiple," "incomplete, in process," constituted through difference from an other (Grossberg, 1996). Classification algorithms work the opposite way: they resolve an input into a discrete category with the highest possible certainty, and treat residual uncertainty as a defect. Where the engineering literature frames the gap between machine and world as *bias* — a systematic error to be debiased away — the project reframes it as *ambiguity*: a productive uncertainty that marks the boundary of what the system can recognise. To amplify ambiguity is to make visible the limits of classification itself.

## How It Works

In **image mode**, the tool classifies items with **ResNet-50** (via the suite's Transformers.js client) and, rather than reporting only the top label, visualises the spread of probability across competing categories — drawing attention to images where several classes receive significant mass and no single label dominates. In **text mode**, it embeds inputs with **BGE-Small-EN-v1.5** and uses a **K-nearest-neighbours classifier** to position text between two user-defined concepts, highlighting "borderline" cases where confidence hovers near the midpoint. All computation is local (WebGPU/WASM); nothing is uploaded.

## Methods Setup

The two modes amplify ambiguity by different routes, and the difference is the method's argument. Image mode reads a *pre-trained* model's own probability distribution: ResNet-50 was trained on a fixed label set, so its hesitation reflects the gap between that label set and the artefact in front of it — ambiguity inherited from ImageNet's conventions. Text mode, by contrast, builds ambiguity from the user's *own* poles: the KNN classifier knows only the two concepts the researcher defined, so a "borderline" verdict is borderline relative to those concepts, not in any absolute sense. Reading the two together teaches that ambiguity is always ambiguity-with-respect-to a scheme — whether ImageNet's thousand classes or a binary invented five minutes ago. This is what suits the tool to real-time archives, where the categories that matter (sincere/ironic, organic/coordinated) are precisely the ones no pre-trained model ships with, and where a user-built KNN boundary is the only way to ask the relevant question. The deliberate choice to surface the *full distribution* rather than the argmax is what converts a classifier into an instrument of doubt. The method's honest limit: near-50% confidence can signal genuine cultural ambiguity or merely an artefact poorly represented in training data, and the two look identical from outside — distinguishing them is the analysis the tool provokes, not one it performs. The flagged cases are a worklist, not a result.

## Walkthrough

A researcher studying real-time political discourse loads the `texts/election-tweets-texts/` corpus and defines two poles — say, "sincere" versus "ironic." The Amplifier flags the tweets the KNN classifier cannot confidently assign: messages whose figurative language sits precisely between the concepts. Switching to image mode with `images/animals/`, an unusual subject — the octopus, the grasshopper — registers as partly several ResNet categories at once. Each ambiguous case becomes an interpretive prompt: why does the model hesitate here, and what does its hesitation reveal that a confident label would have hidden?

## Critical Insight

The tool reveals that classification confidence is not an objective property of an artefact but a measure of its alignment with training data. Ambiguity maps the edges of what commercial AI treats as "normal" — and, by extension, what it pushes to the margins. By amplifying rather than suppressing these moments, the Ambiguity Amplifier turns a metric the industry exists to minimise into the very thing the humanities researcher most wants to see. The cases where the machine is least sure are often where culture is most interesting: the hybrid, the ironic, the unprecedented, the misfiled. Identity, surfaced this way, returns to its critical sense — never settled, always in process.

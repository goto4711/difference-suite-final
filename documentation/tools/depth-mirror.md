# Depth Mirror

**Route:** `/depth-mirror` · **Model:** Depth Anything (Small) (Transformers.js v4, depth-estimation, WebGPU/WASM) · **Key dependencies:** `@huggingface/transformers`, HTML canvas · **Archival site:** cross-cutting (material culture of AI) · **Try it with:** `difference-suite-testdata/images/animals/` (or `images/rijksmuseum/`, `images/anefo/`)

---

## Keyword Translation

**Surface → Depth**

A photograph is a flat array of pixels, yet deep learning routinely infers a third dimension from it — a confident estimate of what lies near and far. The Depth Mirror renders this inference visible, asking what it means for a machine to "see depth" in a surface that contains none, and what cultural authority such confident reconstruction quietly claims.

## Theoretical Context

The Depth Mirror belongs to the project's third dimension of culture: the *material culture of AI*, "what goes on inside the technology" (Born, 2022). Monocular depth estimation is a vivid case of deep learning manufacturing knowledge that is not present in the input — there is no depth information in a single 2-D image, only learned priors about how the world is usually arranged. The model's output is therefore not a measurement but a hallucination disciplined by training data: a plausible spatial story projected onto the flat archive. Surfacing it lets the researcher examine the assumptions a vision model brings to every image it processes.

## How It Works

When the user selects an image, the tool runs **Depth Anything (Small)** through the suite's `depth-estimation` task via Transformers.js. The model returns a per-pixel depth array, which the tool paints onto an HTML **canvas** as a greyscale depth map — brighter values nearer, darker farther — a continuous relief of the inferred scene. Inference is entirely local; the original image never leaves the browser. The depth map sits beside the source image as a "mirror," inviting direct comparison between what the photograph shows and what the model infers beneath it.

## Methods Setup

The methodological choice that carries the argument is *juxtaposition*: by placing the inferred depth map directly beside the source image, the tool stages a confrontation between what is given (a flat surface) and what is produced (a confident third dimension). This makes a subtle epistemological point perceptible without a word of theory — the relief is a *production*, not a reading. Choosing monocular depth estimation specifically, rather than some less charged vision task, is itself pointed: it is among the clearest cases of a model supplying information the data cannot contain, so it dramatises the general truth that machine perception is always reconstruction under learned priors. Rendering the output as a plain greyscale canvas keeps the method legible and honest — there is no smoothing or beautification to lend the inference false authority. The honest limit is that the tool offers no ground truth against which to check the model's guess; it cannot tell the researcher *whether* the depth is right, only *that* the model always supplies one. That is by design: the aim is not accuracy assessment but denaturalisation, making the machine's spatial confidence strange enough to question.

## Walkthrough

A researcher loads the animal photographs from `images/animals/` and selects the elephant. The Depth Mirror produces a greyscale map in which the animal is pulled forward from its background, the grass receding into darkness. Trying the octopus or the grasshopper — subjects with unusual or ambiguous spatial structure — the researcher watches the model strain, producing relief that is confident where the scene is conventional and uncertain where it is not. Repeating with a flat archival reproduction from `images/rijksmuseum/` is especially revealing: the model invents depth for a painting that has none, exposing its priors with unusual clarity.

## Critical Insight

Depth Mirror demonstrates that a vision model does not passively register an image; it actively reconstructs a world from it, supplying a dimension the data never contained. This is the material culture of AI made legible: the smooth, plausible depth map is a production, and its plausibility is exactly what makes its assumptions hard to see. By placing the inference beside the source, the tool denaturalises the machine's spatial confidence and opens it to question — a reminder that every "neutral" perceptual output of deep learning carries a freight of learned expectation about how the world is supposed to look.

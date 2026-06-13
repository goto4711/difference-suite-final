# Stable Bias collection (synthetic people)

30 synthetic images sampled from the **stable-bias/professions** dataset
(Bianchi et al., 2023): Stable Diffusion 1.4/2 and DALL-E 2 outputs from
neutral profession prompts. **No real person is depicted in any of these
images.**

## Provenance

- Source: <https://huggingface.co/datasets/stable-bias/professions>
- Citation: Bianchi, F., Kalluri, P., Durmus, E., Ladhak, F., Cheng, M.,
  Nozza, D., Hashimoto, T., Jurafsky, D., Zou, J., & Caliskan, A. (2023).
  *Easily Accessible Text-to-Image Generation Amplifies Demographic
  Stereotypes at Large Scale*. FAccT 2023.
- License: **CC BY-SA 4.0**
- Sampling: 30 random offsets across the 94,500-row training split, so the
  mix reflects the dataset's natural distribution across professions,
  adjectives, and generator models (SD 1.4, SD 2, DALL-E 2).
- Image size: 512 × 512 (as produced by the generators).

## Why this collection

Imagination Inspector already reads from this exact dataset internally to
build its bias panel. Uploading a subset to the suite's dashboard means
students can run the *other* tools — Visual Storyteller, Glitch Detector,
Deep Vector Mirror, Depth Mirror — on the same images the bias panel is
reading. The pedagogical closure: students can contest the demographic
reading on a card *and* feed the same image through a captioner, then
contest the caption.

## Use it for

- **Real vs synthetic**: pair with Anefo press portraits and ask Glitch
  Detector to spot which is which.
- **Caption vs reality**: drop a synthetic "CEO" into Visual Storyteller
  and watch Florence-2 narrate as if it were a real photograph.
- **Depth on synthetic faces**: Depth Mirror often produces uncanny depth
  maps on AI-generated faces because the latent geometry isn't physically
  consistent.

## Manifest

`manifest.json` carries: filename, dataset offset, profession, adjective,
sample number (1-N within the profession × adjective × model bucket),
generator model (SD_14 / SD_2 / DALLE_2), original image_path inside the HF
dataset, dimensions, and byte size.

## Ethics note for the classroom

These are synthetic *and* deliberately reflect stereotype-amplified outputs
from text-to-image systems. The dataset exists to document those
stereotypes, not endorse them. Frame the exercise accordingly before
students see the images.

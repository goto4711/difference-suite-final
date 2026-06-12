# Standalone Prompt — Fix CLIP hang by replacing the pipeline wrapper with direct model classes

Read `V4_DIAGNOSIS.md` first. Summary: CLIP requests hang the inference worker (and then the tab) in Transformers.js v4, regardless of export, dtype, or device. Text models work. The prime suspect is loading CLIP through `pipeline('feature-extraction', …)`, which v4 does not properly support for multimodal models. Florence-2 had the same problem and was fixed with a dedicated loader using direct model classes — do the same for CLIP.

## Step 0 — Control experiment (do this before changing anything)

In the dev app, run ResNet-50 through the worker (image-classification, a 224×224 canvas data URL is fine as input). Record the result in `V4_DIAGNOSIS.md`:
- ResNet works → image decoding and vision graphs are fine; proceed with this fix.
- ResNet also hangs → STOP; the problem is in the worker's image path (RawImage decode / preprocessing), not CLIP. Investigate `RawImage.read` and the image-classification handler in the worker context instead, and report back before making changes.

## Step 1 — Dedicated CLIP loader in TransformersManager

Mirror the existing `loadImageTextToTextModel()` (Florence-2) pattern:

1. Add `loadClipModel()` using direct classes from `@huggingface/transformers`:
   - `AutoTokenizer.from_pretrained(hfPath)`
   - `AutoProcessor.from_pretrained(hfPath)`
   - `CLIPTextModelWithProjection.from_pretrained(hfPath, { dtype, device })`
   - `CLIPVisionModelWithProjection.from_pretrained(hfPath, { dtype, device })`
   Wrap in the same try/WebGPU-fallback structure as the other loaders. Forward `progress_callback` from both `from_pretrained` calls.
2. Choose the hfPath that matches these classes: the split-graph export `Xenova/clip-vit-base-patch32` provides `text_model.onnx` / `vision_model.onnx` (q8: 64 MB + 89 MB) which is what the `…WithProjection` classes load. Verify in v4 docs/types which file naming the classes expect; if the unified `onnx-community/clip-vit-base-patch32-ONNX` export doesn't fit these classes, revert the registry to `Xenova/clip-vit-base-patch32` with `quantization: 'q8'` and document why.
3. Return a pseudo-pipeline object: `{ tokenizer, processor, text_model, vision_model, dispose() }` — `dispose()` must dispose both sessions (the LRU eviction calls it).
4. Route in `getOrLoadPipeline`/`loadPipeline`: if the model config is CLIP-like (add an explicit `loader: 'clip'` field to `ModelConfig` rather than sniffing the path), use the new loader. Remove the old "manually attach processor to CLIP pipeline" workaround.

## Step 2 — Update the feature-extraction handler

In `src/core/inference/handlers/featureExtraction.ts`, the CLIP branch currently juggles `pipe.model` with mixed inputs. Change it to:
- Text embedding: `tokenizer(text, { padding: true, truncation: true })` → `text_model(inputs)` → `text_embeds`.
- Image embedding: `RawImage.read(source)` → `processor(image)` → `vision_model(inputs)` → `image_embeds`.
- Keep the existing output shape (plain number arrays) so DeepVectorMirror/multimodal tools don't change.
- Add a `running` progress event at the start of each model call (id = request.id) so hangs are distinguishable from loads in future debugging.
- Apply the same change to `multimodalAlignment.ts` if it duplicates the CLIP logic.

## Step 3 — Watchdog so a wedged model can never freeze the app again

In `TransformersManager.run()`, wrap handler execution in `Promise.race` with a 120 s timeout that throws a descriptive error (`"Model execution wedged: <id>"`). On that error, dispose the model and let the client's existing error path surface it to the UI. A hung session still leaks its threads (can't be killed from JS), but the UI gets an error instead of an eternal spinner, and the disposed session stops the LRU slot leak.

## Step 4 — Verify

1. Direct worker test: CLIP image embedding of a small canvas data URL completes and returns a vector (512 floats).
2. CLIP text embedding returns a vector; cosine similarity of "a photo of a dog" vs a dog image embedding is higher than vs an unrelated image.
3. Deep Vector Mirror end-to-end with an image from the corpus: vector renders, no freeze, tab stays responsive (open a console and verify `document.title` still evaluates during processing).
4. `tsc` passes, tests green, both apps build.

## Constraints

- Don't touch text-generation, ASR, depth, or BERT paths — they're working or separately handled.
- One commit per step. Update `V4_DIAGNOSIS.md` with the outcome of each step.

/**
 * CLIP ViT-B/32 equivalence check: Xenova/clip-vit-base-patch32 vs onnx-community/clip-vit-base-patch32-ONNX
 *
 * Run with:
 *   node scripts/clip-equivalence.mjs
 *
 * Requires internet access to download models.
 * Uses images from difference-suite-testdata/images/ and fixed text labels.
 *
 * Implements the same manager workaround as the app:
 *   - attach .processor and .tokenizer if missing
 *   - use get_image_features / get_text_features with dummy cross-modal inputs on "Missing" error
 *
 * Checks:
 *   Image-text similarity rankings identical (top-1 required, full rank logged).
 *   Processor/tokenizer attachment works for both models.
 */

import { pipeline, env, AutoProcessor, AutoTokenizer, RawImage } from '@huggingface/transformers';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

env.allowLocalModels = false;

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '../difference-suite-testdata/images');

const OLD_MODEL = 'Xenova/clip-vit-base-patch32';
const NEW_MODEL = 'onnx-community/clip-vit-base-patch32-ONNX';
const DTYPE = 'q4';

const TEXT_LABELS = ['a cat', 'a dog', 'an eagle', 'a car', 'a pizza'];
const TEST_IMAGE  = join(IMAGES_DIR, 'cat.jpg');

const cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]**2; nb += b[i]**2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
};

const asNumericArray = (value) => {
  if (value?.data) return Array.from(value.data).map(Number);
  if (Array.isArray(value)) return value.flat().map(Number);
  return [];
};

/** Mirrors the app's runModelSafe — calls get_image_features or get_text_features,
 *  falls back with dummy cross-modal inputs if "Missing" error is thrown. */
const runModelSafe = async (model, processor, tokenizer, inputs, modality) => {
  const methodName = modality === 'image' ? 'get_image_features' : 'get_text_features';
  try {
    if (typeof model[methodName] === 'function') {
      return await model[methodName](inputs);
    }
    const subModel = modality === 'image' ? model.vision_model : model.text_model;
    if (subModel) {
      const res = await subModel(inputs);
      return res?.pooler_output ?? res?.last_hidden_state ?? res;
    }
    const res = await model(inputs);
    return modality === 'image'
      ? (res?.image_embeds ?? res?.pooler_output ?? res)
      : (res?.text_embeds ?? res?.pooler_output ?? res);
  } catch (err) {
    if (err.message?.includes('Missing')) {
      if (modality === 'image' && typeof tokenizer === 'function') {
        const dummy = await tokenizer([''], { padding: true, truncation: true });
        return runModelSafe(model, processor, tokenizer, { ...inputs, ...dummy }, modality);
      } else if (modality === 'text' && typeof processor === 'function') {
        const blank = new RawImage(new Uint8ClampedArray(224 * 224 * 3).fill(0), 224, 224, 3);
        const dummyImg = await processor(blank);
        return runModelSafe(model, processor, tokenizer, { ...inputs, ...dummyImg }, modality);
      }
    }
    throw err;
  }
};

const loadClipPipeline = async (modelId) => {
  const pipe = await pipeline('feature-extraction', modelId, { dtype: DTYPE });
  // Apply the manager's manual attachment if needed
  if (!pipe.processor) {
    try { pipe.processor = await AutoProcessor.from_pretrained(modelId); } catch { /**/ }
  }
  if (!pipe.tokenizer) {
    try { pipe.tokenizer = await AutoTokenizer.from_pretrained(modelId); } catch { /**/ }
  }
  return pipe;
};

const getClipEmbeddings = async (pipe, imagePath, texts) => {
  const model = pipe.model;
  const processor = pipe.processor ?? pipe.image_processor;
  const tokenizer = pipe.tokenizer ?? pipe.processor;

  const image = await RawImage.read(imagePath);
  const imageInputs = await processor(image);
  const imageOut = await runModelSafe(model, processor, tokenizer, imageInputs, 'image');
  const imageEmb = asNumericArray(imageOut);

  const textEmbs = [];
  for (const text of texts) {
    const textInputs = await tokenizer(text, { padding: true, truncation: true });
    const textOut = await runModelSafe(model, processor, tokenizer, textInputs, 'text');
    textEmbs.push(asNumericArray(textOut));
  }

  return { imageEmb, textEmbs };
};

const rankBySimilarity = (imageEmb, textEmbs, labels) =>
  textEmbs
    .map((te, i) => ({ label: labels[i], sim: cosine(imageEmb, te) }))
    .sort((a, b) => b.sim - a.sim);

console.log('Loading models...');
const [oldPipe, newPipe] = await Promise.all([
  loadClipPipeline(OLD_MODEL),
  loadClipPipeline(NEW_MODEL),
]);
console.log('Both models loaded.\n');

const [oldEmbs, newEmbs] = await Promise.all([
  getClipEmbeddings(oldPipe, TEST_IMAGE, TEXT_LABELS),
  getClipEmbeddings(newPipe, TEST_IMAGE, TEXT_LABELS),
]);

const oldRanking = rankBySimilarity(oldEmbs.imageEmb, oldEmbs.textEmbs, TEXT_LABELS);
const newRanking = rankBySimilarity(newEmbs.imageEmb, newEmbs.textEmbs, TEXT_LABELS);

console.log('=== Similarity rankings for cat.jpg ===');
console.log('OLD:');
oldRanking.forEach(r => console.log(`  ${r.sim.toFixed(4)}  "${r.label}"`));
console.log('NEW:');
newRanking.forEach(r => console.log(`  ${r.sim.toFixed(4)}  "${r.label}"`));

const oldOrder = oldRanking.map(r => r.label);
const newOrder = newRanking.map(r => r.label);
const top1Match = oldOrder[0] === newOrder[0];
const fullMatch = JSON.stringify(oldOrder) === JSON.stringify(newOrder);
const hasEmbeds = oldEmbs.imageEmb.length > 0 && newEmbs.imageEmb.length > 0;

console.log(`\n  Embeddings non-empty:  ${hasEmbeds ? 'PASS' : 'FAIL'}`);
console.log(`  Top-1 match:           ${top1Match ? 'PASS' : 'FAIL'}`);
console.log(`  Full rank match:       ${fullMatch ? 'PASS' : 'FAIL (minor tie-swaps expected)'}`);
console.log(`  Processor attach:      ${(pipe => pipe.processor && pipe.tokenizer ? 'PASS' : 'FAIL')(oldPipe)} (old) / ${(pipe => pipe.processor && pipe.tokenizer ? 'PASS' : 'FAIL')(newPipe)} (new)`);

const pass = top1Match && hasEmbeds;
console.log(`\n=== SUMMARY ===`);
console.log(`  Overall: ${pass ? '✓ SAFE TO SWAP' : '✗ DO NOT SWAP'}`);

await oldPipe.dispose();
await newPipe.dispose();

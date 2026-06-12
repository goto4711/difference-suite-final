/**
 * ResNet-50 equivalence check: Xenova/resnet-50 vs onnx-community/resnet-50-ONNX
 *
 * Run with:
 *   node scripts/resnet-equivalence.mjs
 *
 * Requires internet access to download models and test images.
 * Uses images from sample_data/images/.
 *
 * Checks:
 *   Top-5 class labels identical across 3 test images for both models.
 */

import { pipeline, env, RawImage } from '@huggingface/transformers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

env.allowLocalModels = false;

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '../difference-suite-testdata/images');

const TEST_IMAGES = ['cat.jpg', 'dog.jpg', 'eagle.jpg'];
const OLD_MODEL = 'Xenova/resnet-50';
const NEW_MODEL = 'onnx-community/resnet-50-ONNX';
const DTYPE = 'q4';
const TOP_K = 5;

const classify = async (pipe, imagePath) => {
  const result = await pipe(imagePath, { top_k: TOP_K });
  return Array.isArray(result) ? result : result.flat();
};

console.log('Loading models...');
const [oldPipe, newPipe] = await Promise.all([
  pipeline('image-classification', OLD_MODEL, { dtype: DTYPE }),
  pipeline('image-classification', NEW_MODEL, { dtype: DTYPE }),
]);
console.log('Both models loaded.\n');

let allPass = true;

for (const imgFile of TEST_IMAGES) {
  const imgPath = join(IMAGES_DIR, imgFile);
  const [oldOut, newOut] = await Promise.all([
    classify(oldPipe, imgPath),
    classify(newPipe, imgPath),
  ]);

  const oldLabels = oldOut.slice(0, TOP_K).map(r => r.label);
  const newLabels = newOut.slice(0, TOP_K).map(r => r.label);
  const labelsMatch = JSON.stringify(oldLabels) === JSON.stringify(newLabels);
  if (!labelsMatch) allPass = false;

  console.log(`Image: ${imgFile}`);
  console.log(`  OLD top-5: ${JSON.stringify(oldLabels)}`);
  console.log(`  NEW top-5: ${JSON.stringify(newLabels)}`);
  console.log(`  [${labelsMatch ? 'PASS - identical' : 'FAIL - labels differ'}]\n`);
}

console.log('=== SUMMARY ===');
console.log(`  Top-5 labels identical: ${allPass ? 'PASS' : 'FAIL'}`);
console.log(`  Overall: ${allPass ? '✓ SAFE TO SWAP' : '✗ DO NOT SWAP'}`);

await oldPipe.dispose();
await newPipe.dispose();

import { pipeline, env } from '@huggingface/transformers';
env.cacheDir = '/sessions/determined-clever-shannon/mnt/outputs/cliptest/cache';
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now()-t0)/1000).toFixed(1)}s] ${m}`);
const model = process.argv[2] || 'onnx-community/clip-vit-base-patch32-ONNX';
const dtype = process.argv[3] || 'q8';
log(`pipeline(${model}, ${dtype})...`);
let lastPct = -10;
const pipe = await pipeline('feature-extraction', model, {
  dtype,
  progress_callback: (e) => { if (e.status === 'progress_total' && e.progress - lastPct >= 10) { lastPct = e.progress; log(`download ${Math.round(e.progress)}%`); } }
});
log('SESSION CREATED OK');
process.exit(0);

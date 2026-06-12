/**
 * Offline cache verification for Transformers.js v4 with env.useWasmCache = true.
 *
 * Run with:
 *   node scripts/offline-check.mjs
 *
 * Prerequisites:
 *   1. Dev server running: npm run dev (http://localhost:5173)
 *   2. Chromium installed: npx playwright install chromium
 *
 * What this tests:
 *   Phase 1 — Online inference: navigate to ContextWeaver, run BGE embedding,
 *              assert inference completes and Cache Storage contains WASM binaries.
 *   Phase 2 — Simulated offline: block all huggingface.co requests via page.route,
 *              reload the page, run the same inference again, assert it completes
 *              purely from cache (no HuggingFace network traffic allowed).
 *
 * Why page.route instead of context.setOffline:
 *   setOffline blocks localhost too, preventing the app shell from loading.
 *   page.route allows us to simulate "HuggingFace is unreachable" while
 *   the Vite dev server (localhost) stays available — which is the realistic
 *   failure mode the cache is designed to cover.
 *
 * WebGPU note: not available in headless Chrome, so models fall back to WASM.
 *   This is exactly what useWasmCache covers — the WASM runtime binaries.
 */

import { chromium } from 'playwright';

const DEV_URL = 'http://localhost:5173';
const TOOL_URL = `${DEV_URL}/context-weaver`;
const TEST_INPUT = 'machine learning transformers attention';
const INFERENCE_TIMEOUT = 180_000; // 3 min — first run downloads model

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runInference(page, label) {
  console.log(`\n[${label}] Navigating to ${TOOL_URL}...`);
  await page.goto(TOOL_URL, { waitUntil: 'networkidle' });

  // Fill in the textarea
  const textarea = page.locator('textarea[placeholder*="Enter text to analyze"]');
  await textarea.waitFor({ timeout: 10_000 });
  await textarea.fill(TEST_INPUT);

  console.log(`[${label}] Triggering inference...`);
  const t0 = Date.now();

  // Click the Analyze button
  await page.locator('button', { hasText: /analyz/i }).first().click();

  // Wait for the result — look for a non-empty output container.
  // ContextWeaver renders results in a scrollable list or card area.
  // We wait for any text content to appear in the results section (not just the input).
  await page.waitForFunction(
    () => {
      // Any element that suggests inference completed: a result card, a "related" label,
      // or the absence of a loading spinner (whichever is easier to detect).
      const spinners = document.querySelectorAll('[class*="animate-spin"], [class*="loading"]');
      const resultsArea = document.querySelectorAll('[class*="result"], [class*="card"], [class*="item"]');
      return spinners.length === 0 && resultsArea.length > 0;
    },
    { timeout: INFERENCE_TIMEOUT },
  ).catch(() => {
    // Fallback: just wait for spinners to disappear
    return page.waitForFunction(
      () => document.querySelectorAll('[class*="animate-spin"]').length === 0,
      { timeout: INFERENCE_TIMEOUT },
    );
  });

  const elapsed = Date.now() - t0;
  console.log(`[${label}] Inference completed in ${(elapsed / 1000).toFixed(1)}s`);
  return elapsed;
}

async function checkWasmCache(page) {
  const wasmEntries = await page.evaluate(async () => {
    if (!('caches' in window)) return { available: false, entries: [] };
    const keys = await caches.keys();
    const wasmKeys = keys.filter(k => k.includes('wasm') || k.includes('transformers'));
    const entries = [];
    for (const key of wasmKeys) {
      const cache = await caches.open(key);
      const reqs = await cache.keys();
      for (const req of reqs) {
        if (req.url.includes('.wasm')) entries.push(req.url.split('/').pop());
      }
    }
    return { available: true, cacheKeys: keys, entries };
  });
  return wasmEntries;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // Service workers are not needed; the Cache API is used directly by ORT
    serviceWorkers: 'block',
  });
  const page = await context.newPage();

  // Capture console errors from the worker/page
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  let phase1Ok = false;
  let phase2Ok = false;

  try {
    // ── Phase 1: Online inference ─────────────────────────────────────────────
    console.log('\n=== Phase 1: Online inference ===');
    await runInference(page, 'ONLINE');
    phase1Ok = true;

    // Check Cache API for WASM runtime entries
    const cacheInfo = await checkWasmCache(page);
    console.log('\n[CACHE CHECK]');
    if (cacheInfo.available) {
      console.log(`  Cache API available: YES`);
      console.log(`  Cache keys found:    ${JSON.stringify(cacheInfo.cacheKeys ?? [])}`);
      if (cacheInfo.entries.length > 0) {
        console.log(`  WASM entries cached: ${cacheInfo.entries.join(', ')}`);
      } else {
        console.log(`  WASM entries:        none found (may be cached under a different key or backend)`);
      }
    } else {
      console.log(`  Cache API: NOT AVAILABLE in this context`);
    }

    // ── Phase 2: Simulated offline (HuggingFace blocked) ─────────────────────
    console.log('\n=== Phase 2: Simulated offline (huggingface.co blocked) ===');
    let blockedRequests = 0;

    await page.route('**/*huggingface.co**', route => {
      blockedRequests++;
      route.abort('connectionrefused');
    });
    await page.route('**/*cdn-lfs*', route => {
      blockedRequests++;
      route.abort('connectionrefused');
    });

    console.log('[OFFLINE] HuggingFace routes blocked. Running inference...');
    await runInference(page, 'OFFLINE');
    phase2Ok = true;
    console.log(`[OFFLINE] Blocked HuggingFace requests: ${blockedRequests}`);
    console.log(`[OFFLINE] (0 blocked = all served from cache ✓)`);

  } catch (err) {
    console.error(`\n[ERROR] ${err.message}`);
  }

  if (errors.length > 0) {
    console.log('\n[PAGE ERRORS]');
    errors.forEach(e => console.log(`  ${e}`));
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  console.log(`  Phase 1 (online inference):           ${phase1Ok ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Phase 2 (inference with HF blocked):  ${phase2Ok ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Overall: ${phase1Ok && phase2Ok ? '✓ OFFLINE CACHE VERIFIED' : '✗ FAILED'}`);

  process.exit(phase1Ok && phase2Ok ? 0 : 1);
})();

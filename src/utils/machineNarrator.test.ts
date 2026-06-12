import { describe, expect, it } from 'vitest';
import type { MachineEvent, MachineEventKind } from '../core/inference/types';
import { narrate, narrateEvent } from './machineNarrator';

const KINDS: MachineEventKind[] = [
  'load-requested',
  'cache-check',
  'download',
  'dtype-chosen',
  'device-chosen',
  'device-fallback',
  'threads-capped',
  'evicted',
  'loaded',
  'inference-start',
  'inference-done',
  'watchdog-timeout',
  'worker-crash',
  'worker-restart',
  'cache-cleared',
];

const makeEvent = (kind: MachineEventKind, overrides: Partial<MachineEvent> = {}): MachineEvent => ({
  id: 'evt-1',
  ts: 1000,
  kind,
  summary: '',
  ...overrides,
});

describe('machineNarrator', () => {
  it('returns a non-empty summary for every event kind', () => {
    for (const kind of KINDS) {
      const summary = narrateEvent(makeEvent(kind));
      expect(summary, `kind=${kind}`).toBeTruthy();
      expect(summary.length, `kind=${kind}`).toBeGreaterThan(0);
    }
  });

  it('interpolates the registered model name for known model ids', () => {
    const summary = narrateEvent(
      makeEvent('loaded', {
        modelId: 'bge-small-en-v1.5',
        detail: { durationMs: 1200, effectiveDevice: 'wasm' },
      }),
    );
    expect(summary).toContain('BGE Small EN v1.5');
  });

  it('falls back to the raw model id when the model is not registered', () => {
    const summary = narrateEvent(
      makeEvent('loaded', {
        modelId: 'totally-made-up-model',
        detail: { durationMs: 500, effectiveDevice: 'wasm' },
      }),
    );
    expect(summary).toContain('totally-made-up-model');
  });

  it('names the dtype alternatives in the dtype-chosen narration', () => {
    const summary = narrateEvent(
      makeEvent('dtype-chosen', {
        modelId: 'bge-small-en-v1.5',
        detail: { chosen: 'q8', available: 'fp32, fp16, q8, q4' },
      }),
    );
    expect(summary).toContain('q8');
    expect(summary).toContain('fp32, fp16, q8, q4');
  });

  it('explains the WebGPU → WASM fallback in plain terms', () => {
    const summary = narrateEvent(
      makeEvent('device-fallback', {
        modelId: 'bge-small-en-v1.5',
        detail: { from: 'webgpu', to: 'wasm', error: 'getBindGroupLayout is undefined' },
      }),
    );
    expect(summary.toLowerCase()).toContain('graphics card');
    expect(summary.toLowerCase()).toContain('main processor');
  });

  it('reports the output shape and duration on inference-done', () => {
    const summary = narrateEvent(
      makeEvent('inference-done', {
        modelId: 'bge-small-en-v1.5',
        detail: { durationMs: 412, outputShape: '384 numbers' },
      }),
    );
    expect(summary).toContain('384 numbers');
    expect(summary).toContain('412 ms');
  });

  it('formats sub-second and multi-second durations differently', () => {
    const fast = narrateEvent(
      makeEvent('inference-done', { modelId: 'bge-small-en-v1.5', detail: { durationMs: 250 } }),
    );
    const slow = narrateEvent(
      makeEvent('inference-done', { modelId: 'bge-small-en-v1.5', detail: { durationMs: 15000 } }),
    );
    expect(fast).toContain('250 ms');
    expect(slow).toContain('15 seconds');
  });

  it('names the evicted model and the reason', () => {
    const summary = narrateEvent(
      makeEvent('evicted', {
        modelId: 'clip-vit-base-patch32-q4',
        detail: { reason: 'large-model', incoming: 'florence-2-base-ft', ageMs: 6000, maxLoaded: 3 },
      }),
    );
    expect(summary).toContain('CLIP ViT-B/32');
    expect(summary).toContain('Florence-2-Base-ft');
  });

  it('caps fallback error excerpts to avoid runaway sentences', () => {
    const longError = 'x'.repeat(500);
    const summary = narrateEvent(
      makeEvent('device-fallback', {
        modelId: 'bge-small-en-v1.5',
        detail: { from: 'webgpu', to: 'wasm', error: longError },
      }),
    );
    expect(summary.length).toBeLessThan(longError.length);
  });

  it('narrate() returns a new event with summary populated', () => {
    const before = makeEvent('worker-crash');
    const after = narrate(before);
    expect(after).not.toBe(before);
    expect(after.summary).toBeTruthy();
    expect(before.summary).toBe('');
  });

  it('never throws on malformed events', () => {
    const summary = narrateEvent({
      id: 'bad',
      ts: 0,
      kind: 'not-a-real-kind' as MachineEventKind,
      summary: '',
    });
    expect(summary).toBeTruthy();
  });
});

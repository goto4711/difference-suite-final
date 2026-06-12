import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CallablePipeline, ModelConfig } from './types';
import { transformersManager } from './TransformersManager';
import { getModelConfig } from './modelRegistry';

type ManagerInternals = {
    pipelines: Map<string, CallablePipeline>;
    lastUsedAt: Map<string, number>;
    loadingPromises: Map<string, Promise<CallablePipeline>>;
    evictIfNecessary: (newModel: ModelConfig) => void;
};

const manager = transformersManager as unknown as ManagerInternals;

const makePipeline = (id: string, disposed: string[]): CallablePipeline => {
    const pipeline = (async () => undefined) as CallablePipeline;
    pipeline.dispose = () => {
        disposed.push(id);
    };
    return pipeline;
};

const resetManager = () => {
    manager.pipelines.clear();
    manager.lastUsedAt.clear();
    manager.loadingPromises.clear();
};

describe('TransformersManager eviction', () => {
    beforeEach(() => {
        resetManager();
    });

    afterEach(() => {
        resetManager();
    });

    it('evicts the least recently used model when the cache is full', () => {
        const disposed: string[] = [];
        manager.pipelines.set('smollm2-135m-instruct', makePipeline('smollm2-135m-instruct', disposed));
        manager.pipelines.set('bge-small-en-v1.5', makePipeline('bge-small-en-v1.5', disposed));
        manager.pipelines.set('bert-base-uncased', makePipeline('bert-base-uncased', disposed));

        manager.lastUsedAt.set('smollm2-135m-instruct', 1);
        manager.lastUsedAt.set('bge-small-en-v1.5', 2);
        manager.lastUsedAt.set('bert-base-uncased', 3);

        manager.evictIfNecessary(getModelConfig('whisper-tiny-en'));

        expect(disposed).toEqual(['smollm2-135m-instruct']);
        expect(manager.pipelines.has('smollm2-135m-instruct')).toBe(false);
    });

    it('does not dispose models that are mid-load (in loadingPromises)', () => {
        const disposed: string[] = [];
        manager.pipelines.set('smollm2-135m-instruct', makePipeline('smollm2-135m-instruct', disposed));
        manager.pipelines.set('bge-small-en-v1.5', makePipeline('bge-small-en-v1.5', disposed));
        manager.pipelines.set('bert-base-uncased', makePipeline('bert-base-uncased', disposed));

        manager.lastUsedAt.set('smollm2-135m-instruct', 1);
        manager.lastUsedAt.set('bge-small-en-v1.5', 2);
        manager.lastUsedAt.set('bert-base-uncased', 3);

        // Mark smollm2 as loading
        manager.loadingPromises.set('smollm2-135m-instruct', Promise.resolve({} as CallablePipeline));

        manager.evictIfNecessary(getModelConfig('whisper-tiny-en'));

        // Should evict bge-small-en-v1.5 (timestamp 2) instead of smollm2 (timestamp 1) because smollm2 is loading
        expect(disposed).toEqual(['bge-small-en-v1.5']);
        expect(manager.pipelines.has('smollm2-135m-instruct')).toBe(true);
        expect(manager.pipelines.has('bge-small-en-v1.5')).toBe(false);
    });

    it('evicts all other models before loading a large model', () => {
        const disposed: string[] = [];
        manager.pipelines.set('smollm2-135m-instruct', makePipeline('smollm2-135m-instruct', disposed));
        manager.pipelines.set('bge-small-en-v1.5', makePipeline('bge-small-en-v1.5', disposed));

        manager.lastUsedAt.set('smollm2-135m-instruct', 1);
        manager.lastUsedAt.set('bge-small-en-v1.5', 2);

        // florence-2-base-ft is the large model (1200 MB); clip was downgraded to isLargeModel: false
        manager.evictIfNecessary(getModelConfig('florence-2-base-ft'));

        expect(disposed.sort()).toEqual(['bge-small-en-v1.5', 'smollm2-135m-instruct']);
        expect(manager.pipelines.size).toBe(0);
    });
});

import { describe, expect, it } from 'vitest';
import { createIdbCache, createMemoryBackend } from './idbCache';

describe('idbCache', () => {
    it('returns null on a miss', async () => {
        const cache = createIdbCache<string>({
            dbName: 'test',
            storeName: 'kv',
            backend: createMemoryBackend(),
        });
        expect(await cache.get('absent')).toBeNull();
    });

    it('round-trips values with meta', async () => {
        const cache = createIdbCache<{ a: number }>({
            dbName: 'test',
            storeName: 'kv',
            backend: createMemoryBackend(),
        });
        await cache.set('k', { a: 1 }, { source: 'unit-test' });
        const entry = await cache.get('k');
        expect(entry).not.toBeNull();
        expect(entry?.value).toEqual({ a: 1 });
        expect(entry?.meta).toEqual({ source: 'unit-test' });
        expect(entry?.version).toBe(1);
        expect(typeof entry?.storedAt).toBe('number');
    });

    it('treats entries written under a different version as misses', async () => {
        const backend = createMemoryBackend();
        const v1 = createIdbCache<string>({ dbName: 't', storeName: 'kv', version: 1, backend });
        await v1.set('k', 'old');

        const v2 = createIdbCache<string>({ dbName: 't', storeName: 'kv', version: 2, backend });
        expect(await v2.get('k')).toBeNull();

        await v2.set('k', 'new');
        const entry = await v2.get('k');
        expect(entry?.value).toBe('new');
        expect(entry?.version).toBe(2);
    });

    it('delete removes a single key', async () => {
        const cache = createIdbCache<string>({
            dbName: 'test',
            storeName: 'kv',
            backend: createMemoryBackend(),
        });
        await cache.set('a', '1');
        await cache.set('b', '2');
        await cache.delete('a');
        expect(await cache.get('a')).toBeNull();
        expect((await cache.get('b'))?.value).toBe('2');
    });

    it('clear empties the store', async () => {
        const cache = createIdbCache<string>({
            dbName: 'test',
            storeName: 'kv',
            backend: createMemoryBackend(),
        });
        await cache.set('a', '1');
        await cache.set('b', '2');
        await cache.clear();
        expect(await cache.get('a')).toBeNull();
        expect(await cache.get('b')).toBeNull();
    });

    it('does not leak between cache instances when backends differ', async () => {
        const a = createIdbCache<string>({
            dbName: 't',
            storeName: 'kv',
            backend: createMemoryBackend(),
        });
        const b = createIdbCache<string>({
            dbName: 't',
            storeName: 'kv',
            backend: createMemoryBackend(),
        });
        await a.set('k', 'in-a');
        expect(await b.get('k')).toBeNull();
    });

    it('overwrites existing values on repeat set', async () => {
        const cache = createIdbCache<string>({
            dbName: 'test',
            storeName: 'kv',
            backend: createMemoryBackend(),
        });
        await cache.set('k', 'first');
        await cache.set('k', 'second');
        expect((await cache.get('k'))?.value).toBe('second');
    });

    it('rejects a malformed raw record as a miss', async () => {
        const backend = createMemoryBackend();
        // Simulate stale or hand-poked data that doesn't match the CacheEntry shape.
        await backend.setRaw('k', { not: 'an entry' });
        const cache = createIdbCache<string>({ dbName: 't', storeName: 'kv', backend });
        expect(await cache.get('k')).toBeNull();
    });
});

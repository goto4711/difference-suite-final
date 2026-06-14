// Generic typed key/value cache with a swappable backend.
//
// Two backends ship: an IndexedDB backend (default for browsers) and an
// in-memory backend (for tests and any non-browser environment). Both speak
// the same RawBackend interface, so the public IdbCache<V> API behaves
// identically regardless of which is plugged in.
//
// The helper is intentionally value-agnostic: it stores whatever JSON-
// serialisable shape the caller hands it. Callers decide what to put in V
// (a string data URL for small assets, a Blob for large weights, a row
// object, etc.). Do not bake any single shape's assumptions into here.
//
// Designed to be reused by WP-8 (model-weight caching) — keep this file
// minimal and free of Stable-Bias-specific concerns.

export interface CacheEntry<V> {
    value: V;
    meta?: Record<string, unknown>;
    storedAt: number;
    version: number;
}

export interface IdbCache<V> {
    get(key: string): Promise<CacheEntry<V> | null>;
    set(key: string, value: V, meta?: Record<string, unknown>): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

// Backends store raw, opaque records. The cache layer wraps/unwraps
// CacheEntry around them; backends never inspect the value.
export interface RawBackend {
    getRaw(key: string): Promise<unknown>;
    setRaw(key: string, value: unknown): Promise<void>;
    deleteRaw(key: string): Promise<void>;
    clearRaw(): Promise<void>;
}

export interface CreateIdbCacheOptions {
    dbName: string;
    storeName: string;
    // Bumped when the value shape changes incompatibly. Entries written
    // under older versions are treated as cache misses.
    version?: number;
    backend?: RawBackend;
}

export function createIdbCache<V>(opts: CreateIdbCacheOptions): IdbCache<V> {
    const version = opts.version ?? 1;
    const backend = opts.backend ?? createIdbBackend(opts.dbName, opts.storeName);

    return {
        async get(key) {
            const raw = await backend.getRaw(key);
            if (!isCacheEntry<V>(raw)) return null;
            if (raw.version !== version) return null;
            return raw;
        },
        async set(key, value, meta) {
            const entry: CacheEntry<V> = {
                value,
                meta,
                storedAt: Date.now(),
                version,
            };
            await backend.setRaw(key, entry);
        },
        async delete(key) {
            await backend.deleteRaw(key);
        },
        async clear() {
            await backend.clearRaw();
        },
    };
}

function isCacheEntry<V>(raw: unknown): raw is CacheEntry<V> {
    return (
        typeof raw === 'object' &&
        raw !== null &&
        'value' in raw &&
        'version' in raw &&
        typeof (raw as { version: unknown }).version === 'number'
    );
}

// ------------------------------------------------------------------
// In-memory backend — used by unit tests and any environment without
// IndexedDB. Exported so callers can opt in explicitly.
// ------------------------------------------------------------------

export function createMemoryBackend(): RawBackend {
    const store = new Map<string, unknown>();
    return {
        async getRaw(key) {
            return store.has(key) ? store.get(key) : undefined;
        },
        async setRaw(key, value) {
            store.set(key, value);
        },
        async deleteRaw(key) {
            store.delete(key);
        },
        async clearRaw() {
            store.clear();
        },
    };
}

// ------------------------------------------------------------------
// IndexedDB backend — thin adapter. Kept deliberately small because
// memory-backend tests do not exercise IDB transaction/versioning glue;
// changes here should be validated manually in a browser.
// ------------------------------------------------------------------

function createIdbBackend(dbName: string, storeName: string): RawBackend {
    const openDb = (): Promise<IDBDatabase> => {
        if (typeof indexedDB === 'undefined') {
            return Promise.reject(new Error('IndexedDB is not available in this environment.'));
        }
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(dbName, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error ?? new Error(`Failed to open ${dbName}.`));
        });
    };

    const withStore = async <T>(
        mode: IDBTransactionMode,
        fn: (store: IDBObjectStore) => IDBRequest<T> | null,
    ): Promise<T | undefined> => {
        const db = await openDb();
        return new Promise<T | undefined>((resolve, reject) => {
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            const req = fn(store);
            let result: T | undefined;
            if (req) {
                req.onsuccess = () => {
                    result = req.result;
                };
                req.onerror = () => {
                    db.close();
                    reject(req.error ?? new Error('IndexedDB request failed.'));
                };
            }
            tx.oncomplete = () => {
                db.close();
                resolve(result);
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error ?? new Error('IndexedDB transaction failed.'));
            };
        });
    };

    return {
        async getRaw(key) {
            return await withStore('readonly', (s) => s.get(key));
        },
        async setRaw(key, value) {
            await withStore('readwrite', (s) => s.put(value, key));
        },
        async deleteRaw(key) {
            await withStore('readwrite', (s) => s.delete(key));
        },
        async clearRaw() {
            await withStore('readwrite', (s) => s.clear());
        },
    };
}

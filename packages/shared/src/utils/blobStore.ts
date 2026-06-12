const DB_NAME = 'difference-suite-blobs';
const STORE_NAME = 'items';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
        throw new Error('IndexedDB is not available in this environment.');
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Failed to open blob store.'));
    });
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        transaction.oncomplete = () => {
            db.close();
            resolve();
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error ?? new Error('Failed to save blob.'));
        };

        store.put(blob, id);
    });
}

export async function getBlob(id: string): Promise<Blob | null> {
    const db = await openDatabase();

    return await new Promise<Blob | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
            db.close();
            reject(transaction.error ?? new Error('Failed to load blob.'));
        };
        request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
        request.onerror = () => reject(request.error ?? new Error('Failed to load blob.'));
    });
}

export async function deleteBlob(id: string): Promise<void> {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        transaction.oncomplete = () => {
            db.close();
            resolve();
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error ?? new Error('Failed to delete blob.'));
        };

        store.delete(id);
    });
}

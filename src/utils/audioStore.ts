/**
 * Audio data URLs are far too large for localStorage (~5MB per origin in most
 * browsers), so generated audio and voice previews live in IndexedDB instead.
 * Every function fails soft: if IndexedDB is unavailable (private mode, blocked
 * storage) the app keeps working and simply does not persist audio.
 */

const DB_NAME = 'resona';
const STORE = 'audio';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Audio storage unavailable:', err);
    return undefined;
  }
}

export function saveAudio(key: string, dataUrl: string): Promise<unknown> {
  return run('readwrite', (store) => store.put(dataUrl, key));
}

export async function loadAudio(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (keys.length === 0) return result;
  await run('readonly', (store) => {
    for (const key of keys) {
      const request = store.get(key);
      request.onsuccess = () => {
        if (typeof request.result === 'string') result[key] = request.result;
      };
    }
  });
  return result;
}

export function deleteAudio(keys: string[]): Promise<unknown> {
  if (keys.length === 0) return Promise.resolve();
  return run('readwrite', (store) => {
    for (const key of keys) store.delete(key);
  });
}

export const historyAudioKey = (id: string) => `history:${id}`;
export const voicePreviewKey = (id: string) => `voice:${id}`;

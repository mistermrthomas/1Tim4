import type { StorageAdapter, TxFn, TxMode } from './StorageAdapter';
import { DB_NAME, DB_VERSION, type IndexQuery, type StoreName } from './types';

const STORE_NAMES: StoreName[] = [
  'profiles',
  'entities',
  'daily_plans',
  'drafts',
  'outbox',
  'content_packs',
  'scripture_texts',
  'meta',
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

/**
 * IndexedDB implementation of StorageAdapter.
 * ONLY file that may touch indexedDB globals (enforced by ESLint).
 */
export function createIndexedDbAdapter(): StorageAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null;
  const db = () => {
    dbPromise ??= openDb();
    return dbPromise;
  };

  const adapter: StorageAdapter = {
    async get<T>(store: StoreName, key: string): Promise<T | null> {
      const database = await db();
      const tx = database.transaction(store, 'readonly');
      const value = await idbReq(tx.objectStore(store).get(key));
      return (value as T | undefined) ?? null;
    },

    async put<T>(store: StoreName, key: string, value: T): Promise<void> {
      const database = await db();
      const tx = database.transaction(store, 'readwrite');
      await idbReq(tx.objectStore(store).put(value, key));
    },

    async delete(store: StoreName, key: string): Promise<void> {
      const database = await db();
      const tx = database.transaction(store, 'readwrite');
      await idbReq(tx.objectStore(store).delete(key));
    },

    async query<T>(store: StoreName, index: IndexQuery): Promise<T[]> {
      const database = await db();
      const tx = database.transaction(store, 'readonly');
      const all = (await idbReq(tx.objectStore(store).getAll())) as T[];
      if (index.type === 'all') return all;
      // Prefix filter on object field when values are records with that field
      return all.filter((item) => {
        if (item && typeof item === 'object' && index.field in item) {
          const v = String((item as Record<string, unknown>)[index.field] ?? '');
          return v.startsWith(index.prefix);
        }
        return false;
      });
    },

    async tx<T>(stores: StoreName[], mode: TxMode, fn: TxFn<T>): Promise<T> {
      const database = await db();
      const idbMode = mode === 'rw' ? 'readwrite' : 'readonly';
      const transaction = database.transaction(stores, idbMode);

      const api = {
        get: async <TVal>(store: StoreName, key: string): Promise<TVal | null> => {
          const value = await idbReq(transaction.objectStore(store).get(key));
          return (value as TVal | undefined) ?? null;
        },
        put: async <TVal>(store: StoreName, key: string, value: TVal): Promise<void> => {
          await idbReq(transaction.objectStore(store).put(value, key));
        },
        delete: async (store: StoreName, key: string): Promise<void> => {
          await idbReq(transaction.objectStore(store).delete(key));
        },
      };

      const result = await fn(api);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('tx failed'));
        transaction.onabort = () => reject(transaction.error ?? new Error('tx aborted'));
      });
      return result;
    },
  };

  return adapter;
}

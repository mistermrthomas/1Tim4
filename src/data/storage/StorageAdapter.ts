import type { IndexQuery, StoreName } from './types';

export type TxMode = 'r' | 'rw';

export type TxFn<T> = (api: {
  get: <TVal>(store: StoreName, key: string) => Promise<TVal | null>;
  put: <TVal>(store: StoreName, key: string, value: TVal) => Promise<void>;
  delete: (store: StoreName, key: string) => Promise<void>;
}) => Promise<T>;

/**
 * Persistence port. v1 = IndexedDB. Future: SQLite / native.
 * Features and repositories must depend on this interface only.
 */
export interface StorageAdapter {
  get<T>(store: StoreName, key: string): Promise<T | null>;
  put<T>(store: StoreName, key: string, value: T): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
  query<T>(store: StoreName, index: IndexQuery): Promise<T[]>;
  tx<T>(stores: StoreName[], mode: TxMode, fn: TxFn<T>): Promise<T>;
}

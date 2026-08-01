import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createIndexedDbAdapter } from './indexedDbAdapter';
import { DB_NAME } from './types';

describe('createIndexedDbAdapter', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase(DB_NAME);
  });

  it('round-trips put/get and atomic tx swap', async () => {
    const storage = createIndexedDbAdapter();
    await storage.put('profiles', 'p1', { id: 'p1', displayName: 'Test' });
    const got = await storage.get<{ id: string; displayName: string }>('profiles', 'p1');
    expect(got?.displayName).toBe('Test');

    await storage.tx(['content_packs'], 'rw', async (api) => {
      await api.put('content_packs', '__temp__foundation.core', { ok: true, v: 1 });
      await api.put('content_packs', 'foundation.core', { ok: true, v: 1 });
      await api.delete('content_packs', '__temp__foundation.core');
    });

    const pack = await storage.get<{ ok: boolean; v: number }>('content_packs', 'foundation.core');
    expect(pack).toEqual({ ok: true, v: 1 });
    const temp = await storage.get('content_packs', '__temp__foundation.core');
    expect(temp).toBeNull();
  });
});

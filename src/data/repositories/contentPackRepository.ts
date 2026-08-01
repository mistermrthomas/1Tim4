import type { StorageAdapter } from '../storage/StorageAdapter';
import type { InstalledContentPack } from '../../content/types';

export function createContentPackRepository(storage: StorageAdapter) {
  return {
    async getInstalled(packId: string): Promise<InstalledContentPack | null> {
      return storage.get<InstalledContentPack>('content_packs', packId);
    },

    async listInstalled(): Promise<InstalledContentPack[]> {
      return storage.query<InstalledContentPack>('content_packs', { type: 'all' });
    },

    /**
     * Atomic install: write pack under temp key then swap in one transaction.
     */
    async installAtomic(pack: InstalledContentPack): Promise<void> {
      const tempKey = `__temp__${pack.manifest.packId}`;
      await storage.tx(['content_packs'], 'rw', async (api) => {
        await api.put('content_packs', tempKey, pack);
        await api.put('content_packs', pack.manifest.packId, pack);
        await api.delete('content_packs', tempKey);
      });
    },
  };
}

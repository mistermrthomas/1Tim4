import type { StorageAdapter } from '../storage/StorageAdapter';

export interface LocalProfile {
  id: string;
  displayName: string;
  timezone: string;
  preferredTranslationId: string;
  createdAt: string;
  updatedAt: string;
}

export function createProfileRepository(storage: StorageAdapter) {
  return {
    async get(id: string): Promise<LocalProfile | null> {
      return storage.get<LocalProfile>('profiles', id);
    },

    async save(profile: LocalProfile): Promise<void> {
      await storage.put('profiles', profile.id, profile);
    },

    async list(): Promise<LocalProfile[]> {
      return storage.query<LocalProfile>('profiles', { type: 'all' });
    },
  };
}

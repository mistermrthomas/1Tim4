import { createId } from '../utils/id';
import type { UserProfile } from '../types';

const REGISTRY_KEY = 'path-profiles-registry';
const LEGACY_DATA_KEY = 'path-app-data';
const LEGACY_MODE_KEY = 'path-app-mode';
const LEGACY_TIMOTHY_DATA_KEY = 'timothy-app-data';
const LEGACY_TIMOTHY_MODE_KEY = 'timothy-app-mode';

export interface ProfilesRegistry {
  version: 1;
  profiles: UserProfile[];
  activeProfileId: string | null;
}

function emptyRegistry(): ProfilesRegistry {
  return { version: 1, profiles: [], activeProfileId: null };
}

export function loadRegistry(): ProfilesRegistry {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return emptyRegistry();
    const parsed = JSON.parse(raw) as ProfilesRegistry;
    if (parsed.version !== 1 || !Array.isArray(parsed.profiles)) {
      return emptyRegistry();
    }
    return parsed;
  } catch {
    return emptyRegistry();
  }
}

export function saveRegistry(registry: ProfilesRegistry): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export function createProfileRecord(name: string): UserProfile {
  return {
    id: createId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
}

function migrateLegacySingleUserData(targetProfileId: string): void {
  const legacyData =
    localStorage.getItem(LEGACY_DATA_KEY) ?? localStorage.getItem(LEGACY_TIMOTHY_DATA_KEY);
  const legacyMode =
    localStorage.getItem(LEGACY_MODE_KEY) ?? localStorage.getItem(LEGACY_TIMOTHY_MODE_KEY);

  if (legacyData) {
    localStorage.setItem(`path-app-data-${targetProfileId}`, legacyData);
  }
  if (legacyMode) {
    localStorage.setItem(`path-app-mode-${targetProfileId}`, legacyMode);
  }
}

/** Ensures Michael and Bailey example profiles exist; migrates legacy data to Michael if present. */
export function ensureProfilesInitialized(): ProfilesRegistry {
  let registry = loadRegistry();

  if (registry.profiles.length === 0) {
    const michael = createProfileRecord('Michael');
    const bailey = createProfileRecord('Bailey');
    registry.profiles = [michael, bailey];

    const legacyData =
      localStorage.getItem(LEGACY_DATA_KEY) ?? localStorage.getItem(LEGACY_TIMOTHY_DATA_KEY);
    if (legacyData) {
      migrateLegacySingleUserData(michael.id);
    }
  }

  saveRegistry(registry);
  return registry;
}

export function getActiveProfileId(): string | null {
  return loadRegistry().activeProfileId;
}

export function getActiveProfile(): UserProfile | null {
  const registry = loadRegistry();
  if (!registry.activeProfileId) return null;
  return registry.profiles.find((p) => p.id === registry.activeProfileId) ?? null;
}

export function setActiveProfileId(profileId: string | null): ProfilesRegistry {
  const registry = loadRegistry();
  registry.activeProfileId = profileId;
  saveRegistry(registry);
  return registry;
}

export function addProfile(name: string): UserProfile {
  const registry = loadRegistry();
  const profile = createProfileRecord(name);
  registry.profiles.push(profile);
  saveRegistry(registry);
  return profile;
}

export function listProfiles(): UserProfile[] {
  return loadRegistry().profiles;
}

export function clearActiveProfile(): void {
  setActiveProfileId(null);
}

import { isAppDataEmpty } from '../data/emptyData';
import { createId } from '../utils/id';
import type { UserProfile } from '../types';
import { getAppMode, loadAppData } from './storage';

const REGISTRY_KEY = 'path-profiles-registry';
const LEGACY_SEED_MIGRATION_KEY = 'path-profiles-legacy-seed-migrated-v2';
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

const LEGACY_SEED_NAMES = new Set(['michael', 'bailey']);

function profileNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function profileHasTrailContent(profileId: string): boolean {
  const data = loadAppData(profileId);
  if (data.spiritualAssessment || data.servingDiscovery) return true;
  if (!isAppDataEmpty(data)) return true;
  const mode = getAppMode(profileId);
  return mode === 'demo' || mode === 'live';
}

function removeProfileStorage(profileId: string): void {
  localStorage.removeItem(`path-app-data-${profileId}`);
  localStorage.removeItem(`path-app-mode-${profileId}`);
}

/** Drop old auto-seeded Michael/Bailey test profiles so new users get the name-first welcome. */
function migrateLegacySeedProfiles(registry: ProfilesRegistry): ProfilesRegistry {
  if (localStorage.getItem(LEGACY_SEED_MIGRATION_KEY)) return registry;

  const names = registry.profiles.map((p) => profileNameKey(p.name));
  const isClassicSeedPair =
    registry.profiles.length === 2 &&
    names.includes('michael') &&
    names.includes('bailey') &&
    names.every((n) => LEGACY_SEED_NAMES.has(n));

  if (isClassicSeedPair) {
    for (const profile of registry.profiles) {
      removeProfileStorage(profile.id);
    }
    const empty = emptyRegistry();
    saveRegistry(empty);
    localStorage.setItem(LEGACY_SEED_MIGRATION_KEY, '1');
    return empty;
  }

  let changed = false;
  const nextProfiles = registry.profiles.filter((profile) => {
    if (!LEGACY_SEED_NAMES.has(profileNameKey(profile.name))) return true;
    if (profileHasTrailContent(profile.id)) return true;
    removeProfileStorage(profile.id);
    changed = true;
    return false;
  });

  if (changed) {
    registry.profiles = nextProfiles;
    if (
      registry.activeProfileId &&
      !nextProfiles.some((p) => p.id === registry.activeProfileId)
    ) {
      registry.activeProfileId = null;
    }
    saveRegistry(registry);
  }

  localStorage.setItem(LEGACY_SEED_MIGRATION_KEY, '1');
  return registry;
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

/** Ensures registry exists; migrates legacy single-user data to the first profile created. */
export function ensureProfilesInitialized(): ProfilesRegistry {
  let registry = migrateLegacySeedProfiles(loadRegistry());

  const legacyData =
    localStorage.getItem(LEGACY_DATA_KEY) ?? localStorage.getItem(LEGACY_TIMOTHY_DATA_KEY);
  if (legacyData && registry.profiles.length === 0) {
    const first = createProfileRecord('Traveler');
    registry.profiles = [first];
    migrateLegacySingleUserData(first.id);
    registry.activeProfileId = first.id;
    saveRegistry(registry);
    return registry;
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

/** Ensures a profile exists in the registry (e.g. after cloud restore). */
export function ensureProfileInRegistry(profileId: string, name: string): UserProfile {
  const registry = loadRegistry();
  const existing = registry.profiles.find((p) => p.id === profileId);
  if (existing) {
    if (name.trim() && existing.name !== name.trim()) {
      existing.name = name.trim();
      saveRegistry(registry);
    }
    return existing;
  }
  const profile: UserProfile = {
    id: profileId,
    name: name.trim() || 'Traveler',
    createdAt: new Date().toISOString(),
  };
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

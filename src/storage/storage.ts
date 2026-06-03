import { createEmptyAppData } from '../data/emptyData';
import { sampleData } from '../data/sampleData';
import type { AppData } from '../types';

const LEGACY_STORAGE_KEY = 'timothy-app-data';
const LEGACY_MODE_KEY = 'timothy-app-mode';
const LEGACY_PATH_DATA_KEY = 'path-app-data';
const LEGACY_PATH_MODE_KEY = 'path-app-mode';

export type AppMode = 'new' | 'demo' | 'live';

function dataKey(profileId: string): string {
  return `path-app-data-${profileId}`;
}

function modeKey(profileId: string): string {
  return `path-app-mode-${profileId}`;
}

function migrateLegacyKeysForProfile(profileId: string): void {
  if (!localStorage.getItem(dataKey(profileId))) {
    const legacy =
      localStorage.getItem(LEGACY_PATH_DATA_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(dataKey(profileId), legacy);
    }
  }
  if (!localStorage.getItem(modeKey(profileId))) {
    const legacy =
      localStorage.getItem(LEGACY_PATH_MODE_KEY) ?? localStorage.getItem(LEGACY_MODE_KEY);
    if (legacy) {
      localStorage.setItem(modeKey(profileId), legacy);
    }
  }
}

export function getAppMode(profileId: string): AppMode | null {
  migrateLegacyKeysForProfile(profileId);
  const raw = localStorage.getItem(modeKey(profileId));
  if (raw === 'new' || raw === 'demo' || raw === 'live') return raw;
  return null;
}

export function setAppMode(profileId: string, mode: AppMode): void {
  localStorage.setItem(modeKey(profileId), mode);
}

export function loadAppData(profileId: string): AppData {
  migrateLegacyKeysForProfile(profileId);
  const mode = getAppMode(profileId);
  try {
    const raw = localStorage.getItem(dataKey(profileId));
    if (!raw) {
      if (mode === 'demo') return structuredClone(sampleData);
      return createEmptyAppData();
    }
    const parsed = JSON.parse(raw) as AppData;
    if (parsed.version !== 1) {
      return mode === 'demo' ? structuredClone(sampleData) : createEmptyAppData();
    }
    const data = parsed as AppData;
    if (data.spiritualAssessment === undefined) data.spiritualAssessment = null;
    if (data.servingDiscovery === undefined) data.servingDiscovery = null;
    if (!data.onboardingProgress) data.onboardingProgress = {};
    return data;
  } catch {
    return mode === 'demo' ? structuredClone(sampleData) : createEmptyAppData();
  }
}

export function saveAppData(profileId: string, data: AppData): void {
  try {
    localStorage.setItem(dataKey(profileId), JSON.stringify(data));
  } catch (err) {
    console.error('Path: could not save data to this device.', err);
  }
}

export function loadDemoData(profileId: string): AppData {
  const data = structuredClone(sampleData);
  saveAppData(profileId, data);
  setAppMode(profileId, 'demo');
  return data;
}

export function startFreshTrail(profileId: string): AppData {
  const data = createEmptyAppData();
  saveAppData(profileId, data);
  setAppMode(profileId, 'new');
  return data;
}

export function promoteToLiveMode(profileId: string): void {
  const mode = getAppMode(profileId);
  if (mode === 'new' || mode === 'demo') {
    setAppMode(profileId, 'live');
  }
}

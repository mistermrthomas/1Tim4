import type { PhysicalTrackerState } from './types';

export const PHYSICAL_TRACKER_KEY = 'path-physical-tracker-v1';

const EMPTY: PhysicalTrackerState = {
  version: 1,
  sessions: [],
  intake: [],
  dayMeta: [],
  waterUnit: 'oz',
};

export function readPhysicalTracker(): PhysicalTrackerState {
  try {
    const raw = localStorage.getItem(PHYSICAL_TRACKER_KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw) as PhysicalTrackerState;
    if (parsed.version !== 1) return structuredClone(EMPTY);
    return {
      ...EMPTY,
      ...parsed,
      sessions: parsed.sessions ?? [],
      intake: parsed.intake ?? [],
      dayMeta: parsed.dayMeta ?? [],
      waterUnit: parsed.waterUnit ?? 'oz',
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function writePhysicalTracker(state: PhysicalTrackerState): void {
  localStorage.setItem(PHYSICAL_TRACKER_KEY, JSON.stringify(state));
}

export function todayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

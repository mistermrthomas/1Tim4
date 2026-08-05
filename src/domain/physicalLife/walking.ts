import { todayDateKey, newId } from '../physical/store';
import { effectiveSteps, getStepsDay } from '../physical/stepsTracker';

export const WALKING_STORE_KEY = 'path-walking-v1';

export type WalkingEntry = {
  id: string;
  date: string;
  /** Minutes walked, optional. */
  durationMin: number | null;
  /** Miles or km — stored as entered; unit in `distanceUnit`. */
  distance: number | null;
  distanceUnit: 'mi' | 'km';
  planned: boolean;
  note: string;
  createdAt: string;
};

type WalkingState = {
  version: 1;
  entries: WalkingEntry[];
};

function empty(): WalkingState {
  return { version: 1, entries: [] };
}

export function readWalkingState(): WalkingState {
  try {
    const raw = localStorage.getItem(WALKING_STORE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as WalkingState;
    if (parsed.version !== 1) return empty();
    return { version: 1, entries: parsed.entries ?? [] };
  } catch {
    return empty();
  }
}

function write(state: WalkingState): void {
  localStorage.setItem(WALKING_STORE_KEY, JSON.stringify(state));
}

export function upsertWalkingEntry(input: {
  id?: string;
  date?: string;
  durationMin?: number | null;
  distance?: number | null;
  distanceUnit?: 'mi' | 'km';
  planned?: boolean;
  note?: string;
}): WalkingEntry {
  const state = readWalkingState();
  const date = input.date ?? todayDateKey();
  if (input.id) {
    const next = state.entries.map((entry) =>
      entry.id === input.id
        ? {
            ...entry,
            date,
            durationMin: input.durationMin ?? entry.durationMin,
            distance: input.distance ?? entry.distance,
            distanceUnit: input.distanceUnit ?? entry.distanceUnit,
            planned: input.planned ?? entry.planned,
            note: (input.note ?? entry.note).trim(),
          }
        : entry,
    );
    write({ version: 1, entries: next });
    return next.find((e) => e.id === input.id)!;
  }

  const entry: WalkingEntry = {
    id: newId('walk'),
    date,
    durationMin: input.durationMin ?? null,
    distance: input.distance ?? null,
    distanceUnit: input.distanceUnit ?? 'mi',
    planned: input.planned ?? false,
    note: (input.note ?? '').trim(),
    createdAt: new Date().toISOString(),
  };
  write({ version: 1, entries: [entry, ...state.entries] });
  return entry;
}

export function recentWalks(limit = 10): WalkingEntry[] {
  return readWalkingState()
    .entries.slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/** Prefer Health/steps total when present; walking log remains optional. */
export function stepsForDate(date = todayDateKey()): number {
  return effectiveSteps(getStepsDay(date));
}

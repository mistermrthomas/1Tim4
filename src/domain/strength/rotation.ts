import { addDays, toLocalDateKey } from '../calendar/week';
import { todayDateKey } from '../physical/store';
import { WORKOUT_1_ID, WORKOUT_2_ID, WORKOUT_3_ID } from './seed';
import type { StrengthState } from './types';

export type RotationKind = 'workout' | 'recovery';

export type RotationSlot = {
  kind: RotationKind;
  /** Strength workout id when kind === 'workout' */
  workoutId: string | null;
  label: string;
  shortLabel: string;
};

/** A → B → Recovery → C → A → B → Recovery … */
export const STRENGTH_ROTATION: RotationSlot[] = [
  {
    kind: 'workout',
    workoutId: WORKOUT_1_ID,
    label: 'Workout A — Chest, Triceps, Core',
    shortLabel: 'Workout A',
  },
  {
    kind: 'workout',
    workoutId: WORKOUT_2_ID,
    label: 'Workout B — Back, Biceps, Traps',
    shortLabel: 'Workout B',
  },
  {
    kind: 'recovery',
    workoutId: null,
    label: 'Recovery or Walk',
    shortLabel: 'Recovery / Walk',
  },
  {
    kind: 'workout',
    workoutId: WORKOUT_3_ID,
    label: 'Workout C — Legs',
    shortLabel: 'Workout C',
  },
  {
    kind: 'workout',
    workoutId: WORKOUT_1_ID,
    label: 'Workout A — Chest, Triceps, Core',
    shortLabel: 'Workout A',
  },
  {
    kind: 'workout',
    workoutId: WORKOUT_2_ID,
    label: 'Workout B — Back, Biceps, Traps',
    shortLabel: 'Workout B',
  },
  {
    kind: 'recovery',
    workoutId: null,
    label: 'Recovery or Walk',
    shortLabel: 'Recovery / Walk',
  },
];

const ROTATION_KEY = 'path-strength-rotation-v1';

export type RotationState = {
  version: 1;
  /** Index of the last completed slot in STRENGTH_ROTATION, or -1 if none. */
  lastCompletedIndex: number;
  lastCompletedDate: string | null;
  /** Optional note when completing a recovery/walk day. */
  lastCompletedNote: string;
};

function emptyRotation(): RotationState {
  return {
    version: 1,
    lastCompletedIndex: -1,
    lastCompletedDate: null,
    lastCompletedNote: '',
  };
}

export function readRotationState(): RotationState {
  try {
    const raw = localStorage.getItem(ROTATION_KEY);
    if (!raw) return emptyRotation();
    const parsed = JSON.parse(raw) as RotationState;
    if (parsed.version !== 1) return emptyRotation();
    return {
      ...emptyRotation(),
      ...parsed,
      lastCompletedIndex: Number.isFinite(parsed.lastCompletedIndex)
        ? parsed.lastCompletedIndex
        : -1,
    };
  } catch {
    return emptyRotation();
  }
}

export function writeRotationState(state: RotationState): void {
  localStorage.setItem(ROTATION_KEY, JSON.stringify(state));
}

export function nextRotationIndex(lastCompletedIndex: number): number {
  if (lastCompletedIndex < 0) return 0;
  return (lastCompletedIndex + 1) % STRENGTH_ROTATION.length;
}

export function getNextSlot(state = readRotationState()): RotationSlot {
  return STRENGTH_ROTATION[nextRotationIndex(state.lastCompletedIndex)]!;
}

export function getLastSlot(state = readRotationState()): RotationSlot | null {
  if (state.lastCompletedIndex < 0) return null;
  return STRENGTH_ROTATION[state.lastCompletedIndex] ?? null;
}

export function daysSince(dateKey: string | null, today = todayDateKey()): number | null {
  if (!dateKey) return null;
  const a = new Date(`${dateKey}T12:00:00`);
  const b = new Date(`${today}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

export function completeRotationSlot(
  index: number,
  date = todayDateKey(),
  note = '',
): RotationState {
  const next: RotationState = {
    version: 1,
    lastCompletedIndex: index,
    lastCompletedDate: date,
    lastCompletedNote: note.trim(),
  };
  writeRotationState(next);
  return next;
}

export function completeNextSlot(note = '', date = todayDateKey()): RotationState {
  const state = readRotationState();
  const index = nextRotationIndex(state.lastCompletedIndex);
  return completeRotationSlot(index, date, note);
}

/** Infer last workout dates from strength log when rotation state is empty. */
export function bootstrapRotationFromLogs(strength: StrengthState): RotationState {
  const existing = readRotationState();
  if (existing.lastCompletedIndex >= 0) return existing;

  const byWorkout = new Map<string, string>();
  for (const entry of strength.entries) {
    if (!entry.workoutId) continue;
    const prev = byWorkout.get(entry.workoutId);
    if (!prev || entry.date > prev) byWorkout.set(entry.workoutId, entry.date);
  }

  const a = byWorkout.get(WORKOUT_1_ID);
  const b = byWorkout.get(WORKOUT_2_ID);
  if (!a && !b) return existing;

  let lastId = WORKOUT_1_ID;
  let lastDate = a ?? b!;
  if (a && b) {
    if (b > a) {
      lastId = WORKOUT_2_ID;
      lastDate = b;
    } else {
      lastId = WORKOUT_1_ID;
      lastDate = a;
    }
  } else if (b && !a) {
    lastId = WORKOUT_2_ID;
    lastDate = b;
  }

  const index = STRENGTH_ROTATION.findIndex(
    (slot) => slot.kind === 'workout' && slot.workoutId === lastId,
  );
  if (index < 0) return existing;
  return completeRotationSlot(index, lastDate);
}

export function formatDaysSince(days: number | null): string {
  if (days == null) return 'Not yet';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function upcomingDates(from = todayDateKey(), count = 7): Array<{ date: string; slot: RotationSlot }> {
  const state = readRotationState();
  let index = nextRotationIndex(state.lastCompletedIndex);
  const out: Array<{ date: string; slot: RotationSlot }> = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      date: addDays(from, i),
      slot: STRENGTH_ROTATION[index]!,
    });
    index = (index + 1) % STRENGTH_ROTATION.length;
  }
  return out;
}

export function localTodayLabel(): string {
  return toLocalDateKey();
}

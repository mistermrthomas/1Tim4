import { newId } from '../physical/store';
import { buildSeededStrengthState, STRENGTH_SEED_VERSION } from './seed';
import type {
  StrengthExercise,
  StrengthLogEntry,
  StrengthState,
  StrengthWorkoutNote,
} from './types';

export const STRENGTH_STORE_KEY = 'path-strength-log-v1';

function cloneSeed(): StrengthState {
  return structuredClone(buildSeededStrengthState());
}

function mergeCatalog(state: StrengthState): StrengthState {
  const seed = cloneSeed();
  const byId = new Map(state.exercises.map((e) => [e.id, e]));
  for (const exercise of seed.exercises) {
    const existing = byId.get(exercise.id);
    if (!existing) {
      byId.set(exercise.id, exercise);
      continue;
    }
    byId.set(exercise.id, {
      ...existing,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      active: exercise.active,
      workoutId: exercise.workoutId,
      order: exercise.order,
      weightIncrementLb: exercise.weightIncrementLb,
      weightSuffix: exercise.weightSuffix,
      maxWeightLb: exercise.maxWeightLb,
      // Keep user-edited technique notes if they customized beyond seed empty/default.
      techniqueNote: existing.techniqueNote.trim()
        ? existing.techniqueNote
        : exercise.techniqueNote,
    });
  }

  const entryIds = new Set(state.entries.map((e) => `${e.exerciseId}|${e.date}|${e.weightLb}`));
  const mergedEntries = [...state.entries];
  for (const entry of seed.entries) {
    const key = `${entry.exerciseId}|${entry.date}|${entry.weightLb}`;
    if (!entryIds.has(key)) {
      mergedEntries.push(entry);
      entryIds.add(key);
    }
  }

  const noteKeys = new Set(state.workoutNotes.map((n) => `${n.workoutId}|${n.date}`));
  const mergedNotes = [...state.workoutNotes];
  for (const note of seed.workoutNotes) {
    const key = `${note.workoutId}|${note.date}`;
    if (!noteKeys.has(key)) mergedNotes.push(note);
  }

  return {
    version: 1,
    seedVersion: STRENGTH_SEED_VERSION,
    workouts: seed.workouts,
    exercises: Array.from(byId.values()),
    entries: mergedEntries,
    workoutNotes: mergedNotes,
  };
}

export function readStrengthState(): StrengthState {
  try {
    const raw = localStorage.getItem(STRENGTH_STORE_KEY);
    if (!raw) {
      const seeded = cloneSeed();
      writeStrengthState(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as StrengthState;
    if (parsed.version !== 1) {
      const seeded = cloneSeed();
      writeStrengthState(seeded);
      return seeded;
    }
    if ((parsed.seedVersion ?? 0) < STRENGTH_SEED_VERSION) {
      const merged = mergeCatalog({
        version: 1,
        seedVersion: parsed.seedVersion ?? 0,
        workouts: parsed.workouts ?? [],
        exercises: parsed.exercises ?? [],
        entries: parsed.entries ?? [],
        workoutNotes: parsed.workoutNotes ?? [],
      });
      writeStrengthState(merged);
      return merged;
    }
    return {
      version: 1,
      seedVersion: parsed.seedVersion ?? STRENGTH_SEED_VERSION,
      workouts: parsed.workouts ?? [],
      exercises: parsed.exercises ?? [],
      entries: parsed.entries ?? [],
      workoutNotes: parsed.workoutNotes ?? [],
    };
  } catch {
    const seeded = cloneSeed();
    writeStrengthState(seeded);
    return seeded;
  }
}

export function writeStrengthState(state: StrengthState): void {
  localStorage.setItem(STRENGTH_STORE_KEY, JSON.stringify(state));
}

export function updateStrengthState(mutate: (state: StrengthState) => StrengthState): StrengthState {
  const next = mutate(readStrengthState());
  writeStrengthState(next);
  return next;
}

export function upsertStrengthLogEntry(
  input: Omit<StrengthLogEntry, 'id' | 'createdAt'> & { id?: string },
): StrengthState {
  return updateStrengthState((state) => {
    const now = new Date().toISOString();
    if (input.id) {
      return {
        ...state,
        entries: state.entries.map((entry) =>
          entry.id === input.id
            ? {
                ...entry,
                ...input,
                id: entry.id,
                createdAt: entry.createdAt,
                setCount: input.reps.length,
              }
            : entry,
        ),
      };
    }
    const entry: StrengthLogEntry = {
      id: newId('slog'),
      createdAt: now,
      exerciseId: input.exerciseId,
      workoutId: input.workoutId,
      date: input.date,
      weightLb: input.weightLb,
      setCount: input.reps.length,
      reps: input.reps,
      difficulty: input.difficulty,
      pain: input.pain,
      notes: input.notes,
    };
    return { ...state, entries: [entry, ...state.entries] };
  });
}

export function deleteStrengthLogEntry(entryId: string): StrengthState {
  return updateStrengthState((state) => ({
    ...state,
    entries: state.entries.filter((entry) => entry.id !== entryId),
  }));
}

/** Unique session dates for the given exercises, oldest → newest. */
export function sessionDatesForExercises(
  state: StrengthState,
  exerciseIds: Iterable<string>,
  limit = 8,
): string[] {
  const ids = new Set(exerciseIds);
  const dates = new Set<string>();
  for (const entry of state.entries) {
    if (ids.has(entry.exerciseId)) dates.add(entry.date);
  }
  return Array.from(dates)
    .sort((a, b) => a.localeCompare(b))
    .slice(-limit);
}

/** Unique session dates for a workout’s exercises, oldest → newest. */
export function sessionDatesForWorkout(
  state: StrengthState,
  workoutId: string,
  limit = 8,
): string[] {
  return sessionDatesForExercises(
    state,
    exercisesForWorkout(state, workoutId).map((e) => e.id),
    limit,
  );
}

export function activeExercises(state: StrengthState): StrengthExercise[] {
  return state.exercises
    .filter((e) => e.active)
    .sort((a, b) => {
      const workoutA =
        state.workouts.find((w) => w.id === a.workoutId)?.order ?? Number.MAX_SAFE_INTEGER;
      const workoutB =
        state.workouts.find((w) => w.id === b.workoutId)?.order ?? Number.MAX_SAFE_INTEGER;
      if (workoutA !== workoutB) return workoutA - workoutB;
      return a.order - b.order;
    });
}

export function entryForExerciseDate(
  state: StrengthState,
  exerciseId: string,
  date: string,
): StrengthLogEntry | null {
  const matches = state.entries
    .filter((e) => e.exerciseId === exerciseId && e.date === date)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return matches[0] ?? null;
}

export function updateExerciseTechniqueNote(exerciseId: string, techniqueNote: string): StrengthState {
  return updateStrengthState((state) => ({
    ...state,
    exercises: state.exercises.map((exercise) =>
      exercise.id === exerciseId ? { ...exercise, techniqueNote } : exercise,
    ),
  }));
}

export function getExercise(state: StrengthState, exerciseId: string): StrengthExercise | null {
  return state.exercises.find((e) => e.id === exerciseId) ?? null;
}

export function entriesForExercise(
  state: StrengthState,
  exerciseId: string,
): StrengthLogEntry[] {
  return state.entries
    .filter((e) => e.exerciseId === exerciseId)
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function latestEntry(
  state: StrengthState,
  exerciseId: string,
): StrengthLogEntry | null {
  return entriesForExercise(state, exerciseId)[0] ?? null;
}

export function activeWorkouts(state: StrengthState) {
  return state.workouts.filter((w) => w.active).sort((a, b) => a.order - b.order);
}

export function exercisesForWorkout(state: StrengthState, workoutId: string) {
  return state.exercises
    .filter((e) => e.active && e.workoutId === workoutId)
    .sort((a, b) => a.order - b.order);
}

export function addWorkoutNote(note: Omit<StrengthWorkoutNote, 'id'>): StrengthState {
  return updateStrengthState((state) => ({
    ...state,
    workoutNotes: [{ ...note, id: newId('swn') }, ...state.workoutNotes],
  }));
}

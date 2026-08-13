import { todayDateKey } from '../physical/store';
import { activeExercises, exercisesForWorkout, entryForExerciseDate } from './store';
import type { StrengthExercise, StrengthState } from './types';

export const GROUP_PICKS_KEY = 'path-strength-group-picks-v1';

export type GroupPicksState = {
  date: string;
  /** Selected muscle groups keyed by suggested workout id. */
  byWorkout: Record<string, string[]>;
};

export function suggestedGroupsForWorkout(state: StrengthState, workoutId: string): string[] {
  const seen = new Set<string>();
  const groups: string[] = [];
  for (const exercise of exercisesForWorkout(state, workoutId)) {
    if (seen.has(exercise.muscleGroup)) continue;
    seen.add(exercise.muscleGroup);
    groups.push(exercise.muscleGroup);
  }
  return groups;
}

export function allActiveMuscleGroups(state: StrengthState): string[] {
  const seen = new Set<string>();
  const groups: string[] = [];
  for (const exercise of activeExercises(state)) {
    if (seen.has(exercise.muscleGroup)) continue;
    seen.add(exercise.muscleGroup);
    groups.push(exercise.muscleGroup);
  }
  return groups;
}

export function extraGroupsForWorkout(state: StrengthState, workoutId: string): string[] {
  const suggested = new Set(suggestedGroupsForWorkout(state, workoutId));
  return allActiveMuscleGroups(state).filter((group) => !suggested.has(group));
}

export function parseGroupsParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const groups: string[] = [];
  for (const part of raw.split(',')) {
    const group = decodeURIComponent(part.trim());
    if (!group || seen.has(group)) continue;
    seen.add(group);
    groups.push(group);
  }
  return groups;
}

export function serializeGroupsParam(groups: string[]): string {
  return groups.map((group) => encodeURIComponent(group)).join(',');
}

export function workoutHref(workoutId: string, groups: string[]): string {
  const suggested = groups;
  if (!suggested.length) return `/workouts?w=${workoutId}`;
  return `/workouts?w=${workoutId}&groups=${serializeGroupsParam(suggested)}`;
}

export function exercisesForGroups(
  state: StrengthState,
  groups: string[],
): StrengthExercise[] {
  if (!groups.length) return [];
  const wanted = new Set(groups);
  return activeExercises(state).filter((exercise) => wanted.has(exercise.muscleGroup));
}

export function exercisesForWorkoutGroups(
  state: StrengthState,
  workoutId: string,
  groups: string[],
): StrengthExercise[] {
  const selected = groups.length ? groups : suggestedGroupsForWorkout(state, workoutId);
  const wanted = new Set(selected);
  const inWorkout = exercisesForWorkout(state, workoutId).filter((exercise) =>
    wanted.has(exercise.muscleGroup),
  );
  const extras = activeExercises(state).filter(
    (exercise) =>
      exercise.workoutId !== workoutId && wanted.has(exercise.muscleGroup),
  );
  return [...inWorkout, ...extras];
}

export function muscleGroupLogProgress(
  state: StrengthState,
  exercises: StrengthExercise[],
  dateKey: string,
): { total: number; logged: number; allLogged: boolean } {
  const logged = exercises.filter((exercise) =>
    Boolean(entryForExerciseDate(state, exercise.id, dateKey)),
  ).length;
  return {
    total: exercises.length,
    logged,
    allLogged: exercises.length > 0 && logged === exercises.length,
  };
}

export function emptyGroupPicks(date = todayDateKey()): GroupPicksState {
  return { date, byWorkout: {} };
}

export function readGroupPicks(date = todayDateKey()): GroupPicksState {
  try {
    const raw = localStorage.getItem(GROUP_PICKS_KEY);
    if (!raw) return emptyGroupPicks(date);
    const parsed = JSON.parse(raw) as GroupPicksState;
    if (parsed.date !== date) return emptyGroupPicks(date);
    return {
      date,
      byWorkout: parsed.byWorkout ?? {},
    };
  } catch {
    return emptyGroupPicks(date);
  }
}

export function writeGroupPicks(state: GroupPicksState): void {
  localStorage.setItem(GROUP_PICKS_KEY, JSON.stringify(state));
}

export function selectedGroupsForWorkout(
  state: StrengthState,
  workoutId: string,
  picks: GroupPicksState,
): string[] {
  const saved = picks.byWorkout[workoutId];
  if (saved?.length) return saved.filter(Boolean);
  return suggestedGroupsForWorkout(state, workoutId);
}

export function toggleGroupInList(groups: string[], group: string): string[] {
  return groups.includes(group)
    ? groups.filter((item) => item !== group)
    : [...groups, group];
}

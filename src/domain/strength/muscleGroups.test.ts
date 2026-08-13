import { beforeEach, describe, expect, it } from 'vitest';
import { WORKOUT_1_ID, WORKOUT_2_ID, WORKOUT_3_ID } from './seed';
import {
  exercisesForWorkoutGroups,
  extraGroupsForWorkout,
  parseGroupsParam,
  selectedGroupsForWorkout,
  serializeGroupsParam,
  suggestedGroupsForWorkout,
  toggleGroupInList,
  workoutHref,
} from './muscleGroups';
import { readStrengthState, STRENGTH_STORE_KEY } from './store';

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      clear: () => map.clear(),
    },
  });
}

describe('muscle group session picks', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    localStorage.removeItem(STRENGTH_STORE_KEY);
  });

  it('suggests groups in workout order without duplicates', () => {
    const state = readStrengthState();
    expect(suggestedGroupsForWorkout(state, WORKOUT_1_ID)).toEqual([
      'Chest',
      'Triceps',
      'Core',
    ]);
    expect(suggestedGroupsForWorkout(state, WORKOUT_2_ID)).toEqual([
      'Back',
      'Shoulders',
      'Traps',
      'Biceps',
    ]);
    expect(suggestedGroupsForWorkout(state, WORKOUT_3_ID)).toEqual(['Legs']);
  });

  it('lets a session drop core and keep chest/triceps', () => {
    const state = readStrengthState();
    const exercises = exercisesForWorkoutGroups(state, WORKOUT_1_ID, ['Chest', 'Triceps']);
    expect(exercises.every((e) => e.muscleGroup !== 'Core')).toBe(true);
    expect(exercises.map((e) => e.muscleGroup)).toEqual([
      'Chest',
      'Chest',
      'Chest',
      'Triceps',
      'Triceps',
    ]);
  });

  it('can attach core to another workout', () => {
    const state = readStrengthState();
    const exercises = exercisesForWorkoutGroups(state, WORKOUT_2_ID, ['Back', 'Biceps', 'Core']);
    expect(exercises.some((e) => e.muscleGroup === 'Core')).toBe(true);
    expect(exercises.some((e) => e.muscleGroup === 'Back')).toBe(true);
    expect(exercises.some((e) => e.workoutId === WORKOUT_1_ID && e.muscleGroup === 'Core')).toBe(
      true,
    );
  });

  it('serializes groups for the workout URL', () => {
    expect(parseGroupsParam('Chest,Triceps')).toEqual(['Chest', 'Triceps']);
    expect(serializeGroupsParam(['Chest', 'Core'])).toBe('Chest,Core');
    expect(workoutHref(WORKOUT_1_ID, ['Chest', 'Triceps'])).toBe(
      `/workouts?w=${WORKOUT_1_ID}&groups=Chest,Triceps`,
    );
  });

  it('defaults to the suggested grouping until the user unchecks a group', () => {
    const state = readStrengthState();
    expect(selectedGroupsForWorkout(state, WORKOUT_1_ID, { date: '2026-08-12', byWorkout: {} })).toEqual(
      ['Chest', 'Triceps', 'Core'],
    );
    expect(
      selectedGroupsForWorkout(state, WORKOUT_1_ID, {
        date: '2026-08-12',
        byWorkout: { [WORKOUT_1_ID]: ['Chest', 'Triceps'] },
      }),
    ).toEqual(['Chest', 'Triceps']);
    expect(toggleGroupInList(['Chest', 'Triceps', 'Core'], 'Core')).toEqual(['Chest', 'Triceps']);
    expect(extraGroupsForWorkout(state, WORKOUT_1_ID)).toEqual(
      expect.arrayContaining(['Back', 'Legs']),
    );
  });
});

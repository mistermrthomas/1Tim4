import { beforeEach, describe, expect, it } from 'vitest';
import { recommendNextWeightLb } from './progression';
import { WORKOUT_1_ID, WORKOUT_2_ID } from './seed';
import {
  exercisesForWorkout,
  latestEntry,
  readStrengthState,
  STRENGTH_STORE_KEY,
  upsertStrengthLogEntry,
} from './store';

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

describe('strength log', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    localStorage.removeItem(STRENGTH_STORE_KEY);
  });

  it('seeds two active workouts and baseline history', () => {
    const state = readStrengthState();
    expect(state.workouts.filter((w) => w.active)).toHaveLength(2);
    expect(exercisesForWorkout(state, WORKOUT_1_ID)).toHaveLength(7);
    expect(exercisesForWorkout(state, WORKOUT_2_ID).map((e) => e.name)).toEqual([
      'Lat Pulldown',
      'Seated Row',
      'Rear Delt Fly',
      'Bowflex Shrug',
      'Bowflex Preacher Curl',
      'Dumbbell Twist Curl',
    ]);
    expect(state.exercises.find((e) => e.id === 'ex_dumbbell_shrug')?.active).toBe(false);
    expect(latestEntry(state, 'ex_flat_chest_press')?.weightLb).toBe(155);
    expect(latestEntry(state, 'ex_bowflex_shrug')).toBeNull();
  });

  it('recommends progression from difficulty', () => {
    expect(recommendNextWeightLb(110, 'easy', 5)).toBe(115);
    expect(recommendNextWeightLb(110, 'moderate', 5)).toBe(110);
    expect(recommendNextWeightLb(110, 'hard', 5)).toBe(110);
    expect(recommendNextWeightLb(110, 'max', 5)).toBe(105);
  });

  it('appends new log entries without losing history', () => {
    readStrengthState();
    upsertStrengthLogEntry({
      exerciseId: 'ex_flat_chest_press',
      workoutId: WORKOUT_1_ID,
      date: '2026-08-05',
      weightLb: 160,
      setCount: 3,
      reps: ['12', '10', '8'],
      difficulty: 'moderate',
      pain: 0,
      notes: 'Felt strong',
    });
    const state = readStrengthState();
    const entries = state.entries.filter((e) => e.exerciseId === 'ex_flat_chest_press');
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(latestEntry(state, 'ex_flat_chest_press')?.weightLb).toBe(160);
  });
});

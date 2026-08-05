import { beforeEach, describe, expect, it } from 'vitest';
import { recommendNextWeightLb } from './progression';
import { WORKOUT_1_ID, WORKOUT_2_ID } from './seed';
import {
  deleteStrengthLogEntry,
  exercisesForWorkout,
  latestEntry,
  readStrengthState,
  sessionDatesForWorkout,
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

  it('seeds three active workouts and baseline history', () => {
    const state = readStrengthState();
    expect(state.workouts.filter((w) => w.active)).toHaveLength(3);
    expect(exercisesForWorkout(state, WORKOUT_1_ID)).toHaveLength(7);
    expect(exercisesForWorkout(state, WORKOUT_2_ID).map((e) => e.name)).toEqual([
      'Lat Pulldown',
      'Seated Row',
      'Rear Delt Fly',
      'Shrug',
      'Preacher Curl',
      'Twist Curl',
    ]);
    expect(exercisesForWorkout(state, 'strength_workout_3').map((e) => e.name)).toEqual([
      'Squat',
      'Leg Extension',
      'Leg Curl',
      'Romanian Deadlift',
      'Standing Calf Raise',
      'Step-Up',
    ]);
    expect(exercisesForWorkout(state, WORKOUT_2_ID).find((e) => e.name === 'Shrug')?.equipment).toBe(
      'Bowflex',
    );
    expect(
      exercisesForWorkout(state, WORKOUT_2_ID).find((e) => e.name === 'Twist Curl')?.maxWeightLb,
    ).toBe(25);
    expect(
      exercisesForWorkout(state, WORKOUT_1_ID).find((e) => e.name === 'Flat Chest Press')
        ?.maxWeightLb,
    ).toBe(155);
    expect(state.exercises.find((e) => e.id === 'ex_dumbbell_shrug')?.active).toBe(false);
    expect(latestEntry(state, 'ex_flat_chest_press')?.weightLb).toBe(155);
    expect(latestEntry(state, 'ex_bowflex_shrug')).toBeNull();
  });

  it('recommends progression from difficulty and respects equipment max', () => {
    expect(recommendNextWeightLb(110, 'easy', 5)).toBe(115);
    expect(recommendNextWeightLb(110, 'moderate', 5)).toBe(110);
    expect(recommendNextWeightLb(110, 'hard', 5)).toBe(110);
    expect(recommendNextWeightLb(110, 'max', 5)).toBe(105);
    expect(recommendNextWeightLb(155, 'easy', 5, 155)).toBe(155);
    expect(recommendNextWeightLb(25, 'easy', 5, 25)).toBe(25);
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

  it('lists workout session dates oldest to newest and can delete an entry', () => {
    const state = readStrengthState();
    expect(sessionDatesForWorkout(state, WORKOUT_1_ID)).toEqual(['2026-08-03']);
    const entry = latestEntry(state, 'ex_flat_chest_press');
    expect(entry).toBeTruthy();
    const next = deleteStrengthLogEntry(entry!.id);
    expect(latestEntry(next, 'ex_flat_chest_press')).toBeNull();
    expect(latestEntry(next, 'ex_incline_chest_press')?.weightLb).toBe(155);
  });
});

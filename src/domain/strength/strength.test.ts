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
    expect(exercisesForWorkout(state, WORKOUT_1_ID)).toHaveLength(8);
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
    expect(state.exercises.find((e) => e.id === 'ex_incline_chest_press')?.active).toBe(false);
    expect(exercisesForWorkout(state, WORKOUT_1_ID).map((e) => e.name)).toEqual([
      'Flat Chest Press',
      'Chest Flyes',
      'Decline Chest Press',
      'Tricep Pushdown',
      'Overhead Tricep Extension',
      'Crunch',
      'Oblique Twist Left',
      'Oblique Twist Right',
    ]);
    expect(latestEntry(state, 'ex_oblique_twist_left')?.reps).toEqual(['12', '12', '12']);
    expect(latestEntry(state, 'ex_oblique_twist_right')?.reps).toEqual(['12', '12', '12']);
    expect(latestEntry(state, 'ex_flat_chest_press')?.weightLb).toBe(155);
    expect(latestEntry(state, 'ex_chest_fly')?.weightLb).toBe(155);
    expect(latestEntry(state, 'ex_chest_fly')?.reps).toEqual(['12', '12', '12']);
    expect(latestEntry(state, 'ex_bowflex_shrug')).toBeNull();
  });

  it('recommends progression from difficulty and respects equipment max', () => {
    expect(recommendNextWeightLb(110, 'easy', 5)).toBe(115);
    expect(recommendNextWeightLb(110, 'easy_moderate', 5)).toBe(110);
    expect(recommendNextWeightLb(110, 'moderate', 5)).toBe(110);
    expect(recommendNextWeightLb(110, 'moderate_hard', 5)).toBe(110);
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
    expect(latestEntry(next, 'ex_chest_fly')?.weightLb).toBe(155);
  });

  it('migrates incline press history to chest flyes on seed upgrade', () => {
    const seeded = readStrengthState();
    const inclineEntry = {
      ...seeded.entries.find((e) => e.exerciseId === 'ex_chest_fly')!,
      id: 'log_incline_legacy',
      exerciseId: 'ex_incline_chest_press',
    };
    localStorage.setItem(
      STRENGTH_STORE_KEY,
      JSON.stringify({
        ...seeded,
        seedVersion: 3,
        exercises: seeded.exercises.filter((e) => e.id !== 'ex_chest_fly'),
        entries: [
          ...seeded.entries.filter((e) => e.exerciseId !== 'ex_chest_fly'),
          inclineEntry,
        ],
      }),
    );
    const migrated = readStrengthState();
    expect(migrated.seedVersion).toBe(5);
    expect(exercisesForWorkout(migrated, WORKOUT_1_ID).some((e) => e.name === 'Chest Flyes')).toBe(
      true,
    );
    expect(latestEntry(migrated, 'ex_chest_fly')?.weightLb).toBe(155);
    expect(latestEntry(migrated, 'ex_incline_chest_press')).toBeNull();
    expect(latestEntry(migrated, 'ex_oblique_twist_left')?.weightLb).toBe(120);
    expect(latestEntry(migrated, 'ex_oblique_twist_right')?.weightLb).toBe(120);
  });
});

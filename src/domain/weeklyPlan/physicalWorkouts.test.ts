import { describe, expect, it } from 'vitest';
import type { CatalogTemplate } from '../physical/planCatalog';
import {
  addWorkoutToDay,
  moveWorkoutInDay,
  normalizePhysicalDay,
  removeWorkoutFromDay,
} from './physicalWorkouts';
import type { PhysicalDailyAssignment } from './types';

const templates: CatalogTemplate[] = [
  {
    id: 'tmpl_chest_triceps',
    name: 'Chest and Triceps',
    classification: 'primary',
    exercises: [{ exerciseId: 'a', sets: 3, reps: '12', load: 1, loadUnit: 'lb', note: '', cautionNote: '', order: 0 }],
  },
  {
    id: 'tmpl_core_finisher',
    name: 'Core Finisher',
    classification: 'finisher',
    estimatedDuration: '6–10 minutes',
    exercises: [{ exerciseId: 'b', sets: 3, reps: '12', load: null, loadUnit: 'lb', note: '', cautionNote: '', order: 0 }],
  },
];

function day(partial: Partial<PhysicalDailyAssignment> = {}): PhysicalDailyAssignment {
  return {
    id: 'd1',
    date: '2026-08-03',
    dayNumber: 2,
    type: 'workout',
    scheduledWorkouts: [],
    workoutTemplateId: null,
    workoutName: '',
    notes: '',
    isRequired: true,
    ...partial,
  };
}

describe('physicalWorkouts helpers', () => {
  it('migrates legacy single workoutTemplateId into a one-item array', () => {
    const normalized = normalizePhysicalDay(
      day({
        workoutTemplateId: 'tmpl_chest_triceps',
        scheduledWorkouts: undefined as unknown as [],
      }),
    );
    expect(normalized.scheduledWorkouts).toHaveLength(1);
    expect(normalized.scheduledWorkouts[0]?.workoutTemplateId).toBe('tmpl_chest_triceps');
  });

  it('adds, reorders, and removes workouts independently', () => {
    let next = addWorkoutToDay(day(), 'tmpl_chest_triceps', templates);
    next = addWorkoutToDay(next, 'tmpl_core_finisher', templates);
    expect(next.scheduledWorkouts.map((b) => b.workoutTemplateId)).toEqual([
      'tmpl_chest_triceps',
      'tmpl_core_finisher',
    ]);
    expect(next.workoutName).toContain('Core Finisher');

    const finisherId = next.scheduledWorkouts[1]!.id;
    next = moveWorkoutInDay(next, finisherId, -1, templates);
    expect(next.scheduledWorkouts.map((b) => b.workoutTemplateId)).toEqual([
      'tmpl_core_finisher',
      'tmpl_chest_triceps',
    ]);

    next = removeWorkoutFromDay(next, next.scheduledWorkouts[0]!.id, templates);
    expect(next.scheduledWorkouts).toHaveLength(1);
    expect(next.scheduledWorkouts[0]?.workoutTemplateId).toBe('tmpl_chest_triceps');
  });
});

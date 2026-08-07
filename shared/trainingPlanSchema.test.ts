import { describe, expect, it } from 'vitest';
import { safeParseTrainingPlan } from './trainingPlanSchema';

describe('trainingPlanSchema', () => {
  it('accepts a multi-block week with suggested additions empty', () => {
    const result = safeParseTrainingPlan({
      weeklyTrainingGoal: 'Build consistency with four strength sessions.',
      coachingSummary:
        'Based on last week’s completion, keep volume modest and protect the shoulder.',
      plannedTrainingDays: ['monday', 'wednesday', 'friday', 'saturday'],
      restDays: ['sunday', 'tuesday', 'thursday'],
      progressionApproach: 'Hold loads steady; add one clean rep when all sets succeed.',
      recoveryGuidance: 'Walk on rest days; keep Saturday lighter if sleep is poor.',
      workouts: [
        {
          day: 'monday',
          workoutName: 'Chest and Triceps',
          workoutType: 'primary',
          estimatedMinutes: 40,
          rationale: 'Primary upper push within time limit.',
          sourceTemplateId: 'tmpl_chest_triceps',
          exercises: [
            {
              exerciseCatalogId: 'bowflex_chest_press',
              exerciseName: 'Chest Press',
              equipment: 'Bowflex Xtreme 2 SE',
              sets: 3,
              repRange: '10-12',
              targetResistance: 155,
              resistanceUnit: 'lb',
              restSeconds: 90,
              progressionInstruction: 'Keep 155 if all reps are clean.',
              cautionNote: '',
            },
          ],
        },
        {
          day: 'monday',
          workoutName: 'Core Finisher',
          workoutType: 'finisher',
          estimatedMinutes: 8,
          rationale: 'Short core block after primary work.',
          sourceTemplateId: 'tmpl_core_finisher',
          exercises: [
            {
              exerciseCatalogId: 'bowflex_abdominal_crunch',
              exerciseName: 'Ab Crunch',
              equipment: 'Bowflex Xtreme 2 SE',
              sets: 3,
              repRange: '12-15',
              targetResistance: null,
              resistanceUnit: 'lb',
              restSeconds: 45,
              progressionInstruction: 'Stop shy of form breakdown.',
              cautionNote: '',
            },
          ],
        },
      ],
      suggestedCatalogAdditions: [],
    });
    expect(result.success).toBe(true);
  });
});

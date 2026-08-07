import { z } from 'zod';

const DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const WORKOUT_TYPES = [
  'primary',
  'accessory',
  'finisher',
  'mobility',
  'recovery',
  'cardio',
] as const;

const nonEmpty = (min: number, max: number) => z.string().trim().min(min).max(max);

export const trainingPlanExerciseSchema = z.object({
  exerciseCatalogId: nonEmpty(2, 80),
  exerciseName: nonEmpty(2, 120),
  equipment: nonEmpty(2, 80),
  sets: z.number().int().min(1).max(12),
  repRange: nonEmpty(1, 40),
  targetResistance: z.number().nullable().optional(),
  resistanceUnit: z.enum(['lb', 'kg', 'bw']).optional(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  progressionInstruction: nonEmpty(8, 280),
  cautionNote: z.string().trim().max(400).optional(),
});

export const trainingPlanWorkoutSchema = z.object({
  day: z.enum(DAYS),
  workoutName: nonEmpty(2, 120),
  workoutType: z.enum(WORKOUT_TYPES),
  estimatedMinutes: z.number().int().min(5).max(180),
  rationale: nonEmpty(12, 400),
  sourceTemplateId: z.string().trim().max(80).nullable().optional(),
  exercises: z.array(trainingPlanExerciseSchema).min(1).max(16),
});

export const suggestedCatalogAdditionSchema = z.object({
  proposedName: nonEmpty(2, 120),
  equipment: nonEmpty(2, 80),
  muscleGroups: z.array(nonEmpty(2, 40)).max(6).optional(),
  reason: nonEmpty(8, 280),
});

export const trainingPlanSchema = z.object({
  weeklyTrainingGoal: nonEmpty(8, 280),
  coachingSummary: nonEmpty(20, 900),
  plannedTrainingDays: z.array(z.enum(DAYS)).min(1).max(6),
  restDays: z.array(z.enum(DAYS)).max(7),
  progressionApproach: nonEmpty(12, 480),
  recoveryGuidance: nonEmpty(12, 480),
  workouts: z.array(trainingPlanWorkoutSchema).min(1).max(18),
  suggestedCatalogAdditions: z.array(suggestedCatalogAdditionSchema).max(8).optional(),
});

export type TrainingPlan = z.infer<typeof trainingPlanSchema>;
export type TrainingPlanWorkout = z.infer<typeof trainingPlanWorkoutSchema>;
export type TrainingPlanExercise = z.infer<typeof trainingPlanExerciseSchema>;

export const trainingPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'weeklyTrainingGoal',
    'coachingSummary',
    'plannedTrainingDays',
    'restDays',
    'progressionApproach',
    'recoveryGuidance',
    'workouts',
    'suggestedCatalogAdditions',
  ],
  properties: {
    weeklyTrainingGoal: { type: 'string' },
    coachingSummary: { type: 'string' },
    plannedTrainingDays: {
      type: 'array',
      items: { type: 'string', enum: [...DAYS] },
    },
    restDays: {
      type: 'array',
      items: { type: 'string', enum: [...DAYS] },
    },
    progressionApproach: { type: 'string' },
    recoveryGuidance: { type: 'string' },
    workouts: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'day',
          'workoutName',
          'workoutType',
          'estimatedMinutes',
          'rationale',
          'sourceTemplateId',
          'exercises',
        ],
        properties: {
          day: { type: 'string', enum: [...DAYS] },
          workoutName: { type: 'string' },
          workoutType: { type: 'string', enum: [...WORKOUT_TYPES] },
          estimatedMinutes: { type: 'integer' },
          rationale: { type: 'string' },
          sourceTemplateId: { type: ['string', 'null'] },
          exercises: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'exerciseCatalogId',
                'exerciseName',
                'equipment',
                'sets',
                'repRange',
                'targetResistance',
                'resistanceUnit',
                'restSeconds',
                'progressionInstruction',
                'cautionNote',
              ],
              properties: {
                exerciseCatalogId: { type: 'string' },
                exerciseName: { type: 'string' },
                equipment: { type: 'string' },
                sets: { type: 'integer' },
                repRange: { type: 'string' },
                targetResistance: { type: ['number', 'null'] },
                resistanceUnit: { type: 'string', enum: ['lb', 'kg', 'bw'] },
                restSeconds: { type: ['integer', 'null'] },
                progressionInstruction: { type: 'string' },
                cautionNote: { type: 'string' },
              },
            },
          },
        },
      },
    },
    suggestedCatalogAdditions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['proposedName', 'equipment', 'muscleGroups', 'reason'],
        properties: {
          proposedName: { type: 'string' },
          equipment: { type: 'string' },
          muscleGroups: { type: 'array', items: { type: 'string' } },
          reason: { type: 'string' },
        },
      },
    },
  },
} as const;

export function coerceTrainingPlanCandidate(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const plan = { ...(raw as Record<string, unknown>) };
  if (!Array.isArray(plan.suggestedCatalogAdditions)) {
    plan.suggestedCatalogAdditions = [];
  }
  if (Array.isArray(plan.workouts)) {
    plan.workouts = plan.workouts.map((w) => {
      if (!w || typeof w !== 'object') return w;
      const workout = { ...(w as Record<string, unknown>) };
      if (workout.sourceTemplateId === undefined) workout.sourceTemplateId = null;
      if (Array.isArray(workout.exercises)) {
        workout.exercises = workout.exercises.map((ex) => {
          if (!ex || typeof ex !== 'object') return ex;
          const row = { ...(ex as Record<string, unknown>) };
          if (row.targetResistance === undefined) row.targetResistance = null;
          if (row.resistanceUnit === undefined) row.resistanceUnit = 'lb';
          if (row.restSeconds === undefined || row.restSeconds === null) row.restSeconds = 60;
          if (row.cautionNote === undefined) row.cautionNote = '';
          return row;
        });
      }
      return workout;
    });
  }
  return plan;
}

export function parseTrainingPlan(data: unknown): TrainingPlan {
  return trainingPlanSchema.parse(coerceTrainingPlanCandidate(data));
}

export function safeParseTrainingPlan(data: unknown) {
  return trainingPlanSchema.safeParse(coerceTrainingPlanCandidate(data));
}

export { DAYS as TRAINING_PLAN_DAYS, WORKOUT_TYPES as TRAINING_WORKOUT_TYPES };

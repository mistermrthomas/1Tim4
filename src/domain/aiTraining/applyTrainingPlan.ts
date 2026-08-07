import type { TrainingPlan } from '../../../shared/trainingPlanSchema';
import { TRAINING_PLAN_DAYS } from '../../../shared/trainingPlanSchema';
import { newId } from '../physical/store';
import type {
  PhysicalDailyAssignment,
  ScheduledExerciseSpec,
  ScheduledWorkoutBlock,
  WeeklyPlan,
  WorkoutClassification,
} from '../weeklyPlan/types';

const DAY_NAME_TO_NUMBER: Record<string, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

function asClassification(value: string): WorkoutClassification {
  if (
    value === 'primary' ||
    value === 'accessory' ||
    value === 'finisher' ||
    value === 'mobility' ||
    value === 'recovery' ||
    value === 'cardio'
  ) {
    return value;
  }
  return 'primary';
}

function toExerciseSpecs(
  exercises: TrainingPlan['workouts'][number]['exercises'],
): ScheduledExerciseSpec[] {
  return exercises.map((ex, order) => ({
    exerciseId: ex.exerciseCatalogId,
    sets: ex.sets,
    reps: ex.repRange,
    load: ex.targetResistance ?? null,
    loadUnit: ex.resistanceUnit ?? (ex.targetResistance == null ? 'bw' : 'lb'),
    note: ex.progressionInstruction,
    cautionNote: ex.cautionNote ?? '',
    order,
    restSeconds: ex.restSeconds,
    progressionInstruction: ex.progressionInstruction,
  }));
}

/** Map a validated AI training plan onto PhysicalWeeklyPlan days. */
export function applyTrainingPlanToWeeklyPlan(
  plan: WeeklyPlan,
  ai: TrainingPlan,
  meta: { modelUsed: string; promptVersion: string },
): WeeklyPlan {
  const byDay = new Map<number, ScheduledWorkoutBlock[]>();

  for (const workout of ai.workouts) {
    const dayNumber = DAY_NAME_TO_NUMBER[workout.day];
    if (!dayNumber) continue;
    const block: ScheduledWorkoutBlock = {
      id: newId('sw'),
      workoutTemplateId: workout.sourceTemplateId ?? null,
      order: byDay.get(dayNumber)?.length ?? 0,
      workoutName: workout.workoutName,
      classification: asClassification(workout.workoutType),
      estimatedMinutes: workout.estimatedMinutes,
      rationale: workout.rationale,
      exercises: toExerciseSpecs(workout.exercises),
    };
    const list = byDay.get(dayNumber) ?? [];
    list.push(block);
    byDay.set(dayNumber, list);
  }

  const restDayNumbers = new Set(
    ai.restDays.map((d) => DAY_NAME_TO_NUMBER[d]).filter((n): n is number => Boolean(n)),
  );

  const days: PhysicalDailyAssignment[] = plan.physical.days.map((day) => {
    const blocks = (byDay.get(day.dayNumber) ?? []).map((b, order) => ({ ...b, order }));
    if (blocks.length > 0) {
      return {
        ...day,
        type: blocks.every((b) => b.classification === 'recovery') ? 'recovery' : 'workout',
        scheduledWorkouts: blocks,
        workoutTemplateId: blocks[0]?.workoutTemplateId ?? null,
        workoutName: blocks.map((b) => b.workoutName || 'Workout').join(' + '),
        isRequired: true,
        notes: blocks
          .map((b) => b.rationale)
          .filter(Boolean)
          .join(' '),
      };
    }
    if (restDayNumbers.has(day.dayNumber) || day.dayNumber === 7) {
      return {
        ...day,
        type: 'rest',
        scheduledWorkouts: [],
        workoutTemplateId: null,
        workoutName: day.dayNumber === 7 ? 'Sabbath / Full Rest' : 'Rest',
        isRequired: false,
        notes: day.dayNumber === 7 ? 'Rest from structured training.' : ai.recoveryGuidance,
      };
    }
    return {
      ...day,
      type: 'unscheduled',
      scheduledWorkouts: [],
      workoutTemplateId: null,
      workoutName: '',
      isRequired: false,
      notes: '',
    };
  });

  const plannedCount = ai.plannedTrainingDays.length || ai.workouts.length;

  return {
    ...plan,
    physical: {
      ...plan.physical,
      desiredWorkoutCount: Math.min(6, Math.max(3, plannedCount)),
      days,
      approved: false,
      aiProposal: ai,
      aiMeta: {
        generationSource: 'ai',
        generatedAt: new Date().toISOString(),
        promptVersion: meta.promptVersion,
        modelUsed: meta.modelUsed,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function trainingDayLabel(day: (typeof TRAINING_PLAN_DAYS)[number]): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

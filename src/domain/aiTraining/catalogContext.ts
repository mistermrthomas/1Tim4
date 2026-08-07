/** Compact catalog / history payload for the training-plan AI. */

import { addDays } from '../calendar/week';
import { readPhysicalPlan } from '../physical/planCatalog';
import { buildTrainingWeekSummaryFromHistory } from '../physical/trainingWeekSummary';
import type { TrainingCoachingIntake } from '../weeklyPlan/types';

export function buildTrainingCatalogContext(weekStartDate: string) {
  const plan = readPhysicalPlan();
  const priorStart = addDays(weekStartDate, -7);
  const priorSummary = buildTrainingWeekSummaryFromHistory(priorStart);

  const equipment = [...new Set(plan.exercises.map((e) => e.equipment).filter(Boolean))];

  const exercises = plan.exercises
    .filter((e) => !e.avoidAutoSchedule)
    .map((e) => ({
      id: e.id,
      name: e.name,
      equipment: e.equipment,
      muscleGroups: e.muscleGroups,
      defaultLoad: e.defaultLoad,
      defaultLoadUnit: e.defaultLoadUnit,
      defaultSets: e.defaultSets,
      defaultReps: e.defaultReps,
      cautionNote: e.cautionNote || undefined,
      useCautiously: e.useCautiously || undefined,
      needsWorkingWeight: e.needsWorkingWeight || undefined,
    }));

  const templates = plan.templates.map((t) => ({
    id: t.id,
    name: t.name,
    classification: t.classification ?? 'primary',
    estimatedDuration: t.estimatedDuration,
    exerciseIds: t.exercises.map((e) => e.exerciseId),
    exerciseCount: t.exercises.length,
  }));

  return {
    equipment,
    exercises,
    templates,
    priorWeekSummary: priorSummary,
    targets: {
      steps: plan.targets.steps,
      proteinG: plan.targets.proteinG,
      waterOz: plan.targets.waterOz,
    },
  };
}

export function intakeReadyForGeneration(intake: TrainingCoachingIntake): boolean {
  if (!intake.primaryGoal) return false;
  if (![3, 4, 5, 6].includes(intake.trainingDaysCount)) return false;
  if (intake.minutesPerWorkout < 15 || intake.minutesPerWorkout > 120) return false;
  if (intake.preferredDays.length < 1) return false;
  return true;
}

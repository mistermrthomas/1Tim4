/** Helpers for multi-workout physical day assignments. */

import { newId } from '../physical/store';
import type { CatalogTemplate } from '../physical/planCatalog';
import type { PhysicalDailyAssignment, ScheduledWorkoutBlock, WorkoutClassification } from './types';

export function classificationLabel(kind: WorkoutClassification | undefined): string {
  switch (kind) {
    case 'primary':
      return 'Primary';
    case 'accessory':
      return 'Accessory';
    case 'finisher':
      return 'Finisher';
    case 'mobility':
      return 'Mobility';
    case 'recovery':
      return 'Recovery';
    case 'cardio':
      return 'Cardio';
    default:
      return 'Workout';
  }
}

export function templateClassification(template: CatalogTemplate | undefined): WorkoutClassification {
  return template?.classification ?? 'primary';
}

export function makeScheduledWorkout(
  workoutTemplateId: string,
  order: number,
  templates?: CatalogTemplate[],
): ScheduledWorkoutBlock {
  const tmpl = templates?.find((t) => t.id === workoutTemplateId);
  return {
    id: newId('sw'),
    workoutTemplateId,
    order,
    workoutName: tmpl?.name,
    classification: tmpl?.classification,
    exercises: tmpl?.exercises.map((row, i) => ({
      exerciseId: row.exerciseId,
      sets: row.sets,
      reps: row.reps,
      load: row.load,
      loadUnit: row.loadUnit,
      note: row.note,
      cautionNote: row.cautionNote,
      order: i,
    })),
  };
}

function blockIsSchedulable(block: ScheduledWorkoutBlock): boolean {
  return Boolean(block.workoutTemplateId) || (Array.isArray(block.exercises) && block.exercises.length > 0);
}

function blockDisplayName(block: ScheduledWorkoutBlock, templates: CatalogTemplate[]): string {
  if (block.workoutName?.trim()) return block.workoutName.trim();
  if (block.workoutTemplateId) {
    return templates.find((t) => t.id === block.workoutTemplateId)?.name ?? 'Workout';
  }
  return 'Workout';
}

/** Normalize legacy single-template days into ordered scheduledWorkouts. */
export function normalizePhysicalDay(day: PhysicalDailyAssignment): PhysicalDailyAssignment {
  const existing = Array.isArray(day.scheduledWorkouts) ? day.scheduledWorkouts : null;
  let scheduledWorkouts: ScheduledWorkoutBlock[];

  if (existing && existing.length > 0) {
    scheduledWorkouts = existing
      .map((block, index) => ({
        ...block,
        id: block.id || newId('sw'),
        workoutTemplateId: block.workoutTemplateId ?? null,
        order: typeof block.order === 'number' ? block.order : index,
      }))
      .filter(blockIsSchedulable)
      .sort((a, b) => a.order - b.order)
      .map((block, index) => ({ ...block, order: index }));
  } else if (day.workoutTemplateId) {
    scheduledWorkouts = [makeScheduledWorkout(day.workoutTemplateId, 0)];
  } else {
    scheduledWorkouts = [];
  }

  const primaryId = scheduledWorkouts[0]?.workoutTemplateId ?? null;
  return {
    ...day,
    scheduledWorkouts,
    workoutTemplateId: primaryId,
  };
}

export function physicalDayWorkoutNames(
  day: PhysicalDailyAssignment,
  templates: CatalogTemplate[],
): string {
  const normalized = normalizePhysicalDay(day);
  if (!normalized.scheduledWorkouts.length) {
    return day.workoutName || '';
  }
  return normalized.scheduledWorkouts.map((block) => blockDisplayName(block, templates)).join(' + ');
}

export function setDayWorkouts(
  day: PhysicalDailyAssignment,
  blocks: ScheduledWorkoutBlock[],
  templates: CatalogTemplate[],
): PhysicalDailyAssignment {
  const scheduledWorkouts = blocks
    .filter(blockIsSchedulable)
    .map((block, index) => ({ ...block, order: index }));
  const workoutName = physicalDayWorkoutNames(
    { ...day, scheduledWorkouts, workoutTemplateId: scheduledWorkouts[0]?.workoutTemplateId ?? null },
    templates,
  );
  return {
    ...day,
    scheduledWorkouts,
    workoutTemplateId: scheduledWorkouts[0]?.workoutTemplateId ?? null,
    workoutName,
    type: scheduledWorkouts.length > 0 ? (day.type === 'recovery' ? 'recovery' : 'workout') : day.type === 'workout' ? 'unscheduled' : day.type,
    isRequired: scheduledWorkouts.length > 0 ? day.isRequired || day.type === 'workout' : false,
  };
}

export function addWorkoutToDay(
  day: PhysicalDailyAssignment,
  workoutTemplateId: string,
  templates: CatalogTemplate[],
): PhysicalDailyAssignment {
  const normalized = normalizePhysicalDay(day);
  if (normalized.scheduledWorkouts.some((b) => b.workoutTemplateId === workoutTemplateId)) {
    return normalized;
  }
  const next = [
    ...normalized.scheduledWorkouts,
    makeScheduledWorkout(workoutTemplateId, normalized.scheduledWorkouts.length, templates),
  ];
  return setDayWorkouts(
    { ...normalized, type: 'workout', isRequired: true },
    next,
    templates,
  );
}

export function removeWorkoutFromDay(
  day: PhysicalDailyAssignment,
  scheduledWorkoutId: string,
  templates: CatalogTemplate[],
): PhysicalDailyAssignment {
  const normalized = normalizePhysicalDay(day);
  const next = normalized.scheduledWorkouts.filter((b) => b.id !== scheduledWorkoutId);
  return setDayWorkouts(normalized, next, templates);
}

export function moveWorkoutInDay(
  day: PhysicalDailyAssignment,
  scheduledWorkoutId: string,
  direction: -1 | 1,
  templates: CatalogTemplate[],
): PhysicalDailyAssignment {
  const normalized = normalizePhysicalDay(day);
  const index = normalized.scheduledWorkouts.findIndex((b) => b.id === scheduledWorkoutId);
  if (index < 0) return normalized;
  const target = index + direction;
  if (target < 0 || target >= normalized.scheduledWorkouts.length) return normalized;
  const next = [...normalized.scheduledWorkouts];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item!);
  return setDayWorkouts(normalized, next, templates);
}

import {
  readPhysicalPlan,
  writePhysicalPlan,
  type WeekSchedule,
  type WeekScheduleSlot,
} from '../physical/planCatalog';
import { activateWeeklyPlan, saveWeeklyPlan } from './store';
import { normalizePhysicalDay } from './physicalWorkouts';
import type { WeeklyPlan } from './types';

/** Map PATH dayNumber (1=Sun) → JS weekday key for planCatalog. */
function weekdayKeyFromDayNumber(dayNumber: number): string {
  return String(dayNumber - 1);
}

/** Push approved physical assignments into the existing workout schedule. */
export function syncPhysicalScheduleFromWeeklyPlan(plan: WeeklyPlan): void {
  const catalog = readPhysicalPlan();
  const schedule: WeekSchedule = { ...catalog.weekSchedule };

  for (const day of plan.physical.days) {
    const key = weekdayKeyFromDayNumber(day.dayNumber);
    const normalized = normalizePhysicalDay(day);
    const hasBlocks = normalized.scheduledWorkouts.length > 0;
    if (
      (day.type === 'workout' || day.type === 'recovery' || day.type === 'optional_movement') &&
      hasBlocks
    ) {
      const slots: WeekScheduleSlot[] = normalized.scheduledWorkouts.map((block) => ({
        id: block.id,
        workoutTemplateId: block.workoutTemplateId,
        order: block.order,
        workoutName: block.workoutName,
        classification: block.classification,
        estimatedMinutes: block.estimatedMinutes,
        rationale: block.rationale,
        exercises: block.exercises,
      }));
      schedule[key] = slots;
    } else {
      schedule[key] = [];
    }
  }

  writePhysicalPlan({
    ...catalog,
    weekSchedule: schedule,
    targets: {
      ...catalog.targets,
    },
  });
}

export async function activateAndSyncWeeklyPlan(plan: WeeklyPlan): Promise<WeeklyPlan> {
  const saved = await saveWeeklyPlan(plan);
  const activated = await activateWeeklyPlan(saved.id);
  syncPhysicalScheduleFromWeeklyPlan(activated);
  return activated;
}

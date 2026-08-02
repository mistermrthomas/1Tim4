import { readPhysicalPlan, writePhysicalPlan, type WeekSchedule } from '../physical/planCatalog';
import { activateWeeklyPlan, saveWeeklyPlan } from './store';
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
    if (day.type === 'workout' && day.workoutTemplateId) {
      schedule[key] = day.workoutTemplateId;
    } else {
      schedule[key] = null;
    }
  }

  writePhysicalPlan({
    ...catalog,
    weekSchedule: schedule,
    targets: {
      ...catalog.targets,
      // keep existing targets; workout count is informational
    },
  });
}

export async function activateAndSyncWeeklyPlan(plan: WeeklyPlan): Promise<WeeklyPlan> {
  const saved = await saveWeeklyPlan(plan);
  const activated = await activateWeeklyPlan(saved.id);
  syncPhysicalScheduleFromWeeklyPlan(activated);
  return activated;
}

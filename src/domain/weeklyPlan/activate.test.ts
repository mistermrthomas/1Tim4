import { beforeEach, describe, expect, it } from 'vitest';
import { readPhysicalPlan } from '../physical/planCatalog';
import { syncPhysicalScheduleFromWeeklyPlan } from './activate';
import { buildDraftWeeklyPlan, suggestPhysicalSchedule } from './factory';
import { addWorkoutToDay, normalizePhysicalDay } from './physicalWorkouts';

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
      clear: () => map.clear(),
    },
  });
}

describe('activate weekly plan physical sync', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it('maps workout templates onto planCatalog weekday keys and clears Sabbath', () => {
    let plan = buildDraftWeeklyPlan('2026-08-02');
    plan = suggestPhysicalSchedule(plan);
    const sunday = plan.physical.days.find((d) => d.dayNumber === 1);
    expect(sunday?.type).toBe('workout');
    expect(sunday?.workoutTemplateId).toBeTruthy();
    expect(normalizePhysicalDay(sunday!).scheduledWorkouts.length).toBeGreaterThanOrEqual(1);

    syncPhysicalScheduleFromWeeklyPlan(plan);
    const schedule = readPhysicalPlan().weekSchedule;
    expect(schedule['6']).toEqual([]); // Saturday
    expect(schedule['0']?.[0]?.workoutTemplateId).toBe(sunday!.workoutTemplateId);
  });

  it('syncs multiple workouts for a day in order', () => {
    let plan = buildDraftWeeklyPlan('2026-08-02');
    plan = suggestPhysicalSchedule(plan);
    const templates = readPhysicalPlan().templates;
    const mondayIndex = plan.physical.days.findIndex((d) => d.dayNumber === 2);
    expect(mondayIndex).toBeGreaterThanOrEqual(0);
    const monday = plan.physical.days[mondayIndex]!;
    const withFinisher = addWorkoutToDay(monday, 'tmpl_core_finisher', templates);
    plan = {
      ...plan,
      physical: {
        ...plan.physical,
        days: plan.physical.days.map((d, i) => (i === mondayIndex ? withFinisher : d)),
      },
    };

    syncPhysicalScheduleFromWeeklyPlan(plan);
    const mondaySlots = readPhysicalPlan().weekSchedule['1'] ?? [];
    expect(mondaySlots.length).toBeGreaterThanOrEqual(2);
    expect(mondaySlots.map((s) => s.workoutTemplateId)).toContain('tmpl_core_finisher');
    expect(mondaySlots.every((s, i) => s.order === i)).toBe(true);
  });
});

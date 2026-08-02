import { beforeEach, describe, expect, it } from 'vitest';
import { readPhysicalPlan } from '../physical/planCatalog';
import { syncPhysicalScheduleFromWeeklyPlan } from './activate';
import { buildDraftWeeklyPlan, suggestPhysicalSchedule } from './factory';

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

    syncPhysicalScheduleFromWeeklyPlan(plan);
    const schedule = readPhysicalPlan().weekSchedule;
    expect(schedule['6']).toBeNull(); // Saturday
    expect(schedule['0']).toBe(sunday!.workoutTemplateId);
  });
});

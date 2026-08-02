import { beforeEach, describe, expect, it } from 'vitest';
import { CATALOG_SEED_VERSION } from '../demo/demoIds';
import {
  buildDefaultPhysicalPlan,
  emptyWeekSchedule,
  migratePhysicalPlanCatalog,
  PHYSICAL_PLAN_KEY,
  readPhysicalPlan,
  resolveTodaysPrescription,
} from './planCatalog';

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

describe('physical plan catalog seed', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it('seeds exercises with known Bowflex loads and empty week schedule', () => {
    const plan = buildDefaultPhysicalPlan();
    expect(plan.catalogSeedVersion).toBe(CATALOG_SEED_VERSION);
    expect(plan.weekSchedule).toEqual(emptyWeekSchedule());
    const chest = plan.exercises.find((e) => e.id === 'bowflex_chest_press');
    expect(chest?.defaultLoad).toBe(155);
    expect(chest?.defaultSets).toBe(3);
    const incline = plan.exercises.find((e) => e.id === 'bowflex_incline_chest_press');
    expect(incline?.useCautiously).toBe(true);
    expect(incline?.cautionNote.length).toBeGreaterThan(20);
    expect(plan.exercises.some((e) => /shoulder press/i.test(e.name))).toBe(false);
    expect(plan.exercises.some((e) => /lateral/i.test(e.name))).toBe(false);
  });

  it('does not assign a workout on Today from catalog alone', () => {
    readPhysicalPlan();
    expect(resolveTodaysPrescription(new Date(2026, 7, 2, 12))).toBeNull();
  });

  it('clears demo schedules when migrating from seed v1', () => {
    const migrated = migratePhysicalPlanCatalog({
      version: 1,
      catalogSeedVersion: 1,
      weekSchedule: {
        '0': null,
        '1': 'tmpl_chest_triceps',
        '2': 'tmpl_back_biceps',
        '3': 'tmpl_lower_body',
        '4': 'tmpl_full_body',
        '5': 'tmpl_chest_triceps',
        '6': 'tmpl_chest_triceps',
      },
      exercises: [],
      templates: [],
      targets: buildDefaultPhysicalPlan().targets,
    });
    expect(migrated.weekSchedule).toEqual(emptyWeekSchedule());
    expect(migrated.exercises.length).toBeGreaterThan(20);
    localStorage.setItem(PHYSICAL_PLAN_KEY, JSON.stringify(migrated));
    expect(readPhysicalPlan().weekSchedule['1']).toBeNull();
  });
});

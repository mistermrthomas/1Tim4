import { beforeEach, describe, expect, it } from 'vitest';
import { CATALOG_SEED_VERSION } from '../demo/demoIds';
import {
  buildDefaultPhysicalPlan,
  emptyWeekSchedule,
  migratePhysicalPlanCatalog,
  normalizeWeekDaySlots,
  PHYSICAL_PLAN_KEY,
  readPhysicalPlan,
  resolveTodaysPrescription,
  resolveTodaysPrescriptions,
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

  it('keeps core exercise library rows but retires programmed templates', () => {
    const plan = buildDefaultPhysicalPlan();
    const crunch = plan.exercises.filter((e) => /ab crunch|abdominal crunch/i.test(e.name));
    expect(crunch).toHaveLength(1);
    expect(crunch[0]?.name).toBe('Ab Crunch');
    expect(plan.exercises.some((e) => e.name === 'Oblique Twist — Left')).toBe(true);
    expect(plan.exercises.some((e) => e.name === 'Oblique Twist — Right')).toBe(true);
    const finisher = plan.templates.find((t) => t.id === 'tmpl_core_finisher');
    expect(finisher?.classification).toBe('finisher');
    expect(finisher?.exercises).toHaveLength(0);
    expect(finisher?.name).toMatch(/Retired/i);
  });

  it('does not assign a workout on Today from catalog alone', () => {
    readPhysicalPlan();
    expect(resolveTodaysPrescription(new Date(2026, 7, 2, 12))).toBeNull();
    expect(resolveTodaysPrescriptions(new Date(2026, 7, 2, 12))).toEqual([]);
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
      } as never,
      exercises: [],
      templates: [],
      targets: buildDefaultPhysicalPlan().targets,
    });
    expect(migrated.weekSchedule).toEqual(emptyWeekSchedule());
    expect(migrated.exercises.length).toBeGreaterThan(20);
    localStorage.setItem(PHYSICAL_PLAN_KEY, JSON.stringify(migrated));
    expect(readPhysicalPlan().weekSchedule['1']).toEqual([]);
  });

  it('preserves and reshapes v2 single-template schedules into ordered slots', () => {
    const migrated = migratePhysicalPlanCatalog({
      version: 1,
      catalogSeedVersion: 2,
      weekSchedule: {
        '0': 'tmpl_chest_triceps',
        '1': null,
        '2': [],
        '3': ['tmpl_lower_body', 'tmpl_core_finisher'],
        '4': null,
        '5': null,
        '6': null,
      } as never,
      exercises: [],
      templates: [],
      targets: buildDefaultPhysicalPlan().targets,
    });
    expect(migrated.weekSchedule['0']).toHaveLength(1);
    expect(migrated.weekSchedule['0']![0]?.workoutTemplateId).toBe('tmpl_chest_triceps');
    expect(migrated.weekSchedule['3']).toHaveLength(2);
    expect(migrated.weekSchedule['3']!.map((s) => s.workoutTemplateId)).toEqual([
      'tmpl_lower_body',
      'tmpl_core_finisher',
    ]);
    expect(migrated.templates.some((t) => t.id === 'tmpl_core_finisher')).toBe(true);
  });

  it('normalizes legacy string day values', () => {
    const slots = normalizeWeekDaySlots('tmpl_chest_triceps', '1');
    expect(slots).toHaveLength(1);
    expect(slots[0]?.workoutTemplateId).toBe('tmpl_chest_triceps');
    expect(normalizeWeekDaySlots(null)).toEqual([]);
  });
});

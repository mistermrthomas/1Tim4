import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetWeeklyPlanMemoryForTests,
  activateWeeklyPlan,
  ensureWeeklyPlan,
  getActiveWeeklyPlan,
  getWeeklyPlan,
} from './store';

describe('weekly plan store', () => {
  beforeEach(() => {
    __resetWeeklyPlanMemoryForTests();
  });

  it('ensures a draft plan per week start', async () => {
    const plan = await ensureWeeklyPlan('2026-08-02');
    expect(plan.weekStartDate).toBe('2026-08-02');
    expect(plan.weekEndDate).toBe('2026-08-08');
    expect(plan.status).toBe('draft');
    expect(plan.biblical.days).toHaveLength(7);
    expect(plan.physical.days[6]?.type).toBe('rest');
  });

  it('allows only one active plan', async () => {
    const a = await ensureWeeklyPlan('2026-08-02');
    const b = await ensureWeeklyPlan('2026-08-09');
    await activateWeeklyPlan(a.id);
    await activateWeeklyPlan(b.id);
    const active = await getActiveWeeklyPlan();
    expect(active?.id).toBe(b.id);
    expect(active?.weekStartDate).toBe('2026-08-09');
    const prior = await getWeeklyPlan(a.id);
    expect(prior?.status).toBe('archived');
  });

  it('finds this week’s draft on Monday when nothing is activated yet', async () => {
    const { getPlanCoveringDate } = await import('./store');
    const draft = await ensureWeeklyPlan('2026-08-02');
    expect(draft.status).toBe('draft');
    const monday = await getPlanCoveringDate('2026-08-03');
    expect(monday?.id).toBe(draft.id);
    expect(monday?.weekStartDate).toBe('2026-08-02');
  });

  it('prefers the active plan that covers the date', async () => {
    const { getPlanCoveringDate } = await import('./store');
    const draft = await ensureWeeklyPlan('2026-08-02');
    await activateWeeklyPlan(draft.id);
    const monday = await getPlanCoveringDate('2026-08-03');
    expect(monday?.status).toBe('active');
    expect(monday?.id).toBe(draft.id);
  });
});

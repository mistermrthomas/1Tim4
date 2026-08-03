import { describe, expect, it } from 'vitest';
import { buildDraftWeeklyPlan } from './factory';
import { deriveWeeklySetup } from './setupStatus';

describe('deriveWeeklySetup', () => {
  it('starts with all tracks not_started for a fresh draft', () => {
    const plan = buildDraftWeeklyPlan('2026-08-02');
    const setup = deriveWeeklySetup(plan);
    expect(setup.biblicalComplete).toBe(false);
    expect(setup.trainingComplete).toBe(false);
    expect(setup.workComplete).toBe(false);
    expect(setup.canActivate).toBe(false);
    expect(setup.items[0]?.status).toBe('not_started');
  });

  it('marks biblical complete when notes, theme, and approval exist', () => {
    let plan = buildDraftWeeklyPlan('2026-08-02');
    plan = {
      ...plan,
      church: {
        ...plan.church,
        sermonNotes:
          'The sermon called us to renew our minds and refuse conformed patterns of distraction.',
        sermonTitle: 'Renewed Attention',
      },
      biblical: {
        ...plan.biblical,
        weeklyTheme: 'Transforming Our Lives Through Attention',
        weeklyPractice: 'Remove one distraction before Bible reading.',
        approved: true,
      },
    };
    const setup = deriveWeeklySetup(plan);
    expect(setup.biblicalComplete).toBe(true);
    expect(setup.items[0]?.status).toBe('complete');
    expect(setup.items[0]?.summary).toBe('Transforming Our Lives Through Attention');
  });

  it('summarizes completed work as outcome count, not goal titles', () => {
    let plan = buildDraftWeeklyPlan('2026-08-02');
    plan = {
      ...plan,
      work: {
        ...plan.work,
        approved: true,
        weeklyOutcomes: [
          { id: 'w1', title: 'Ship onboarding polish', order: 0 },
          { id: 'w2', title: 'Close Q3 forecast', order: 1 },
          { id: 'w3', title: 'Mentor review', order: 2 },
        ],
      },
    };
    const setup = deriveWeeklySetup(plan);
    expect(setup.workComplete).toBe(true);
    expect(setup.items[2]?.summary).toBe('3 weekly outcomes');
    expect(setup.items[2]?.summary).not.toContain('Ship');
  });
});

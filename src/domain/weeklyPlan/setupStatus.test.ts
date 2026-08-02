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
    expect(setup.items[0]?.summary).toContain('Attention');
  });
});

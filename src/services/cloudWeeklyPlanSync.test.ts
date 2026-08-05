import { describe, expect, it } from 'vitest';
import { buildDraftWeeklyPlan } from '../domain/weeklyPlan/factory';
import { shouldReplaceLocalWeeklyPlanWithCloud } from './cloudWeeklyPlanSync';

describe('shouldReplaceLocalWeeklyPlanWithCloud', () => {
  it('replaces empty local draft with meaningful cloud plan', () => {
    const local = buildDraftWeeklyPlan('2026-08-02');
    const cloud = {
      ...buildDraftWeeklyPlan('2026-08-02'),
      church: {
        ...buildDraftWeeklyPlan('2026-08-02').church,
        sermonNotes: 'A full paragraph of sermon notes about obedience and grace.',
        sermonTitle: 'Grace That Trains',
      },
      updatedAt: '2026-08-05T12:00:00.000Z',
    };
    expect(
      shouldReplaceLocalWeeklyPlanWithCloud(local, cloud, '2026-08-05T12:00:00.000Z'),
    ).toBe(true);
  });

  it('does not replace meaningful local with empty cloud', () => {
    const local = {
      ...buildDraftWeeklyPlan('2026-08-02'),
      church: {
        ...buildDraftWeeklyPlan('2026-08-02').church,
        sermonNotes: 'Local notes that matter for discipleship this week together.',
      },
      updatedAt: '2026-08-05T12:00:00.000Z',
    };
    const cloud = buildDraftWeeklyPlan('2026-08-02');
    expect(
      shouldReplaceLocalWeeklyPlanWithCloud(local, cloud, '2026-08-05T18:00:00.000Z'),
    ).toBe(false);
  });

  it('prefers newer updatedAt when both sides have content', () => {
    const base = buildDraftWeeklyPlan('2026-08-02');
    const notes = 'Shared meaningful sermon notes for the week of training.';
    const local = {
      ...base,
      church: { ...base.church, sermonNotes: notes },
      updatedAt: '2026-08-05T10:00:00.000Z',
    };
    const cloud = {
      ...base,
      church: { ...base.church, sermonNotes: `${notes} Edited on device B.` },
      updatedAt: '2026-08-05T15:00:00.000Z',
    };
    expect(
      shouldReplaceLocalWeeklyPlanWithCloud(local, cloud, '2026-08-05T15:00:00.000Z'),
    ).toBe(true);
  });
});

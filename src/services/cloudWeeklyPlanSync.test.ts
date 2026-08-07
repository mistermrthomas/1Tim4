import { describe, expect, it } from 'vitest';
import { buildDraftWeeklyPlan } from '../domain/weeklyPlan/factory';
import {
  pickNewestCloudRowPerWeek,
  shouldReplaceLocalWeeklyPlanWithCloud,
  type CloudWeeklyPlanRow,
} from './cloudWeeklyPlanSync';

function cloudRow(
  overrides: Partial<CloudWeeklyPlanRow> & Pick<CloudWeeklyPlanRow, 'profile_id' | 'week_start_date' | 'updated_at'>,
): CloudWeeklyPlanRow {
  const plan = buildDraftWeeklyPlan(overrides.week_start_date);
  return {
    week_end_date: plan.weekEndDate,
    plan_id: plan.id,
    status: plan.status,
    payload: plan,
    activated_at: null,
    revision: 1,
    ...overrides,
  };
}

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

describe('pickNewestCloudRowPerWeek', () => {
  it('keeps the newest row when the same week exists under different profile ids', () => {
    const older = cloudRow({
      profile_id: 'phone-profile',
      week_start_date: '2026-08-02',
      updated_at: '2026-08-05T10:00:00.000Z',
    });
    const newer = cloudRow({
      profile_id: 'computer-profile',
      week_start_date: '2026-08-02',
      updated_at: '2026-08-05T18:00:00.000Z',
    });
    const otherWeek = cloudRow({
      profile_id: 'computer-profile',
      week_start_date: '2026-07-26',
      updated_at: '2026-07-28T12:00:00.000Z',
    });

    const picked = pickNewestCloudRowPerWeek([older, newer, otherWeek]);
    expect(picked).toHaveLength(2);
    expect(picked.find((r) => r.week_start_date === '2026-08-02')?.profile_id).toBe(
      'computer-profile',
    );
  });
});

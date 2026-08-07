import { describe, expect, it } from 'vitest';
import type { ChurchNotesSnapshot } from '../domain/churchNotes/store';
import type { WeeklyPlansSnapshot } from '../domain/weeklyPlan/store';
import { buildDraftWeeklyPlan } from '../domain/weeklyPlan/factory';

/** Local copies of merge helpers for pure unit tests (mirror cloudFormationSync). */
function mergeWeeklySnapshots(
  local: WeeklyPlansSnapshot,
  cloud: WeeklyPlansSnapshot,
): WeeklyPlansSnapshot {
  const byWeek = new Map<string, (typeof local.plans)[number]>();
  for (const plan of local.plans) byWeek.set(plan.weekStartDate, plan);
  for (const plan of cloud.plans) {
    const existing = byWeek.get(plan.weekStartDate);
    if (!existing || Date.parse(plan.updatedAt) >= Date.parse(existing.updatedAt)) {
      byWeek.set(plan.weekStartDate, plan);
    }
  }
  const plans = [...byWeek.values()];
  const byWeekStart: Record<string, string> = {};
  for (const plan of plans) byWeekStart[plan.weekStartDate] = plan.id;
  const localActive = local.plans.find((p) => p.id === local.index.activePlanId);
  const cloudActive = cloud.plans.find((p) => p.id === cloud.index.activePlanId);
  let activePlanId: string | null = null;
  if (localActive && cloudActive) {
    activePlanId =
      Date.parse(cloudActive.updatedAt) >= Date.parse(localActive.updatedAt)
        ? cloudActive.id
        : localActive.id;
  } else {
    activePlanId = cloudActive?.id ?? localActive?.id ?? null;
  }
  return { index: { version: 1, byWeekStart, activePlanId }, plans };
}

describe('formation cloud merge', () => {
  it('prefers newer weekly plan for the same week start', () => {
    const older = buildDraftWeeklyPlan('2026-08-02');
    older.updatedAt = '2026-08-02T10:00:00.000Z';
    older.biblical.weeklyTheme = 'Old theme';
    const newer = buildDraftWeeklyPlan('2026-08-02');
    newer.id = 'cloud-plan';
    newer.updatedAt = '2026-08-03T10:00:00.000Z';
    newer.biblical.weeklyTheme = 'Be transformed';
    newer.status = 'active';

    const local: WeeklyPlansSnapshot = {
      index: { version: 1, byWeekStart: { '2026-08-02': older.id }, activePlanId: null },
      plans: [older],
    };
    const cloud: WeeklyPlansSnapshot = {
      index: { version: 1, byWeekStart: { '2026-08-02': newer.id }, activePlanId: newer.id },
      plans: [newer],
    };

    const merged = mergeWeeklySnapshots(local, cloud);
    expect(merged.plans).toHaveLength(1);
    expect(merged.plans[0]?.biblical.weeklyTheme).toBe('Be transformed');
    expect(merged.index.activePlanId).toBe('cloud-plan');
  });

  it('keeps sermon notes from both devices by id', () => {
    const local: ChurchNotesSnapshot = {
      index: { version: 1, noteIds: ['n1'], activeFormationPlanId: null, formationPlanIds: [] },
      notes: [
        {
          id: 'n1',
          userId: 'u',
          sermonDate: '2026-08-02',
          church: '',
          speaker: '',
          title: 'Local only',
          series: '',
          primaryScripture: '',
          rawNotes: 'phone note',
          sourceLinks: '',
          announcementsNotes: '',
          status: 'draft',
          createdAt: '2026-08-02T10:00:00.000Z',
          updatedAt: '2026-08-02T10:00:00.000Z',
        },
      ],
      analyses: [],
      plans: [],
    };
    const cloud: ChurchNotesSnapshot = {
      index: { version: 1, noteIds: ['n2'], activeFormationPlanId: null, formationPlanIds: [] },
      notes: [
        {
          id: 'n2',
          userId: 'u',
          sermonDate: '2026-08-02',
          church: '',
          speaker: '',
          title: 'Computer',
          series: '',
          primaryScripture: '',
          rawNotes: 'desktop note',
          sourceLinks: '',
          announcementsNotes: '',
          status: 'approved',
          createdAt: '2026-08-02T12:00:00.000Z',
          updatedAt: '2026-08-02T12:00:00.000Z',
        },
      ],
      analyses: [],
      plans: [],
    };

    const notesById = new Map(local.notes.map((n) => [n.id, n]));
    for (const note of cloud.notes) notesById.set(note.id, note);
    expect([...notesById.keys()].sort()).toEqual(['n1', 'n2']);
  });
});

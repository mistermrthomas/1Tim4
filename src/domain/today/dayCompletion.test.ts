import { beforeEach, describe, expect, it } from 'vitest';
import type { BiblicalDayLog } from '../biblical/dayLog';
import { buildDraftWeeklyPlan } from '../weeklyPlan/factory';
import {
  completeDay,
  evaluateWeekdayEligibility,
  loadDayCompletion,
  reopenDay,
} from './dayCompletion';

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

function baseLog(partial: Partial<BiblicalDayLog> = {}): BiblicalDayLog {
  return {
    dateKey: '2026-08-03',
    practiceAccepted: true,
    practiceDone: true,
    concreteActionStatus: 'completed',
    concreteActionNote: '',
    expectedTest: 'test',
    intention: 'intend',
    prayerText: '',
    morningReflection: '',
    reflectQuestion: '',
    reflectAnswer: '',
    morningMode: 'full',
    morningDone: true,
    middayDone: true,
    eveningDone: true,
    emotion: null,
    tested: null,
    eveningNotes: {},
    scriptureReviewed: true,
    updatedAt: '2026-08-03T12:00:00.000Z',
    ...partial,
  };
}

describe('dayCompletion', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it('does not become eligible until concrete action has an outcome', () => {
    const plan = buildDraftWeeklyPlan('2026-08-02');
    const monday = plan.biblical.days.find((d) => d.dayNumber === 2)!;
    const evalOpen = evaluateWeekdayEligibility(
      plan,
      monday.date,
      baseLog({ dateKey: monday.date, concreteActionStatus: 'unset', practiceDone: false }),
    );
    expect(evalOpen.eligible).toBe(false);
    expect(evalOpen.missing).toContain('Concrete action outcome');
  });

  it('persists completion and reopen without losing history', () => {
    const record = completeDay({
      date: '2026-08-03',
      completionType: 'weekday',
      summary: {
        biblicalPracticeCompleted: true,
        concreteActionStatus: 'carried_forward',
        workoutStatus: 'skipped',
        workStatus: 'deferred',
        healthTargetsReached: 1,
        healthTargetsTotal: 3,
        unfinishedItems: ['Concrete action', 'Training', 'Work priority'],
      },
      closureQuality: 'closed_with_unfinished',
    });
    expect(record.status).toBe('completed');
    expect(loadDayCompletion('2026-08-03').closureQuality).toBe('closed_with_unfinished');

    const reopened = reopenDay('2026-08-03');
    expect(reopened.status).toBe('open');
    expect(reopened.reopenHistory).toHaveLength(1);
    expect(reopened.summary?.concreteActionStatus).toBe('carried_forward');
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import {
  getScheduledDay,
  isScheduledDayActivityDone,
  markScheduleDayComplete,
  missedPriorNote,
  optionalCatchUpExtras,
  previewLine,
  reconcileMissedScheduleDays,
} from './calendarSchedule';

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      clear: () => map.clear(),
    },
  });
}

describe('calendar training schedule', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it('uses the dated August week as source of truth', () => {
    expect(getScheduledDay('2026-08-03').shortLabel).toBe('Workout A');
    expect(getScheduledDay('2026-08-04').shortLabel).toBe('Workout B');
    expect(getScheduledDay('2026-08-05').label).toBe('Recovery — Walk + Mobility');
    expect(getScheduledDay('2026-08-06').label).toBe('Workout A — Chest / Triceps / Core');
    expect(getScheduledDay('2026-08-07').shortLabel).toBe('Workout B');
    expect(getScheduledDay('2026-08-08').shortLabel).toBe('Recovery / Walk');
    expect(getScheduledDay('2026-08-09').shortLabel).toBe('Rest');
  });

  it('does not let a missed recovery block Thursday’s Workout A', () => {
    reconcileMissedScheduleDays('2026-08-06');
    const thursday = getScheduledDay('2026-08-06');
    expect(thursday.shortLabel).toBe('Workout A');
    expect(thursday.focus).toBe('Chest · Triceps · Core');

    const missed = missedPriorNote('2026-08-06');
    expect(missed?.message).toMatch(/recovery/i);
    expect(optionalCatchUpExtras('2026-08-06')).toEqual(['walk', 'mobility']);
    expect(isScheduledDayActivityDone(thursday)).toBe(false);
  });

  it('keeps today’s plan after marking a prior day complete or missed', () => {
    markScheduleDayComplete('2026-08-05');
    expect(getScheduledDay('2026-08-06').shortLabel).toBe('Workout A');
    expect(previewLine(getScheduledDay('2026-08-06'))).toContain('Workout A');
  });
});

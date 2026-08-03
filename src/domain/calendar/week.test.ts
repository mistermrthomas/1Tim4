import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayNumberFromDateKey,
  endOfWeekSaturday,
  isDateKeySaturday,
  isDateKeySunday,
  isSaturdaySabbath,
  isSundayPlanningDay,
  followingSundayStart,
  nextSundayStart,
  startOfWeekSunday,
  toLocalDateKey,
  weekRangeFor,
} from './week';

describe('week calendar (local timezone)', () => {
  it('formats local date keys without UTC drift', () => {
    const d = new Date(2026, 7, 2, 23, 30, 0); // Aug 2 local evening
    expect(toLocalDateKey(d)).toBe('2026-08-02');
  });

  it('starts the week on Sunday for a mid-week date', () => {
    // Wednesday Aug 5, 2026
    const wed = new Date(2026, 7, 5, 10, 0, 0);
    expect(startOfWeekSunday(wed)).toBe('2026-08-02');
    expect(endOfWeekSaturday('2026-08-02')).toBe('2026-08-08');
  });

  it('maps Sunday=1 through Saturday=7', () => {
    expect(dayNumberFromDateKey('2026-08-02')).toBe(1);
    expect(dayNumberFromDateKey('2026-08-03')).toBe(2);
    expect(dayNumberFromDateKey('2026-08-08')).toBe(7);
  });

  it('builds a seven-day Sunday–Saturday range', () => {
    const range = weekRangeFor(new Date(2026, 7, 4, 9));
    expect(range.weekStart).toBe('2026-08-02');
    expect(range.weekEnd).toBe('2026-08-08');
    expect(range.days).toHaveLength(7);
    expect(range.days[0]).toMatchObject({ dateKey: '2026-08-02', dayNumber: 1 });
    expect(range.days[6]).toMatchObject({ dateKey: '2026-08-08', dayNumber: 7 });
  });

  it('detects Sunday planning and Saturday Sabbath', () => {
    const sunday = new Date(2026, 7, 2, 12);
    const saturday = new Date(2026, 7, 1, 12);
    expect(isSundayPlanningDay(sunday)).toBe(true);
    expect(isSaturdaySabbath(saturday)).toBe(true);
    expect(isDateKeySunday('2026-08-02')).toBe(true);
    expect(isDateKeySaturday('2026-08-08')).toBe(true);
  });

  it('returns next Sunday when today is Saturday', () => {
    const saturday = new Date(2026, 7, 1, 18);
    expect(nextSundayStart(saturday)).toBe('2026-08-02');
    expect(followingSundayStart(saturday)).toBe('2026-08-02');
    expect(addDays('2026-08-02', 1)).toBe('2026-08-03');
  });

  it('starts the following week from Sunday without attaching to the current week', () => {
    const sunday = new Date(2026, 7, 2, 10);
    expect(nextSundayStart(sunday)).toBe('2026-08-02');
    expect(followingSundayStart(sunday)).toBe('2026-08-09');
  });

  it('keeps Monday inside the Sunday week that started yesterday', () => {
    const monday = new Date(2026, 7, 3, 9);
    expect(startOfWeekSunday(monday)).toBe('2026-08-02');
    expect(nextSundayStart(monday)).toBe('2026-08-09');
  });
});

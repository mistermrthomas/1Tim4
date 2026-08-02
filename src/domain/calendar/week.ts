/** Sunday–Saturday week helpers using the user’s local timezone. */

export type DateKey = string; // YYYY-MM-DD (local)

export interface WeekRange {
  weekStart: DateKey;
  weekEnd: DateKey;
  /** Sunday=1 … Saturday=7 */
  days: Array<{ dateKey: DateKey; dayNumber: number; weekday: number }>;
}

/** Local calendar date key — never UTC ISO slice. */
export function toLocalDateKey(date = new Date()): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDateKey(dateKey: DateKey): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

export function addDays(dateKey: DateKey, days: number): DateKey {
  const date = parseLocalDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

/** JS getDay(): 0=Sun … 6=Sat → PATH dayNumber 1–7. */
export function dayNumberFromWeekday(weekday: number): number {
  return weekday + 1;
}

export function weekdayFromDateKey(dateKey: DateKey): number {
  return parseLocalDateKey(dateKey).getDay();
}

export function dayNumberFromDateKey(dateKey: DateKey): number {
  return dayNumberFromWeekday(weekdayFromDateKey(dateKey));
}

/** Sunday of the week containing `date`. */
export function startOfWeekSunday(date = new Date()): DateKey {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  local.setDate(local.getDate() - local.getDay());
  return toLocalDateKey(local);
}

export function endOfWeekSaturday(weekStart: DateKey): DateKey {
  return addDays(weekStart, 6);
}

export function weekRangeFor(date = new Date()): WeekRange {
  const weekStart = startOfWeekSunday(date);
  const weekEnd = endOfWeekSaturday(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDays(weekStart, i);
    const weekday = weekdayFromDateKey(dateKey);
    return { dateKey, dayNumber: dayNumberFromWeekday(weekday), weekday };
  });
  return { weekStart, weekEnd, days };
}

export function isSundayPlanningDay(date = new Date()): boolean {
  return date.getDay() === 0;
}

export function isSaturdaySabbath(date = new Date()): boolean {
  return date.getDay() === 6;
}

export function isDateKeySunday(dateKey: DateKey): boolean {
  return weekdayFromDateKey(dateKey) === 0;
}

export function isDateKeySaturday(dateKey: DateKey): boolean {
  return weekdayFromDateKey(dateKey) === 6;
}

/** Next Sunday on or after today (today if already Sunday). */
export function nextSundayStart(date = new Date()): DateKey {
  if (date.getDay() === 0) return toLocalDateKey(date);
  const daysUntil = 7 - date.getDay();
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + daysUntil, 12);
  return toLocalDateKey(next);
}

/**
 * Sunday that starts the *next* planning week.
 * On Sunday this is seven days ahead so planning does not attach to the prior week.
 * On Saturday (and other weekdays) this is the upcoming Sunday.
 */
export function followingSundayStart(date = new Date()): DateKey {
  const upcoming = nextSundayStart(date);
  if (toLocalDateKey(date) === upcoming) return addDays(upcoming, 7);
  return upcoming;
}

export function weekdayLabel(dayNumber: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    dayNumber - 1
  ]!;
}

export function shortWeekdayLabel(dayNumber: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayNumber - 1]!;
}

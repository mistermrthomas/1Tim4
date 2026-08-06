/**
 * Calendar-dated physical training schedule.
 *
 * Today’s plan is resolved by local date — never by the last completed item.
 * A missed recovery day does not block the next day’s scheduled workout.
 */

import { addDays, toLocalDateKey, weekdayFromDateKey } from '../calendar/week';
import { mobilityDoneOn } from '../physicalLife/mobility';
import { travelRecommendation } from '../physicalLife/travel';
import { walkDoneOn } from '../physicalLife/walking';
import { todayDateKey } from '../physical/store';
import { WORKOUT_1_ID, WORKOUT_2_ID, WORKOUT_3_ID } from './seed';
import { readStrengthState } from './store';

export type ScheduleDayKind = 'workout' | 'recovery' | 'rest';
export type SchedulePrimaryAction =
  | 'start_workout'
  | 'log_walk'
  | 'start_mobility'
  | 'rest';
export type ScheduleDayStatus = 'pending' | 'completed' | 'missed' | 'partial';
export type OptionalExtra = 'walk' | 'mobility';

export type ScheduledTrainingDay = {
  dateKey: string;
  kind: ScheduleDayKind;
  workoutId: string | null;
  /** e.g. Workout A */
  title: string;
  /** e.g. Chest · Triceps · Core or Walk + Mobility */
  focus: string;
  /** Full display: Workout A — Chest / Triceps / Core */
  label: string;
  shortLabel: string;
  primaryAction: SchedulePrimaryAction;
  /** Secondary primary on dual recovery days (Walk + Mobility). */
  secondaryAction: SchedulePrimaryAction | null;
  /** Optional support on strength days — never required/overdue. */
  optionalExtras: OptionalExtra[];
  /** True when this came from the Poland travel overlay. */
  travelOverride: boolean;
};

type PatternDay = Omit<ScheduledTrainingDay, 'dateKey' | 'travelOverride'>;

/** Monday-start weekly pattern matching the dated August 2026 plan. */
const WEEK_PATTERN: PatternDay[] = [
  {
    kind: 'workout',
    workoutId: WORKOUT_1_ID,
    title: 'Workout A',
    focus: 'Chest · Triceps · Core',
    label: 'Workout A — Chest / Triceps / Core',
    shortLabel: 'Workout A',
    primaryAction: 'start_workout',
    secondaryAction: null,
    optionalExtras: ['walk', 'mobility'],
  },
  {
    kind: 'workout',
    workoutId: WORKOUT_2_ID,
    title: 'Workout B',
    focus: 'Back · Biceps · Traps',
    label: 'Workout B — Back / Biceps / Traps',
    shortLabel: 'Workout B',
    primaryAction: 'start_workout',
    secondaryAction: null,
    optionalExtras: ['walk', 'mobility'],
  },
  {
    kind: 'recovery',
    workoutId: null,
    title: 'Recovery',
    focus: 'Walk + Mobility',
    label: 'Recovery — Walk + Mobility',
    shortLabel: 'Recovery',
    primaryAction: 'log_walk',
    secondaryAction: 'start_mobility',
    optionalExtras: [],
  },
  {
    kind: 'workout',
    workoutId: WORKOUT_1_ID,
    title: 'Workout A',
    focus: 'Chest · Triceps · Core',
    label: 'Workout A — Chest / Triceps / Core',
    shortLabel: 'Workout A',
    primaryAction: 'start_workout',
    secondaryAction: null,
    optionalExtras: ['walk', 'mobility'],
  },
  {
    kind: 'workout',
    workoutId: WORKOUT_2_ID,
    title: 'Workout B',
    focus: 'Back · Biceps · Traps',
    label: 'Workout B — Back / Biceps / Traps',
    shortLabel: 'Workout B',
    primaryAction: 'start_workout',
    secondaryAction: null,
    optionalExtras: ['walk', 'mobility'],
  },
  {
    kind: 'recovery',
    workoutId: null,
    title: 'Recovery',
    focus: 'Walk or light movement',
    label: 'Recovery or Walk',
    shortLabel: 'Recovery / Walk',
    primaryAction: 'log_walk',
    secondaryAction: null,
    optionalExtras: ['mobility'],
  },
  {
    kind: 'rest',
    workoutId: null,
    title: 'Rest / Church',
    focus: 'Rest and worship',
    label: 'Rest / Church',
    shortLabel: 'Rest',
    primaryAction: 'rest',
    secondaryAction: null,
    optionalExtras: [],
  },
];

/** Explicit dated overrides for August 2026 (source of truth for that month). */
const DATED_OVERRIDES: Record<string, PatternDay> = {
  '2026-08-03': WEEK_PATTERN[0]!,
  '2026-08-04': WEEK_PATTERN[1]!,
  '2026-08-05': WEEK_PATTERN[2]!,
  '2026-08-06': WEEK_PATTERN[3]!,
  '2026-08-07': WEEK_PATTERN[4]!,
  '2026-08-08': WEEK_PATTERN[5]!,
  '2026-08-09': WEEK_PATTERN[6]!,
};

/** Anchor Monday for the repeating weekly pattern (Aug 3, 2026). */
export const SCHEDULE_ANCHOR_MONDAY = '2026-08-03';

const STATUS_KEY = 'path-training-day-status-v1';

type StatusStore = {
  version: 1;
  /** Explicit completions (e.g. Mark done) and reconciled missed markers. */
  byDate: Record<string, ScheduleDayStatus>;
};

function emptyStatus(): StatusStore {
  return { version: 1, byDate: {} };
}

function readStatusStore(): StatusStore {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (!raw) return emptyStatus();
    const parsed = JSON.parse(raw) as StatusStore;
    if (parsed.version !== 1) return emptyStatus();
    return { version: 1, byDate: parsed.byDate ?? {} };
  } catch {
    return emptyStatus();
  }
}

function writeStatusStore(store: StatusStore): void {
  localStorage.setItem(STATUS_KEY, JSON.stringify(store));
}

function patternForDate(dateKey: string): PatternDay {
  const override = DATED_OVERRIDES[dateKey];
  if (override) return override;

  const weekday = weekdayFromDateKey(dateKey); // 0=Sun … 6=Sat
  // WEEK_PATTERN is Mon=0 … Sun=6
  const index = weekday === 0 ? 6 : weekday - 1;
  return WEEK_PATTERN[index]!;
}

function applyTravel(dateKey: string, base: PatternDay): ScheduledTrainingDay {
  const travel = travelRecommendation(dateKey);
  if (!travel.trip || !travel.kind) {
    return { ...base, dateKey, travelOverride: false };
  }

  switch (travel.kind) {
    case 'hotel_strength':
      return {
        dateKey,
        kind: 'workout',
        workoutId: WORKOUT_1_ID,
        title: 'Hotel strength',
        focus: 'Maintenance session',
        label: 'Hotel strength',
        shortLabel: 'Hotel strength',
        primaryAction: 'start_workout',
        secondaryAction: null,
        optionalExtras: ['walk', 'mobility'],
        travelOverride: true,
      };
    case 'walk':
      return {
        dateKey,
        kind: 'recovery',
        workoutId: null,
        title: 'Walk',
        focus: '20–40 minute walk',
        label: '20–40 minute walk',
        shortLabel: 'Walk',
        primaryAction: 'log_walk',
        secondaryAction: null,
        optionalExtras: [],
        travelOverride: true,
      };
    case 'mobility':
      return {
        dateKey,
        kind: 'recovery',
        workoutId: null,
        title: 'Mobility',
        focus: 'Mobility only',
        label: 'Mobility only',
        shortLabel: 'Mobility',
        primaryAction: 'start_mobility',
        secondaryAction: null,
        optionalExtras: [],
        travelOverride: true,
      };
    case 'travel':
    case 'rest':
      return {
        dateKey,
        kind: 'rest',
        workoutId: null,
        title: travel.kind === 'travel' ? 'Travel day' : 'Rest',
        focus: travel.guidance,
        label: travel.kind === 'travel' ? 'Travel day' : 'Rest',
        shortLabel: travel.kind === 'travel' ? 'Travel' : 'Rest',
        primaryAction: 'rest',
        secondaryAction: null,
        optionalExtras: [],
        travelOverride: true,
      };
    default:
      return { ...base, dateKey, travelOverride: false };
  }
}

/** Resolve the plan assigned to a local calendar date. */
export function getScheduledDay(dateKey = todayDateKey()): ScheduledTrainingDay {
  return applyTravel(dateKey, patternForDate(dateKey));
}

/** Shape compatible with legacy RotationSlot consumers. */
export function toRotationSlot(day: ScheduledTrainingDay): {
  kind: 'workout' | 'recovery';
  workoutId: string | null;
  label: string;
  shortLabel: string;
} {
  return {
    kind: day.kind === 'rest' ? 'recovery' : day.kind,
    workoutId: day.workoutId,
    label: day.label,
    shortLabel: day.shortLabel,
  };
}

export function strengthLoggedOn(workoutId: string | null, dateKey: string): boolean {
  if (!workoutId) return false;
  return readStrengthState().entries.some(
    (entry) => entry.workoutId === workoutId && entry.date === dateKey,
  );
}

/** Activity completion from real logs — independent of schedule advancement. */
export function isScheduledDayActivityDone(
  day: ScheduledTrainingDay,
  dateKey = day.dateKey,
): boolean {
  if (day.kind === 'rest') return true;
  if (day.kind === 'workout') {
    return strengthLoggedOn(day.workoutId, dateKey) || readDayStatus(dateKey) === 'completed';
  }
  // Recovery: walk and/or mobility depending on the day’s focus.
  if (day.secondaryAction === 'start_mobility') {
    return walkDoneOn(dateKey) || mobilityDoneOn(dateKey) || readDayStatus(dateKey) === 'completed';
  }
  if (day.primaryAction === 'start_mobility') {
    return mobilityDoneOn(dateKey) || readDayStatus(dateKey) === 'completed';
  }
  return walkDoneOn(dateKey) || mobilityDoneOn(dateKey) || readDayStatus(dateKey) === 'completed';
}

export function readDayStatus(dateKey: string): ScheduleDayStatus | null {
  return readStatusStore().byDate[dateKey] ?? null;
}

export function markScheduleDayStatus(
  dateKey: string,
  status: ScheduleDayStatus,
): ScheduleDayStatus {
  const store = readStatusStore();
  store.byDate[dateKey] = status;
  writeStatusStore(store);
  return status;
}

export function markScheduleDayComplete(dateKey = todayDateKey()): void {
  markScheduleDayStatus(dateKey, 'completed');
}

/**
 * Past planned days that were never completed become "missed".
 * Does not change today’s plan or carry the activity forward as primary.
 */
export function reconcileMissedScheduleDays(today = todayDateKey()): void {
  const store = readStatusStore();
  let cursor = SCHEDULE_ANCHOR_MONDAY;
  let changed = false;
  while (cursor < today) {
    const day = getScheduledDay(cursor);
    if (day.kind !== 'rest' && !store.byDate[cursor]) {
      if (isScheduledDayActivityDone(day, cursor)) {
        store.byDate[cursor] = 'completed';
      } else {
        store.byDate[cursor] = 'missed';
      }
      changed = true;
    }
    cursor = addDays(cursor, 1);
  }
  if (changed) writeStatusStore(store);
}

export type MissedPriorNote = {
  dateKey: string;
  label: string;
  /** Soft copy, e.g. "Recovery walk not completed" */
  message: string;
};

/** Soft note about yesterday if it was planned and not completed. */
export function missedPriorNote(today = todayDateKey()): MissedPriorNote | null {
  reconcileMissedScheduleDays(today);
  const yesterday = addDays(today, -1);
  const day = getScheduledDay(yesterday);
  if (day.kind === 'rest') return null;
  if (isScheduledDayActivityDone(day, yesterday)) return null;
  const status = readDayStatus(yesterday);
  if (status === 'completed') return null;

  const message =
    day.kind === 'recovery'
      ? day.focus.toLowerCase().includes('mobility')
        ? 'Recovery walk / mobility not completed'
        : 'Recovery walk not completed'
      : `${day.shortLabel} not completed`;

  return { dateKey: yesterday, label: day.label, message };
}

/** Optional extras offered when yesterday’s recovery was missed — never primary. */
export function optionalCatchUpExtras(today = todayDateKey()): OptionalExtra[] {
  const note = missedPriorNote(today);
  if (!note) return [];
  const yesterday = getScheduledDay(note.dateKey);
  if (yesterday.kind !== 'recovery') return [];
  if (yesterday.secondaryAction === 'start_mobility') return ['walk', 'mobility'];
  if (yesterday.primaryAction === 'start_mobility') return ['mobility'];
  return ['walk'];
}

export function upcomingScheduledDays(
  from = todayDateKey(),
  count = 7,
): ScheduledTrainingDay[] {
  return Array.from({ length: count }, (_, i) => getScheduledDay(addDays(from, i)));
}

export function previewLine(day: ScheduledTrainingDay): string {
  if (day.kind === 'rest') return day.title;
  if (day.kind === 'recovery') return `${day.title} · ${day.focus}`;
  return `${day.title} · ${day.focus.replace(/ · /g, ' / ')}`;
}

/** Workout C remains in the catalog; not in the Aug weekly pattern. */
export function catalogWorkoutIds(): string[] {
  return [WORKOUT_1_ID, WORKOUT_2_ID, WORKOUT_3_ID];
}

export function localScheduleTodayLabel(): string {
  return toLocalDateKey();
}

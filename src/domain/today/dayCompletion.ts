/**
 * Explicit day-completion records.
 * Eligibility is derived; completion is never automatic from the last checkbox.
 */

import { loadBiblicalDay, type BiblicalDayLog } from '../biblical/dayLog';
import { todayDateKey } from '../physical/store';
import {
  dayWorkoutsComplete,
  ensureWorkoutSessions,
  getSessionsForDate,
} from '../physical/workoutTracker';
import { totalIntake } from '../physical/intakeTracker';
import { readPhysicalPlan } from '../physical/planCatalog';
import { effectiveSteps, getStepsDay } from '../physical/stepsTracker';
import { normalizePhysicalDay } from '../weeklyPlan/physicalWorkouts';
import { deriveWeeklySetup } from '../weeklyPlan/setupStatus';
import type { SaturdayReflection, WeeklyPlan, WorkDailyAssignment } from '../weeklyPlan/types';

const KEY = 'path-day-completion-v1';

export type DayCompletionStatus = 'open' | 'eligible' | 'completed';
export type DayCompletionType = 'weekday' | 'planning_day' | 'weekly_reflection';
export type DayClosureQuality = 'completed_as_planned' | 'closed_with_unfinished';

export type ConcreteActionStatus = 'unset' | 'completed' | 'not_completed' | 'carried_forward';
export type WorkoutDayStatus = 'completed' | 'skipped' | 'partial' | 'not_scheduled' | 'open';
export type WorkDayStatus =
  | 'completed'
  | 'deferred'
  | 'carried_forward'
  | 'not_scheduled'
  | 'open';

export interface DayCompletionSummary {
  biblicalPracticeCompleted: boolean;
  concreteActionStatus: Exclude<ConcreteActionStatus, 'unset'>;
  workoutStatus: Exclude<WorkoutDayStatus, 'open'>;
  workStatus: Exclude<WorkDayStatus, 'open'>;
  healthTargetsReached: number;
  healthTargetsTotal: number;
  unfinishedItems: string[];
}

export interface DayCompletionRecord {
  date: string;
  status: 'open' | 'completed';
  completedAt: string | null;
  completionType: DayCompletionType | null;
  closureQuality: DayClosureQuality | null;
  summary: DayCompletionSummary | null;
  reopenHistory: Array<{ reopenedAt: string; previousCompletedAt: string | null }>;
}

type Store = Record<string, DayCompletionRecord>;

function emptyRecord(date: string): DayCompletionRecord {
  return {
    date,
    status: 'open',
    completedAt: null,
    completionType: null,
    closureQuality: null,
    summary: null,
    reopenHistory: [],
  };
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function loadDayCompletion(date = todayDateKey()): DayCompletionRecord {
  const stored = readStore()[date];
  if (!stored) return emptyRecord(date);
  return {
    ...emptyRecord(date),
    ...stored,
    reopenHistory: stored.reopenHistory ?? [],
  };
}

export function saveDayCompletion(record: DayCompletionRecord): DayCompletionRecord {
  const store = readStore();
  store[record.date] = record;
  writeStore(store);
  return record;
}

export function healthTargetsSnapshot(dateKey = todayDateKey()): {
  reached: number;
  total: number;
} {
  const plan = readPhysicalPlan();
  const targets = plan.targets;
  const steps = effectiveSteps(getStepsDay(dateKey));
  const protein = totalIntake(dateKey, 'protein');
  const water = totalIntake(dateKey, 'water');
  const waterTarget =
    targets.waterUnit === 'ml'
      ? Math.round(targets.waterOz * 29.5735)
      : targets.waterUnit === 'L'
        ? targets.waterOz / 33.814
        : targets.waterOz;
  const checks = [
    steps >= (getStepsDay(dateKey).target || targets.steps),
    protein >= targets.proteinG,
    water >= waterTarget,
  ];
  return {
    reached: checks.filter(Boolean).length,
    total: checks.length,
  };
}

function concreteFromLog(log: BiblicalDayLog): ConcreteActionStatus {
  if (log.concreteActionStatus && log.concreteActionStatus !== 'unset') {
    return log.concreteActionStatus;
  }
  // Legacy: practiceDone alone counts as completed until user sets an honest disposition.
  if (log.practiceDone) return 'completed';
  return 'unset';
}

function workoutStatusForDay(
  plan: WeeklyPlan,
  dateKey: string,
): WorkoutDayStatus {
  const physical = plan.physical.days.find((d) => d.date === dateKey);
  const blocks = physical ? normalizePhysicalDay(physical).scheduledWorkouts : [];
  if (!blocks.length || physical?.type === 'rest' || physical?.type === 'unscheduled') {
    return 'not_scheduled';
  }
  const sessions =
    dateKey === todayDateKey() ? ensureWorkoutSessions(dateKey) : getSessionsForDate(dateKey);
  if (!sessions.length) return 'open';
  if (!dayWorkoutsComplete(sessions)) return 'open';
  if (sessions.every((s) => s.status === 'skipped')) return 'skipped';
  if (sessions.some((s) => s.status === 'partial')) return 'partial';
  return 'completed';
}

function workStatusForDay(assignments: WorkDailyAssignment[]): WorkDayStatus {
  const active = assignments.filter((a) => a.status !== 'removed' && a.title.trim());
  if (!active.length) return 'not_scheduled';
  if (active.some((a) => a.status === 'open')) return 'open';
  if (active.every((a) => a.status === 'done')) return 'completed';
  if (active.some((a) => a.status === 'carried_forward')) return 'carried_forward';
  if (active.some((a) => a.status === 'deferred')) return 'deferred';
  return 'completed';
}

export interface WeekdayEligibility {
  eligible: boolean;
  missing: string[];
  summary: DayCompletionSummary;
  closureQuality: DayClosureQuality;
}

export function evaluateWeekdayEligibility(
  plan: WeeklyPlan,
  dateKey: string,
  log: BiblicalDayLog = loadBiblicalDay(dateKey),
): WeekdayEligibility {
  const missing: string[] = [];
  const unfinished: string[] = [];

  const concrete = concreteFromLog(log);
  const biblicalTouched = Boolean(
    log.practiceAccepted || log.practiceDone || log.morningDone || concrete !== 'unset',
  );
  if (!biblicalTouched) missing.push('Biblical practice');
  if (concrete === 'unset') missing.push('Concrete action outcome');
  else if (concrete !== 'completed') unfinished.push('Concrete action');

  const workout = workoutStatusForDay(plan, dateKey);
  if (workout === 'open') missing.push('Training outcome');
  else if (workout === 'skipped' || workout === 'partial') unfinished.push('Training');

  const workAssignments = plan.work.days.filter((d) => d.date === dateKey);
  const work = workStatusForDay(workAssignments);
  if (work === 'open') missing.push('Work priority outcome');
  else if (work === 'deferred' || work === 'carried_forward') unfinished.push('Work priority');

  const health = healthTargetsSnapshot(dateKey);
  const eligible = missing.length === 0;
  const summary: DayCompletionSummary = {
    biblicalPracticeCompleted: Boolean(log.practiceAccepted || log.practiceDone || concrete === 'completed'),
    concreteActionStatus: concrete === 'unset' ? 'not_completed' : concrete,
    workoutStatus: workout === 'open' ? 'not_scheduled' : workout,
    workStatus: work === 'open' ? 'not_scheduled' : work,
    healthTargetsReached: health.reached,
    healthTargetsTotal: health.total,
    unfinishedItems: unfinished,
  };

  return {
    eligible,
    missing,
    summary,
    closureQuality: unfinished.length ? 'closed_with_unfinished' : 'completed_as_planned',
  };
}

export function evaluatePlanningDayEligibility(plan: WeeklyPlan | null): {
  eligible: boolean;
  missing: string[];
} {
  const setup = deriveWeeklySetup(plan);
  if (setup.isActive) return { eligible: true, missing: [] };
  return { eligible: false, missing: setup.missingSections.length ? setup.missingSections : ['Activate the week'] };
}

export function evaluateSaturdayEligibility(reflection: SaturdayReflection): {
  eligible: boolean;
  missing: string[];
} {
  const checks: Array<[keyof SaturdayReflection | 'act', string, boolean]> = [
    ['godShowed', 'What the sermon revealed', Boolean(reflection.godShowed.trim())],
    ['practicedNotJustRemembered', 'Where teaching was practiced', Boolean(reflection.practicedNotJustRemembered.trim())],
    ['resistedOrDrifted', 'Where resistance or drift occurred', Boolean(reflection.resistedOrDrifted.trim())],
    ['act', 'Act of obedience outcome', Boolean(reflection.actOfObedienceDone)],
    ['trainingChanged', 'Training review', Boolean(reflection.trainingChanged.trim())],
    ['workMoved', 'Work review', Boolean(reflection.workMoved.trim())],
    ['carryForward', 'What should carry forward', Boolean(reflection.carryForward.trim())],
    ['release', 'What should be released', Boolean(reflection.release.trim())],
  ];
  const missing = checks.filter(([, , ok]) => !ok).map(([, label]) => label);
  return { eligible: missing.length === 0, missing };
}

export function completeDay(input: {
  date: string;
  completionType: DayCompletionType;
  summary: DayCompletionSummary;
  closureQuality: DayClosureQuality;
}): DayCompletionRecord {
  const prev = loadDayCompletion(input.date);
  return saveDayCompletion({
    ...prev,
    date: input.date,
    status: 'completed',
    completedAt: new Date().toISOString(),
    completionType: input.completionType,
    closureQuality: input.closureQuality,
    summary: input.summary,
  });
}

export function reopenDay(date: string): DayCompletionRecord {
  const prev = loadDayCompletion(date);
  return saveDayCompletion({
    ...prev,
    status: 'open',
    completedAt: null,
    completionType: prev.completionType,
    closureQuality: null,
    summary: prev.summary,
    reopenHistory: [
      ...prev.reopenHistory,
      {
        reopenedAt: new Date().toISOString(),
        previousCompletedAt: prev.completedAt,
      },
    ],
  });
}

export function displayStatus(
  record: DayCompletionRecord,
  eligible: boolean,
): DayCompletionStatus {
  if (record.status === 'completed') return 'completed';
  if (eligible) return 'eligible';
  return 'open';
}

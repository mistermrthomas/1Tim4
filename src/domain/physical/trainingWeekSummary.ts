/**
 * Prior-week training summary for AI coaching.
 * Stage 1: often manual / mixed. Stage 2: filled from completion history.
 */

import type { DateKey } from '../calendar/week';
import { endOfWeekSaturday, weekRangeFor } from '../calendar/week';
import { readPhysicalPlan } from './planCatalog';
import { readPhysicalTracker } from './store';
import type { WorkoutSession } from './types';

export type TrainingWeekSummarySource = 'manual' | 'history' | 'mixed';

export interface TrainingWeekSummary {
  weekStartDate: DateKey;
  weekEndDate: DateKey;
  plannedWorkouts: number;
  completedWorkouts: number;
  skippedWorkouts: number;
  partialWorkouts: number;
  exercisesCompleted: number;
  exercisesSkipped: number;
  finishersCompleted: number;
  finishersSkipped: number;
  /** Template or workout names that were completed. */
  strongWorkouts: string[];
  /** Template ids consistently skipped (Stage 2 signal). */
  repeatedlySkippedTemplateIds: string[];
  lastUsedResistance: Array<{
    exerciseId: string;
    exerciseName: string;
    load: number | null;
    loadUnit: string;
  }>;
  painOrCautionNotes: string[];
  averageSessionMinutes: number | null;
  source: TrainingWeekSummarySource;
  /** Free-text context still useful when history is thin. */
  notes: string;
}

function sessionsInRange(
  sessions: WorkoutSession[],
  start: DateKey,
  end: DateKey,
): WorkoutSession[] {
  return sessions.filter((s) => s.dateKey >= start && s.dateKey <= end);
}

/** Build a best-effort summary from stored sessions + prior schedule. */
function parseNoon(dateKey: DateKey): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

export function buildTrainingWeekSummaryFromHistory(
  weekStartDate: DateKey,
): TrainingWeekSummary {
  const range = weekRangeFor(parseNoon(weekStartDate));
  const end = endOfWeekSaturday(weekStartDate);
  const tracker = readPhysicalTracker();
  const catalog = readPhysicalPlan();
  const sessions = sessionsInRange(tracker.sessions, weekStartDate, end);

  let planned = 0;
  for (const day of range.days) {
    const slots = catalog.weekSchedule[String(day.weekday)] ?? [];
    planned += slots.length;
  }

  const completed = sessions.filter((s) => s.status === 'completed').length;
  const skipped = sessions.filter((s) => s.status === 'skipped').length;
  const partial = sessions.filter((s) => s.status === 'partial').length;

  const exercisesCompleted = sessions.flatMap((s) => s.exercises).filter((e) => e.completed).length;
  const exercisesSkipped = sessions.flatMap((s) => s.exercises).filter((e) => e.skipped).length;

  const finishers = sessions.filter((s) => /finisher|core/i.test(s.workoutName));
  const finishersCompleted = finishers.filter((s) => s.status === 'completed').length;
  const finishersSkipped = finishers.filter((s) => s.status === 'skipped').length;

  const strongWorkouts = sessions
    .filter((s) => s.status === 'completed')
    .map((s) => s.workoutName)
    .filter(Boolean);

  const skipCounts = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== 'skipped') continue;
    skipCounts.set(s.templateId, (skipCounts.get(s.templateId) ?? 0) + 1);
  }
  const repeatedlySkippedTemplateIds = [...skipCounts.entries()]
    .filter(([, n]) => n >= 2)
    .map(([id]) => id);

  const resistanceByExercise = new Map<
    string,
    { exerciseId: string; exerciseName: string; load: number | null; loadUnit: string }
  >();
  for (const s of sessions) {
    if (s.status !== 'completed' && s.status !== 'partial') continue;
    for (const ex of s.exercises) {
      if (!ex.completed) continue;
      resistanceByExercise.set(ex.exerciseId, {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        load: ex.actual.load,
        loadUnit: ex.actual.loadUnit,
      });
    }
  }

  const painOrCautionNotes = sessions.flatMap((s) => {
    const notes: string[] = [];
    if (s.painNotes?.trim()) notes.push(s.painNotes.trim());
    if (s.adjustNextTime?.trim()) notes.push(s.adjustNextTime.trim());
    for (const ex of s.exercises) {
      if (ex.cautionNote?.trim() && (ex.skipped || s.painNotes)) {
        notes.push(`${ex.exerciseName}: ${ex.cautionNote.trim()}`);
      }
    }
    return notes;
  });

  const durations = sessions
    .filter((s) => s.startedAt && s.completedAt)
    .map((s) => {
      const ms = new Date(s.completedAt!).getTime() - new Date(s.startedAt!).getTime();
      return ms / 60_000;
    })
    .filter((m) => Number.isFinite(m) && m > 0 && m < 300);
  const averageSessionMinutes = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  const hasHistory = sessions.length > 0;
  return {
    weekStartDate,
    weekEndDate: end,
    plannedWorkouts: planned || sessions.length,
    completedWorkouts: completed,
    skippedWorkouts: skipped,
    partialWorkouts: partial,
    exercisesCompleted,
    exercisesSkipped,
    finishersCompleted,
    finishersSkipped,
    strongWorkouts: [...new Set(strongWorkouts)].slice(0, 8),
    repeatedlySkippedTemplateIds,
    lastUsedResistance: [...resistanceByExercise.values()].slice(0, 40),
    painOrCautionNotes: [...new Set(painOrCautionNotes)].slice(0, 12),
    averageSessionMinutes,
    source: hasHistory ? (planned > 0 ? 'mixed' : 'history') : 'manual',
    notes: '',
  };
}

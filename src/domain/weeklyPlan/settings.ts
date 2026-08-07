/**
 * Weekly rhythm settings — MVP enforces Sunday start / Saturday Sabbath,
 * but the shape is ready for user configuration later.
 */

import { notifyAccountBag } from '../../services/notifyAccountBag';

export interface WeeklyRhythmSettings {
  weekStartDay: 0; // Sunday (JS weekday)
  sabbathDay: 6; // Saturday
  churchDay: 0;
  planningDay: 0;
  desiredWorkoutCount: number;
  defaultStepsTarget: number;
  defaultProteinTarget: number;
  defaultWaterTargetOz: number;
  workPlanningEnabled: boolean;
  aiSuggestionsEnabled: boolean;
  reflectionQuestions: string[];
}

const STORAGE_KEY = 'path-weekly-rhythm-v1';

export const DEFAULT_WEEKLY_RHYTHM: WeeklyRhythmSettings = {
  weekStartDay: 0,
  sabbathDay: 6,
  churchDay: 0,
  planningDay: 0,
  desiredWorkoutCount: 4,
  defaultStepsTarget: 8000,
  defaultProteinTarget: 150,
  defaultWaterTargetOz: 100,
  workPlanningEnabled: true,
  aiSuggestionsEnabled: false,
  reflectionQuestions: [
    'What stood out most?',
    'Why do you think it stood out?',
    'Where could this change your behavior this week?',
  ],
};

export function readWeeklyRhythmSettings(): WeeklyRhythmSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WEEKLY_RHYTHM };
    return { ...DEFAULT_WEEKLY_RHYTHM, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_WEEKLY_RHYTHM };
  }
}

export function writeWeeklyRhythmSettings(settings: WeeklyRhythmSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  notifyAccountBag('weekly_rhythm');
}

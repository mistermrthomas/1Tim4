import { createEmptyAppData } from '../data/emptyData';
import type { AppData } from '../types';
import { hydrateReadingPlan } from '../utils/readingPlanFromProfile';

/** Ensure arrays and nested objects exist so saves never crash on .push() or .length. */
export function normalizeAppData(raw: AppData): AppData {
  const defaults = createEmptyAppData();
  return {
    ...defaults,
    ...raw,
    version: 1,
    journeyStartedAt: raw.journeyStartedAt ?? defaults.journeyStartedAt,
    trainingFocus: raw.trainingFocus ?? null,
    trainingVerse: raw.trainingVerse ?? null,
    trainingFocusHistory: Array.isArray(raw.trainingFocusHistory)
      ? raw.trainingFocusHistory
      : [],
    trainingVerseArchive: Array.isArray(raw.trainingVerseArchive)
      ? raw.trainingVerseArchive
      : [],
    dailyEntries: raw.dailyEntries && typeof raw.dailyEntries === 'object'
      ? raw.dailyEntries
      : {},
    prayers: Array.isArray(raw.prayers) ? raw.prayers : [],
    lessonsLearned: Array.isArray(raw.lessonsLearned) ? raw.lessonsLearned : [],
    readingLog: Array.isArray(raw.readingLog) ? raw.readingLog : [],
    readingPlan: hydrateReadingPlan(raw.readingPlan ?? defaults.readingPlan),
    spiritualAssessment: raw.spiritualAssessment ?? null,
    servingDiscovery: raw.servingDiscovery ?? null,
    onboardingProgress: raw.onboardingProgress ?? {},
    cloudSyncedAt: raw.cloudSyncedAt,
    trailStartMode: raw.trailStartMode ?? null,
    lastBackupAt: raw.lastBackupAt,
  };
}

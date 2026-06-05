import { createEmptyAppData } from '../data/emptyData';
import type { AppData } from '../types';
import { ensureFocusHasReadingPlan, suggestedVerseForFocus } from '../utils/suggestReadingForFocus';
import { hydrateReadingPlan } from '../utils/readingPlanFromProfile';
import { createId } from '../utils/id';
import { toDateKey } from '../utils/date';

/** Ensure arrays and nested objects exist so saves never crash on .push() or .length. */
export function normalizeAppData(raw: AppData): AppData {
  const defaults = createEmptyAppData();
  const normalized: AppData = {
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

  if (normalized.trainingFocus && !normalized.readingPlan.currentBook?.trim()) {
    normalized.readingPlan = ensureFocusHasReadingPlan(normalized);
    if (!normalized.trainingVerse) {
      const verse = suggestedVerseForFocus(
        normalized.trainingFocus.title,
        normalized.trainingFocus.themes,
      );
      if (verse) {
        normalized.trainingVerse = {
          id: createId(),
          reference: verse.reference,
          text: verse.text,
          startedAt: normalized.trainingFocus.startedAt || toDateKey(),
          linkedFocusId: normalized.trainingFocus.id,
          themes: normalized.trainingFocus.themes,
        };
      }
    }
    if (!normalized.trailStartMode) {
      normalized.trailStartMode = 'quick_path';
    }
  }

  return normalized;
}

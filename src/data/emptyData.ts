import type { AppData } from '../types';
import { toDateKey } from '../utils/date';

export function createEmptyAppData(): AppData {
  const today = toDateKey();
  return {
    version: 1,
    journeyStartedAt: today,
    trainingFocus: null,
    trainingFocusHistory: [],
    trainingVerse: null,
    trainingVerseArchive: [],
    dailyEntries: {},
    prayers: [],
    lessonsLearned: [],
    readingLog: [],
    readingPlan: {
      currentBook: '',
      currentChapter: 1,
      chaptersCompletedInBook: [],
    },
    spiritualAssessment: null,
    servingDiscovery: null,
    onboardingProgress: {},
  };
}

export function isAppDataEmpty(data: AppData): boolean {
  if (data.readingPlan?.currentBook?.trim()) return false;
  if (data.trailStartMode) return false;
  return (
    !data.trainingFocus &&
    !data.trainingVerse &&
    data.trainingFocusHistory.length === 0 &&
    data.trainingVerseArchive.length === 0 &&
    Object.keys(data.dailyEntries).length === 0 &&
    data.prayers.length === 0 &&
    data.lessonsLearned.length === 0 &&
    data.readingLog.length === 0
  );
}

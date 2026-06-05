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
  const history = data.trainingFocusHistory ?? [];
  const verseArchive = data.trainingVerseArchive ?? [];
  const entries = data.dailyEntries ?? {};
  const prayers = data.prayers ?? [];
  const lessons = data.lessonsLearned ?? [];
  const readingLog = data.readingLog ?? [];

  return (
    !data.trainingFocus &&
    !data.trainingVerse &&
    history.length === 0 &&
    verseArchive.length === 0 &&
    Object.keys(entries).length === 0 &&
    prayers.length === 0 &&
    lessons.length === 0 &&
    readingLog.length === 0
  );
}

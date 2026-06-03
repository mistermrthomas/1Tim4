import type { AppData, ReadingPlan } from '../types';

/** Single-chapter (or focused) reading to begin without assessment. */
export function buildPassageReadingPlan(book: string, chapter: number): ReadingPlan {
  const b = book.trim();
  const ch = Math.max(1, chapter);
  return {
    currentBook: b,
    currentChapter: ch,
    chaptersCompletedInBook: [],
    scopeMode: 'chapter_range',
    startChapter: ch,
    endChapter: ch,
    anchorChapter: ch,
    anchorLabel: `${b} ${ch}`,
  };
}

export type TrailStartMode = 'quick_read' | 'quick_path' | 'assessment';

export function hasStartedTrail(data: AppData): boolean {
  if (data.trailStartMode) return true;
  if (data.trainingFocus) return true;
  if (data.readingPlan?.currentBook?.trim()) return true;
  if (data.spiritualAssessment?.status === 'accepted') return true;
  return (
    Object.keys(data.dailyEntries).length > 0 ||
    data.prayers.length > 0 ||
    data.lessonsLearned.length > 0
  );
}

import type { ChapterReference, ReadingPlan } from '../types';
import { hydrateReadingPlan } from './readingPlanFromProfile';

/** Chapter counts for common reading-plan books (NASB trail defaults). */
export const BOOK_CHAPTER_COUNT: Record<string, number> = {
  James: 5,
  Philippians: 4,
  Romans: 16,
  Galatians: 6,
  '1 Corinthians': 16,
  '2 Corinthians': 13,
  Matthew: 28,
  John: 21,
  Psalms: 150,
  Psalm: 150,
  Proverbs: 31,
  Ephesians: 6,
  Colossians: 4,
  Lamentations: 5,
  Micah: 7,
  Deuteronomy: 34,
  '1 Thessalonians': 5,
};

export function getChapterCount(book: string): number | null {
  return BOOK_CHAPTER_COUNT[book.trim()] ?? null;
}

export function formatChapterLabel(book: string, chapter: number): string {
  return `${book} ${chapter}`;
}

export function getNextChapterInPlan(
  plan: ReadingPlan,
  book: string,
  chapter: number,
): ChapterReference | null {
  const p = hydrateReadingPlan(plan);
  const trimmed = book.trim();
  if (!trimmed || chapter < 1 || trimmed !== p.currentBook) return null;

  const end = p.endChapter;
  if (chapter >= end) return null;
  return { book: trimmed, chapter: chapter + 1 };
}

/** After logging chapters read, advance to the next chapter within the plan scope. */
export function advanceReadingPlan(
  plan: ReadingPlan,
  chaptersRead: ChapterReference[],
): ReadingPlan {
  const base = hydrateReadingPlan(plan);
  if (!base.currentBook) return base;

  const completed = new Set(base.chaptersCompletedInBook);
  let currentChapter = base.currentChapter;

  for (const ch of chaptersRead) {
    if (!ch.book || ch.chapter < 1) continue;
    if (ch.book === base.currentBook) {
      completed.add(ch.chapter);
      if (ch.chapter >= currentChapter) {
        const next = getNextChapterInPlan(base, ch.book, ch.chapter);
        currentChapter = next ? next.chapter : Math.min(ch.chapter, base.endChapter);
      }
    }
  }

  if (currentChapter < base.startChapter) {
    currentChapter = base.startChapter;
  }

  return {
    ...base,
    currentChapter,
    chaptersCompletedInBook: [...completed].sort((a, b) => a - b),
  };
}

export function getUpcomingChapter(plan: ReadingPlan): ChapterReference | null {
  const p = hydrateReadingPlan(plan);
  if (!p.currentBook || p.currentChapter < 1) return null;
  if (p.currentChapter > p.endChapter) return null;
  return { book: p.currentBook, chapter: p.currentChapter };
}

export function isReadingPlanComplete(plan: ReadingPlan): boolean {
  const p = hydrateReadingPlan(plan);
  if (!p.currentBook) return false;
  for (let c = p.startChapter; c <= p.endChapter; c++) {
    if (!p.chaptersCompletedInBook.includes(c)) return false;
  }
  return true;
}

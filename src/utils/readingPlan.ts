import type { ChapterReference, ReadingPlan } from '../types';

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

export function getNextChapter(book: string, chapter: number): ChapterReference | null {
  const trimmed = book.trim();
  if (!trimmed || chapter < 1) return null;
  const max = getChapterCount(trimmed);
  if (max && chapter < max) {
    return { book: trimmed, chapter: chapter + 1 };
  }
  return null;
}

/** After logging chapters read, advance today's pointer to the next unread chapter. */
export function advanceReadingPlan(
  plan: ReadingPlan,
  chaptersRead: ChapterReference[],
): ReadingPlan {
  if (!plan.currentBook) return plan;

  const completed = new Set(plan.chaptersCompletedInBook);
  let currentBook = plan.currentBook;
  let currentChapter = plan.currentChapter;

  for (const ch of chaptersRead) {
    if (!ch.book || ch.chapter < 1) continue;
    if (ch.book === currentBook) {
      completed.add(ch.chapter);
      if (ch.chapter >= currentChapter) {
        const next = getNextChapter(currentBook, ch.chapter);
        if (next) {
          currentChapter = next.chapter;
        } else {
          currentChapter = ch.chapter;
        }
      }
    }
  }

  return {
    currentBook,
    currentChapter,
    chaptersCompletedInBook: [...completed].sort((a, b) => a - b),
  };
}

export function getUpcomingChapter(plan: ReadingPlan): ChapterReference | null {
  if (!plan.currentBook || plan.currentChapter < 1) return null;
  return { book: plan.currentBook, chapter: plan.currentChapter };
}

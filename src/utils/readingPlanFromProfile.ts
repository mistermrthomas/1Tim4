import type { ReadingPlan, ReadingScopeMode } from '../types';
import { BOOK_CHAPTER_COUNT, formatChapterLabel } from './readingPlan';

export interface ReadingPlanSource {
  readingBook: string;
  readingStartChapter: number;
  readingEndChapter: number;
  readingScope: ReadingScopeMode;
  readingAnchorChapter: number;
  readingAnchorLabel: string;
}

export function resolveEndChapter(book: string, scope: ReadingScopeMode, rangeEnd: number): number {
  const max = BOOK_CHAPTER_COUNT[book.trim()];
  if (scope === 'whole_book' && max) return max;
  return rangeEnd;
}

export function buildReadingPlanFromSource(source: ReadingPlanSource): ReadingPlan {
  const book = source.readingBook.trim();
  const endChapter = resolveEndChapter(book, source.readingScope, source.readingEndChapter);
  const start = Math.max(1, source.readingStartChapter);

  return {
    currentBook: book,
    currentChapter: start,
    chaptersCompletedInBook: [],
    scopeMode: source.readingScope,
    startChapter: start,
    endChapter,
    anchorChapter: source.readingAnchorChapter,
    anchorLabel: source.readingAnchorLabel,
  };
}

export function hydrateReadingPlan(plan: ReadingPlan): Required<
  Pick<ReadingPlan, 'scopeMode' | 'startChapter' | 'endChapter'>
> &
  ReadingPlan {
  const book = plan.currentBook?.trim() ?? '';
  const anchor = plan.anchorChapter ?? (plan.currentChapter >= 1 ? plan.currentChapter : 1);
  const max = book ? BOOK_CHAPTER_COUNT[book] : undefined;

  const scopeMode = plan.scopeMode ?? 'whole_book';
  const startChapter = plan.startChapter ?? 1;
  const endChapter =
    plan.endChapter ??
    (scopeMode === 'whole_book' && max ? max : Math.max(startChapter, anchor));

  const currentChapter =
    plan.currentChapter >= 1
      ? Math.min(Math.max(plan.currentChapter, startChapter), endChapter)
      : startChapter;

  return {
    ...plan,
    scopeMode,
    startChapter,
    endChapter,
    anchorChapter: plan.anchorChapter ?? anchor,
    anchorLabel: plan.anchorLabel,
    currentChapter,
  };
}

export function formatReadingProgressLabel(plan: ReadingPlan): string {
  const p = hydrateReadingPlan(plan);
  if (!p.currentBook) return '';

  const range =
    p.startChapter === p.endChapter
      ? formatChapterLabel(p.currentBook, p.startChapter)
      : `${p.currentBook} ${p.startChapter}–${p.endChapter}`;

  if (p.scopeMode === 'whole_book') {
    return `Read ${p.currentBook} in order, starting at chapter ${p.startChapter}`;
  }
  return `Read ${range} in order, one chapter at a time`;
}

export function formatThemeChapterLabel(plan: ReadingPlan): string | null {
  const p = hydrateReadingPlan(plan);
  if (!p.anchorChapter || !p.currentBook) return null;
  if (p.anchorChapter === p.currentChapter && p.scopeMode === 'whole_book') return null;
  return p.anchorLabel ?? formatChapterLabel(p.currentBook, p.anchorChapter);
}

import type { ReadingPlan } from '../../types';
import { BibleChapterLink } from '../shared/BibleChapterLink';
import {
  formatThemeChapterLabel,
  formatReadingProgressLabel,
  hydrateReadingPlan,
} from '../../utils/readingPlanFromProfile';
import { formatChapterLabel, getNextChapterInPlan, getUpcomingChapter } from '../../utils/readingPlan';
import './TodaysReading.css';

interface TodaysReadingProps {
  plan: ReadingPlan;
  todayChapters: { book: string; chapter: number }[];
}

export function TodaysReading({ plan, todayChapters }: TodaysReadingProps) {
  const reading =
    todayChapters.length > 0
      ? todayChapters[0]
      : { book: plan.currentBook, chapter: plan.currentChapter };

  const hydrated = hydrateReadingPlan(plan);
  const completed = hydrated.chaptersCompletedInBook.length;
  const upcoming = getUpcomingChapter(hydrated);
  const nextUp = upcoming ? getNextChapterInPlan(hydrated, upcoming.book, upcoming.chapter) : null;
  const themeChapter = formatThemeChapterLabel(hydrated);
  const progressNote = formatReadingProgressLabel(hydrated);

  return (
    <section className="todays-reading card" aria-label="Today's reading">
      <div className="todays-reading__head">
        <span className="eyebrow">Today&apos;s reading</span>
        <BibleChapterLink book={reading.book} chapter={reading.chapter} />
      </div>
      {progressNote && <p className="todays-reading__progress">{progressNote}</p>}
      {themeChapter && (
        <p className="todays-reading__theme field-hint">Training connection: {themeChapter}</p>
      )}
      {completed > 0 && (
        <p className="todays-reading__logged field-hint">
          {completed} chapter{completed === 1 ? '' : 's'} logged in this plan
        </p>
      )}
      {nextUp && (
        <p className="todays-reading__next field-hint">
          After you check off today&apos;s chapter in Prepare, up next:{' '}
          {formatChapterLabel(nextUp.book, nextUp.chapter)}
        </p>
      )}
    </section>
  );
}

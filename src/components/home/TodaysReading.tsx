import type { ReadingPlan } from '../../types';
import { BibleChapterLink } from '../shared/BibleChapterLink';
import { formatChapterLabel, getNextChapter, getUpcomingChapter } from '../../utils/readingPlan';
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

  const completed = plan.chaptersCompletedInBook.length;
  const upcoming = getUpcomingChapter(plan);
  const nextUp = upcoming ? getNextChapter(upcoming.book, upcoming.chapter) : null;

  return (
    <section className="todays-reading card" aria-label="Today's reading">
      <div className="todays-reading__head">
        <span className="eyebrow">Today&apos;s reading</span>
        <BibleChapterLink book={reading.book} chapter={reading.chapter} />
      </div>
      <p className="todays-reading__progress">
        {completed > 0
          ? `${completed} chapter${completed === 1 ? '' : 's'} recorded in ${plan.currentBook}`
          : plan.currentBook
            ? `Working through ${plan.currentBook}`
            : 'Set a reading plan in Guide or your assessment'}
      </p>
      {nextUp && (
        <p className="todays-reading__next field-hint">
          After you check off today&apos;s chapter in Prepare, up next:{' '}
          {formatChapterLabel(nextUp.book, nextUp.chapter)}
        </p>
      )}
    </section>
  );
}

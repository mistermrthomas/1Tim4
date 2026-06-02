import type { ReadingPlan } from '../../types';
import './TodaysReading.css';

interface TodaysReadingProps {
  plan: ReadingPlan;
  todayChapters: { book: string; chapter: number }[];
}

export function TodaysReading({ plan, todayChapters }: TodaysReadingProps) {
  const display =
    todayChapters.length > 0
      ? todayChapters.map((c) => `${c.book} ${c.chapter}`).join(', ')
      : `${plan.currentBook} ${plan.currentChapter}`;

  const completed = plan.chaptersCompletedInBook.length;

  return (
    <section className="todays-reading card" aria-label="Today's reading">
      <div className="todays-reading__head">
        <span className="eyebrow">Today&apos;s reading</span>
        <span className="todays-reading__current">{display}</span>
      </div>
      <p className="todays-reading__progress">
        {completed > 0
          ? `${completed} chapter${completed === 1 ? '' : 's'} recorded in ${plan.currentBook}`
          : `Continuing in ${plan.currentBook}`}
      </p>
    </section>
  );
}

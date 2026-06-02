import type { LessonLearned } from '../../types';
import { formatDisplayDate } from '../../utils/date';
import './LessonsCard.css';

export function LessonsCard({ lessons }: { lessons: LessonLearned[] }) {
  const recent = lessons.slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <section className="lessons-card" aria-label="Lessons learned">
      <div className="lessons-card__label">Lessons learned</div>
      {recent.map((lesson) => (
        <div key={lesson.id} className="lessons-card__item">
          <p className="lessons-card__text serif">&ldquo;{lesson.text}&rdquo;</p>
          <p className="lessons-card__from">From {lesson.sourceType} · {formatDisplayDate(lesson.sourceDate)}</p>
        </div>
      ))}
    </section>
  );
}

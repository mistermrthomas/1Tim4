import type { TrainingVerse } from '../../types';
import { formatSince } from '../../utils/date';
import './TrainingVerseCard.css';

export function TrainingVerseCard({ verse, compact }: { verse: TrainingVerse; compact?: boolean }) {
  return (
    <section
      className={`training-verse${compact ? ' training-verse--compact' : ''}`}
      aria-label="Training verse"
    >
      <p className="training-verse__label">Training verse</p>
      <p className="training-verse__text serif">{verse.text}</p>
      <p className="training-verse__ref">{verse.reference}</p>
      {!compact && (
        <p className="training-verse__companion">
          Carried on the trail since {formatSince(verse.startedAt)}
        </p>
      )}
    </section>
  );
}

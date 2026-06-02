import type { TrainingVerse } from '../../types';
import { formatSince } from '../../utils/date';
import { ScriptureVerse } from '../shared/ScriptureVerse';
import './TrainingVerseCard.css';

export function TrainingVerseCard({ verse, compact }: { verse: TrainingVerse; compact?: boolean }) {
  return (
    <section
      className={`training-verse${compact ? ' training-verse--compact' : ''}`}
      aria-label="Training verse"
    >
      <p className="training-verse__label">Training verse</p>
      <ScriptureVerse reference={verse.reference} text={verse.text} />
      {!compact && (
        <p className="training-verse__companion">
          Carried on the trail since {formatSince(verse.startedAt)}
        </p>
      )}
    </section>
  );
}

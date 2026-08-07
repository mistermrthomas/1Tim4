import { Link } from 'react-router-dom';
import { todayDateKey } from '../../domain/physical/store';
import { PhysicalTrainingPanel } from './PhysicalTrainingPanel';

function formatSundayHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Sunday Today when this week’s biblical training is not yet built. */
export function SundaySermonPrompt() {
  const todayKey = todayDateKey();

  return (
    <div className="today-preview path-fade-in">
      <div className="today-grid">
        <div className="today-grid__main">
          <header className="today-hero">
            <p className="path-eyebrow">Sunday</p>
            <h1 className="path-display today-hero__title">{formatSundayHeader(todayKey)}</h1>
            <p className="today-hero__focus" style={{ marginTop: '0.65rem' }}>
              Enter today’s sermon notes to prepare the week.
            </p>
          </header>

          <section className="path-surface sunday-sermon-prompt">
            <p className="path-body" style={{ margin: '0 0 1rem' }}>
              PATH turns one sermon into daily biblical training. Physical and work training stay on
              their own tracks.
            </p>
            <Link className="path-btn path-btn--primary sunday-sermon-prompt__btn" to="/sermon">
              Add Sermon Notes
            </Link>
          </section>
        </div>
        <PhysicalTrainingPanel unscheduled />
      </div>
    </div>
  );
}

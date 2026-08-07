import { Link } from 'react-router-dom';
import { isSaturdaySabbath, toLocalDateKey } from '../../domain/calendar/week';
import { PhysicalTrainingPanel } from './PhysicalTrainingPanel';

/**
 * Today when no biblical week is active — weekdays / Saturday.
 * Sunday without training uses SundaySermonPrompt instead.
 */
export function TodayPlanningEmpty() {
  const sabbath = isSaturdaySabbath();

  return (
    <div className="today-preview path-fade-in">
      <div className="today-grid">
        <div className="today-grid__main">
          <div className="today-grid__header">
            <p className="path-eyebrow today-preview__eyebrow">PATH</p>
            <header className="today-hero">
              <div className="today-hero__row">
                <h1 className="path-display today-hero__title">Today</h1>
                <p className="today-hero__theme">
                  {sabbath ? 'Sabbath' : 'No active training week'}
                </p>
              </div>
              <p className="today-hero__focus">
                {sabbath
                  ? 'Rest. Enter next Sunday’s sermon notes when the week begins.'
                  : 'Enter Sunday’s sermon notes to build this week’s biblical training.'}
              </p>
              <p className="today-hero__meta">{toLocalDateKey()}</p>
            </header>
          </div>

          <section className="today-week-banner path-surface">
            <p className="today-panel__label">Biblical training</p>
            <p className="path-body">
              PATH builds the week from one sermon. Physical and work training continue on their own
              tracks.
            </p>
            <div className="today-week-banner__actions">
              <Link className="path-btn path-btn--primary" to="/sermon">
                Sunday Sermon
              </Link>
            </div>
          </section>
        </div>

        <PhysicalTrainingPanel unscheduled />
      </div>
    </div>
  );
}

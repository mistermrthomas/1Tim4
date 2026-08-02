import { Link } from 'react-router-dom';
import {
  followingSundayStart,
  isSaturdaySabbath,
  isSundayPlanningDay,
  toLocalDateKey,
} from '../../domain/calendar/week';
import { startNextWeekPath } from '../weeklyPlan/WeeklyPlanWorkspace';
import { PhysicalTrainingPanel } from './PhysicalTrainingPanel';

/** Today when no weekly plan is active — sermon-first Sunday planning. */
export function TodayPlanningEmpty() {
  const sabbath = isSaturdaySabbath();
  const sunday = isSundayPlanningDay();

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
                  {sunday ? 'Weekly planning day' : sabbath ? 'Sabbath' : 'No active week yet'}
                </p>
              </div>
              <p className="today-hero__focus-label">Status</p>
              <p className="today-hero__focus">
                {sunday
                  ? 'Start with this week’s sermon.'
                  : sabbath
                    ? 'Rest. Begin next week’s plan when Sunday comes.'
                    : 'Activate a weekly plan to see today’s assignments.'}
              </p>
              <p className="today-hero__meta">{toLocalDateKey()}</p>
              <p className="today-hero__plan-link">
                <Link to="/journey">Journey</Link>
                <span aria-hidden> · </span>
                <Link to={startNextWeekPath()}>Weekly plan</Link>
              </p>
            </header>
          </div>

          {sabbath ? (
            <section className="today-week-banner today-week-banner--sabbath path-surface">
              <p className="today-panel__label">Sabbath</p>
              <p className="path-body">
                Rest from structured training. Be present with family and friends.
              </p>
              <div className="today-week-banner__actions">
                <Link className="path-btn path-btn--ghost" to={`/plan/week/${followingSundayStart()}`}>
                  Plan next week
                </Link>
              </div>
            </section>
          ) : (
            <section className="today-week-banner path-surface">
              <p className="today-panel__label">
                {sunday ? 'Sunday · Weekly kickoff' : 'Weekly planning'}
              </p>
              <p className="path-body">
                <strong>Start with this week’s sermon.</strong> Add your church notes or paste the
                link to the sermon you need to watch. Then build faith, training, and work — and
                activate the week.
              </p>
              <div className="today-week-banner__actions">
                <Link className="path-btn path-btn--primary" to={startNextWeekPath()}>
                  Build This Week’s Plan
                </Link>
                <Link
                  className="path-btn path-btn--ghost"
                  to={`/plan/week/${followingSundayStart()}`}
                >
                  Start Next Week
                </Link>
              </div>
            </section>
          )}
        </div>

        <PhysicalTrainingPanel unscheduled />
      </div>
    </div>
  );
}

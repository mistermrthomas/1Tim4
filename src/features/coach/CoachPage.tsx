import { Link } from 'react-router-dom';
import { startNextWeekPath } from '../weeklyPlan/WeeklyPlanWorkspace';
import './CoachPage.css';

const GUIDANCE = [
  {
    title: 'After missed sessions',
    body: 'Use a shorter session tomorrow. Keep the same practice — reduce volume, not identity.',
  },
  {
    title: 'Recurring pressure',
    body: 'Name one clarifying question before you reply when inbox or overlapping meetings surface.',
  },
  {
    title: 'Shoulder caution',
    body: 'Incline pressing and shoulder-isolation work have irritated the left shoulder before. Prefer caution over progression.',
  },
  {
    title: 'Training adjustment',
    body: 'If a session feels long, keep the main lifts from this week’s plan and protect recovery.',
  },
];

export function CoachPage() {
  return (
    <div className="coach-preview path-fade-in">
      <header className="coach-preview__hero">
        <p className="path-eyebrow">Guidance and adjustments</p>
        <h1 className="path-display coach-preview__title">Coach</h1>
        <p className="path-body coach-preview__lede">
          Steadying reminders for this week’s faith, training, and work tracks. AI-assisted coaching
          arrives later.
        </p>
      </header>

      <p className="coach-preview__card path-surface">
        Review Biblical content against Scripture and your own judgment before activating any weekly
        plan.
      </p>

      <section className="coach-section" aria-labelledby="coach-guidance">
        <h2 id="coach-guidance" className="path-display coach-section__title">
          Steadying reminders
        </h2>
        <ul className="coach-section__list">
          {GUIDANCE.map((item) => (
            <li key={item.title} className="path-surface">
              <p className="coach-section__item-title">{item.title}</p>
              <p className="path-body">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="coach-preview__actions">
        <Link className="path-btn path-btn--primary" to={startNextWeekPath()}>
          Build This Week’s Plan
        </Link>
        <Link className="path-btn path-btn--ghost" to="/today">
          Today
        </Link>
      </div>
    </div>
  );
}

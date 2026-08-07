import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listWeeklyPlans } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { listCompletedSessions } from '../../domain/physical/workoutTracker';
import './GrowthPage.css';

export function GrowthPage() {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [ready, setReady] = useState(false);
  const workouts = listCompletedSessions().filter((s) => s.status === 'completed').length;

  useEffect(() => {
    let cancelled = false;
    listWeeklyPlans()
      .then((list) => {
        if (!cancelled) {
          setPlans(list.filter((p) => p.status === 'completed' || p.saturdayReflection.completedAt));
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <p className="growth-preview__loading">Loading growth…</p>;

  return (
    <div className="growth-preview path-fade-in">
      <header className="growth-preview__hero">
        <p className="path-eyebrow">Review progress</p>
        <h1 className="path-display growth-preview__title">Growth</h1>
        <p className="path-body growth-preview__lede">
          Patterns from completed weeks — themes practiced, obedience, training, and work.
        </p>
      </header>

      <section className="growth-section">
        <h2 className="path-display growth-section__title">At a glance</h2>
        <ul className="growth-section__cards">
          <li className="path-surface">
            <p className="growth-section__card-title">Completed weeks</p>
            <p className="path-body">{plans.length}</p>
          </li>
          <li className="path-surface">
            <p className="growth-section__card-title">Workouts completed</p>
            <p className="path-body">{workouts}</p>
          </li>
        </ul>
      </section>

      <section className="growth-section" aria-labelledby="growth-reflections">
        <h2 id="growth-reflections" className="path-display growth-section__title">
          Weekly reflections
        </h2>
        {plans.length === 0 ? (
          <p className="path-body">
            Complete a Saturday reflection and mark a week completed to begin this history.
          </p>
        ) : (
          <ul className="growth-section__cards">
            {plans.map((p) => (
              <li key={p.id} className="path-surface">
                <p className="growth-section__card-title">
                  {p.weekStartDate} → {p.weekEndDate}
                </p>
                <p className="path-body">
                  <strong>{p.biblical.weeklyTheme || p.church.sermonTitle || 'Week'}</strong>
                </p>
                {p.biblical.actOfObedience ? (
                  <p className="path-body">Act of obedience: {p.biblical.actOfObedience}</p>
                ) : null}
                {p.saturdayReflection.godShowed ? (
                  <p className="path-body">God showed: {p.saturdayReflection.godShowed}</p>
                ) : null}
                {p.saturdayReflection.carryForward ? (
                  <p className="path-body">Carry forward: {p.saturdayReflection.carryForward}</p>
                ) : null}
                <Link className="path-btn path-btn--ghost" to="/sermon">
                  Sunday Sermon
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="growth-preview__actions">
        <Link className="path-btn path-btn--primary" to="/journey">
          Journey
        </Link>
        <Link className="path-btn path-btn--ghost" to="/today">
          Today
        </Link>
      </div>
    </div>
  );
}

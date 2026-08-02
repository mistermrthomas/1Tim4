import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { followingSundayStart, nextSundayStart, startOfWeekSunday } from '../../domain/calendar/week';
import { listWeeklyPlans } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { startNextWeekPath } from '../weeklyPlan/WeeklyPlanWorkspace';
import './JourneyPage.css';

export function JourneyPage() {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [ready, setReady] = useState(false);
  const thisWeekStart = startOfWeekSunday();
  const nextWeek = followingSundayStart();

  useEffect(() => {
    let cancelled = false;
    listWeeklyPlans()
      .then((list) => {
        if (!cancelled) {
          setPlans(list);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlans([]);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(
    () => plans.find((p) => p.status === 'active') ?? null,
    [plans],
  );
  const upcoming = useMemo(
    () =>
      plans.find(
        (p) =>
          p.status === 'draft' &&
          (p.weekStartDate === nextWeek || p.weekStartDate === nextSundayStart()),
      ) ?? plans.find((p) => p.status === 'draft' && p.weekStartDate >= thisWeekStart) ?? null,
    [plans, nextWeek, thisWeekStart],
  );
  const past = useMemo(
    () =>
      plans.filter(
        (p) =>
          p.status === 'completed' ||
          p.status === 'archived' ||
          (p.weekEndDate < thisWeekStart && p.status !== 'active'),
      ),
    [plans, thisWeekStart],
  );
  const sermons = useMemo(
    () =>
      plans.filter(
        (p) => p.church.sermonTitle.trim() || p.church.sermonNotes.trim() || p.church.sermonUrl.trim(),
      ),
    [plans],
  );

  if (!ready) return <p className="journey-preview__loading">Loading journey…</p>;

  return (
    <div className="journey-preview path-fade-in">
      <header className="journey-preview__hero">
        <p className="path-eyebrow">Weekly planning</p>
        <h1 className="path-display journey-preview__title">Journey</h1>
        <p className="journey-preview__purpose">
          This week, next week, past weeks, and the sermons that shaped them.
        </p>
      </header>

      <div className="journey-preview__actions">
        <Link className="path-btn path-btn--primary" to={startNextWeekPath()}>
          {active ? 'Edit This Week' : 'Build This Week’s Plan'}
        </Link>
        <Link className="path-btn path-btn--ghost" to={`/plan/week/${nextWeek}`}>
          Plan Next Week
        </Link>
        <Link className="path-btn path-btn--ghost" to="/today">
          Today
        </Link>
      </div>

      <section className="journey-summary">
        <article className="journey-summary__card path-surface">
          <p className="path-label">This week</p>
          {active ? (
            <>
              <h2 className="journey-summary__title">
                {active.biblical.weeklyTheme || active.church.sermonTitle || 'Active week'}
              </h2>
              <p className="path-body">
                {active.weekStartDate} → {active.weekEndDate}
              </p>
              <p className="path-body">
                Faith · Training · Work
                {active.biblical.actOfObedience
                  ? ` · Obedience: ${active.biblical.actOfObedience}`
                  : ''}
              </p>
              <Link className="path-btn path-btn--ghost" to={`/plan/week/${active.weekStartDate}`}>
                View This Week
              </Link>
            </>
          ) : (
            <>
              <h2 className="journey-summary__title">No active week</h2>
              <p className="path-body">Start with this week’s sermon, then activate the plan.</p>
            </>
          )}
        </article>
      </section>

      <section className="journey-summary" style={{ marginTop: '1rem' }}>
        <article className="journey-summary__card path-surface">
          <p className="path-label">Upcoming</p>
          {upcoming ? (
            <>
              <h2 className="journey-summary__title">
                Draft · {upcoming.weekStartDate} → {upcoming.weekEndDate}
              </h2>
              <p className="path-body">
                {upcoming.church.sermonTitle || 'Sermon not captured yet'}
              </p>
              <Link className="path-btn path-btn--ghost" to={`/plan/week/${upcoming.weekStartDate}`}>
                Continue draft
              </Link>
            </>
          ) : (
            <>
              <h2 className="journey-summary__title">No draft yet</h2>
              <p className="path-body">Plan next week when you’re ready.</p>
              <Link className="path-btn path-btn--ghost" to={`/plan/week/${nextWeek}`}>
                Plan Next Week
              </Link>
            </>
          )}
        </article>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 className="path-display" style={{ fontSize: '1.25rem' }}>
          Past weeks
        </h2>
        {past.length === 0 ? (
          <p className="path-body">Completed weeks will appear here.</p>
        ) : (
          <ul className="journey-summary" style={{ listStyle: 'none', padding: 0 }}>
            {past.map((p) => (
              <li key={p.id} className="journey-summary__card path-surface">
                <p className="path-label">
                  {p.weekStartDate} → {p.weekEndDate} · {p.status}
                </p>
                <h3 className="journey-summary__title">
                  {p.church.sermonTitle || p.biblical.weeklyTheme || 'Weekly plan'}
                </h3>
                <p className="path-body">{p.biblical.weeklyTheme}</p>
                {p.saturdayReflection.godShowed ? (
                  <p className="path-body">Reflection: {p.saturdayReflection.godShowed}</p>
                ) : null}
                <Link className="path-btn path-btn--ghost" to={`/plan/week/${p.weekStartDate}`}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 className="path-display" style={{ fontSize: '1.25rem' }}>
          Sermon archive
        </h2>
        {sermons.length === 0 ? (
          <p className="path-body">Sermons from your weekly plans will collect here.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sermons.map((p) => (
              <li key={p.id} className="path-surface" style={{ padding: '0.85rem 1rem' }}>
                <p className="path-label">{p.church.sermonDate || p.weekStartDate}</p>
                <p className="path-body">
                  <strong>{p.church.sermonTitle || 'Untitled sermon'}</strong>
                  {p.church.speaker ? ` · ${p.church.speaker}` : ''}
                </p>
                {p.church.primaryScripture ? (
                  <p className="path-body">{p.church.primaryScripture}</p>
                ) : null}
                {p.church.sermonUrl ? (
                  <a href={p.church.sermonUrl} target="_blank" rel="noreferrer">
                    Sermon link
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

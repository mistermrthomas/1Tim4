import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import { resolveActivePlan, type ActivePlan } from '../../domain/training/activePlan';
import './JourneyPage.css';

type PlanTab = 'biblical' | 'physical';

export function JourneyPage() {
  const [pack, setPack] = useState<InstalledSeasonPack | null>(null);
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [tab, setTab] = useState<PlanTab>('biblical');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSeasonPack()
      .then((loaded) => {
        if (cancelled) return;
        setPack(loaded);
        setPlan(resolveActivePlan(loaded, 1, 'Day 1'));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="journey-preview__error">{error}</p>;
  if (!pack || !plan) return <p className="journey-preview__loading">Loading journey…</p>;

  const template =
    pack.data.workouts.templates.find((t) => t.id === pack.data.season.physicalTemplateId) ??
    pack.data.workouts.templates[0];

  return (
    <div className="journey-preview path-fade-in">
      <header className="journey-preview__hero">
        <p className="path-eyebrow">Goals and plan</p>
        <h1 className="path-display journey-preview__title">Journey</h1>
        <p className="journey-preview__purpose">
          PATH holds two independent training tracks in one daily schedule — Biblical Training and
          Physical Training.
        </p>
      </header>

      <div className="journey-preview__actions">
        <Link className="path-btn path-btn--primary" to="/today">
          Train today
        </Link>
        <Link className="path-btn path-btn--ghost" to="/plan/week">
          This week’s plan
        </Link>
        <Link className="path-btn path-btn--ghost" to="/plan">
          Manage plans
        </Link>
      </div>

      <div className="journey-summary">
        <article className="journey-summary__card path-surface">
          <p className="path-label">Active biblical plan</p>
          <h2 className="journey-summary__title">{plan.seasonTitle}</h2>
          <p className="path-body">
            Week 1 of {plan.durationWeeks} · {plan.spiritual.primaryGoal}
          </p>
        </article>
        <article className="journey-summary__card path-surface">
          <p className="path-label">Active physical plan</p>
          <h2 className="journey-summary__title">{template?.name ?? 'Strength Foundation'}</h2>
          <p className="path-body">
            {plan.physical.workoutsPerWeek} workouts per week · {plan.physical.primaryGoal}
          </p>
        </article>
      </div>

      <div className="journey-tabs" role="tablist" aria-label="Plan tracks">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'biblical'}
          className={`journey-tabs__tab${tab === 'biblical' ? ' journey-tabs__tab--active' : ''}`}
          onClick={() => setTab('biblical')}
        >
          Biblical plan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'physical'}
          className={`journey-tabs__tab${tab === 'physical' ? ' journey-tabs__tab--active' : ''}`}
          onClick={() => setTab('physical')}
        >
          Physical plan
        </button>
      </div>

      {tab === 'biblical' ? (
        <section className="journey-plan" aria-label="Biblical plan">
          <div className="journey-plan__head">
            <p className="path-label">Biblical training</p>
            <h2 className="path-display journey-plan__title">
              Season {String(plan.seasonNumber).padStart(2, '0')}: {plan.seasonTitle}
            </h2>
            <p className="journey-plan__meta">
              Develop Christian character through Scripture, teaching, practice, and reflection.
            </p>
          </div>
          <ul className="journey-plan__list">
            <li>
              <span className="journey-plan__key">Primary goal</span>
              <span>{plan.spiritual.primaryGoal}</span>
            </li>
            <li>
              <span className="journey-plan__key">Secondary goal</span>
              <span>{plan.spiritual.secondaryGoal}</span>
            </li>
          </ul>
          <p className="journey-plan__subhead">Weekly progression</p>
          <ol className="journey-plan__weeks">
            {plan.spiritual.weeklyProgression.map((week) => (
              <li key={week.weekIndex}>
                <strong>
                  Week {week.weekIndex}: {week.theme}
                </strong>
                <span>{week.intent}</span>
              </li>
            ))}
          </ol>
          <Link className="path-btn path-btn--ghost journey-plan__edit" to="/plan">
            Edit biblical plan
          </Link>
        </section>
      ) : (
        <section className="journey-plan" aria-label="Physical plan">
          <div className="journey-plan__head">
            <p className="path-label">Physical training</p>
            <h2 className="path-display journey-plan__title">
              {template?.name ?? 'Strength Foundation'}
            </h2>
            <p className="journey-plan__meta">
              Build strength, health, and physical consistency. Sourced from the workout tracker
              templates.
            </p>
          </div>
          <ul className="journey-plan__list">
            <li>
              <span className="journey-plan__key">Primary goal</span>
              <span>{plan.physical.primaryGoal}</span>
            </li>
            <li>
              <span className="journey-plan__key">Schedule</span>
              <span>{plan.physical.workoutsPerWeek} workouts per week</span>
            </li>
          </ul>
          <p className="journey-plan__subhead">Workout rotation</p>
          <ul className="journey-plan__rotation">
            {plan.physical.rotation.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p className="journey-plan__subhead">Daily targets</p>
          <ul className="journey-plan__rotation">
            <li>Protein — {plan.physical.foundations.proteinG}g</li>
            <li>Water — {plan.physical.foundations.waterOz} oz</li>
            <li>Recovery — {plan.physical.foundations.recovery}</li>
          </ul>
          <Link className="path-btn path-btn--ghost journey-plan__edit" to="/plan">
            Edit physical plan
          </Link>
        </section>
      )}

      <p className="path-body journey-preview__note">
        Changing the biblical plan does not alter the physical plan, and changing the physical plan
        does not alter the biblical plan.
      </p>
    </div>
  );
}

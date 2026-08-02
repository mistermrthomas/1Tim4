import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import { resolveActivePlan, type ActivePlan } from '../../domain/training/activePlan';
import './CoachPage.css';

const GUIDANCE = [
  {
    title: 'After missed sessions',
    body: 'Use Short or Two-Minute mode tomorrow. Keep the same character practice — reduce volume, not identity.',
  },
  {
    title: 'Recurring pressure',
    body: 'Inbox and overlapping meetings keep surfacing. Name one clarifying question before you reply in those moments.',
  },
  {
    title: 'Theme continuation',
    body: 'Week focus is still relevant. Stay with “recognizing pressure” until noticing becomes automatic.',
  },
  {
    title: 'Workout adjustment',
    body: 'If Full Body A feels long, keep the three main lifts and protect recovery. Consistency beats intensity this season.',
  },
];

export function CoachPage() {
  const [pack, setPack] = useState<InstalledSeasonPack | null>(null);
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSeasonPack()
      .then((loaded) => {
        if (cancelled) return;
        setPack(loaded);
        setPlan(resolveActivePlan(loaded));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="coach-preview__error">{error}</p>;
  if (!pack || !plan) return <p className="coach-preview__loading">Loading coach…</p>;

  const dailyCard = pack.data.coachIntents
    .find((i) => i.intentKey === 'daily_card')
    ?.template.replace('{{primaryRef}}', 'Matthew 5:38-42');

  return (
    <div className="coach-preview path-fade-in">
      <header className="coach-preview__hero">
        <p className="path-eyebrow">Guidance and adjustments</p>
        <h1 className="path-display coach-preview__title">Coach</h1>
        <p className="path-body coach-preview__lede">
          Coach helps adjust Biblical and Physical plans independently. It does not replace Journey
          or Today’s execution.
        </p>
        <p className="coach-preview__plan-ref">
          Active plan: Season {String(plan.seasonNumber).padStart(2, '0')} · {plan.seasonTitle}
        </p>
      </header>

      {dailyCard ? <p className="coach-preview__card path-surface">{dailyCard}</p> : null}

      <section className="coach-section" aria-labelledby="coach-guidance">
        <h2 id="coach-guidance" className="path-display coach-section__title">
          Recommended adjustments
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

      <section className="coach-section" aria-labelledby="coach-next">
        <h2 id="coach-next" className="path-display coach-section__title">
          Build the next step
        </h2>
        <div className="coach-next path-surface">
          <p className="path-body">
            When this season ends, Coach can help choose whether to deepen patience, shift secondary
            focus, or raise physical consistency — then send you to Manage Plan to publish it.
          </p>
          <div className="coach-preview__actions">
            <Link className="path-btn path-btn--primary" to="/plan">
              Open plan builder
            </Link>
            <Link className="path-btn path-btn--ghost" to="/growth">
              Review growth evidence
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

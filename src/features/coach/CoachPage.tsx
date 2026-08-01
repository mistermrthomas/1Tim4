import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import './CoachPage.css';

export function CoachPage() {
  const [pack, setPack] = useState<InstalledSeasonPack | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSeasonPack()
      .then((loaded) => {
        if (!cancelled) setPack(loaded);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="coach-preview__error">{error}</p>;
  if (!pack) return <p className="coach-preview__loading">Loading coach…</p>;

  const intents = pack.data.coachIntents;

  return (
    <div className="coach-preview path-fade-in">
      <header className="coach-preview__hero">
        <p className="path-eyebrow">Coach leads</p>
        <h1 className="path-display coach-preview__title">Coach</h1>
        <p className="path-body coach-preview__lede">
          About 90% proactive structured coaching. Ask Coach is a bounded 10% — never the center of
          the product.
        </p>
      </header>

      <p className="coach-preview__card path-surface">
        {intents
          .find((i) => i.intentKey === 'daily_card')
          ?.template.replace('{{primaryRef}}', 'Matthew 5:38-42')}
      </p>

      <h2 className="path-display coach-preview__h2">Grounded intents</h2>
      <ul className="coach-preview__intents">
        {intents.map((intent) => (
          <li key={intent.intentKey} className="path-surface path-surface--interactive">
            <strong>{intent.intentKey}</strong>
            <span>Lens: {intent.priorityLens.replace('_', ' ')}</span>
            <p>Grounded in: {intent.groundingReferenceIds.join(', ')}</p>
          </li>
        ))}
      </ul>

      <p className="path-body">
        Ask Coach soft cap and AI narration land next. For this preview, train from Today’s plan.
      </p>

      <Link className="path-btn path-btn--primary coach-preview__cta" to="/today">
        Open today’s coaching
      </Link>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import { PATH_MEDIA } from '../../ui/media';
import './JourneyPage.css';

export function JourneyPage() {
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

  if (error) return <p className="journey-preview__error">{error}</p>;
  if (!pack) return <p className="journey-preview__loading">Loading journey…</p>;

  const { season, weeks, days } = pack.data;

  return (
    <div className="journey-preview path-fade-in">
      <header className="journey-preview__hero path-scene">
        <img className="path-scene__img" src={PATH_MEDIA.scriptureDesk} alt="" />
        <div className="path-scene__veil" />
        <div className="journey-preview__copy path-scene__content">
          <p className="path-eyebrow">Where am I going?</p>
          <h1 className="path-display journey-preview__title">Journey</h1>
          <p className="journey-preview__season">{season.title}</p>
          <p className="path-body journey-preview__lede">{season.theme}</p>
          <p className="path-body journey-preview__lede">{season.summary}</p>
        </div>
      </header>

      <dl className="journey-preview__facts">
        <div className="path-surface">
          <dt className="path-label">Primary focus</dt>
          <dd>{season.primaryFocusKey}</dd>
        </div>
        <div className="path-surface">
          <dt className="path-label">Secondary</dt>
          <dd>{season.secondaryFocusKey}</dd>
        </div>
        <div className="path-surface">
          <dt className="path-label">Physical track</dt>
          <dd>{season.physicalTemplateId.replaceAll('_', ' ')}</dd>
        </div>
        <div className="path-surface">
          <dt className="path-label">Reassessment</dt>
          <dd>
            Week {season.reassessmentWeekIndex} · {season.graceDays}-day grace
          </dd>
        </div>
      </dl>

      <h2 className="path-display journey-preview__h2">Six-week roadmap</h2>
      <ol className="journey-preview__weeks">
        {weeks.map((week) => {
          const sampleDays = days.filter((d) => d.weekIndex === week.weekIndex).map((d) => d.dayKey);
          return (
            <li key={week.weekIndex} className="path-surface path-surface--interactive">
              <strong>
                Week {week.weekIndex} · {week.theme}
              </strong>
              <span className="journey-preview__stage">{week.stageKey.replaceAll('_', ' ')}</span>
              <p className="path-body">{week.intent}</p>
              {sampleDays.length ? (
                <p className="journey-preview__samples">Preview days: {sampleDays.join(', ')}</p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <Link className="path-btn path-btn--primary journey-preview__cta" to="/today">
        Train today
      </Link>
    </div>
  );
}

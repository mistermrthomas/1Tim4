import { Link } from 'react-router-dom';
import { ProgressMeter } from '../../ui/ProgressMeter';
import { PATH_MEDIA } from '../../ui/media';
import './GrowthPage.css';

const METRICS = [
  { label: 'Workout completion', value: 'Preview', percent: 40 },
  { label: 'Training consistency', value: 'Pattern', percent: 28 },
  { label: 'Strength progression', value: 'Template', percent: 22 },
  { label: 'Movement', value: 'Walks', percent: 35 },
  { label: 'Sleep', value: 'When entered', percent: 18 },
  { label: 'Energy / recovery', value: 'Evening', percent: 30 },
  { label: 'Body weight', value: 'Optional', percent: 10 },
];

export function GrowthPage() {
  return (
    <div className="growth-preview path-fade-in">
      <header className="growth-preview__hero path-scene">
        <img className="path-scene__img" src={PATH_MEDIA.trainPlates} alt="" />
        <div className="path-scene__veil" />
        <div className="growth-preview__copy path-scene__content">
          <p className="path-eyebrow">How am I changing?</p>
          <h1 className="path-display growth-preview__title">Growth</h1>
          <p className="path-body growth-preview__lede">
            Evidence of becoming — physical capacity, recovery, character observations, and life
            application stay distinct. No single spiritual score.
          </p>
        </div>
      </header>

      <ul className="growth-preview__metrics">
        {METRICS.map((m) => (
          <li key={m.label} className="path-surface">
            <ProgressMeter label={m.label} valueLabel={m.value} percent={m.percent} />
            <p className="path-body">
              {m.label === 'Body weight'
                ? 'Never the dominant metric.'
                : 'Supports coaching — not a scoreboard.'}
            </p>
          </li>
        ))}
      </ul>

      <p className="path-body growth-preview__note">
        Fruit observations and journal highlights appear after evening reflections — framed for
        honesty, not verdicts.
      </p>

      <Link className="path-btn path-btn--primary growth-preview__cta" to="/today">
        Capture today’s evidence
      </Link>
    </div>
  );
}

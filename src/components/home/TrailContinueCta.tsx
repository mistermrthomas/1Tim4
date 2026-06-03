import { Link } from 'react-router-dom';
import type { TodaysTrailStep } from '../../utils/todaysTrail';
import './TrailContinueCta.css';

interface TrailContinueCtaProps {
  step: TodaysTrailStep;
}

export function TrailContinueCta({ step }: TrailContinueCtaProps) {
  if (!step.nextPath || !step.nextLabel) {
    return (
      <div className="trail-continue trail-continue--done card">
        <p className="trail-continue__eyebrow eyebrow">Today&apos;s trail</p>
        <p className="trail-continue__title serif">All three markers entered</p>
        <p className="trail-continue__lead">Prepare, Live, and Reflect are recorded for today.</p>
      </div>
    );
  }

  return (
    <div className="trail-continue card">
      <p className="trail-continue__eyebrow eyebrow">Continue today&apos;s trail</p>
      <p className="trail-continue__progress">
        {step.completedCount} of 3 ·{' '}
        {step.nextStage === 'prepare'
          ? 'Start with reading'
          : step.nextStage === 'live'
            ? 'Pause at midday'
            : 'Close the day'}
      </p>
      <Link to={step.nextPath} className="btn btn-primary trail-continue__cta">
        {step.nextLabel}
      </Link>
    </div>
  );
}

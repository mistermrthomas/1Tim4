import { Link } from 'react-router-dom';
import { APP_NAME, TAGLINE } from '../../constants/brand';
import { useApp } from '../../context/AppContext';
import { HeroArt } from '../illustrations/FieldGuideArt';
import './HomeOnboarding.css';

export function HomeOnboarding() {
  const { loadDemoData, spiritualAssessment } = useApp();

  const assessmentCta = (() => {
    if (spiritualAssessment?.status === 'in_progress') {
      return { label: 'Resume your intake', to: '/assessment' };
    }
    if (spiritualAssessment?.status === 'completed') {
      return { label: 'Review your suggested plan', to: '/assessment' };
    }
    return { label: 'Start first training plan', to: '/assessment' };
  })();

  return (
    <article className="welcome-cover" aria-label="Welcome">
      <div className="welcome-cover__artwork">
        <HeroArt visualKey="default" alt="Mountain wilderness — begin your journey" />
        <div className="welcome-cover__scrim" aria-hidden="true" />
        <div className="welcome-cover__stamp">
          <span className="welcome-cover__stamp-kicker">{APP_NAME}</span>
          <span className="welcome-cover__stamp-title">{TAGLINE}</span>
        </div>
      </div>

      <header className="welcome-cover__plate">
        <p className="welcome-cover__eyebrow">Welcome, traveler</p>
        <h1 className="welcome-cover__title serif">Begin your journey</h1>
        <p className="welcome-cover__lead">
          A companion for walking with God and documenting spiritual formation over time.
          Start with a brief intake conversation, not a test — then begin your first
          training season on the path ahead.
        </p>
      </header>

      <section className="welcome-cover__intake card">
        <p className="welcome-cover__intake-label eyebrow">New trail</p>
        <h2 className="welcome-cover__intake-title serif">Initial spiritual assessment</h2>
        <p className="welcome-cover__intake-desc">
          Six trail markers covering your season, walk with God, growth, relationships,
          and reflection — ending with a suggested training focus, verse, and reading.
        </p>
        <Link to={assessmentCta.to} className="btn btn-primary welcome-cover__intake-cta">
          {assessmentCta.label}
        </Link>
      </section>

      <section className="welcome-cover__trail">
        <h2 className="welcome-cover__subtitle serif">The daily trail</h2>
        <div className="welcome-cover__stages">
          <StageCard time="Morning" name="Prepare" desc="Read, reflect, set your heart." to="/prepare" />
          <StageCard time="Midday" name="Live" desc="Pause. Remember your focus." to="/live" />
          <StageCard time="Evening" name="Reflect" desc="Review. Capture what matters." to="/reflect" />
        </div>
      </section>

      <footer className="welcome-cover__actions">
        <Link to="/guide" className="btn btn-secondary">Set focus manually in Guide</Link>
        <button type="button" className="btn btn-ghost" onClick={loadDemoData}>
          Explore demo expedition
        </button>
      </footer>
    </article>
  );
}

function StageCard({
  time,
  name,
  desc,
  to,
}: {
  time: string;
  name: string;
  desc: string;
  to: string;
}) {
  return (
    <Link to={to} className="welcome-cover__stage">
      <span className="welcome-cover__stage-time">{time}</span>
      <span className="welcome-cover__stage-name serif">{name}</span>
      <span className="welcome-cover__stage-desc">{desc}</span>
    </Link>
  );
}

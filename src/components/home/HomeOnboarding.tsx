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
    return { label: 'Take the full intake (optional)', to: '/assessment' };
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
          Start reading Scripture today — then reflect in Prepare. The full intake is
          optional whenever you want a personalized training season.
        </p>
      </header>

      <section className="welcome-cover__intake card welcome-cover__intake--primary">
        <p className="welcome-cover__intake-label eyebrow">Quick start</p>
        <h2 className="welcome-cover__intake-title serif">Start reading now</h2>
        <p className="welcome-cover__intake-desc">
          Pick a passage (or get a suggestion), open it in your Bible app, then answer
          follow-up questions tied to what you read.
        </p>
        <Link to="/quick-start" className="btn btn-primary welcome-cover__intake-cta">
          Choose a passage
        </Link>
      </section>

      <section className="welcome-cover__intake card">
        <p className="welcome-cover__intake-label eyebrow">Full trail plan</p>
        <h2 className="welcome-cover__intake-title serif">Initial spiritual assessment</h2>
        <p className="welcome-cover__intake-desc">
          Six trail markers — season, walk with God, growth, relationships — ending with
          a suggested focus, verse, and reading plan.
        </p>
        <Link to={assessmentCta.to} className="btn btn-secondary welcome-cover__intake-cta">
          {assessmentCta.label}
        </Link>
      </section>

      <section className="welcome-cover__trail">
        <h2 className="welcome-cover__subtitle serif">The daily trail</h2>
        <div className="welcome-cover__stages">
          <StageCard time="Morning" name="Prepare" desc="Read Scripture, then reflect and set your heart." to="/prepare" />
          <StageCard time="Midday" name="Live" desc="Pause. Remember your focus." to="/live" />
          <StageCard time="Evening" name="Reflect" desc="Review. Capture what matters." to="/reflect" />
        </div>
      </section>

      <footer className="welcome-cover__actions">
        <Link to="/guide" className="btn btn-ghost">Set focus manually in Guide</Link>
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

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SERVING_INTRO, SERVING_SECTIONS, getServingSectionQuestions } from '../constants/servingAssessment';
import { SERVING_LANES } from '../data/servingLanes';
import type { ServingSuggestion } from '../types';
import { SubPageHeader } from '../components/layout/PageHeader';
import './AssessmentPage.css';

type Phase = 'intro' | 'sections' | 'results';

export function ServingAssessmentPage() {
  const navigate = useNavigate();
  const {
    servingDiscovery,
    startServingDiscovery,
    saveServingProgress,
    completeServingDiscovery,
  } = useApp();

  const [phase, setPhase] = useState<Phase>(() => {
    if (servingDiscovery?.status === 'completed') return 'results';
    if (servingDiscovery?.status === 'in_progress') return 'sections';
    return 'intro';
  });

  const [sectionIndex, setSectionIndex] = useState(() => servingDiscovery?.sectionIndex ?? 0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => servingDiscovery?.answers ?? {},
  );
  const [result, setResult] = useState<ServingSuggestion | null>(
    () => servingDiscovery?.suggestion ?? null,
  );
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (phase === 'sections') window.scrollTo(0, 0);
  }, [sectionIndex, phase]);

  const section = SERVING_SECTIONS[sectionIndex];
  const questions = useMemo(
    () => (section ? getServingSectionQuestions(section.id) : []),
    [section],
  );

  const handleStart = () => {
    if (servingDiscovery?.status === 'in_progress') {
      setPhase('sections');
      setSectionIndex(servingDiscovery.sectionIndex);
      setAnswers(servingDiscovery.answers);
      return;
    }
    startServingDiscovery();
    setPhase('sections');
    setSectionIndex(0);
    setAnswers({});
  };

  const handleBack = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      if (sectionIndex === 0) {
        setPhase('intro');
        return;
      }
      const prev = sectionIndex - 1;
      setSectionIndex(prev);
      saveServingProgress(prev, answers);
    } finally {
      setIsNavigating(false);
    }
  };

  const handleContinue = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      const isLast = sectionIndex >= SERVING_SECTIONS.length - 1;
      if (isLast) {
        const suggestion = completeServingDiscovery(answers);
        setResult(suggestion);
        setPhase('results');
        return;
      }
      const next = sectionIndex + 1;
      setSectionIndex(next);
      saveServingProgress(next, answers);
    } finally {
      setIsNavigating(false);
    }
  };

  if (phase === 'intro') {
    return (
      <main className="page-content page-content--form assessment-page">
        <SubPageHeader title={SERVING_INTRO.title} subtitle={SERVING_INTRO.subtitle} />
        <div className="assessment-banner card">
          <p className="assessment-banner__lead">{SERVING_INTRO.lead}</p>
          <button type="button" className="btn btn-primary" onClick={handleStart}>
            {servingDiscovery?.status === 'in_progress' ? 'Resume discovery' : 'Begin serving discovery'}
          </button>
        </div>
        <p className="assessment-page__note">
          <Link to="/guide">Return to Guide</Link>
        </p>
      </main>
    );
  }

  if (phase === 'results' && result) {
    const primary = SERVING_LANES[result.primaryLane];
    return (
      <main className="page-content page-content--form assessment-page">
        <SubPageHeader title="Your serving fit" subtitle="Based on your answers — a starting point, not a label." />
        <article className="assessment-results">
          <section className="assessment-results__block card">
            <p className="eyebrow">Strongest fit</p>
            <h2 className="assessment-results__focus serif">{result.primaryTitle}</h2>
            <p className="assessment-results__why">{result.headline}</p>
            <p className="assessment-results__why">{result.whySummary}</p>
          </section>

          <section className="assessment-results__block card">
            <p className="eyebrow">Also worth considering</p>
            <ul className="serving-results__lanes">
              {result.lanes.slice(1).map((lane) => (
                <li key={lane.key}>
                  <strong>{lane.title}</strong>
                  <span>{lane.summary}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="assessment-results__grid">
            <div className="assessment-results__block card">
              <p className="eyebrow">Strengths to lean on</p>
              <ul className="serving-results__bullets">
                {result.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="assessment-results__block card">
              <p className="eyebrow">Watchouts</p>
              <ul className="serving-results__bullets">
                {result.watchouts.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          </section>

          <p className="field-hint serving-results__examples">
            Examples for {primary.title}: {primary.examples.join(' · ')}
          </p>

          <div className="assessment-results__actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>
              Return to trail
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleStart}>
              Retake discovery
            </button>
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="page-content page-content--form assessment-page">
      <SubPageHeader title={section.title} subtitle={section.subtitle} />
      <div className="assessment-progress">
        {SERVING_SECTIONS.map((s, i) => (
          <div
            key={s.id}
            className={`assessment-progress__step${i === sectionIndex ? ' assessment-progress__step--active' : ''}${i < sectionIndex ? ' assessment-progress__step--done' : ''}`}
          >
            <span className="assessment-progress__dot" />
            <span className="assessment-progress__label">{s.milestone}</span>
          </div>
        ))}
      </div>

      <section className="assessment-section card">
        {questions.map((q) => (
          <div key={q.id} className="field">
            <label className="field-label" htmlFor={q.id}>{q.text}</label>
            <textarea
              id={q.id}
              className="text-area"
              value={answers[q.id] ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              rows={3}
            />
          </div>
        ))}
        <footer className="assessment-section__nav">
          <button type="button" className="btn btn-secondary" onClick={handleBack} disabled={isNavigating}>
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={isNavigating}>
            {sectionIndex >= SERVING_SECTIONS.length - 1 ? 'See your fit' : 'Continue'}
          </button>
        </footer>
      </section>
    </main>
  );
}

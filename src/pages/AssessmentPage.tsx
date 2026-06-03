import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { APP_NAME } from '../constants/brand';
import {
  ASSESSMENT_INTRO,
  ASSESSMENT_SECTIONS,
  FRUIT_OPTIONS,
  getSectionQuestions,
} from '../constants/assessment';
import {
  FOCUS_PROFILES,
  MANUAL_FOCUS_OPTIONS,
  getAssessmentHeroKey,
  profileToSuggestion,
} from '../data/assessmentProfiles';
import type { AssessmentFocusKey, AssessmentSuggestion } from '../types';
import { bibleTranslationDisplay } from '../constants/bible';
import { BibleChapterLink } from '../components/shared/BibleChapterLink';
import { GoDeeperPanel } from '../components/study/GoDeeperPanel';
import { ScriptureVerse } from '../components/shared/ScriptureVerse';
import { HeroArt } from '../components/illustrations/FieldGuideArt';
import { SubPageHeader } from '../components/layout/PageHeader';
import './AssessmentPage.css';

type Phase = 'intro' | 'sections' | 'results';

export function AssessmentPage() {
  const navigate = useNavigate();
  const {
    spiritualAssessment,
    startAssessment,
    saveAssessmentProgress,
    completeAssessment,
    acceptAssessmentPlan,
    isEmpty,
  } = useApp();

  const [phase, setPhase] = useState<Phase>(() => {
    if (spiritualAssessment?.status === 'completed') return 'results';
    if (spiritualAssessment?.status === 'in_progress') return 'sections';
    return 'intro';
  });

  const [sectionIndex, setSectionIndex] = useState(
    () => spiritualAssessment?.sectionIndex ?? 0,
  );
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => spiritualAssessment?.answers ?? {},
  );
  const [result, setResult] = useState<AssessmentSuggestion | null>(
    () => spiritualAssessment?.suggestion ?? null,
  );
  const [manualKey, setManualKey] = useState<AssessmentFocusKey | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    if (spiritualAssessment?.status === 'accepted') {
      navigate('/', { replace: true });
    }
  }, [spiritualAssessment?.status, navigate]);

  useEffect(() => {
    if (phase === 'sections') {
      window.scrollTo(0, 0);
    }
  }, [sectionIndex, phase]);

  const section = ASSESSMENT_SECTIONS[sectionIndex];
  const questions = useMemo(
    () => (section ? getSectionQuestions(section.id) : []),
    [section],
  );

  const displayResult = useMemo(() => {
    if (!result) return null;
    if (!manualKey || manualKey === result.focusKey) return result;
    const profile = FOCUS_PROFILES[manualKey];
    return profileToSuggestion(profile, result.whyFocus);
  }, [result, manualKey]);

  const updateAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleStart = () => {
    if (spiritualAssessment?.status === 'in_progress') {
      setPhase('sections');
      setSectionIndex(spiritualAssessment.sectionIndex);
      setAnswers(spiritualAssessment.answers);
      return;
    }
    startAssessment();
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
      saveAssessmentProgress(prev, answers);
    } finally {
      setIsNavigating(false);
    }
  };

  const handleContinue = () => {
    if (isNavigating || planLoading) return;
    setIsNavigating(true);
    try {
      const isLast = sectionIndex >= ASSESSMENT_SECTIONS.length - 1;
      if (isLast) {
        void finishAssessment();
        return;
      }
      const next = sectionIndex + 1;
      setSectionIndex(next);
      saveAssessmentProgress(next, answers);
    } finally {
      setIsNavigating(false);
    }
  };

  const finishAssessment = async () => {
    setPlanLoading(true);
    try {
      const suggestion = await completeAssessment(answers);
      setResult(suggestion);
      setPhase('results');
    } finally {
      setPlanLoading(false);
      setIsNavigating(false);
    }
  };

  const handleAccept = () => {
    if (!displayResult) return;
    acceptAssessmentPlan({
      focusTitle: displayResult.focusTitle,
      focusDescription: displayResult.focusDescription,
      focusThemes: displayResult.focusThemes,
      verseReference: displayResult.verseReference,
      verseText: displayResult.verseText,
      readingBook: displayResult.readingBook,
      readingChapter: displayResult.readingChapter,
      readingStartChapter: displayResult.readingStartChapter,
      readingEndChapter: displayResult.readingEndChapter,
      readingScope: displayResult.readingScope,
      readingAnchorLabel: displayResult.readingLabel,
    });
    navigate('/', { replace: true });
  };

  if (phase === 'intro') {
    return (
      <main className="page-content page-content--form assessment-page">
        <AssessmentBanner />
        <IntroPanel onStart={handleStart} hasProgress={spiritualAssessment?.status === 'in_progress'} />
        {!isEmpty && (
          <p className="assessment-page__note">
            <Link to="/">Return to today&apos;s trail</Link>
          </p>
        )}
      </main>
    );
  }

  if (phase === 'results' && displayResult) {
    return (
      <main className="page-content page-content--form assessment-page">
        <AssessmentBanner compact />
        <ResultsPanel
          result={displayResult}
          showPicker={showPicker}
          onTogglePicker={() => setShowPicker((v) => !v)}
          manualKey={manualKey ?? displayResult.focusKey}
          onSelectFocus={(key) => {
            setManualKey(key);
            setShowPicker(false);
          }}
          onAccept={handleAccept}
        />
      </main>
    );
  }

  if (!section) return null;

  return (
    <main className="page-content page-content--form assessment-page">
      <AssessmentBanner compact />
      <ProgressTrail current={sectionIndex} />

      <article className="assessment-section card">
        <p className="assessment-section__milestone eyebrow">{section.milestone}</p>
        <h1 className="assessment-section__title serif">{section.title}</h1>
        <p className="assessment-section__subtitle">{section.subtitle}</p>
        <div className="assessment-section__questions">
          {questions.map((q) =>
            q.type === 'fruit' ? (
              <FruitQuestion
                key={q.id}
                label={q.text}
                value={answers[q.id] ?? ''}
                onChange={(v) => updateAnswer(q.id, v)}
              />
            ) : (
              <div key={q.id} className="field assessment-field">
                <label className="field-label" htmlFor={q.id}>{q.text}</label>
                <textarea
                  id={q.id}
                  className="text-area assessment-field__input"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  rows={3}
                  placeholder="Take your time — a few honest sentences are enough."
                />
              </div>
            ),
          )}
        </div>

        {planLoading && (
          <div className="assessment-plan-loading" role="status" aria-live="polite">
            <p className="assessment-plan-loading__title serif">Mapping your trail plan</p>
            <p className="assessment-plan-loading__hint field-hint">
              Reading your intake responses… This usually takes a few seconds.
            </p>
          </div>
        )}

        <footer className="assessment-section__nav">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBack}
            disabled={isNavigating || planLoading}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleContinue}
            disabled={isNavigating || planLoading}
          >
            {planLoading
              ? 'Preparing your plan…'
              : sectionIndex >= ASSESSMENT_SECTIONS.length - 1
                ? 'Review your trail plan'
                : 'Continue'}
          </button>
        </footer>
      </article>

      <p className="assessment-page__progress-note">
        Section {sectionIndex + 1} of {ASSESSMENT_SECTIONS.length} · Not graded or scored
      </p>
    </main>
  );
}

function AssessmentBanner({ compact }: { compact?: boolean }) {
  return (
    <div className={`assessment-banner${compact ? ' assessment-banner--compact' : ''}`}>
      <HeroArt visualKey="default" alt="" className="assessment-banner__art" />
      <div className="assessment-banner__scrim" aria-hidden="true" />
      <div className="assessment-banner__label">
        <p className="eyebrow">{APP_NAME} · Intake</p>
        {!compact && (
          <p className="assessment-banner__tagline serif">A conversation before your first season</p>
        )}
      </div>
    </div>
  );
}

function IntroPanel({
  onStart,
  hasProgress,
}: {
  onStart: () => void;
  hasProgress: boolean;
}) {
  return (
    <article className="assessment-intro card">
      <SubPageHeader title={ASSESSMENT_INTRO.title} subtitle={ASSESSMENT_INTRO.subtitle} />
      <p className="assessment-intro__lead">{ASSESSMENT_INTRO.lead}</p>
      <ul className="assessment-intro__list">
        <li>About 15–20 minutes, at your own pace</li>
        <li>Six trail markers — not a test</li>
        <li>Ends with a suggested first training plan you can accept or adjust</li>
      </ul>
      <button type="button" className="btn btn-primary assessment-intro__cta" onClick={onStart}>
        {hasProgress ? 'Resume intake' : 'Start first training plan'}
      </button>
    </article>
  );
}

function ProgressTrail({ current }: { current: number }) {
  return (
    <nav className="assessment-progress" aria-label="Assessment progress">
      {ASSESSMENT_SECTIONS.map((s, i) => (
        <div
          key={s.id}
          className={`assessment-progress__step${
            i === current ? ' assessment-progress__step--current' : ''
          }${i < current ? ' assessment-progress__step--done' : ''}`}
        >
          <span className="assessment-progress__dot" aria-hidden="true" />
          <span className="assessment-progress__label">{s.milestone}</span>
        </div>
      ))}
    </nav>
  );
}

function FruitQuestion({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field assessment-field assessment-field--fruit">
      <p className="field-label">{label}</p>
      <div className="assessment-fruit-grid" role="group" aria-label={label}>
        {FRUIT_OPTIONS.map((fruit) => (
          <button
            key={fruit}
            type="button"
            className={`chip${value === fruit ? ' chip--active' : ''}`}
            onClick={() => onChange(fruit)}
            aria-pressed={value === fruit}
          >
            {fruit}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultsPanel({
  result,
  showPicker,
  onTogglePicker,
  manualKey,
  onSelectFocus,
  onAccept,
}: {
  result: AssessmentSuggestion;
  showPicker: boolean;
  onTogglePicker: () => void;
  manualKey: AssessmentFocusKey;
  onSelectFocus: (key: AssessmentFocusKey) => void;
  onAccept: () => void;
}) {
  const heroKey = getAssessmentHeroKey(result.focusKey);

  return (
    <article className="assessment-results">
      <header className="assessment-results__header">
        <p className="eyebrow">Your suggested training plan</p>
        <h1 className="assessment-results__title serif">Trail plan ready</h1>
        <p className="assessment-results__lead">
          Based on your answers — not a one-size-fits-all result. Accept this plan or choose a
          different focus below.
        </p>
        {result.guidanceSource === 'ai' && (
          <p className="field-hint assessment-results__ai-note">
            Trail guidance was shaped from your intake responses.
          </p>
        )}
      </header>

      <div className="assessment-results__hero card">
        <div className="assessment-results__hero-art">
          <HeroArt visualKey={heroKey} alt="" />
          <div className="assessment-results__hero-scrim" aria-hidden="true" />
        </div>
        <div className="assessment-results__hero-body">
          <p className="eyebrow">Suggested training focus</p>
          <h2 className="assessment-results__focus serif">{result.focusTitle}</h2>
          <p className="assessment-results__why">{result.whyFocus}</p>
        </div>
      </div>

      <section className="assessment-results__block card">
        <p className="eyebrow">Training verse</p>
        <ScriptureVerse
          reference={result.verseReference}
          text={result.verseText}
          translation={bibleTranslationDisplay(result.translation)}
        />
        <GoDeeperPanel
          reference={result.verseReference}
          verseText={result.verseText}
          trainingFocusTitle={result.focusTitle}
          compact
        />
      </section>

      <section className="assessment-results__grid">
        <div className="assessment-results__block card">
          <p className="eyebrow">Daily reading</p>
          <BibleChapterLink
            book={result.readingBook}
            chapter={result.readingStartChapter}
            className="assessment-results__reading"
          >
            {result.readingBook} {result.readingStartChapter}
            {result.readingEndChapter > result.readingStartChapter
              ? ` (through ${result.readingEndChapter})`
              : ''}
          </BibleChapterLink>
          <p className="field-hint" style={{ marginTop: 8 }}>
            {result.readingProgressLabel}
          </p>
          <p className="field-hint" style={{ marginTop: 4 }}>
            Training connection: {result.readingLabel}
          </p>
        </div>
        <div className="assessment-results__block card">
          <p className="eyebrow">Daily emphasis</p>
          <p className="assessment-results__emphasis">{result.dailyEmphasis}</p>
        </div>
      </section>

      <div className="assessment-results__actions">
        <button type="button" className="btn btn-primary" onClick={onAccept}>
          Begin training with this plan
        </button>
        <button type="button" className="btn btn-secondary" onClick={onTogglePicker}>
          {showPicker ? 'Hide focus options' : 'Choose a different focus'}
        </button>
      </div>

      {showPicker && (
        <div className="assessment-results__picker card">
          <p className="field-label">Select another training focus</p>
          <div className="chip-row">
            {MANUAL_FOCUS_OPTIONS.map((key) => (
              <button
                key={key}
                type="button"
                className={`chip${manualKey === key ? ' chip--active' : ''}`}
                onClick={() => onSelectFocus(key)}
              >
                {FOCUS_PROFILES[key].title}
              </button>
            ))}
          </div>
          <p className="field-hint">
            Verse and reading will update to match your selection when you begin training.
          </p>
        </div>
      )}
    </article>
  );
}

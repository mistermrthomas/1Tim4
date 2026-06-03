import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FOCUS_PROFILES } from '../data/assessmentProfiles';
import { QUICK_START_PASSAGES, QUICK_START_PATH_KEYS } from '../constants/quickStart';
import { useApp } from '../context/AppContext';
import { BibleChapterLink } from '../components/shared/BibleChapterLink';
import { SubPageHeader } from '../components/layout/PageHeader';
import type { AssessmentFocusKey } from '../types';
import './QuickStartPage.css';

export function QuickStartPage() {
  const navigate = useNavigate();
  const { quickStartPassage, quickStartWithPath, getSuggestedPassage } = useApp();
  const [suggested, setSuggested] = useState(() => getSuggestedPassage());
  const [showPaths, setShowPaths] = useState(false);

  const beginPassage = (book: string, chapter: number) => {
    quickStartPassage(book, chapter);
    navigate('/prepare', { replace: true });
  };

  const beginPath = (key: AssessmentFocusKey) => {
    quickStartWithPath(key);
    navigate('/prepare', { replace: true });
  };

  const refreshSuggestion = () => {
    setSuggested(getSuggestedPassage());
  };

  return (
    <main className="page-content page-content--form quick-start-page">
      <SubPageHeader
        title="Start reading"
        subtitle="No assessment required — pick a passage, read in your Bible app, then answer questions in Prepare."
      />

      <section className="quick-start__suggest card">
        <p className="eyebrow">Suggested for today</p>
        <h2 className="quick-start__suggest-title serif">{suggested.label}</h2>
        <p className="field-hint">{suggested.hint}</p>
        <div className="quick-start__suggest-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => beginPassage(suggested.book, suggested.chapter)}
          >
            Start with {suggested.label}
          </button>
          <button type="button" className="btn btn-secondary" onClick={refreshSuggestion}>
            Another suggestion
          </button>
        </div>
        <p className="field-hint quick-start__open">
          <BibleChapterLink book={suggested.book} chapter={suggested.chapter} />
        </p>
      </section>

      <section className="quick-start__list card">
        <p className="eyebrow">Or choose a passage</p>
        <ul className="quick-start__passages">
          {QUICK_START_PASSAGES.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="quick-start__passage-btn"
                onClick={() => beginPassage(p.book, p.chapter)}
              >
                <span className="quick-start__passage-label serif">{p.label}</span>
                <span className="quick-start__passage-hint">{p.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="quick-start__paths card">
        <button
          type="button"
          className="section-link quick-start__paths-toggle"
          onClick={() => setShowPaths((v) => !v)}
          aria-expanded={showPaths}
        >
          {showPaths ? 'Hide training paths' : 'Optional: pick a training path (focus + verse + reading)'}
        </button>
        {showPaths && (
          <>
            <p className="field-hint" style={{ marginTop: 10 }}>
              Same paths as the full assessment — without the intake conversation.
            </p>
            <ul className="quick-start__path-grid">
              {QUICK_START_PATH_KEYS.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => beginPath(key)}
                  >
                    {FOCUS_PROFILES[key].title}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <footer className="quick-start__footer">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
          Back to trail
        </button>
      </footer>
    </main>
  );
}

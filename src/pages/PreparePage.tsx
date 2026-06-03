import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SubPageHeader } from '../components/layout/PageHeader';
import { QuestionField } from '../components/forms/QuestionField';
import { ChapterChecklist, StandoutVerseField } from '../components/forms/VerseFields';
import { PREPARE_QUESTIONS, getRotatingQuestions, type Question } from '../constants/questions';
import { fetchChapterReadingQuestions } from '../services/readingQuestions';
import { dayOfYear } from '../utils/date';
import { hydrateReadingPlan } from '../utils/readingPlanFromProfile';
import type { ChapterReference, VerseReference, QuestionResponse } from '../types';
import './PreparePage.css';

function initialStandout(existing: { standoutVerses?: VerseReference[]; keyVerses?: VerseReference[] }) {
  const standout = existing.standoutVerses?.[0];
  if (standout?.reference || standout?.text) {
    return { reference: standout.reference ?? '', why: standout.text ?? '' };
  }
  const legacy = existing.keyVerses?.[0];
  if (legacy?.reference || legacy?.text) {
    return { reference: legacy.reference ?? '', why: legacy.text ?? '' };
  }
  return { reference: '', why: '' };
}

export function PreparePage() {
  const { todayEntry, savePrepare, data } = useApp();
  const navigate = useNavigate();
  const existing = todayEntry.prepare;

  const fallbackQuestions = useMemo(
    () => getRotatingQuestions(PREPARE_QUESTIONS, 4, dayOfYear()),
    [],
  );

  const [chapterQuestions, setChapterQuestions] = useState<Question[] | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsSource, setQuestionsSource] = useState<'ai' | 'default'>('default');

  const hydratedPlan = useMemo(() => hydrateReadingPlan(data.readingPlan), [data.readingPlan]);

  const [chaptersRead, setChaptersRead] = useState<ChapterReference[]>(
    existing?.chaptersRead ?? [],
  );
  const initial = initialStandout(existing ?? {});
  const [standoutRef, setStandoutRef] = useState(initial.reference);
  const [standoutWhy, setStandoutWhy] = useState(initial.why);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const q of fallbackQuestions) {
      const found = existing?.responses.find((r) => r.questionId === q.id);
      map[q.id] = found?.answer ?? '';
    }
    return map;
  });

  const focusChapter = useMemo(() => {
    if (chaptersRead.length > 0) {
      const last = chaptersRead[chaptersRead.length - 1];
      return { book: last.book, chapter: last.chapter };
    }
    if (hydratedPlan.currentBook) {
      return { book: hydratedPlan.currentBook, chapter: hydratedPlan.currentChapter };
    }
    return null;
  }, [chaptersRead, hydratedPlan.currentBook, hydratedPlan.currentChapter]);

  useEffect(() => {
    if (!focusChapter?.book || !focusChapter.chapter) {
      setChapterQuestions(null);
      setQuestionsSource('default');
      return;
    }

    let cancelled = false;
    setQuestionsLoading(true);
    void fetchChapterReadingQuestions(
      focusChapter.book,
      focusChapter.chapter,
      data.trainingFocus?.title,
    ).then((qs) => {
      if (cancelled) return;
      if (qs?.length) {
        setChapterQuestions(qs);
        setQuestionsSource('ai');
        setAnswers((prev) => {
          const next = { ...prev };
          for (const q of qs) {
            if (next[q.id] === undefined) next[q.id] = '';
          }
          return next;
        });
      } else {
        setChapterQuestions(null);
        setQuestionsSource('default');
      }
      setQuestionsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [focusChapter?.book, focusChapter?.chapter, data.trainingFocus?.title]);

  const activeQuestions = chapterQuestions ?? fallbackQuestions;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const responses: QuestionResponse[] = activeQuestions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: answers[q.id].trim(),
      }));

    const standoutVerses: VerseReference[] = standoutRef.trim()
      ? [{ reference: standoutRef.trim(), text: standoutWhy.trim() }]
      : [];

    savePrepare({
      chaptersRead: chaptersRead.filter((c) => c.book && c.chapter > 0),
      keyVerses: [],
      standoutVerses,
      notes: notes.trim(),
      responses,
    });
    navigate('/');
  };

  return (
    <main className="page-content page-content--form prepare-page">
      <SubPageHeader
        title="Prepare"
        subtitle="Read first, then name what stood out and answer questions about your reading."
      />

      <form className="prepare-page__form" onSubmit={handleSubmit}>
        <section className="prepare-page__section" aria-labelledby="prepare-reading-heading">
          <h2 id="prepare-reading-heading" className="prepare-page__section-title">
            Reading
          </h2>
          <ChapterChecklist
            plan={data.readingPlan}
            selected={chaptersRead}
            onChange={setChaptersRead}
            priorChapters={existing?.chaptersRead}
          />
          <StandoutVerseField
            reference={standoutRef}
            why={standoutWhy}
            onReferenceChange={setStandoutRef}
            onWhyChange={setStandoutWhy}
            trainingFocusTitle={data.trainingFocus?.title}
          />
        </section>

        <section className="prepare-page__section" aria-labelledby="prepare-questions-heading">
          <h2 id="prepare-questions-heading" className="prepare-page__section-title">
            Questions after reading
          </h2>
          {focusChapter && (
            <p className="prepare-page__section-lead field-hint">
              {questionsLoading && 'Preparing questions for your chapter…'}
              {!questionsLoading && questionsSource === 'ai' && (
                <>
                  Based on <strong>{focusChapter.book} {focusChapter.chapter}</strong> — tied to
                  what you read today.
                </>
              )}
              {!questionsLoading && questionsSource === 'default' && (
                <>
                  General morning questions
                  {focusChapter.book ? ` (read ${focusChapter.book} ${focusChapter.chapter} first)` : ''}.
                </>
              )}
            </p>
          )}
          {!focusChapter && (
            <p className="prepare-page__section-lead field-hint">
              Start a passage from the trail home to get chapter-specific questions.
            </p>
          )}
          {activeQuestions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id] ?? ''}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
            />
          ))}
        </section>

        <div className="field prepare-page__notes">
          <label className="field-label" htmlFor="notes">
            Notes <span className="prepare-page__optional">(optional)</span>
          </label>
          <textarea
            id="notes"
            className="text-area"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else from your reading..."
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {existing ? 'Update preparation' : 'Record preparation'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
            Return to trail
          </button>
        </div>
      </form>
    </main>
  );
}

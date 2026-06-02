import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SubPageHeader } from '../components/layout/PageHeader';
import { QuestionField } from '../components/forms/QuestionField';
import { ChapterField, VerseFields } from '../components/forms/VerseFields';
import { PREPARE_QUESTIONS, getRotatingQuestions } from '../constants/questions';
import { dayOfYear } from '../utils/date';
import type { ChapterReference, VerseReference, QuestionResponse } from '../types';

export function PreparePage() {
  const { todayEntry, savePrepare, data } = useApp();
  const navigate = useNavigate();
  const existing = todayEntry.prepare;

  const questions = useMemo(
    () => getRotatingQuestions(PREPARE_QUESTIONS, 4, dayOfYear()),
    [],
  );

  const [chapters, setChapters] = useState<ChapterReference[]>(
    existing?.chaptersRead.length
      ? existing.chaptersRead
      : [{ book: data.readingPlan.currentBook, chapter: data.readingPlan.currentChapter }],
  );
  const [keyVerses, setKeyVerses] = useState<VerseReference[]>(
    existing?.keyVerses.length ? existing.keyVerses : [{ reference: '', text: '' }],
  );
  const [standoutVerses, setStandoutVerses] = useState<VerseReference[]>(
    existing?.standoutVerses.length ? existing.standoutVerses : [{ reference: '', text: '' }],
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const q of questions) {
      const found = existing?.responses.find((r) => r.questionId === q.id);
      map[q.id] = found?.answer ?? '';
    }
    return map;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const responses: QuestionResponse[] = questions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: answers[q.id].trim(),
      }));

    savePrepare({
      chaptersRead: chapters.filter((c) => c.book && c.chapter > 0),
      keyVerses: keyVerses.filter((v) => v.reference.trim()),
      standoutVerses: standoutVerses.filter((v) => v.reference.trim()),
      notes: notes.trim(),
      responses,
    });
    navigate('/');
  };

  return (
    <main className="page-content page-content--form">
      <SubPageHeader
        title="Prepare"
        subtitle="Set your heart before the day begins."
      />

      <form onSubmit={handleSubmit}>
        <ChapterField chapters={chapters} onChange={setChapters} />

        <VerseFields
          keyVerses={keyVerses}
          standoutVerses={standoutVerses}
          onKeyVersesChange={setKeyVerses}
          onStandoutVersesChange={setStandoutVerses}
        />

        <div className="field">
          <label className="field-label" htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            className="text-area"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else from your reading..."
            rows={3}
          />
        </div>

        <div className="section-head" style={{ marginTop: 28 }}>
          <h2 className="section-title">Morning questions</h2>
        </div>

        {questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id] ?? ''}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
          />
        ))}

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

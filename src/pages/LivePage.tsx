import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SubPageHeader } from '../components/layout/PageHeader';
import { TrainingVerseCard } from '../components/home/TrainingVerseCard';
import { QuestionField } from '../components/forms/QuestionField';
import { LIVE_QUESTIONS } from '../constants/questions';
import type { QuestionResponse } from '../types';

export function LivePage() {
  const { todayEntry, saveLive, data } = useApp();
  const navigate = useNavigate();
  const existing = todayEntry.live;
  const prepare = todayEntry.prepare;

  const questions = LIVE_QUESTIONS;

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const q of questions) {
      const found = existing?.responses.find((r) => r.questionId === q.id);
      map[q.id] = found?.answer ?? '';
    }
    return map;
  });

  const morningSnippet = useMemo(() => {
    if (!prepare) return null;
    if (prepare.notes) return prepare.notes;
    return prepare.responses[0]?.answer ?? null;
  }, [prepare]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const responses: QuestionResponse[] = questions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: answers[q.id].trim(),
      }));

    saveLive({ responses });
    navigate('/');
  };

  return (
    <main className="page-content page-content--form">
      <SubPageHeader
        title="Live"
        subtitle="Pause amid the day. Notice where God is at work."
      />

      {data.trainingFocus && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="eyebrow">Current focus</div>
          <p className="serif" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
            {data.trainingFocus.title}
          </p>
        </div>
      )}

      {data.trainingVerse && (
        <TrainingVerseCard verse={data.trainingVerse} compact />
      )}

      {morningSnippet && (
        <div className="card card--dashed" style={{ marginBottom: 24 }}>
          <div className="eyebrow">From this morning</div>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 8, fontStyle: 'italic', lineHeight: 1.45 }}>
            {morningSnippet}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
            {existing ? 'Update check-in' : 'Record check-in'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
            Return to trail
          </button>
        </div>
      </form>
    </main>
  );
}

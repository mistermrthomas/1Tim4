import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SubPageHeader } from '../components/layout/PageHeader';
import { TrainingVerseCard } from '../components/home/TrainingVerseCard';
import { QuestionField } from '../components/forms/QuestionField';
import { REFLECT_QUESTIONS, getRotatingQuestions } from '../constants/questions';
import { dayOfYear } from '../utils/date';
import type { QuestionResponse } from '../types';

export function ReflectPage() {
  const { todayEntry, saveReflect, data } = useApp();
  const navigate = useNavigate();
  const existing = todayEntry.reflect;

  const questions = useMemo(
    () => getRotatingQuestions(REFLECT_QUESTIONS, 5, dayOfYear() + 3),
    [],
  );

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const q of questions) {
      const found = existing?.responses.find((r) => r.questionId === q.id);
      map[q.id] = found?.answer ?? '';
    }
    return map;
  });

  const [lessonText, setLessonText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const responses: QuestionResponse[] = questions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => ({
        questionId: q.id,
        questionText: q.text,
        answer: answers[q.id].trim(),
      }));

    const newLessons = lessonText.trim() ? [lessonText.trim()] : [];
    saveReflect({ responses }, newLessons);
    navigate('/');
  };

  return (
    <main className="page-content page-content--form">
      <SubPageHeader
        title="Reflect"
        subtitle="Review the day. Capture what matters."
      />

      {data.trainingVerse && (
        <TrainingVerseCard verse={data.trainingVerse} compact />
      )}

      {data.trainingFocus && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="eyebrow">Today&apos;s focus</div>
          <p className="serif" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
            {data.trainingFocus.title}
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

        <div className="field">
          <label className="field-label" htmlFor="lesson">Lesson learned today</label>
          <p className="field-hint">Optional — capture an insight worth remembering</p>
          <textarea
            id="lesson"
            className="text-area"
            value={lessonText}
            onChange={(e) => setLessonText(e.target.value)}
            placeholder="What truth emerged from today?"
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {existing ? 'Update reflection' : 'Record reflection'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
            Return to trail
          </button>
        </div>
      </form>
    </main>
  );
}

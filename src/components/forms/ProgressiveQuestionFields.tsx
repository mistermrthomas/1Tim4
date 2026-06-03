import { useEffect, useState } from 'react';
import type { Question } from '../../constants/questions';
import type { QuestionResponse } from '../../types';
import { initialVisibleQuestionCount } from '../../utils/trailQuestions';
import { QuestionField } from './QuestionField';
import './ProgressiveQuestionFields.css';

interface ProgressiveQuestionFieldsProps {
  questions: Question[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  existingResponses?: QuestionResponse[];
  sectionHint?: string;
}

export function ProgressiveQuestionFields({
  questions,
  answers,
  onAnswerChange,
  existingResponses,
  sectionHint,
}: ProgressiveQuestionFieldsProps) {
  const [visibleCount, setVisibleCount] = useState(() =>
    initialVisibleQuestionCount(questions, existingResponses),
  );

  useEffect(() => {
    setVisibleCount(initialVisibleQuestionCount(questions, existingResponses));
  }, [questions, existingResponses]);

  const visibleQuestions = questions.slice(0, visibleCount);
  const hiddenCount = Math.max(0, questions.length - visibleCount);

  if (questions.length === 0) return null;

  return (
    <div className="progressive-questions">
      {sectionHint && <p className="field-hint progressive-questions__hint">{sectionHint}</p>}
      {visibleQuestions.map((q) => (
        <QuestionField
          key={q.id}
          question={q}
          value={answers[q.id] ?? ''}
          onChange={(v) => onAnswerChange(q.id, v)}
        />
      ))}
      {hiddenCount > 0 && (
        <div className="progressive-questions__more">
          <button
            type="button"
            className="btn btn-secondary progressive-questions__more-btn"
            onClick={() => setVisibleCount((c) => Math.min(c + 1, questions.length))}
          >
            Answer another question
            {hiddenCount > 1 ? ` (${hiddenCount} left)` : ''}
          </button>
          {hiddenCount > 2 && (
            <button
              type="button"
              className="section-link progressive-questions__show-all"
              onClick={() => setVisibleCount(questions.length)}
            >
              Show all {questions.length} questions
            </button>
          )}
        </div>
      )}
      {hiddenCount === 0 && questions.length > 2 && (
        <p className="field-hint progressive-questions__enough">
          Two answers is enough for this check-in — the rest are here if you want them.
        </p>
      )}
    </div>
  );
}

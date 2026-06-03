import type { Question } from '../constants/questions';
import type { QuestionResponse } from '../types';

export const TRAIL_INITIAL_QUESTION_COUNT = 2;

/** How many question fields to show first (at least 2, or enough to include prior answers). */
export function initialVisibleQuestionCount(
  questions: Question[],
  responses?: QuestionResponse[],
  initialCount = TRAIL_INITIAL_QUESTION_COUNT,
): number {
  if (questions.length <= initialCount) return questions.length;

  let maxAnsweredIndex = -1;
  for (let i = 0; i < questions.length; i++) {
    const answer = responses?.find((r) => r.questionId === questions[i].id)?.answer?.trim();
    if (answer) maxAnsweredIndex = i;
  }

  const needed = maxAnsweredIndex >= 0 ? maxAnsweredIndex + 1 : initialCount;
  return Math.min(questions.length, Math.max(initialCount, needed));
}

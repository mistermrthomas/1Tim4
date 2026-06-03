import type { Question } from '../constants/questions';
import type { QuestionResponse } from '../types';

export const PREPARE_INITIAL_QUESTION_COUNT = 2;

/** How many question fields to show (at least 2, or enough to include prior answers). */
export function initialPrepareQuestionVisibleCount(
  questions: Question[],
  responses?: QuestionResponse[],
): number {
  if (questions.length <= PREPARE_INITIAL_QUESTION_COUNT) return questions.length;

  let maxAnsweredIndex = -1;
  for (let i = 0; i < questions.length; i++) {
    const answer = responses?.find((r) => r.questionId === questions[i].id)?.answer?.trim();
    if (answer) maxAnsweredIndex = i;
  }

  const needed = maxAnsweredIndex >= 0 ? maxAnsweredIndex + 1 : PREPARE_INITIAL_QUESTION_COUNT;
  return Math.min(questions.length, Math.max(PREPARE_INITIAL_QUESTION_COUNT, needed));
}

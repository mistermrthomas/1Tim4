import type { Question } from '../constants/questions';

export async function fetchChapterReadingQuestions(
  book: string,
  chapter: number,
  trainingFocusTitle?: string,
): Promise<Question[] | null> {
  if (import.meta.env.VITE_READING_QUESTIONS_AI === 'false') return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28_000);

  try {
    const res = await fetch('/api/reading-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, chapter, trainingFocusTitle }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { questions?: Question[] };
    if (!data.questions?.length) return null;
    return data.questions;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

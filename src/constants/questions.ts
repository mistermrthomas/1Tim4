export interface Question {
  id: string;
  text: string;
}

export const PREPARE_QUESTIONS: Question[] = [
  { id: 'prepare-god', text: 'What did I learn about God?' },
  { id: 'prepare-struggle', text: 'What am I struggling with?' },
  { id: 'prepare-truth', text: 'What truth do I need to remember today?' },
  { id: 'prepare-fruit', text: 'What fruit of the Spirit do I most need today?' },
  { id: 'prepare-listen', text: 'What is God inviting me to pay attention to?' },
  { id: 'prepare-fear', text: 'What fear might be shaping my day?' },
];

export const LIVE_QUESTIONS: Question[] = [
  { id: 'live-doing', text: 'How are you doing?' },
  { id: 'live-challenge', text: 'What challenge are you facing?' },
  { id: 'live-focus', text: 'Have you remembered today\'s focus?' },
  { id: 'live-pray', text: 'Do you need to stop and pray?' },
  { id: 'live-grace', text: 'Where do you need grace right now?' },
];

export const REFLECT_QUESTIONS: Question[] = [
  { id: 'reflect-god', text: 'Where did I see God at work today?' },
  { id: 'reflect-focus', text: 'What happened with today\'s focus area?' },
  { id: 'reflect-thankful', text: 'What am I thankful for?' },
  { id: 'reflect-learned', text: 'What did I learn today?' },
  { id: 'reflect-remember', text: 'What should I remember?' },
  { id: 'reflect-surprise', text: 'What surprised me about today?' },
];

/** Rotate which questions appear by day-of-year */
export function getRotatingQuestions(
  pool: Question[],
  count: number,
  seed: number,
): Question[] {
  const sorted = [...pool];
  const offset = seed % sorted.length;
  const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)];
  return rotated.slice(0, Math.min(count, rotated.length));
}

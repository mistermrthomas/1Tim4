import type { AssessmentFocusKey } from '../types';

export interface QuickStartPassage {
  id: string;
  book: string;
  chapter: number;
  label: string;
  hint: string;
}

/** One-tap places to begin reading Scripture. */
export const QUICK_START_PASSAGES: QuickStartPassage[] = [
  { id: 'john-1', book: 'John', chapter: 1, label: 'John 1', hint: 'The Word became flesh — a strong starting point.' },
  { id: 'psalm-23', book: 'Psalm', chapter: 23, label: 'Psalm 23', hint: 'The Lord as shepherd — short and beloved.' },
  { id: 'romans-8', book: 'Romans', chapter: 8, label: 'Romans 8', hint: 'Life in the Spirit — hope and assurance.' },
  { id: 'james-1', book: 'James', chapter: 1, label: 'James 1', hint: 'Trials, wisdom, and doing the Word.' },
  { id: 'matthew-5', book: 'Matthew', chapter: 5, label: 'Matthew 5', hint: 'The Sermon on the Mount begins.' },
  { id: 'philippians-2', book: 'Philippians', chapter: 2, label: 'Philippians 2', hint: 'Christ’s humility and our mindset.' },
  { id: 'genesis-1', book: 'Genesis', chapter: 1, label: 'Genesis 1', hint: 'In the beginning — creation narrative.' },
  { id: 'mark-1', book: 'Mark', chapter: 1, label: 'Mark 1', hint: 'Jesus’s ministry starts — fast-moving Gospel.' },
];

export const QUICK_START_PATH_KEYS: AssessmentFocusKey[] = [
  'prayer',
  'peace',
  'patience',
  'trust',
  'love',
  'faithfulness',
  'self-control',
  'family',
];

export function pickSuggestedPassage(seed: number): QuickStartPassage {
  return QUICK_START_PASSAGES[seed % QUICK_START_PASSAGES.length];
}

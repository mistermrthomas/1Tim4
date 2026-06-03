/** Focus keys the AI may return — must match FOCUS_PROFILES in the app. */
export const ASSESSMENT_FOCUS_KEYS = [
  'patience',
  'peace',
  'self-control',
  'faithfulness',
  'gentleness',
  'love',
  'joy',
  'kindness',
  'goodness',
  'trust',
  'prayer',
  'anxiety',
  'family',
  'work',
] as const;

export type SharedAssessmentFocusKey = (typeof ASSESSMENT_FOCUS_KEYS)[number];

export function isValidAssessmentFocusKey(key: string): key is SharedAssessmentFocusKey {
  return (ASSESSMENT_FOCUS_KEYS as readonly string[]).includes(key);
}

export const FOCUS_KEY_TITLES: Record<SharedAssessmentFocusKey, string> = {
  patience: 'Patience',
  peace: 'Peace',
  'self-control': 'Self-Control',
  faithfulness: 'Faithfulness',
  gentleness: 'Gentleness',
  love: 'Love',
  joy: 'Joy',
  kindness: 'Kindness',
  goodness: 'Goodness',
  trust: 'Trust',
  prayer: 'Prayer',
  anxiety: 'Peace in anxious seasons',
  family: 'Family',
  work: 'Work & vocation',
};

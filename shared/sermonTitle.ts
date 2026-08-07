/** Sermon title helpers for AI generation, validation, and display. */

const GENERIC_SERMON_TITLES = [
  "this week's sermon",
  'this weeks sermon',
  'sunday message',
  'weekly biblical plan',
  'growing in faith',
  "add this week's sermon title",
  'add this weeks sermon title',
  'untitled sermon',
  'untitled',
  'weekly plan',
  'biblical plan',
  'sunday sermon',
  'sermon title',
];

export function stripSermonTitleQuotes(title: string): string {
  return title
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/["'“”‘’]/g, '')
    .trim();
}

export function isGenericSermonTitle(title: string): boolean {
  const normalized = stripSermonTitleQuotes(title).toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return true;
  if (GENERIC_SERMON_TITLES.includes(normalized)) return true;
  if (/^(this week'?s?|weekly|sunday)\b/.test(normalized) && normalized.split(' ').length <= 3) {
    return true;
  }
  return false;
}

export function isUsableSermonTitle(title: string): boolean {
  const cleaned = stripSermonTitleQuotes(title);
  if (cleaned.length < 4 || cleaned.length > 120) return false;
  if (isGenericSermonTitle(cleaned)) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.length >= 2;
}

/** Title Case for UI display (keeps short conjunctions lowercase when mid-title). */
export function toTitleCase(title: string): string {
  const cleaned = stripSermonTitleQuotes(title);
  if (!cleaned) return '';
  const small = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'via']);
  return cleaned
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && small.has(lower)) return lower;
      if (word === word.toUpperCase() && word.length <= 4) return word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function firstWords(text: string, maxWords: number): string {
  const words = text
    .replace(/["'“”‘’]/g, '')
    .replace(/[.!?].*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

/** Deterministic title when AI title is missing or generic. */
export function fallbackSermonTitle(input: {
  centralTruth?: string | null;
  weeklyTheme?: string | null;
  weeklyTitle?: string | null;
  actOfObedience?: string | null;
  weeklyPractice?: string | null;
}): string {
  const candidates = [
    input.centralTruth,
    input.weeklyTheme,
    input.weeklyTitle,
    input.actOfObedience,
    input.weeklyPractice,
  ]
    .map((value) => (value ?? '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const clipped = firstWords(candidate, 8);
    if (isUsableSermonTitle(clipped)) {
      return toTitleCase(clipped);
    }
  }

  return 'Choosing Transformation Over Conformity';
}

export function normalizeSermonTitle(
  title: string | null | undefined,
  fallbackSource: {
    centralTruth?: string | null;
    weeklyTheme?: string | null;
    weeklyTitle?: string | null;
    actOfObedience?: string | null;
    weeklyPractice?: string | null;
  },
): string {
  const cleaned = stripSermonTitleQuotes(title ?? '');
  if (isUsableSermonTitle(cleaned)) return toTitleCase(cleaned);
  return fallbackSermonTitle(fallbackSource);
}

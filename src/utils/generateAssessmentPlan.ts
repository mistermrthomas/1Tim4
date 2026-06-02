import type { AssessmentFocusKey, AssessmentSuggestion } from '../types';
import {
  FOCUS_PROFILES,
  fruitToFocusKey,
  profileToSuggestion,
  type FocusProfile,
} from '../data/assessmentProfiles';

const SCORE_KEYS = Object.keys(FOCUS_PROFILES) as AssessmentFocusKey[];

function normalizeText(answers: Record<string, string>): string {
  return Object.values(answers)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function scoreKeywords(text: string, scores: Record<AssessmentFocusKey, number>): string[] {
  const matched: string[] = [];
  for (const key of SCORE_KEYS) {
    const profile = FOCUS_PROFILES[key];
    for (const kw of profile.keywords) {
      if (text.includes(kw)) {
        scores[key] += 2;
        if (!matched.includes(kw)) matched.push(kw);
      }
    }
  }
  return matched.slice(0, 6);
}

function applyFruitWeight(
  fruit: string | undefined,
  weight: number,
  scores: Record<AssessmentFocusKey, number>,
): void {
  if (!fruit) return;
  const key = fruitToFocusKey(fruit);
  if (key) scores[key] += weight;
}

function pickVerseIndex(winner: AssessmentFocusKey, text: string): number {
  const profile = FOCUS_PROFILES[winner];
  if (profile.verses.length < 2) return 0;
  const altKeywords = profile.verses[1].reference.toLowerCase();
  if (text.includes(altKeywords.split(' ')[0].toLowerCase())) return 1;
  if (winner === 'patience' && (text.includes('hope') || text.includes('afflict'))) return 1;
  if (winner === 'peace' && text.includes('john')) return 1;
  return 0;
}

function humanizeSignals(keywords: string[]): string {
  const labels = keywords.map((k) => {
    if (k.startsWith('frustrat')) return 'frustration';
    if (k.startsWith('impati')) return 'impatience';
    if (k.includes('worry') || k.includes('anxiet')) return 'worry or anxiety';
    if (k.includes('family') || k.includes('child')) return 'family life';
    if (k.includes('work') || k.includes('job')) return 'work';
    if (k.includes('pray')) return 'desire for deeper prayer';
    if (k.includes('habit')) return 'habits you want to change';
    return k.replace(/ing$/, '').replace(/ed$/, '');
  });
  const unique = [...new Set(labels)];
  if (unique.length === 0) return '';
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}`;
}

function buildWhyFocus(
  profile: FocusProfile,
  answers: Record<string, string>,
  signals: string[],
): string {
  const parts: string[] = [];
  const need = answers['growth-most-need'];
  const difficult = answers['growth-most-difficult'];
  const frustration = answers['focus-frustration']?.trim();
  const worry = answers['focus-worry']?.trim();
  const sixMonths = answers['growth-six-months']?.trim();

  if (need) {
    parts.push(`You identified ${need} as the Fruit of the Spirit you most need right now.`);
  }
  if (difficult && difficult !== need) {
    parts.push(`${difficult} is the fruit that feels most difficult for you at the moment.`);
  }
  const signalPhrase = humanizeSignals(signals);
  if (signalPhrase) {
    parts.push(`You mentioned ${signalPhrase} across your responses.`);
  }
  if (frustration && frustration.length > 12) {
    parts.push(`You named frustration around "${truncate(frustration, 80)}."`);
  } else if (worry && worry.length > 12) {
    parts.push(`You named worry around "${truncate(worry, 80)}."`);
  } else if (sixMonths && sixMonths.length > 12) {
    parts.push(`You hope to see change in "${truncate(sixMonths, 80)}" over the next six months.`);
  }
  parts.push(`${profile.title} may be a meaningful training focus for this season.`);
  return parts.join(' ');
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function generateAssessmentPlan(answers: Record<string, string>): AssessmentSuggestion {
  const scores = Object.fromEntries(SCORE_KEYS.map((k) => [k, 0])) as Record<
    AssessmentFocusKey,
    number
  >;

  const corpus = normalizeText(answers);
  const signals = scoreKeywords(corpus, scores);

  applyFruitWeight(answers['growth-most-need'], 10, scores);
  applyFruitWeight(answers['growth-most-difficult'], 6, scores);
  applyFruitWeight(answers['growth-most-natural'], -2, scores);

  const teaching = answers['god-teaching']?.toLowerCase() ?? '';
  if (teaching.includes('patien')) scores.patience += 3;
  if (teaching.includes('peace') || teaching.includes('rest')) scores.peace += 3;
  if (teaching.includes('pray')) scores.prayer += 3;
  if (teaching.includes('trust') || teaching.includes('faith')) scores.trust += 3;

  let winner = SCORE_KEYS[0];
  let top = scores[winner];
  for (const key of SCORE_KEYS) {
    if (scores[key] > top) {
      top = scores[key];
      winner = key;
    }
  }

  if (top <= 0) {
    const fallback = fruitToFocusKey(answers['growth-most-need'] ?? '') ?? 'patience';
    winner = fallback;
  }

  if (winner === 'anxiety') winner = 'peace';

  const profile = FOCUS_PROFILES[winner];
  const verseIndex = pickVerseIndex(winner, corpus);
  const whyFocus = buildWhyFocus(profile, answers, signals);

  return profileToSuggestion(profile, whyFocus, verseIndex);
}

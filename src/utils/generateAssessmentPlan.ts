import type { AssessmentFocusKey, AssessmentSuggestion } from '../types';
import {
  FOCUS_PROFILES,
  fruitToFocusKey,
  profileToSuggestion,
  type FocusProfile,
} from '../data/assessmentProfiles';

const SCORE_KEYS = Object.keys(FOCUS_PROFILES) as AssessmentFocusKey[];

/** When top scores are this close, use tie-breakers instead of defaulting to the first profile. */
const TIE_MARGIN = 3;

type QuestionSignal = { focus: AssessmentFocusKey; patterns: string[] };

/** Targeted patterns per question — weighted higher than generic keyword matching. */
const QUESTION_SIGNALS: Record<string, QuestionSignal[]> = {
  'season-stress': [
    { focus: 'peace', patterns: ['stress', 'anxiet', 'overwhelm', 'worry', 'tired'] },
    { focus: 'family', patterns: ['kids', 'child', 'marriage', 'spouse', 'parent'] },
    { focus: 'work', patterns: ['work', 'job', 'boss', 'deadline', 'office'] },
    { focus: 'trust', patterns: ['money', 'financ', 'future', 'uncertain', 'health'] },
  ],
  'season-prayer': [
    { focus: 'prayer', patterns: ['pray', 'quiet', 'discipline', 'consistent', 'time'] },
    { focus: 'family', patterns: ['family', 'child', 'marriage', 'kids'] },
    { focus: 'peace', patterns: ['peace', 'anxiet', 'fear', 'worry'] },
  ],
  'season-uncertain': [
    { focus: 'trust', patterns: ['uncertain', 'unknown', 'future', 'control'] },
    { focus: 'peace', patterns: ['anxiet', 'worry', 'fear'] },
    { focus: 'work', patterns: ['job', 'career', 'work'] },
  ],
  'god-far': [
    { focus: 'prayer', patterns: ['pray', 'distant', 'dry', 'busy', 'discipline'] },
    { focus: 'peace', patterns: ['guilt', 'shame', 'anxiet'] },
  ],
  'focus-frustration': [
    { focus: 'patience', patterns: ['frustrat', 'impati', 'anger', 'snap', 'rage', 'annoy'] },
    { focus: 'gentleness', patterns: ['yell', 'harsh', 'tone', 'sharp', 'loud'] },
    { focus: 'self-control', patterns: ['habit', 'react', 'impulse', 'temper'] },
    { focus: 'family', patterns: ['kids', 'child', 'spouse', 'husband', 'wife', 'toddler'] },
  ],
  'focus-worry': [
    { focus: 'peace', patterns: ['worry', 'anxiet', 'fear', 'stress', 'future', 'panic'] },
    { focus: 'trust', patterns: ['control', 'trust', 'faith', 'unknown', 'health', 'money'] },
    { focus: 'family', patterns: ['child', 'kids', 'marriage', 'spouse', 'school'] },
  ],
  'focus-habit': [
    { focus: 'self-control', patterns: ['habit', 'phone', 'screen', 'food', 'drink', 'scroll', 'media'] },
    { focus: 'prayer', patterns: ['pray', 'bible', 'read', 'morning', 'scripture'] },
  ],
  'focus-repent': [
    { focus: 'self-control', patterns: ['anger', 'lust', 'lie', 'gossip', 'food', 'drink'] },
    { focus: 'patience', patterns: ['impati', 'harsh', 'react', 'yell'] },
    { focus: 'love', patterns: ['selfish', 'cold', 'neglect', 'serve', 'bitter'] },
  ],
  'focus-obedience': [
    { focus: 'trust', patterns: ['trust', 'surrender', 'control', 'fear', 'forgive'] },
    { focus: 'prayer', patterns: ['pray', 'word', 'scripture', 'read'] },
    { focus: 'faithfulness', patterns: ['commit', 'consistent', 'show up', 'church'] },
  ],
  'relations-challenged': [
    { focus: 'family', patterns: ['family', 'spouse', 'child', 'parent', 'marriage', 'teen'] },
    { focus: 'love', patterns: ['marriage', 'friend', 'distance', 'cold', 'conflict'] },
    { focus: 'gentleness', patterns: ['conflict', 'argu', 'yell', 'harsh'] },
    { focus: 'patience', patterns: ['frustrat', 'impati', 'anger'] },
  ],
  'relations-roles': [
    { focus: 'family', patterns: ['parent', 'spouse', 'wife', 'husband', 'child', 'mom', 'dad'] },
    { focus: 'work', patterns: ['work', 'coworker', 'boss', 'job', 'colleague'] },
    { focus: 'faithfulness', patterns: ['church', 'member', 'serve', 'commit', 'small group'] },
  ],
  'growth-six-months': [
    { focus: 'patience', patterns: ['patien', 'anger', 'react', 'listen', 'slow'] },
    { focus: 'peace', patterns: ['peace', 'calm', 'anxiet', 'worry', 'rest'] },
    { focus: 'self-control', patterns: ['habit', 'discipline', 'control', 'tempt'] },
    { focus: 'prayer', patterns: ['pray', 'scripture', 'bible', 'word'] },
    { focus: 'love', patterns: ['love', 'serve', 'selfish', 'kind', 'gentle'] },
    { focus: 'faithfulness', patterns: ['faithful', 'consistent', 'commit'] },
  ],
  'reflect-children-concern': [
    { focus: 'patience', patterns: ['anger', 'impati', 'yell', 'react', 'temper'] },
    { focus: 'prayer', patterns: ['pray', 'bible', 'word', 'spiritual', 'church'] },
    { focus: 'self-control', patterns: ['phone', 'screen', 'habit', 'temper', 'media'] },
    { focus: 'gentleness', patterns: ['harsh', 'yell', 'tone'] },
  ],
  'reflect-one-year': [
    { focus: 'faithfulness', patterns: ['consistent', 'discipline', 'habit', 'grow'] },
    { focus: 'prayer', patterns: ['pray', 'bible', 'word'] },
    { focus: 'peace', patterns: ['peace', 'calm', 'anxiet'] },
    { focus: 'family', patterns: ['family', 'marriage', 'child', 'parent'] },
  ],
};

const DISCOVERY_QUESTION_WEIGHT = 5;
const OTHER_QUESTION_WEIGHT = 3;

const FALLBACK_POOL: AssessmentFocusKey[] = [
  'peace',
  'faithfulness',
  'prayer',
  'gentleness',
  'trust',
  'love',
  'self-control',
  'kindness',
  'family',
  'work',
  'patience',
];

function emptyScores(): Record<AssessmentFocusKey, number> {
  return Object.fromEntries(SCORE_KEYS.map((k) => [k, 0])) as Record<AssessmentFocusKey, number>;
}

function normalizeFocusKey(key: AssessmentFocusKey): AssessmentFocusKey {
  return key === 'anxiety' ? 'peace' : key;
}

function normalizeText(answers: Record<string, string>): string {
  return Object.values(answers)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function scoreKeywords(
  text: string,
  scores: Record<AssessmentFocusKey, number>,
  weight: number,
): string[] {
  const matched: string[] = [];
  for (const key of SCORE_KEYS) {
    const profile = FOCUS_PROFILES[key];
    for (const kw of profile.keywords) {
      if (text.includes(kw)) {
        scores[key] += weight;
        if (!matched.includes(kw)) matched.push(kw);
      }
    }
  }
  return matched.slice(0, 6);
}

function scoreQuestionSignals(
  answers: Record<string, string>,
  scores: Record<AssessmentFocusKey, number>,
): void {
  for (const [questionId, signals] of Object.entries(QUESTION_SIGNALS)) {
    const text = answers[questionId]?.toLowerCase().trim();
    if (!text || text.length < 3) continue;
    const weight = questionId.startsWith('focus-')
      ? DISCOVERY_QUESTION_WEIGHT
      : OTHER_QUESTION_WEIGHT;
    for (const { focus, patterns } of signals) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          scores[focus] += weight;
          break;
        }
      }
    }
  }
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

function hashAnswers(answers: Record<string, string>): number {
  let h = 0;
  const payload = Object.keys(answers)
    .sort()
    .map((k) => `${k}:${answers[k] ?? ''}`)
    .join('|');
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function discoveryTieHint(answers: Record<string, string>): AssessmentFocusKey | null {
  const worry = answers['focus-worry']?.toLowerCase() ?? '';
  if (worry.length > 10) {
    if (worry.includes('money') || worry.includes('financ') || worry.includes('job')) return 'trust';
    return 'peace';
  }
  const habit = answers['focus-habit']?.toLowerCase() ?? '';
  if (habit.length > 10) return 'self-control';
  const repent = answers['focus-repent']?.toLowerCase() ?? '';
  if (repent.length > 10) {
    if (repent.includes('pray') || repent.includes('word')) return 'prayer';
    if (repent.includes('selfish') || repent.includes('love')) return 'love';
    return 'self-control';
  }
  const roles = answers['relations-roles']?.toLowerCase() ?? '';
  if (roles.includes('parent') || roles.includes('spouse') || roles.includes('child')) return 'family';
  if (roles.includes('work') || roles.includes('job') || roles.includes('boss')) return 'work';
  return null;
}

function breakTie(
  contenders: AssessmentFocusKey[],
  answers: Record<string, string>,
): AssessmentFocusKey {
  const priority: (AssessmentFocusKey | null)[] = [
    fruitToFocusKey(answers['growth-most-difficult'] ?? ''),
    fruitToFocusKey(answers['growth-most-need'] ?? ''),
    discoveryTieHint(answers),
  ];

  for (const candidate of priority) {
    if (!candidate) continue;
    const key = normalizeFocusKey(candidate);
    if (contenders.includes(key)) return key;
  }

  const pool = contenders.length > 0 ? contenders : FALLBACK_POOL;
  return pool[hashAnswers(answers) % pool.length];
}

function rankScores(
  scores: Record<AssessmentFocusKey, number>,
): { key: AssessmentFocusKey; score: number }[] {
  return SCORE_KEYS.map((key) => ({ key, score: scores[key] }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

function pickFocus(
  scores: Record<AssessmentFocusKey, number>,
  answers: Record<string, string>,
): { winner: AssessmentFocusKey; runnerUp: AssessmentFocusKey | null } {
  const ranked = rankScores(scores);
  const topScore = ranked[0]?.score ?? 0;

  if (topScore <= 0) {
    const difficult = fruitToFocusKey(answers['growth-most-difficult'] ?? '');
    const need = fruitToFocusKey(answers['growth-most-need'] ?? '');
    const fallback = difficult ?? need ?? FALLBACK_POOL[hashAnswers(answers) % FALLBACK_POOL.length];
    const winner = normalizeFocusKey(fallback);
    const runnerUp = ranked.find((r) => r.key !== winner && r.score > 0)?.key ?? null;
    return { winner, runnerUp: runnerUp ? normalizeFocusKey(runnerUp) : null };
  }

  const contenders = ranked
    .filter((r) => r.score >= topScore - TIE_MARGIN && r.score > 0)
    .map((r) => r.key);

  const winner = normalizeFocusKey(
    contenders.length === 1 ? contenders[0] : breakTie(contenders, answers),
  );

  const runnerUp =
    ranked.find((r) => normalizeFocusKey(r.key) !== winner && r.score > 0)?.key ?? null;

  return {
    winner,
    runnerUp: runnerUp ? normalizeFocusKey(runnerUp) : null,
  };
}

function pickVerseIndex(winner: AssessmentFocusKey, text: string): number {
  const profile = FOCUS_PROFILES[winner];
  if (profile.verses.length < 2) return 0;
  const altBook = profile.verses[1].reference.split(' ')[0].toLowerCase();
  if (text.includes(altBook)) return 1;
  if (winner === 'patience' && (text.includes('hope') || text.includes('afflict'))) return 1;
  if (winner === 'peace' && text.includes('john')) return 1;
  return hashAnswers({ verse: text, focus: winner }) % 2;
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
  runnerUp: AssessmentFocusKey | null,
): string {
  const parts: string[] = [];
  const need = answers['growth-most-need'];
  const difficult = answers['growth-most-difficult'];
  const frustration = answers['focus-frustration']?.trim();
  const worry = answers['focus-worry']?.trim();
  const sixMonths = answers['growth-six-months']?.trim();

  if (difficult) {
    parts.push(`${difficult} is the fruit that feels most difficult for you at the moment.`);
  }
  if (need && need !== difficult) {
    parts.push(`You also named ${need} as the fruit you most need right now.`);
  } else if (need && !difficult) {
    parts.push(`You identified ${need} as the Fruit of the Spirit you most need right now.`);
  }
  const signalPhrase = humanizeSignals(signals);
  if (signalPhrase) {
    parts.push(`Your answers also pointed toward ${signalPhrase}.`);
  }
  if (frustration && frustration.length > 12) {
    parts.push(`You named frustration around "${truncate(frustration, 80)}."`);
  } else if (worry && worry.length > 12) {
    parts.push(`You named worry around "${truncate(worry, 80)}."`);
  } else if (sixMonths && sixMonths.length > 12) {
    parts.push(`You hope to see change in "${truncate(sixMonths, 80)}" over the next six months.`);
  }
  parts.push(`${profile.title} may be a meaningful training focus for this season.`);
  if (runnerUp && runnerUp !== profile.key) {
    parts.push(
      `${FOCUS_PROFILES[runnerUp].title} was a close second — tap "Choose a different focus" below if that fits better.`,
    );
  }
  return parts.join(' ');
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function generateAssessmentPlan(answers: Record<string, string>): AssessmentSuggestion {
  const scores = emptyScores();
  const corpus = normalizeText(answers);

  scoreQuestionSignals(answers, scores);
  const signals = scoreKeywords(corpus, scores, 1);

  applyFruitWeight(answers['growth-most-need'], 7, scores);
  applyFruitWeight(answers['growth-most-difficult'], 11, scores);
  applyFruitWeight(answers['growth-most-natural'], -3, scores);

  const teaching = answers['god-teaching']?.toLowerCase() ?? '';
  if (teaching.includes('patien')) scores.patience += 4;
  if (teaching.includes('peace') || teaching.includes('rest')) scores.peace += 4;
  if (teaching.includes('pray')) scores.prayer += 4;
  if (teaching.includes('trust') || teaching.includes('faith')) scores.trust += 4;
  if (teaching.includes('gentle') || teaching.includes('kind')) scores.gentleness += 4;
  if (teaching.includes('joy')) scores.joy += 4;

  const { winner, runnerUp } = pickFocus(scores, answers);
  const profile = FOCUS_PROFILES[winner];
  const verseIndex = pickVerseIndex(winner, corpus);
  const whyFocus = buildWhyFocus(profile, answers, signals, runnerUp);

  return profileToSuggestion(profile, whyFocus, verseIndex);
}

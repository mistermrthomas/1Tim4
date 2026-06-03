import type { ServingLaneKey, ServingLaneResult, ServingSuggestion } from '../types';
import { SERVING_LANE_KEYS, SERVING_LANES } from '../data/servingLanes';

function normalizeText(answers: Record<string, string>): string {
  return Object.values(answers).filter(Boolean).join(' ').toLowerCase();
}

function scoreLanes(
  corpus: string,
  answers: Record<string, string>,
): Record<ServingLaneKey, number> {
  const scores = Object.fromEntries(SERVING_LANE_KEYS.map((k) => [k, 0])) as Record<
    ServingLaneKey,
    number
  >;

  for (const key of SERVING_LANE_KEYS) {
    for (const kw of SERVING_LANES[key].keywords) {
      if (corpus.includes(kw)) scores[key] += 2;
    }
  }

  const visible = (answers['serve-visible'] ?? '').toLowerCase();
  if (visible.includes('behind') || visible.includes('quiet') || visible.includes('unseen')) {
    scores.support += 5;
    scores.organize += 2;
    scores.lead -= 2;
  }
  if (visible.includes('visible') || visible.includes('front') || visible.includes('lead')) {
    scores.lead += 4;
    scores.teach += 2;
  }

  const setting = (answers['serve-setting'] ?? '').toLowerCase();
  if (setting.includes('one') || setting.includes('individual') || setting.includes('1:1')) {
    scores.encouraging += 4;
    scores.mentor += 3;
  }
  if (setting.includes('group') || setting.includes('team') || setting.includes('people')) {
    scores.hospitality += 3;
    scores.organize += 2;
  }

  const drained = (answers['serve-drained'] ?? '').toLowerCase();
  if (drained.includes('people') || drained.includes('emotional') || drained.includes('heavy')) {
    scores.practical += 2;
    scores.support += 2;
    scores.encouraging -= 1;
  }
  if (drained.includes('detail') || drained.includes('email') || drained.includes('admin')) {
    scores.organize -= 2;
    scores.creative += 2;
  }

  return scores;
}

function rankLanes(scores: Record<ServingLaneKey, number>): ServingLaneKey[] {
  return [...SERVING_LANE_KEYS].sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
}

function buildStrengths(primary: ServingLaneKey, answers: Record<string, string>): string[] {
  const strengths: string[] = [];
  const skills = answers['serve-skills']?.trim();
  const enjoy = answers['serve-enjoy']?.trim();
  const useful = answers['serve-useful']?.trim();

  if (skills && skills.length > 8) strengths.push(`Others often ask you for: ${truncate(skills, 100)}`);
  if (enjoy && enjoy.length > 8) strengths.push(`You come alive when: ${truncate(enjoy, 100)}`);
  if (useful && useful.length > 12) {
    strengths.push(`A high-impact moment for you: ${truncate(useful, 110)}`);
  }
  if (strengths.length === 0) {
    strengths.push(SERVING_LANES[primary].summary);
  }
  return strengths.slice(0, 3);
}

function buildWatchouts(answers: Record<string, string>): string[] {
  const watchouts: string[] = [];
  const drained = answers['serve-drained']?.trim();
  const avoid = answers['serve-avoid']?.trim();

  if (drained && drained.length > 8) {
    watchouts.push(`Pace yourself where you drain quickly: ${truncate(drained, 100)}`);
  }
  if (avoid && avoid.length > 8) {
    watchouts.push(`Roles that were a poor fit before: ${truncate(avoid, 100)}`);
  }
  if (watchouts.length === 0) {
    watchouts.push('Say no to good opportunities that do not fit your energy or season.');
  }
  return watchouts.slice(0, 2);
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function generateServingPlan(answers: Record<string, string>): ServingSuggestion {
  const corpus = normalizeText(answers);
  const scores = scoreLanes(corpus, answers);
  const ranked = rankLanes(scores);
  const primary = ranked[0];
  const profile = SERVING_LANES[primary];

  const lanes: ServingLaneResult[] = ranked.slice(0, 4).map((key) => ({
    key,
    title: SERVING_LANES[key].title,
    score: scores[key],
    summary: SERVING_LANES[key].summary,
  }));

  const learn = answers['serve-learn']?.trim();
  const saturday = answers['serve-saturday']?.trim();

  let headline = `${profile.title} looks like a strong fit for how you are wired to help.`;
  const whyParts: string[] = [profile.summary];
  if (learn && learn.length > 8) {
    whyParts.push(`You want to grow in: ${truncate(learn, 90)}`);
  }
  if (saturday && saturday.length > 8) {
    whyParts.push(`In an ideal week you would gravitate toward: ${truncate(saturday, 90)}`);
  }

  return {
    primaryLane: primary,
    primaryTitle: profile.title,
    headline,
    whySummary: whyParts.join(' '),
    lanes,
    strengths: buildStrengths(primary, answers),
    watchouts: buildWatchouts(answers),
  };
}

/**
 * Feature gate helpers. Every feature must help answer: Who are you becoming?
 */
export const NORTH_STAR_QUESTION = 'Who are you becoming?';

export type FeatureGateResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Reject input-fetish metrics that compete with formation evidence. */
export function gateAgainstCompletionFetish(featurePurpose: string): FeatureGateResult {
  const lowered = featurePurpose.toLowerCase();
  const banned = [
    'streak',
    'chapter count',
    'chapters completed',
    'habit percentage',
    'prayer streak',
    'workout streak',
    'spiritual score',
    'godliness score',
    'fruit xp',
    'leaderboard',
  ];
  const hit = banned.find((b) => lowered.includes(b));
  if (hit) {
    return {
      ok: false,
      reason: `Rejected: optimizes for "${hit}" rather than formation evidence (${NORTH_STAR_QUESTION}).`,
    };
  }
  return { ok: true };
}

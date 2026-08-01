export const COACH_INTENTS = [
  'daily_card',
  'recommend_morning_mode',
  'explain_season',
  'apply_scripture',
  'midday_adjust',
  'evening_reflect',
  'weekly_review',
  'workout_guide',
  'reset',
  'season_propose',
  'ask_coach',
] as const;

export type CoachIntentKey = (typeof COACH_INTENTS)[number];

export const ASK_COACH_SOFT_CAP = 10;

export interface CoachUsageCounters {
  askThreadsStarted: number;
  askSubstantialExchanges: number;
  graceUsed: number;
}

export type AskCoachGate =
  | { allow: true; tone: 'normal' | 'nudge' | 'grace' }
  | { allow: true; tone: 'redirect'; suggestContinueThread: true };

/**
 * Soft cap: never a hard stop. Near limit → nudge toward application / existing content.
 */
export function gateAskCoach(usage: CoachUsageCounters, softCap = ASK_COACH_SOFT_CAP): AskCoachGate {
  const used = usage.askThreadsStarted + usage.askSubstantialExchanges;
  if (used < softCap - 2) return { allow: true, tone: 'normal' };
  if (used < softCap) return { allow: true, tone: 'nudge' };
  if (usage.graceUsed < 2) return { allow: true, tone: 'grace' };
  return { allow: true, tone: 'redirect', suggestContinueThread: true };
}

export function isStructuredIntent(intent: CoachIntentKey): boolean {
  return intent !== 'ask_coach';
}

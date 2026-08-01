export const SEASON_STAGE_KEYS = [
  'understand',
  'notice',
  'practice',
  'practice_under_difficulty',
  'apply_in_relationships',
  'reflect_and_reassess',
] as const;

export type SeasonStageKey = (typeof SEASON_STAGE_KEYS)[number];

export const SEASON_STATUSES = ['active', 'grace', 'completed', 'archived'] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const FOCUS_ROLES = ['primary', 'secondary', 'physical'] as const;
export type FocusRole = (typeof FOCUS_ROLES)[number];

export const MORNING_MODES = ['full', 'short', 'two_minute'] as const;
export type MorningMode = (typeof MORNING_MODES)[number];

export const DEFAULT_SEASON_WEEK_COUNT = 6;
export const DEFAULT_GRACE_DAYS = 14;

export function stageKeyForWeek(weekIndex: number): SeasonStageKey {
  const idx = Math.min(Math.max(weekIndex, 1), SEASON_STAGE_KEYS.length) - 1;
  return SEASON_STAGE_KEYS[idx]!;
}

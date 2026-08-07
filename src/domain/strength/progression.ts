import type { StrengthDifficulty, StrengthExercise, StrengthLogEntry } from './types';

export function recommendNextWeightLb(
  lastWeightLb: number,
  difficulty: StrengthDifficulty,
  incrementLb: number,
  maxWeightLb: number | null = null,
): number {
  const step = Math.max(1, incrementLb);
  let next: number;
  switch (difficulty) {
    case 'easy':
      next = lastWeightLb + step;
      break;
    case 'easy_moderate':
    case 'moderate':
    case 'moderate_hard':
    case 'hard':
      // Only clear Easy advances weight; in-between and harder stay put.
      next = lastWeightLb;
      break;
    case 'max':
      next = Math.max(0, lastWeightLb - step);
      break;
    default:
      next = lastWeightLb;
  }
  if (maxWeightLb != null) return Math.min(next, maxWeightLb);
  return next;
}

export function formatWeight(weightLb: number, suffix = ''): string {
  const base = Number.isInteger(weightLb) ? String(weightLb) : weightLb.toFixed(1);
  return suffix ? `${base} lb ${suffix}` : `${base} lb`;
}

export function formatReps(reps: string[]): string {
  return reps.map((r) => r.trim()).filter(Boolean).join(', ');
}

export function personalBestWeight(entries: StrengthLogEntry[]): number | null {
  if (!entries.length) return null;
  return entries.reduce((best, entry) => Math.max(best, entry.weightLb), 0);
}

export function isAtEquipmentMax(exercise: StrengthExercise, weightLb: number): boolean {
  return exercise.maxWeightLb != null && weightLb >= exercise.maxWeightLb;
}

export function recommendedFromLast(
  exercise: StrengthExercise,
  last: StrengthLogEntry | null,
): number | null {
  if (!last) return null;
  return recommendNextWeightLb(
    last.weightLb,
    last.difficulty,
    exercise.weightIncrementLb,
    exercise.maxWeightLb,
  );
}

/** True when Easy would normally increase, but equipment max blocks it. */
export function isRecommendationCapped(
  exercise: StrengthExercise,
  last: StrengthLogEntry | null,
): boolean {
  if (!last || last.difficulty !== 'easy' || exercise.maxWeightLb == null) return false;
  const uncapped = recommendNextWeightLb(
    last.weightLb,
    last.difficulty,
    exercise.weightIncrementLb,
    null,
  );
  return uncapped > exercise.maxWeightLb;
}

export function formatRecommendedNext(
  exercise: StrengthExercise,
  last: StrengthLogEntry | null,
): string {
  const recommended = recommendedFromLast(exercise, last);
  if (recommended == null) return 'Set first weight';
  const weight = formatWeight(recommended, exercise.weightSuffix);
  if (isRecommendationCapped(exercise, last) || isAtEquipmentMax(exercise, recommended)) {
    return `${weight} · equipment max`;
  }
  return weight;
}

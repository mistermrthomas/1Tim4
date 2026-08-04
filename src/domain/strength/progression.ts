import type { StrengthDifficulty, StrengthExercise, StrengthLogEntry } from './types';

export function recommendNextWeightLb(
  lastWeightLb: number,
  difficulty: StrengthDifficulty,
  incrementLb: number,
): number {
  const step = Math.max(1, incrementLb);
  switch (difficulty) {
    case 'easy':
      return lastWeightLb + step;
    case 'moderate':
    case 'hard':
      return lastWeightLb;
    case 'max':
      return Math.max(0, lastWeightLb - step);
    default:
      return lastWeightLb;
  }
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

export function recommendedFromLast(
  exercise: StrengthExercise,
  last: StrengthLogEntry | null,
): number | null {
  if (!last) return null;
  return recommendNextWeightLb(last.weightLb, last.difficulty, exercise.weightIncrementLb);
}

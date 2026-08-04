export type StrengthDifficulty = 'easy' | 'moderate' | 'hard' | 'max';

export interface StrengthWorkout {
  id: string;
  name: string;
  shortLabel: string;
  active: boolean;
  order: number;
}

export interface StrengthExercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  active: boolean;
  /** Assigned workout id, or null when inactive / historical-only. */
  workoutId: string | null;
  order: number;
  techniqueNote: string;
  /** Typical equipment step for progression recommendations. */
  weightIncrementLb: number;
  /** e.g. "per dumbbell" — appended in UI when set. */
  weightSuffix: string;
}

export interface StrengthLogEntry {
  id: string;
  exerciseId: string;
  workoutId: string | null;
  date: string;
  weightLb: number;
  setCount: number;
  /** One string per set — may be "12", "12 per side", "12 left / 12 right". */
  reps: string[];
  difficulty: StrengthDifficulty;
  pain: number;
  notes: string;
  createdAt: string;
}

export interface StrengthWorkoutNote {
  id: string;
  workoutId: string;
  date: string;
  notes: string;
}

export interface StrengthState {
  version: 1;
  seedVersion: number;
  workouts: StrengthWorkout[];
  exercises: StrengthExercise[];
  entries: StrengthLogEntry[];
  workoutNotes: StrengthWorkoutNote[];
}

export const DIFFICULTY_OPTIONS: Array<{
  value: StrengthDifficulty;
  label: string;
  definition: string;
}> = [
  {
    value: 'easy',
    label: 'Easy',
    definition: 'Target completed with at least three additional reps likely available.',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    definition: 'Target completed with approximately one or two additional reps available.',
  },
  {
    value: 'hard',
    label: 'Hard',
    definition: 'Target barely completed with good form.',
  },
  {
    value: 'max',
    label: 'Max',
    definition: 'Target could not be completed or form failed.',
  },
];

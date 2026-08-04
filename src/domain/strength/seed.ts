import { newId } from '../physical/store';
import { EQUIPMENT_MAX_LB, type StrengthExercise, type StrengthLogEntry, type StrengthState, type StrengthWorkout, type StrengthWorkoutNote } from './types';

export const STRENGTH_SEED_VERSION = 2;

export const WORKOUT_1_ID = 'strength_workout_1';
export const WORKOUT_2_ID = 'strength_workout_2';

const WORKOUTS: StrengthWorkout[] = [
  {
    id: WORKOUT_1_ID,
    name: 'Workout 1 — Chest, Triceps, Core',
    shortLabel: 'Chest / Triceps / Core',
    active: true,
    order: 1,
  },
  {
    id: WORKOUT_2_ID,
    name: 'Workout 2 — Back, Biceps, Traps',
    shortLabel: 'Back / Biceps / Traps',
    active: true,
    order: 2,
  },
];

function ex(
  partial: Omit<
    StrengthExercise,
    'weightIncrementLb' | 'weightSuffix' | 'techniqueNote' | 'maxWeightLb'
  > &
    Partial<
      Pick<StrengthExercise, 'weightIncrementLb' | 'weightSuffix' | 'techniqueNote' | 'maxWeightLb'>
    >,
): StrengthExercise {
  const equipment = partial.equipment;
  const defaultMax =
    /dumbbell/i.test(equipment) ? EQUIPMENT_MAX_LB.dumbbells : EQUIPMENT_MAX_LB.bowflex;
  return {
    weightIncrementLb: 5,
    weightSuffix: '',
    techniqueNote: '',
    maxWeightLb: defaultMax,
    ...partial,
  };
}

const EXERCISES: StrengthExercise[] = [
  ex({
    id: 'ex_flat_chest_press',
    name: 'Flat Chest Press',
    muscleGroup: 'Chest',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_1_ID,
    order: 1,
    techniqueNote: 'Use a slow, controlled tempo.',
  }),
  ex({
    id: 'ex_incline_chest_press',
    name: 'Incline Chest Press',
    muscleGroup: 'Chest',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_1_ID,
    order: 2,
    techniqueNote: 'Use a slow, controlled tempo. Stop if shoulder discomfort increases.',
  }),
  ex({
    id: 'ex_decline_chest_press',
    name: 'Decline Chest Press',
    muscleGroup: 'Chest',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_1_ID,
    order: 3,
    techniqueNote: 'Use a slow, controlled tempo.',
  }),
  ex({
    id: 'ex_tricep_pushdown',
    name: 'Tricep Pushdown',
    muscleGroup: 'Triceps',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_1_ID,
    order: 4,
  }),
  ex({
    id: 'ex_overhead_tricep_extension',
    name: 'Overhead Tricep Extension',
    muscleGroup: 'Triceps',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_1_ID,
    order: 5,
  }),
  ex({
    id: 'ex_crunch',
    name: 'Crunch',
    muscleGroup: 'Core',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_1_ID,
    order: 6,
  }),
  ex({
    id: 'ex_oblique_twist',
    name: 'Oblique Twist',
    muscleGroup: 'Core',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_1_ID,
    order: 7,
  }),
  ex({
    id: 'ex_lat_pulldown',
    name: 'Lat Pulldown',
    muscleGroup: 'Back',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_2_ID,
    order: 1,
  }),
  ex({
    id: 'ex_seated_row',
    name: 'Seated Row',
    muscleGroup: 'Back',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_2_ID,
    order: 2,
  }),
  ex({
    id: 'ex_rear_delt_fly',
    name: 'Rear Delt Fly',
    muscleGroup: 'Shoulders',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_2_ID,
    order: 3,
    techniqueNote:
      'Keep elbows slightly tucked to reduce right shoulder discomfort.',
  }),
  ex({
    id: 'ex_bowflex_shrug',
    name: 'Shrug',
    muscleGroup: 'Traps',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_2_ID,
    order: 4,
    techniqueNote: 'Pause briefly at the top and lower under control.',
  }),
  ex({
    id: 'ex_bowflex_preacher_curl',
    name: 'Preacher Curl',
    muscleGroup: 'Biceps',
    equipment: 'Bowflex',
    active: true,
    workoutId: WORKOUT_2_ID,
    order: 5,
  }),
  ex({
    id: 'ex_dumbbell_twist_curl',
    name: 'Twist Curl',
    muscleGroup: 'Biceps',
    equipment: 'Dumbbells',
    active: true,
    workoutId: WORKOUT_2_ID,
    order: 6,
    weightSuffix: 'per dumbbell',
    techniqueNote: 'Use strict form and avoid swinging.',
  }),
  // Historical-only — keep history, not in active Workout 2.
  ex({
    id: 'ex_dumbbell_shrug',
    name: 'Shrug',
    muscleGroup: 'Traps',
    equipment: 'Dumbbells',
    active: false,
    workoutId: null,
    order: 99,
    weightSuffix: 'per dumbbell',
  }),
];

function entry(
  exerciseId: string,
  workoutId: string | null,
  date: string,
  weightLb: number,
  reps: string[],
  difficulty: StrengthLogEntry['difficulty'],
  notes: string,
  pain = 0,
): StrengthLogEntry {
  return {
    id: newId('slog'),
    exerciseId,
    workoutId,
    date,
    weightLb,
    setCount: reps.length,
    reps,
    difficulty,
    pain,
    notes,
    createdAt: `${date}T18:00:00.000Z`,
  };
}

function baselineEntries(): StrengthLogEntry[] {
  const d1 = '2026-08-03';
  const d2 = '2026-08-04';
  return [
    entry(
      'ex_flat_chest_press',
      WORKOUT_1_ID,
      d1,
      155,
      ['12', '12', '12'],
      'easy',
      'Slow tempo. At Bowflex maximum (155 lb).',
    ),
    entry(
      'ex_incline_chest_press',
      WORKOUT_1_ID,
      d1,
      155,
      ['12', '12', '12'],
      'easy',
      'Slow tempo. Monitor shoulder comfort. At Bowflex maximum (155 lb).',
    ),
    entry(
      'ex_decline_chest_press',
      WORKOUT_1_ID,
      d1,
      155,
      ['12', '12', '12'],
      'easy',
      'Slow tempo. At Bowflex maximum (155 lb).',
    ),
    entry(
      'ex_tricep_pushdown',
      WORKOUT_1_ID,
      d1,
      110,
      ['12', '12', '12'],
      'hard',
      'Not ready to increase.',
    ),
    entry(
      'ex_overhead_tricep_extension',
      WORKOUT_1_ID,
      d1,
      110,
      ['12', '12', '12'],
      'moderate',
      'Easier than tricep pushdown.',
    ),
    entry('ex_crunch', WORKOUT_1_ID, d1, 120, ['20', '20', '20'], 'moderate', ''),
    entry(
      'ex_oblique_twist',
      WORKOUT_1_ID,
      d1,
      120,
      ['12 per side', '12 per side', '12 per side'],
      'moderate',
      '',
    ),
    entry('ex_lat_pulldown', WORKOUT_2_ID, d2, 110, ['12', '12', '12'], 'easy', ''),
    entry('ex_seated_row', WORKOUT_2_ID, d2, 110, ['12', '12', '12'], 'easy', ''),
    entry(
      'ex_rear_delt_fly',
      WORKOUT_2_ID,
      d2,
      70,
      ['12', '12', '12'],
      'moderate',
      'Mild right shoulder discomfort. Keep elbows slightly tucked — worse with elbows flared.',
      3,
    ),
    entry(
      'ex_dumbbell_shrug',
      WORKOUT_2_ID,
      d2,
      25,
      ['15', '15', '15'],
      'moderate',
      'First time performing. Became harder near the end. Historical only — replaced by Shrug on Bowflex.',
    ),
    entry(
      'ex_dumbbell_twist_curl',
      WORKOUT_2_ID,
      d2,
      25,
      ['15', '12', '8'],
      'hard',
      'Performed last after back and trap exercises. At dumbbell maximum (25 lb).',
    ),
  ];
}

function baselineWorkoutNotes(): StrengthWorkoutNote[] {
  return [
    {
      id: newId('swn'),
      workoutId: WORKOUT_1_ID,
      date: '2026-08-03',
      notes:
        'Total elapsed time was approximately 90 minutes because the user was working at the same time.',
    },
  ];
}

export function buildSeededStrengthState(): StrengthState {
  return {
    version: 1,
    seedVersion: STRENGTH_SEED_VERSION,
    workouts: WORKOUTS.map((w) => ({ ...w })),
    exercises: EXERCISES.map((e) => ({ ...e })),
    entries: baselineEntries(),
    workoutNotes: baselineWorkoutNotes(),
  };
}

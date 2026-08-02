/** Persistent physical-training domain — workout tracker + daily intake. */

export type WorkoutSessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'partial'
  | 'skipped';

export type ResistanceUnit = 'lb' | 'kg' | 'bw';

export interface ExercisePrescription {
  load: number | null;
  loadUnit: ResistanceUnit;
  sets: number;
  reps: string;
}

export interface ExerciseLogEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  equipment: string;
  order: number;
  prescribed: ExercisePrescription;
  actual: ExercisePrescription;
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
  note: string;
}

export interface WorkoutSession {
  id: string;
  dateKey: string;
  templateId: string;
  templateSessionId: string;
  workoutName: string;
  status: WorkoutSessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  exercises: ExerciseLogEntry[];
  notes: string;
}

export type IntakeKind = 'protein' | 'water';

export interface IntakeEntry {
  id: string;
  dateKey: string;
  kind: IntakeKind;
  amount: number;
  unit: string;
  note?: string;
  createdAt: string;
}

export interface PhysicalDayMeta {
  dateKey: string;
  recoveryDone: boolean;
}

export interface PhysicalTrackerState {
  version: 1;
  sessions: WorkoutSession[];
  intake: IntakeEntry[];
  dayMeta: PhysicalDayMeta[];
  waterUnit: 'oz' | 'ml' | 'L';
}

export interface PrescribedExercise {
  exerciseId: string;
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  load: number | null;
  loadUnit: ResistanceUnit;
}

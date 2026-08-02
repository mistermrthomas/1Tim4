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

export interface SetLog {
  load: number | null;
  loadUnit: ResistanceUnit;
  reps: number;
}

export interface ExerciseLogEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  equipment: string;
  order: number;
  prescribed: ExercisePrescription;
  actual: ExercisePrescription;
  /** Optional per-set detail for history (e.g. 155×12 | 155×12 | 155×10). */
  setLogs: SetLog[];
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
  note: string;
  cautionNote: string;
}

export interface WorkoutSession {
  id: string;
  dateKey: string;
  /** Links to ScheduledWorkoutBlock.id / WeekScheduleSlot.id for the day. */
  scheduledWorkoutId: string;
  templateId: string;
  templateSessionId: string;
  workoutName: string;
  order: number;
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
  /** How the entry was created (composer, chip, custom, etc.). */
  entryMethod?: string;
  createdAt: string;
}

export interface StepsDayEntry {
  dateKey: string;
  /** Synced health-source baseline when available. */
  syncedBase: number;
  /** Manual +/- adjustments applied on top of synced base. */
  manualDelta: number;
  /** Explicit total override from "Enter total"; null means use syncedBase + manualDelta. */
  manualTotal: number | null;
  target: number;
  source: 'manual' | 'synced';
  updatedAt: string;
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
  steps: StepsDayEntry[];
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
  cautionNote?: string;
  note?: string;
}

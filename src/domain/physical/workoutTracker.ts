import { resolveTodaysPrescription } from './planCatalog';
import { newId, readPhysicalTracker, todayDateKey, writePhysicalTracker } from './store';
import type {
  ExerciseLogEntry,
  ExercisePrescription,
  PrescribedExercise,
  ResistanceUnit,
  SetLog,
  WorkoutSession,
  WorkoutSessionStatus,
} from './types';

/** Today only uses the weekly schedule / planCatalog. */
function resolvePrescription(date = new Date()): {
  templateId: string;
  templateSessionId: string;
  workoutName: string;
  exercises: PrescribedExercise[];
} | null {
  return resolveTodaysPrescription(date);
}

function toLogEntry(ex: PrescribedExercise, order: number): ExerciseLogEntry {
  const prescribed: ExercisePrescription = {
    load: ex.load,
    loadUnit: ex.loadUnit,
    sets: ex.sets,
    reps: ex.reps,
  };
  return {
    id: newId('ex'),
    exerciseId: ex.exerciseId,
    exerciseName: ex.name,
    equipment: ex.equipment,
    order,
    prescribed,
    actual: { ...prescribed },
    setLogs: [],
    completed: false,
    completedAt: null,
    skipped: false,
    note: ex.note ?? '',
    cautionNote: ex.cautionNote ?? '',
  };
}

function sessionUntouched(session: WorkoutSession): boolean {
  return (
    session.status === 'scheduled' &&
    !session.startedAt &&
    session.exercises.every((e) => !e.completed && !e.skipped)
  );
}

function prescriptionsMatch(
  session: WorkoutSession,
  prescribed: { templateSessionId: string; exercises: PrescribedExercise[] },
): boolean {
  if (session.templateSessionId !== prescribed.templateSessionId) return false;
  if (session.exercises.length !== prescribed.exercises.length) return false;
  return session.exercises.every((ex, i) => ex.exerciseId === prescribed.exercises[i]?.exerciseId);
}

function buildSession(
  dateKey: string,
  prescribed: {
    templateId: string;
    templateSessionId: string;
    workoutName: string;
    exercises: PrescribedExercise[];
  },
): WorkoutSession {
  return {
    id: newId('ws'),
    dateKey,
    templateId: prescribed.templateId,
    templateSessionId: prescribed.templateSessionId,
    workoutName: prescribed.workoutName,
    status: 'scheduled',
    startedAt: null,
    completedAt: null,
    exercises: prescribed.exercises.map((ex, index) => toLogEntry(ex, index)),
    notes: '',
  };
}

export function getSessionForDate(dateKey: string): WorkoutSession | null {
  return readPhysicalTracker().sessions.find((s) => s.dateKey === dateKey) ?? null;
}

/** Ensure a session exists for the date from the weekly physical schedule only. */
export function ensureWorkoutSession(dateKey = todayDateKey()): WorkoutSession | null {
  const prescribed = resolvePrescription();
  if (!prescribed) return null;

  const state = readPhysicalTracker();
  const index = state.sessions.findIndex((s) => s.dateKey === dateKey);
  const existing = index >= 0 ? state.sessions[index]! : null;

  if (existing) {
    if (sessionUntouched(existing) && !prescriptionsMatch(existing, prescribed)) {
      const next = buildSession(dateKey, prescribed);
      state.sessions[index] = next;
      writePhysicalTracker(state);
      return next;
    }
    return existing;
  }

  const session = buildSession(dateKey, prescribed);
  state.sessions.push(session);
  writePhysicalTracker(state);
  return session;
}

function updateSession(
  dateKey: string,
  mutate: (session: WorkoutSession) => WorkoutSession,
): WorkoutSession | null {
  const state = readPhysicalTracker();
  const index = state.sessions.findIndex((s) => s.dateKey === dateKey);
  if (index < 0) return null;
  const next = mutate(structuredClone(state.sessions[index]!));
  state.sessions[index] = next;
  writePhysicalTracker(state);
  return next;
}

function deriveStatus(session: WorkoutSession): WorkoutSessionStatus {
  if (session.status === 'skipped') return 'skipped';
  if (session.status === 'completed' || session.status === 'partial') return session.status;
  const done = session.exercises.filter((e) => e.completed || e.skipped).length;
  const total = session.exercises.length;
  if (done === 0) return session.startedAt ? 'in_progress' : 'scheduled';
  if (done >= total) return 'in_progress';
  return 'in_progress';
}

export function startWorkout(dateKey: string): WorkoutSession | null {
  return updateSession(dateKey, (session) => {
    if (!session.startedAt) session.startedAt = new Date().toISOString();
    session.status = 'in_progress';
    return session;
  });
}

export function setExerciseCompleted(
  dateKey: string,
  exerciseLogId: string,
  completed: boolean,
): WorkoutSession | null {
  return updateSession(dateKey, (session) => {
    if (!session.startedAt) session.startedAt = new Date().toISOString();
    const exercise = session.exercises.find((e) => e.id === exerciseLogId);
    if (!exercise) return session;
    exercise.completed = completed;
    exercise.skipped = false;
    exercise.completedAt = completed ? new Date().toISOString() : null;
    if (completed) {
      if (!exercise.actual.sets) exercise.actual = { ...exercise.prescribed };
      if (exercise.setLogs.length === 0) {
        const repsNum = Number(String(exercise.actual.reps).split('-')[0]);
        const perSet = Number.isFinite(repsNum) ? repsNum : 0;
        exercise.setLogs = Array.from({ length: exercise.actual.sets }, () => ({
          load: exercise.actual.load,
          loadUnit: exercise.actual.loadUnit,
          reps: perSet,
        }));
      }
    }
    session.status = deriveStatus(session);
    return session;
  });
}

export function updateExerciseActual(
  dateKey: string,
  exerciseLogId: string,
  patch: Partial<ExercisePrescription> & { setLogs?: SetLog[]; note?: string; cautionNote?: string },
): WorkoutSession | null {
  return updateSession(dateKey, (session) => {
    const exercise = session.exercises.find((e) => e.id === exerciseLogId);
    if (!exercise) return session;
    const { setLogs, note, cautionNote, ...rx } = patch;
    exercise.actual = { ...exercise.actual, ...rx };
    if (setLogs) exercise.setLogs = setLogs;
    if (note != null) exercise.note = note;
    if (cautionNote != null) exercise.cautionNote = cautionNote;
    if (!session.startedAt) {
      session.startedAt = new Date().toISOString();
      session.status = 'in_progress';
    }
    return session;
  });
}

export function skipExercise(
  dateKey: string,
  exerciseLogId: string,
  skipped = true,
): WorkoutSession | null {
  return updateSession(dateKey, (session) => {
    const exercise = session.exercises.find((e) => e.id === exerciseLogId);
    if (!exercise) return session;
    exercise.skipped = skipped;
    if (skipped) {
      exercise.completed = false;
      exercise.completedAt = null;
    }
    if (!session.startedAt) session.startedAt = new Date().toISOString();
    session.status = deriveStatus(session);
    return session;
  });
}

export function completeWorkout(dateKey: string): WorkoutSession | null {
  return updateSession(dateKey, (session) => {
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    if (!session.startedAt) session.startedAt = session.completedAt;
    return session;
  });
}

export function savePartialWorkout(dateKey: string): WorkoutSession | null {
  return updateSession(dateKey, (session) => {
    session.status = 'partial';
    session.completedAt = new Date().toISOString();
    if (!session.startedAt) session.startedAt = session.completedAt;
    return session;
  });
}

export function skipWorkout(dateKey: string): WorkoutSession | null {
  return updateSession(dateKey, (session) => {
    session.status = 'skipped';
    session.completedAt = new Date().toISOString();
    return session;
  });
}

export function formatLoad(load: number | null, unit: ResistanceUnit): string {
  if (unit === 'bw' || load === null) return 'BW';
  return `${load} ${unit}`;
}

export function formatSetLogs(setLogs: SetLog[]): string {
  if (!setLogs.length) return '';
  return setLogs
    .map((s) => `${s.loadUnit === 'bw' || s.load == null ? 'BW' : s.load}×${s.reps}`)
    .join(' | ');
}

export function summarizeCompleted(exercise: ExerciseLogEntry): string {
  if (exercise.setLogs.length) {
    const load = formatLoad(exercise.actual.load, exercise.actual.loadUnit);
    const totalReps = exercise.setLogs.reduce((sum, s) => sum + s.reps, 0);
    return `${load} · ${exercise.setLogs.length} sets · ${totalReps} reps`;
  }
  return `${formatLoad(exercise.actual.load, exercise.actual.loadUnit)} · ${exercise.actual.sets} × ${exercise.actual.reps}`;
}

export function workoutProgress(session: WorkoutSession): {
  completedCount: number;
  total: number;
  allDone: boolean;
  anyDone: boolean;
} {
  const active = session.exercises.filter((e) => !e.skipped);
  const total = active.length || session.exercises.length;
  const completedCount = session.exercises.filter((e) => e.completed).length;
  const finished = session.exercises.every((e) => e.completed || e.skipped);
  return {
    completedCount,
    total,
    allDone: total > 0 && finished,
    anyDone: completedCount > 0,
  };
}

export function listCompletedSessions(): WorkoutSession[] {
  return readPhysicalTracker()
    .sessions.filter((s) => s.status === 'completed' || s.status === 'partial')
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function listExerciseHistory(exerciseId: string): ExerciseLogEntry[] {
  return readPhysicalTracker()
    .sessions.filter((s) => s.status === 'completed' || s.status === 'partial')
    .flatMap((s) => s.exercises.filter((e) => e.exerciseId === exerciseId && e.completed))
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

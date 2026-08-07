import {
  resolveTodaysPrescriptions,
  type ResolvedWorkoutPrescription,
} from './planCatalog';
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
  prescribed: ResolvedWorkoutPrescription,
): boolean {
  if (session.templateSessionId !== prescribed.templateSessionId) return false;
  if (session.exercises.length !== prescribed.exercises.length) return false;
  return session.exercises.every((ex, i) => ex.exerciseId === prescribed.exercises[i]?.exerciseId);
}

function buildSession(
  dateKey: string,
  prescribed: ResolvedWorkoutPrescription,
): WorkoutSession {
  return {
    id: newId('ws'),
    dateKey,
    scheduledWorkoutId: prescribed.scheduledWorkoutId,
    templateId: prescribed.templateId,
    templateSessionId: prescribed.templateSessionId,
    workoutName: prescribed.workoutName,
    order: prescribed.order,
    status: 'scheduled',
    startedAt: null,
    completedAt: null,
    exercises: prescribed.exercises.map((ex, index) => toLogEntry(ex, index)),
    notes: '',
  };
}

function migrateLegacySession(
  session: WorkoutSession,
  prescriptions: ResolvedWorkoutPrescription[],
): WorkoutSession {
  if (session.scheduledWorkoutId) return session;
  const match =
    prescriptions.find((p) => p.templateId === session.templateId) ?? prescriptions[0];
  return {
    ...session,
    scheduledWorkoutId: match?.scheduledWorkoutId ?? `legacy_${session.id}`,
    order: match?.order ?? session.order ?? 0,
  };
}

export function getSessionsForDate(dateKey: string): WorkoutSession[] {
  const state = readPhysicalTracker();
  return state.sessions
    .filter((s) => s.dateKey === dateKey)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getSessionForDate(dateKey: string): WorkoutSession | null {
  return getSessionsForDate(dateKey)[0] ?? null;
}

export function getSessionById(sessionId: string): WorkoutSession | null {
  return readPhysicalTracker().sessions.find((s) => s.id === sessionId) ?? null;
}

/** Ensure one session exists per scheduled workout slot for the date. */
export function ensureWorkoutSessions(dateKey = todayDateKey()): WorkoutSession[] {
  const prescriptions = resolveTodaysPrescriptions();
  if (!prescriptions.length) return [];

  const state = readPhysicalTracker();
  const migrated = state.sessions.map((s) =>
    s.dateKey === dateKey ? migrateLegacySession(s, prescriptions) : s,
  );
  state.sessions = migrated;

  const daySessions = migrated.filter((s) => s.dateKey === dateKey);
  const nextDay: WorkoutSession[] = [];
  let changed = migrated !== state.sessions;

  for (const prescribed of prescriptions) {
    const existing =
      daySessions.find((s) => s.scheduledWorkoutId === prescribed.scheduledWorkoutId) ??
      daySessions.find(
        (s) =>
          s.templateId === prescribed.templateId &&
          !nextDay.some((kept) => kept.id === s.id),
      );

    if (existing) {
      if (sessionUntouched(existing) && !prescriptionsMatch(existing, prescribed)) {
        const rebuilt = buildSession(dateKey, prescribed);
        nextDay.push(rebuilt);
        changed = true;
      } else {
        const patched = {
          ...existing,
          scheduledWorkoutId: prescribed.scheduledWorkoutId,
          order: prescribed.order,
          workoutName: existing.workoutName || prescribed.workoutName,
        };
        nextDay.push(patched);
        if (
          patched.scheduledWorkoutId !== existing.scheduledWorkoutId ||
          patched.order !== existing.order
        ) {
          changed = true;
        }
      }
    } else {
      nextDay.push(buildSession(dateKey, prescribed));
      changed = true;
    }
  }

  // Drop untouched orphan sessions for this date that are no longer scheduled.
  const keepIds = new Set(nextDay.map((s) => s.id));
  const orphans = daySessions.filter((s) => !keepIds.has(s.id));
  for (const orphan of orphans) {
    if (!sessionUntouched(orphan) && orphan.status !== 'scheduled') {
      nextDay.push(orphan);
    } else {
      changed = true;
    }
  }

  if (changed) {
    state.sessions = [
      ...state.sessions.filter((s) => s.dateKey !== dateKey),
      ...nextDay.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    ];
    writePhysicalTracker(state);
  }

  return nextDay.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** @deprecated Prefer ensureWorkoutSessions. */
export function ensureWorkoutSession(dateKey = todayDateKey()): WorkoutSession | null {
  return ensureWorkoutSessions(dateKey)[0] ?? null;
}

function updateSessionById(
  sessionId: string,
  mutate: (session: WorkoutSession) => WorkoutSession,
): WorkoutSession | null {
  const state = readPhysicalTracker();
  const index = state.sessions.findIndex((s) => s.id === sessionId);
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

export function startWorkout(sessionId: string): WorkoutSession | null {
  return updateSessionById(sessionId, (session) => {
    if (!session.startedAt) session.startedAt = new Date().toISOString();
    session.status = 'in_progress';
    return session;
  });
}

export function setExerciseCompleted(
  sessionId: string,
  exerciseLogId: string,
  completed: boolean,
): WorkoutSession | null {
  return updateSessionById(sessionId, (session) => {
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
  sessionId: string,
  exerciseLogId: string,
  patch: Partial<ExercisePrescription> & { setLogs?: SetLog[]; note?: string; cautionNote?: string },
): WorkoutSession | null {
  return updateSessionById(sessionId, (session) => {
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
  sessionId: string,
  exerciseLogId: string,
  skipped = true,
): WorkoutSession | null {
  return updateSessionById(sessionId, (session) => {
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

export function completeWorkout(sessionId: string): WorkoutSession | null {
  return updateSessionById(sessionId, (session) => {
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    if (!session.startedAt) session.startedAt = session.completedAt;
    return session;
  });
}

export function savePartialWorkout(sessionId: string): WorkoutSession | null {
  return updateSessionById(sessionId, (session) => {
    session.status = 'partial';
    session.completedAt = new Date().toISOString();
    if (!session.startedAt) session.startedAt = session.completedAt;
    return session;
  });
}

export function skipWorkout(sessionId: string, skipReason?: string): WorkoutSession | null {
  return updateSessionById(sessionId, (session) => {
    session.status = 'skipped';
    session.completedAt = new Date().toISOString();
    if (skipReason?.trim()) session.skipReason = skipReason.trim();
    return session;
  });
}

export function saveSessionFeedback(
  sessionId: string,
  feedback: {
    difficultyRating?: 1 | 2 | 3 | 4 | 5 | null;
    painNotes?: string;
    adjustNextTime?: string;
  },
): WorkoutSession | null {
  return updateSessionById(sessionId, (session) => {
    if (feedback.difficultyRating !== undefined) {
      session.difficultyRating = feedback.difficultyRating;
    }
    if (feedback.painNotes !== undefined) session.painNotes = feedback.painNotes;
    if (feedback.adjustNextTime !== undefined) session.adjustNextTime = feedback.adjustNextTime;
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

/** Day training target met when every scheduled block is completed or skipped. */
export function dayWorkoutsComplete(sessions: WorkoutSession[]): boolean {
  if (!sessions.length) return false;
  return sessions.every((s) => s.status === 'completed' || s.status === 'skipped' || s.status === 'partial');
}

export function dayWorkoutsSummary(sessions: WorkoutSession[]): {
  completedCount: number;
  total: number;
  allDone: boolean;
} {
  const total = sessions.length;
  const completedCount = sessions.filter(
    (s) => s.status === 'completed' || s.status === 'skipped' || s.status === 'partial',
  ).length;
  return {
    completedCount,
    total,
    allDone: total > 0 && completedCount >= total,
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

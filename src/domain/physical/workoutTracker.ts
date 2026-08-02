import type { InstalledSeasonPack, SeasonDayEntry } from '../../content/types';
import { newId, readPhysicalTracker, todayDateKey, writePhysicalTracker } from './store';
import type {
  ExerciseLogEntry,
  ExercisePrescription,
  PrescribedExercise,
  ResistanceUnit,
  WorkoutSession,
  WorkoutSessionStatus,
} from './types';

function defaultLoad(equipment: string[]): { load: number | null; loadUnit: ResistanceUnit } {
  if (equipment.includes('bodyweight') || equipment.includes('none')) {
    return { load: null, loadUnit: 'bw' };
  }
  return { load: 0, loadUnit: 'lb' };
}

/** Resolve prescribed exercises from the pack workout catalog (source of truth). */
export function resolvePrescribedWorkout(
  pack: InstalledSeasonPack,
  day: SeasonDayEntry,
): {
  templateId: string;
  templateSessionId: string;
  workoutName: string;
  exercises: PrescribedExercise[];
} | null {
  if (day.sessionType !== 'workout' || !day.workoutSessionId) return null;

  for (const template of pack.data.workouts.templates) {
    const session = template.sessions.find((s) => s.id === day.workoutSessionId);
    if (!session) continue;

    const exercises: PrescribedExercise[] = session.blocks.flatMap((block) =>
      block.items.map((item) => {
        const ex = pack.data.workouts.exercises.find((e) => e.id === item.exerciseId);
        const equipment = ex?.equipment?.[0] ?? 'none';
        const load = defaultLoad(ex?.equipment ?? ['none']);
        return {
          exerciseId: item.exerciseId,
          name: ex?.name ?? item.exerciseId,
          equipment,
          sets: item.sets,
          reps: item.reps,
          load: load.load,
          loadUnit: load.loadUnit,
        };
      }),
    );

    return {
      templateId: template.id,
      templateSessionId: session.id,
      workoutName: session.title,
      exercises,
    };
  }

  return null;
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
    completed: false,
    completedAt: null,
    skipped: false,
    note: '',
  };
}

export function getSessionForDate(dateKey: string): WorkoutSession | null {
  return readPhysicalTracker().sessions.find((s) => s.dateKey === dateKey) ?? null;
}

/** Ensure a session exists for the date from the pack prescription. */
export function ensureWorkoutSession(
  pack: InstalledSeasonPack,
  day: SeasonDayEntry,
  dateKey = todayDateKey(),
): WorkoutSession | null {
  const prescribed = resolvePrescribedWorkout(pack, day);
  if (!prescribed) return null;

  const state = readPhysicalTracker();
  const existing = state.sessions.find((s) => s.dateKey === dateKey);
  if (existing) {
    // Keep historical session even if template changes later.
    return existing;
  }

  const session: WorkoutSession = {
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
  const done = session.exercises.filter((e) => e.completed || e.skipped).length;
  const total = session.exercises.length;
  if (done === 0) return session.startedAt ? 'in_progress' : 'scheduled';
  if (done >= total && session.exercises.every((e) => e.completed || e.skipped)) {
    return session.completedAt ? 'completed' : 'in_progress';
  }
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
    if (completed && !exercise.actual.sets) {
      exercise.actual = { ...exercise.prescribed };
    }
    session.status = deriveStatus(session);
    return session;
  });
}

export function updateExerciseActual(
  dateKey: string,
  exerciseLogId: string,
  patch: Partial<ExercisePrescription>,
): WorkoutSession | null {
  return updateSession(dateKey, (session) => {
    const exercise = session.exercises.find((e) => e.id === exerciseLogId);
    if (!exercise) return session;
    exercise.actual = { ...exercise.actual, ...patch };
    if (!session.startedAt) {
      session.startedAt = new Date().toISOString();
      session.status = 'in_progress';
    }
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

export function formatLoad(load: number | null, unit: ResistanceUnit): string {
  if (unit === 'bw' || load === null) return 'BW';
  return `${load} ${unit}`;
}

export function workoutProgress(session: WorkoutSession): {
  completedCount: number;
  total: number;
  allDone: boolean;
  anyDone: boolean;
} {
  const total = session.exercises.length;
  const completedCount = session.exercises.filter((e) => e.completed).length;
  return {
    completedCount,
    total,
    allDone: total > 0 && completedCount === total,
    anyDone: completedCount > 0,
  };
}

export function listCompletedSessions(): WorkoutSession[] {
  return readPhysicalTracker()
    .sessions.filter((s) => s.status === 'completed' || s.status === 'partial')
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

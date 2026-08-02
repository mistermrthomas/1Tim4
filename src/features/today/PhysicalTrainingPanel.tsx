import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isSaturdaySabbath } from '../../domain/calendar/week';
import {
  addIntake,
  getDayMeta,
  getWaterUnit,
  setRecoveryDone,
  setWaterUnit,
  totalIntake,
  undoLastIntake,
} from '../../domain/physical/intakeTracker';
import {
  readPhysicalPlan,
  updatePlanTargets,
  type ResolvedWorkoutPrescription,
} from '../../domain/physical/planCatalog';
import {
  adjustSteps,
  effectiveSteps,
  getStepsDay,
  setStepsTotal,
} from '../../domain/physical/stepsTracker';
import { todayDateKey } from '../../domain/physical/store';
import type { ExerciseLogEntry, ExercisePrescription, StepsDayEntry, WorkoutSession } from '../../domain/physical/types';
import {
  completeWorkout,
  dayWorkoutsSummary,
  ensureWorkoutSessions,
  formatLoad,
  savePartialWorkout,
  setExerciseCompleted,
  skipExercise,
  skipWorkout,
  startWorkout,
  summarizeCompleted,
  updateExerciseActual,
  workoutProgress,
} from '../../domain/physical/workoutTracker';
import { classificationLabel } from '../../domain/weeklyPlan/physicalWorkouts';
import { startNextWeekPath } from '../weeklyPlan/WeeklyPlanWorkspace';
import { Button } from '../../ui/Button';

function SessionProgress({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; done: boolean }>;
}) {
  const doneCount = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  return (
    <div className="today-progress">
      <div className="today-progress__head">
        <p className="today-progress__title">{title}</p>
        <p className="today-progress__count">
          {doneCount} of {items.length}
        </p>
      </div>
      <div className="path-progress__track today-progress__track" aria-hidden>
        <div className="path-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <ul className="today-progress__list">
        {items.map((item) => (
          <li
            key={item.label}
            className={`today-progress__item${item.done ? ' today-progress__item--done' : ''}`}
          >
            <span aria-hidden>{item.done ? '●' : '○'}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function prescriptionEquals(a: ExercisePrescription, b: ExercisePrescription): boolean {
  return a.load === b.load && a.loadUnit === b.loadUnit && a.sets === b.sets && a.reps === b.reps;
}

function summaryLine(exercise: ExerciseLogEntry): string {
  if (exercise.completed) return summarizeCompleted(exercise);
  const load = formatLoad(exercise.actual.load, exercise.actual.loadUnit);
  return `${load} · ${exercise.actual.sets} × ${exercise.actual.reps}`;
}

function ExerciseRow({
  exercise,
  locked,
  editing,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSkip,
}: {
  exercise: ExerciseLogEntry;
  locked: boolean;
  editing: boolean;
  onToggle: (completed: boolean) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (actual: ExercisePrescription) => void;
  onSkip: () => void;
}) {
  const [draftLoad, setDraftLoad] = useState(
    exercise.actual.loadUnit === 'bw' ? 'BW' : String(exercise.actual.load ?? ''),
  );
  const [draftSets, setDraftSets] = useState(String(exercise.actual.sets));
  const [draftReps, setDraftReps] = useState(exercise.actual.reps);

  useEffect(() => {
    if (!editing) return;
    setDraftLoad(exercise.actual.loadUnit === 'bw' ? 'BW' : String(exercise.actual.load ?? ''));
    setDraftSets(String(exercise.actual.sets));
    setDraftReps(exercise.actual.reps);
  }, [editing, exercise.actual]);

  const changed = !prescriptionEquals(exercise.actual, exercise.prescribed);
  const shortName = exercise.exerciseName.replace(/^Bowflex\s+/i, '');

  const save = () => {
    const raw = draftLoad.trim();
    const isBw = raw.toUpperCase() === 'BW' || raw === '';
    const load = isBw ? null : Number(raw);
    onSaveEdit({
      load: isBw || !Number.isFinite(load) ? null : load,
      loadUnit: isBw ? 'bw' : exercise.actual.loadUnit === 'bw' ? 'lb' : exercise.actual.loadUnit,
      sets: Number(draftSets) || 0,
      reps: draftReps.trim() || exercise.prescribed.reps,
    });
  };

  if (exercise.skipped) {
    return (
      <li className="today-exercise today-exercise--skipped">
        <div className="today-exercise__top">
          <span className="today-exercise__name">{shortName}</span>
          <span className="today-exercise__skipped-label">Skipped</span>
        </div>
      </li>
    );
  }

  return (
    <li className={`today-exercise${exercise.completed ? ' today-exercise--done' : ''}`}>
      <div className="today-exercise__top">
        <label className="today-exercise__check">
          <input
            type="checkbox"
            checked={exercise.completed}
            disabled={locked}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span className="today-exercise__name">{shortName}</span>
        </label>
      </div>
      {exercise.cautionNote ? (
        <p className="today-exercise__caution">{exercise.cautionNote.split('—')[0]?.trim() || 'Shoulder caution'}</p>
      ) : null}

      {editing ? (
        <div className="today-exercise__editor">
          <div className="today-exercise__fields">
            <label className="today-exercise__field today-exercise__field--load">
              <span>Weight</span>
              <span className="today-exercise__control">
                <input
                  type="text"
                  inputMode="decimal"
                  value={draftLoad}
                  onChange={(e) => setDraftLoad(e.target.value)}
                  aria-label="Weight or resistance"
                />
                {draftLoad.toUpperCase() !== 'BW' ? (
                  <span className="today-exercise__unit">lb</span>
                ) : null}
              </span>
            </label>
            <label className="today-exercise__field today-exercise__field--sets">
              <span>Sets</span>
              <input
                type="number"
                min={0}
                value={draftSets}
                onChange={(e) => setDraftSets(e.target.value)}
                aria-label="Sets"
              />
            </label>
            <span className="today-exercise__times" aria-hidden>
              ×
            </span>
            <label className="today-exercise__field today-exercise__field--reps">
              <span>Reps</span>
              <input
                type="text"
                value={draftReps}
                onChange={(e) => setDraftReps(e.target.value)}
                aria-label="Reps"
              />
            </label>
          </div>
          <div className="today-exercise__edit-actions">
            <button type="button" className="today-exercise__save" onClick={save}>
              Save
            </button>
            <button type="button" className="today-exercise__cancel" onClick={onCancelEdit}>
              Cancel
            </button>
            {!locked ? (
              <button type="button" className="today-exercise__cancel" onClick={onSkip}>
                Skip
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="today-exercise__summary">
          <div className="today-exercise__summary-main">
            <span>{summaryLine(exercise)}</span>
            {!locked ? (
              <button type="button" className="today-exercise__edit" onClick={onStartEdit}>
                Edit
              </button>
            ) : null}
          </div>
          {changed && !exercise.completed ? (
            <span className="today-exercise__planned">
              Planned: {exercise.prescribed.sets} × {exercise.prescribed.reps}
            </span>
          ) : null}
        </div>
      )}
    </li>
  );
}

function IntakeComposer({
  label,
  totalLabel,
  progress,
  pending,
  unit,
  chips,
  composing,
  onAdjust,
  onBegin,
  onLog,
  onClear,
  onUndo,
  unitControl,
  minusStep = 1,
}: {
  label: string;
  totalLabel: string;
  progress: number;
  pending: number;
  unit: string;
  chips: number[];
  composing: boolean;
  onAdjust: (delta: number) => void;
  onBegin: (delta: number) => void;
  onLog: () => void;
  onClear: () => void;
  onUndo: () => void;
  unitControl?: ReactNode;
  minusStep?: number;
}) {
  return (
    <div className="today-intake">
      <div className="today-intake__head">
        <p className="today-habit__label">{label}</p>
        <p className="today-habit__detail">{totalLabel}</p>
        {unitControl}
      </div>
      <div className="path-progress__track" aria-hidden>
        <div className="path-progress__fill" style={{ width: `${progress}%` }} />
      </div>
      {composing ? (
        <>
          <p className="today-intake__pending">
            Pending: {pending}
            {unit}
          </p>
          <div className="today-intake__controls">
            <button
              type="button"
              className="today-intake__chip"
              onClick={() => onAdjust(-minusStep)}
            >
              −{minusStep}
            </button>
            {chips.map((n) => (
              <button
                key={n}
                type="button"
                className="today-intake__chip"
                onClick={() => onAdjust(n)}
              >
                +{n}
              </button>
            ))}
          </div>
          <div className="today-intake__composer-actions">
            <button
              type="button"
              className="today-intake__log"
              disabled={pending <= 0}
              onClick={onLog}
            >
              Log {pending}
              {unit}
            </button>
            <button type="button" className="today-intake__clear" onClick={onClear}>
              Clear
            </button>
            <button type="button" className="today-intake__clear" onClick={onUndo}>
              Undo
            </button>
          </div>
        </>
      ) : (
        <div className="today-intake__controls">
          {chips.map((n) => (
            <button key={n} type="button" className="today-intake__chip" onClick={() => onBegin(n)}>
              +{n}
            </button>
          ))}
          <button type="button" className="today-intake__chip" onClick={() => onBegin(0)}>
            Custom
          </button>
          <button type="button" className="today-intake__chip" onClick={onUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export function PhysicalTrainingPanel({
  unscheduled = false,
}: {
  /** When true, never invent a workout session (no active weekly schedule). */
  unscheduled?: boolean;
}) {
  const dateKey = todayDateKey();
  const rootRef = useRef<HTMLElement | null>(null);
  const [sticky, setSticky] = useState(false);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [metaById, setMetaById] = useState<Record<string, ResolvedWorkoutPrescription>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [protein, setProtein] = useState(0);
  const [water, setWater] = useState(0);
  const [steps, setSteps] = useState<StepsDayEntry>(() => getStepsDay(dateKey));
  const [recoveryDone, setRecovery] = useState(false);
  const [waterUnit, setUnit] = useState<'oz' | 'ml' | 'L'>('oz');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingProtein, setPendingProtein] = useState<number | null>(null);
  const [pendingWater, setPendingWater] = useState<number | null>(null);
  const [showStepsSet, setShowStepsSet] = useState(false);
  const [stepsDraft, setStepsDraft] = useState('');
  const [targets, setTargets] = useState(() => readPhysicalPlan().targets);

  const patchSession = useCallback((next: WorkoutSession | null) => {
    if (!next) return;
    setSessions((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }, []);

  const reload = useCallback(() => {
    const plan = readPhysicalPlan();
    setTargets(plan.targets);
    const daySlots = plan.weekSchedule[String(new Date().getDay())] ?? [];
    const hasSchedule = daySlots.length > 0;
    if (unscheduled || !hasSchedule) {
      setSessions([]);
      setMetaById({});
      setActiveSessionId(null);
    } else {
      const nextSessions = ensureWorkoutSessions(dateKey);
      setSessions(nextSessions);
      const meta: Record<string, ResolvedWorkoutPrescription> = {};
      for (const slot of daySlots) {
        const tmpl = plan.templates.find((t) => t.id === slot.workoutTemplateId);
        if (!tmpl) continue;
        meta[slot.id] = {
          scheduledWorkoutId: slot.id,
          templateId: tmpl.id,
          templateSessionId: `${tmpl.id}.session`,
          workoutName: tmpl.name,
          classification: tmpl.classification ?? 'primary',
          estimatedDuration: tmpl.estimatedDuration,
          order: slot.order,
          exercises: [],
        };
      }
      setMetaById(meta);
      setActiveSessionId((prev) => {
        if (prev && nextSessions.some((s) => s.id === prev)) return prev;
        const inProgress = nextSessions.find((s) => s.status === 'in_progress');
        return inProgress?.id ?? nextSessions[0]?.id ?? null;
      });
    }
    setProtein(totalIntake(dateKey, 'protein'));
    setWater(totalIntake(dateKey, 'water'));
    setSteps(getStepsDay(dateKey));
    setRecovery(getDayMeta(dateKey).recoveryDone);
    setUnit(getWaterUnit() || plan.targets.waterUnit);
  }, [dateKey, unscheduled]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const desktopMq = window.matchMedia('(min-width: 960px)');
    const update = () => {
      setSticky(desktopMq.matches && el.offsetHeight + 20 < window.innerHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    desktopMq.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      desktopMq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, [sessions, protein, water, steps, recoveryDone, editingId, pendingProtein, pendingWater]);

  const daySummary = dayWorkoutsSummary(sessions);
  const isRecoveryDay = false;
  const stepsTotal = effectiveSteps(steps);
  const stepsTarget = steps.target || targets.steps;
  const waterTarget =
    waterUnit === 'oz'
      ? targets.waterOz
      : waterUnit === 'ml'
        ? Math.round(targets.waterOz * 29.5735)
        : targets.waterOz / 33.814;
  const waterDisplayTarget =
    waterUnit === 'L' ? waterTarget.toFixed(1) : String(Math.round(waterTarget));
  const proteinChips = targets.proteinQuickAdds;
  const waterChips =
    waterUnit === 'ml' ? targets.waterQuickAddsMl : waterUnit === 'L' ? [0.1, 0.25, 0.5, 1] : targets.waterQuickAddsOz;

  const physicalProgress = sessions.length
    ? [
        {
          label: 'Workouts completed',
          done: daySummary.allDone,
        },
        { label: 'Steps target', done: stepsTotal >= stepsTarget },
        { label: 'Protein target', done: protein >= targets.proteinG },
        { label: 'Water target', done: water >= waterTarget },
      ]
    : [
        { label: 'Steps target', done: stepsTotal >= stepsTarget },
        { label: 'Protein target', done: protein >= targets.proteinG },
        { label: 'Water target', done: water >= waterTarget },
      ];

  return (
    <aside
      ref={rootRef}
      className={`today-column today-column--physical today-grid__physical${sticky ? ' today-grid__physical--sticky' : ''}`}
    >
      <div className="today-panel today-panel--physical">
        <header className="today-column__header today-panel__header">
          <h2 className="path-display today-column__title">Physical training</h2>
          <p className="today-column__intro">
            {isSaturdaySabbath()
              ? 'Sabbath — no required workout. Steps, protein, and water stay available.'
              : unscheduled || sessions.length === 0
                ? 'Health targets stay available. Workouts appear after you activate a weekly plan.'
                : 'Today’s training blocks and health targets.'}
          </p>
        </header>

        <hr className="today-panel__divider" />

        <section className="today-panel__section today-workout">
          <p className="today-panel__label">Today’s training</p>

          {sessions.length > 0 ? (
            <>
              <p className="today-workout__day-summary">
                {daySummary.completedCount} of {daySummary.total} workout
                {daySummary.total === 1 ? '' : 's'} completed
              </p>

              <div className="today-workout__cards">
                {sessions.map((session) => {
                  const progress = workoutProgress(session);
                  const meta = metaById[session.scheduledWorkoutId];
                  const kind = meta?.classification ?? 'primary';
                  const expanded = activeSessionId === session.id;
                  const statusLabel =
                    session.status === 'completed'
                      ? 'Completed'
                      : session.status === 'skipped'
                        ? 'Skipped'
                        : session.status === 'partial'
                          ? 'Partial'
                          : session.status === 'in_progress'
                            ? 'In progress'
                            : 'Not started';
                  return (
                    <div
                      key={session.id}
                      className={`today-workout-card${expanded ? ' today-workout-card--active' : ''}${
                        session.status === 'skipped' ? ' today-workout-card--skipped' : ''
                      }${session.status === 'completed' ? ' today-workout-card--done' : ''}`}
                    >
                      <div className="today-workout__summary">
                        <button
                          type="button"
                          className="today-workout__summary-text today-workout__summary-text--button"
                          onClick={() => setActiveSessionId(session.id)}
                        >
                          <p className="today-workout__title">{session.workoutName}</p>
                          <p className="today-workout__meta">
                            {classificationLabel(kind)}
                            {meta?.estimatedDuration ? ` · ${meta.estimatedDuration}` : ''}
                            {' · '}
                            {progress.completedCount} of {progress.total} exercises
                            {' · '}
                            {statusLabel}
                          </p>
                        </button>
                        <div className="today-workout-card__actions">
                          {session.status === 'scheduled' || session.status === 'in_progress' ? (
                            <Button
                              variant="ghost"
                              className="today-workout__btn"
                              onClick={() => {
                                setActiveSessionId(session.id);
                                if (session.status === 'scheduled') {
                                  patchSession(startWorkout(session.id));
                                }
                              }}
                            >
                              {session.status === 'scheduled' ? 'Start' : 'Resume'}
                            </Button>
                          ) : null}
                          {session.status !== 'completed' && session.status !== 'skipped' ? (
                            <Button
                              variant="ghost"
                              className="today-workout__btn"
                              onClick={() => {
                                patchSession(skipWorkout(session.id));
                                setEditingId(null);
                              }}
                            >
                              Skip
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {expanded && session.status !== 'skipped' ? (
                        <>
                          <ul className="today-exercise-list">
                            {session.exercises.map((exercise) => (
                              <ExerciseRow
                                key={exercise.id}
                                exercise={exercise}
                                locked={
                                  session.status === 'completed' || session.status === 'skipped'
                                }
                                editing={editingId === exercise.id}
                                onToggle={(completed) => {
                                  if (!session.startedAt) startWorkout(session.id);
                                  patchSession(
                                    setExerciseCompleted(session.id, exercise.id, completed),
                                  );
                                }}
                                onStartEdit={() => setEditingId(exercise.id)}
                                onCancelEdit={() => setEditingId(null)}
                                onSaveEdit={(actual) => {
                                  if (!session.startedAt) startWorkout(session.id);
                                  patchSession(
                                    updateExerciseActual(session.id, exercise.id, actual),
                                  );
                                  setEditingId(null);
                                }}
                                onSkip={() => {
                                  patchSession(skipExercise(session.id, exercise.id, true));
                                  setEditingId(null);
                                }}
                              />
                            ))}
                          </ul>

                          <div className="today-workout__actions">
                            {session.status !== 'completed' && progress.allDone ? (
                              <Button
                                className="today-workout__btn"
                                onClick={() => patchSession(completeWorkout(session.id))}
                              >
                                Complete workout
                              </Button>
                            ) : null}
                            {session.status === 'in_progress' &&
                            progress.anyDone &&
                            !progress.allDone ? (
                              <Button
                                variant="ghost"
                                className="today-workout__btn"
                                onClick={() => patchSession(savePartialWorkout(session.id))}
                              >
                                Save partial
                              </Button>
                            ) : null}
                            {session.status === 'completed' ? (
                              <p className="today-workout__done">Workout saved to history.</p>
                            ) : null}
                            {session.status === 'partial' ? (
                              <p className="today-workout__done">Partial workout saved.</p>
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      {expanded && session.status === 'skipped' ? (
                        <p className="today-workout__done today-workout__done--skipped">
                          Skipped for today — distinct from completed.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : isRecoveryDay || targets.recoveryEnabled ? (
            <div className="today-recovery">
              <p className="today-workout__title">Recovery / rest</p>
              <p className="path-body">No strength workout scheduled today.</p>
            </div>
          ) : (
            <div className="today-recovery">
              <p className="path-body">
                No workout is scheduled yet. Build this week’s plan to choose your training days.
              </p>
              <Link className="path-btn path-btn--ghost" to={startNextWeekPath()} style={{ marginTop: '0.5rem' }}>
                Build This Week’s Plan
              </Link>
            </div>
          )}
        </section>

        <hr className="today-panel__divider" />

        <section className="today-panel__section">
          <p className="today-panel__label">Daily targets</p>

          <div className="today-intake">
            <div className="today-intake__head">
              <p className="today-habit__label">Steps</p>
              <p className="today-habit__detail">
                {stepsTotal.toLocaleString()} / {stepsTarget.toLocaleString()}
              </p>
            </div>
            <div className="path-progress__track" aria-hidden>
              <div
                className="path-progress__fill"
                style={{
                  width: `${Math.min(100, Math.round((stepsTotal / Math.max(stepsTarget, 1)) * 100))}%`,
                }}
              />
            </div>
            <div className="today-intake__controls">
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => setSteps(adjustSteps(-100))}
              >
                −100
              </button>
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => setSteps(adjustSteps(100))}
              >
                +100
              </button>
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => setSteps(adjustSteps(1000))}
              >
                +1,000
              </button>
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => {
                  setShowStepsSet((v) => !v);
                  setStepsDraft(String(stepsTotal || ''));
                }}
              >
                Set
              </button>
            </div>
            {showStepsSet ? (
              <div className="today-intake__custom">
                <input
                  type="number"
                  min={0}
                  value={stepsDraft}
                  onChange={(e) => setStepsDraft(e.target.value)}
                  aria-label="Enter total steps"
                />
                <button
                  type="button"
                  className="today-intake__add"
                  onClick={() => {
                    const total = Number(stepsDraft);
                    if (!Number.isFinite(total)) return;
                    setSteps(setStepsTotal(total));
                    setShowStepsSet(false);
                  }}
                >
                  Save
                </button>
              </div>
            ) : null}
          </div>

          <IntakeComposer
            label="Protein"
            totalLabel={`${protein} / ${targets.proteinG}g`}
            progress={Math.min(100, Math.round((protein / Math.max(targets.proteinG, 1)) * 100))}
            pending={pendingProtein ?? 0}
            unit="g"
            chips={proteinChips}
            composing={pendingProtein != null}
            onBegin={(n) => setPendingProtein(Math.max(0, n))}
            onAdjust={(delta) =>
              setPendingProtein((prev) => Math.max(0, (prev ?? 0) + delta))
            }
            onLog={() => {
              if (!pendingProtein || pendingProtein <= 0) return;
              addIntake('protein', pendingProtein, 'g', undefined, dateKey, 'composer');
              setProtein(totalIntake(dateKey, 'protein'));
              setPendingProtein(null);
            }}
            onClear={() => setPendingProtein(null)}
            onUndo={() => {
              undoLastIntake('protein');
              setProtein(totalIntake(dateKey, 'protein'));
            }}
          />

          <IntakeComposer
            label="Water"
            totalLabel={`${waterUnit === 'L' ? water.toFixed(1) : water} / ${waterDisplayTarget} ${waterUnit}`}
            progress={Math.min(100, Math.round((water / Math.max(waterTarget, 0.01)) * 100))}
            pending={pendingWater ?? 0}
            unit={waterUnit}
            chips={waterChips}
            composing={pendingWater != null}
            unitControl={
              <select
                className="today-intake__unit"
                value={waterUnit}
                aria-label="Water unit"
                onChange={(e) => {
                  const unit = e.target.value as 'oz' | 'ml' | 'L';
                  setWaterUnit(unit);
                  setUnit(unit);
                  updatePlanTargets({ waterUnit: unit });
                  setPendingWater(null);
                }}
              >
                <option value="oz">oz</option>
                <option value="ml">ml</option>
                <option value="L">L</option>
              </select>
            }
            onBegin={(n) => setPendingWater(Math.max(0, n))}
            onAdjust={(delta) =>
              setPendingWater((prev) => Math.max(0, Math.round(((prev ?? 0) + delta) * 100) / 100))
            }
            onLog={() => {
              if (!pendingWater || pendingWater <= 0) return;
              addIntake('water', pendingWater, waterUnit, undefined, dateKey, 'composer');
              setWater(totalIntake(dateKey, 'water'));
              setPendingWater(null);
            }}
            onClear={() => setPendingWater(null)}
            onUndo={() => {
              undoLastIntake('water');
              setWater(totalIntake(dateKey, 'water'));
            }}
            minusStep={waterUnit === 'ml' ? 50 : waterUnit === 'L' ? 0.1 : 1}
          />

          {targets.recoveryEnabled ? (
            <div className="today-intake today-intake--recovery">
              <div className="today-habit__head">
                <div>
                  <p className="today-habit__label">Recovery</p>
                  <p className="today-habit__detail">{targets.recoveryLabel}</p>
                </div>
                <button
                  type="button"
                  className={`today-habit__check${recoveryDone ? ' today-habit__check--done' : ''}`}
                  aria-pressed={recoveryDone}
                  aria-label={`Mark recovery ${recoveryDone ? 'incomplete' : 'complete'}`}
                  onClick={() => setRecovery(setRecoveryDone(!recoveryDone).recoveryDone)}
                >
                  {recoveryDone ? '✓' : ''}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <hr className="today-panel__divider" />

        <SessionProgress title="Today’s physical progress" items={physicalProgress} />
      </div>
    </aside>
  );
}

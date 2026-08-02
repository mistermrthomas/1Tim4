import { useCallback, useEffect, useRef, useState } from 'react';
import type { InstalledSeasonPack, SeasonDayEntry } from '../../content/types';
import {
  addIntake,
  getDayMeta,
  getWaterUnit,
  setRecoveryDone,
  setWaterUnit,
  totalIntake,
  undoLastIntake,
} from '../../domain/physical/intakeTracker';
import { todayDateKey } from '../../domain/physical/store';
import type { ExerciseLogEntry, ExercisePrescription, WorkoutSession } from '../../domain/physical/types';
import {
  completeWorkout,
  ensureWorkoutSession,
  formatLoad,
  savePartialWorkout,
  setExerciseCompleted,
  startWorkout,
  updateExerciseActual,
  workoutProgress,
} from '../../domain/physical/workoutTracker';
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

function summaryLine(values: ExercisePrescription): string {
  const load = formatLoad(values.load, values.loadUnit);
  return `${load} · ${values.sets} × ${values.reps}`;
}

function ExerciseRow({
  exercise,
  locked,
  editing,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: {
  exercise: ExerciseLogEntry;
  locked: boolean;
  editing: boolean;
  onToggle: (completed: boolean) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (actual: ExercisePrescription) => void;
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
          <span className="today-exercise__name">{exercise.exerciseName}</span>
        </label>
      </div>

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
          </div>
        </div>
      ) : (
        <div className="today-exercise__summary">
          <div className="today-exercise__summary-main">
            <span>{summaryLine(exercise.actual)}</span>
            {!locked ? (
              <button type="button" className="today-exercise__edit" onClick={onStartEdit}>
                Edit
              </button>
            ) : null}
          </div>
          {changed ? (
            <span className="today-exercise__planned">
              Planned: {exercise.prescribed.sets} × {exercise.prescribed.reps}
            </span>
          ) : null}
        </div>
      )}
    </li>
  );
}

export function PhysicalTrainingPanel({
  pack,
  day,
  proteinTarget,
  waterTargetOz,
  recoveryLabel,
}: {
  pack: InstalledSeasonPack;
  day: SeasonDayEntry;
  proteinTarget: number;
  waterTargetOz: number;
  recoveryLabel: string;
}) {
  const dateKey = todayDateKey();
  const rootRef = useRef<HTMLElement | null>(null);
  const [sticky, setSticky] = useState(false);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [protein, setProtein] = useState(0);
  const [water, setWater] = useState(0);
  const [recoveryDone, setRecovery] = useState(false);
  const [waterUnit, setUnit] = useState<'oz' | 'ml' | 'L'>('oz');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showProteinCustom, setShowProteinCustom] = useState(false);
  const [showWaterCustom, setShowWaterCustom] = useState(false);
  const [customProtein, setCustomProtein] = useState('');
  const [customWater, setCustomWater] = useState('');

  const reload = useCallback(() => {
    const next = ensureWorkoutSession(pack, day, dateKey);
    setSession(next);
    setProtein(totalIntake(dateKey, 'protein'));
    setWater(totalIntake(dateKey, 'water'));
    setRecovery(getDayMeta(dateKey).recoveryDone);
    setUnit(getWaterUnit());
  }, [pack, day, dateKey]);

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
  }, [session, protein, water, recoveryDone, editingId]);

  const progress = session ? workoutProgress(session) : null;
  const isRecoveryDay = !session && (day.sessionType === 'recovery' || day.sessionType === 'rest_walk');
  const totalSets = session?.exercises.reduce((sum, ex) => sum + ex.actual.sets, 0) ?? 0;
  const waterTarget =
    waterUnit === 'oz'
      ? waterTargetOz
      : waterUnit === 'ml'
        ? Math.round(waterTargetOz * 29.5735)
        : waterTargetOz / 33.814;
  const waterDisplayTarget =
    waterUnit === 'L' ? waterTarget.toFixed(1) : String(Math.round(waterTarget));

  const physicalProgress = [
    {
      label: 'Workout exercises completed',
      done: progress ? progress.allDone || (!session && isRecoveryDay) : isRecoveryDay,
    },
    { label: 'Protein progress', done: protein >= proteinTarget },
    { label: 'Water progress', done: water >= waterTarget },
    { label: 'Recovery status', done: recoveryDone },
  ];

  return (
    <aside
      ref={rootRef}
      className={`today-column today-column--physical today-grid__physical${sticky ? ' today-grid__physical--sticky' : ''}`}
    >
      <div className="today-panel today-panel--physical">
        <header className="today-column__header today-panel__header">
          <h2 className="path-display today-column__title">Physical training</h2>
          <p className="today-column__intro">Today’s workout and health targets.</p>
        </header>

        <hr className="today-panel__divider" />

        <section className="today-panel__section today-workout">
          <p className="today-panel__label">Today’s workout</p>

          {session ? (
            <>
              <div className="today-workout__summary">
                <div className="today-workout__summary-text">
                  <p className="today-workout__title">{session.workoutName}</p>
                  <p className="today-workout__meta">
                    {progress?.completedCount ?? 0} of {progress?.total ?? 0} exercises · {totalSets}{' '}
                    sets
                  </p>
                </div>
                {session.status === 'scheduled' ? (
                  <Button
                    variant="ghost"
                    className="today-workout__btn"
                    onClick={() => setSession(startWorkout(dateKey))}
                  >
                    Start
                  </Button>
                ) : null}
              </div>

              <ul className="today-exercise-list">
                {session.exercises.map((exercise) => (
                  <ExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    locked={session.status === 'completed'}
                    editing={editingId === exercise.id}
                    onToggle={(completed) => {
                      if (!session.startedAt) startWorkout(dateKey);
                      setSession(setExerciseCompleted(dateKey, exercise.id, completed));
                    }}
                    onStartEdit={() => setEditingId(exercise.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={(actual) => {
                      if (!session.startedAt) startWorkout(dateKey);
                      setSession(updateExerciseActual(dateKey, exercise.id, actual));
                      setEditingId(null);
                    }}
                  />
                ))}
              </ul>

              <div className="today-workout__actions">
                {session.status !== 'completed' && progress?.allDone ? (
                  <Button
                    className="today-workout__btn"
                    onClick={() => setSession(completeWorkout(dateKey))}
                  >
                    Complete workout
                  </Button>
                ) : null}
                {session.status === 'in_progress' && progress?.anyDone && !progress.allDone ? (
                  <Button
                    variant="ghost"
                    className="today-workout__btn"
                    onClick={() => setSession(savePartialWorkout(dateKey))}
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
          ) : isRecoveryDay ? (
            <div className="today-recovery">
              <p className="today-workout__title">Recovery day</p>
              <p className="path-body">No strength workout scheduled.</p>
            </div>
          ) : (
            <p className="path-body">No workout scheduled for today.</p>
          )}
        </section>

        <hr className="today-panel__divider" />

        <section className="today-panel__section">
          <p className="today-panel__label">Daily targets</p>

          <div className="today-intake">
            <div className="today-intake__head">
              <p className="today-habit__label">Protein</p>
              <p className="today-habit__detail">
                {protein} / {proteinTarget}g
              </p>
            </div>
            <div className="path-progress__track" aria-hidden>
              <div
                className="path-progress__fill"
                style={{
                  width: `${Math.min(100, Math.round((protein / Math.max(proteinTarget, 1)) * 100))}%`,
                }}
              />
            </div>
            <div className="today-intake__controls">
              {[10, 20, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="today-intake__chip"
                  onClick={() => {
                    addIntake('protein', n, 'g');
                    setProtein(totalIntake(dateKey, 'protein'));
                  }}
                >
                  +{n}
                </button>
              ))}
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => setShowProteinCustom((v) => !v)}
              >
                Custom
              </button>
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => {
                  undoLastIntake('protein');
                  setProtein(totalIntake(dateKey, 'protein'));
                }}
              >
                Undo
              </button>
            </div>
            {showProteinCustom ? (
              <div className="today-intake__custom">
                <input
                  type="number"
                  min={0}
                  value={customProtein}
                  onChange={(e) => setCustomProtein(e.target.value)}
                  aria-label="Custom protein grams"
                />
                <span className="today-intake__suffix">g</span>
                <button
                  type="button"
                  className="today-intake__add"
                  onClick={() => {
                    const amount = Number(customProtein);
                    if (!amount) return;
                    addIntake('protein', amount, 'g');
                    setProtein(totalIntake(dateKey, 'protein'));
                    setCustomProtein('');
                    setShowProteinCustom(false);
                  }}
                >
                  Add
                </button>
              </div>
            ) : null}
          </div>

          <div className="today-intake">
            <div className="today-intake__head">
              <p className="today-habit__label">Water</p>
              <p className="today-habit__detail">
                {waterUnit === 'L' ? water.toFixed(1) : water} / {waterDisplayTarget} {waterUnit}
              </p>
              <select
                className="today-intake__unit"
                value={waterUnit}
                aria-label="Water unit"
                onChange={(e) => {
                  const unit = e.target.value as 'oz' | 'ml' | 'L';
                  setWaterUnit(unit);
                  setUnit(unit);
                }}
              >
                <option value="oz">oz</option>
                <option value="ml">ml</option>
                <option value="L">L</option>
              </select>
            </div>
            <div className="path-progress__track" aria-hidden>
              <div
                className="path-progress__fill"
                style={{
                  width: `${Math.min(100, Math.round((water / Math.max(waterTarget, 0.01)) * 100))}%`,
                }}
              />
            </div>
            <div className="today-intake__controls">
              {(waterUnit === 'oz'
                ? [8, 12, 16]
                : waterUnit === 'ml'
                  ? [250, 350, 500]
                  : [0.25, 0.5, 1]
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  className="today-intake__chip"
                  onClick={() => {
                    addIntake('water', n, waterUnit);
                    setWater(totalIntake(dateKey, 'water'));
                  }}
                >
                  +{n}
                </button>
              ))}
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => setShowWaterCustom((v) => !v)}
              >
                Custom
              </button>
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => {
                  undoLastIntake('water');
                  setWater(totalIntake(dateKey, 'water'));
                }}
              >
                Undo
              </button>
            </div>
            {showWaterCustom ? (
              <div className="today-intake__custom">
                <input
                  type="number"
                  min={0}
                  step={waterUnit === 'L' ? 0.1 : 1}
                  value={customWater}
                  onChange={(e) => setCustomWater(e.target.value)}
                  aria-label={`Custom water ${waterUnit}`}
                />
                <span className="today-intake__suffix">{waterUnit}</span>
                <button
                  type="button"
                  className="today-intake__add"
                  onClick={() => {
                    const amount = Number(customWater);
                    if (!amount) return;
                    addIntake('water', amount, waterUnit);
                    setWater(totalIntake(dateKey, 'water'));
                    setCustomWater('');
                    setShowWaterCustom(false);
                  }}
                >
                  Add
                </button>
              </div>
            ) : null}
          </div>

          <div className="today-intake today-intake--recovery">
            <div className="today-habit__head">
              <div>
                <p className="today-habit__label">Recovery</p>
                <p className="today-habit__detail">{recoveryLabel}</p>
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
        </section>

        <hr className="today-panel__divider" />

        <SessionProgress title="Physical progress" items={physicalProgress} />
      </div>
    </aside>
  );
}

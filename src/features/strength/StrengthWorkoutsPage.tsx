import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addDays } from '../../domain/calendar/week';
import { todayDateKey } from '../../domain/physical/store';
import {
  formatRecommendedNext,
  formatReps,
  formatWeight,
  isAtEquipmentMax,
  personalBestWeight,
  recommendedFromLast,
} from '../../domain/strength/progression';
import {
  activeExercises,
  activeWorkouts,
  deleteStrengthLogEntry,
  entriesForExercise,
  entryForExerciseDate,
  exercisesForWorkout,
  getExercise,
  latestEntry,
  readStrengthState,
  sessionDatesForExercises,
  updateExerciseTechniqueNote,
  upsertStrengthLogEntry,
} from '../../domain/strength/store';
import {
  DIFFICULTY_OPTIONS,
  type StrengthDifficulty,
  type StrengthExercise,
  type StrengthLogEntry,
  type StrengthState,
  type StrengthWorkout,
} from '../../domain/strength/types';
import { Button } from '../../ui/Button';
import './StrengthWorkoutsPage.css';

type View =
  | { kind: 'home' }
  | { kind: 'workout'; workoutId: string }
  | {
      kind: 'log';
      exerciseId: string;
      workoutId: string | null;
      entryId?: string;
      preferredDate?: string;
    };

function difficultyLabel(value: StrengthDifficulty): string {
  return DIFFICULTY_OPTIONS.find((d) => d.value === value)?.label ?? value;
}

function difficultyShort(value: StrengthDifficulty): string {
  switch (value) {
    case 'easy':
      return 'E';
    case 'easy_moderate':
      return 'E/M';
    case 'moderate':
      return 'M';
    case 'moderate_hard':
      return 'M/H';
    case 'hard':
      return 'H';
    case 'max':
      return 'X';
    default:
      return '';
  }
}

function formatColumnDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!, 12);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function LogForm({
  state,
  exercise,
  workoutId,
  entry,
  preferredDate,
  onCancel,
  onSaved,
  onDeleted,
}: {
  state: StrengthState;
  exercise: StrengthExercise;
  workoutId: string | null;
  entry?: StrengthLogEntry | null;
  preferredDate?: string;
  onCancel: () => void;
  onSaved: (next: StrengthState) => void;
  onDeleted?: (next: StrengthState) => void;
}) {
  const last = latestEntry(state, exercise.id);
  const recommended = recommendedFromLast(exercise, last);
  const todayKey = todayDateKey();
  const yesterdayKey = addDays(todayKey, -1);
  /** New logs: yesterday or today. Editing keeps the entry’s original date if older. */
  const allowedDates = new Set(
    [todayKey, yesterdayKey, entry?.date, preferredDate].filter(
      (value): value is string => Boolean(value),
    ),
  );
  const minDate =
    entry?.date && entry.date < yesterdayKey
      ? entry.date
      : preferredDate && preferredDate < yesterdayKey
        ? preferredDate
        : yesterdayKey;
  const clampLogDate = (value: string) => (allowedDates.has(value) ? value : todayKey);
  const [date, setDate] = useState(
    clampLogDate(entry?.date ?? preferredDate ?? todayKey),
  );
  const [weight, setWeight] = useState(
    String(entry?.weightLb ?? recommended ?? last?.weightLb ?? ''),
  );
  const [reps, setReps] = useState<string[]>(
    entry?.reps?.length ? [...entry.reps] : ['12', '12', '12'],
  );
  const [difficulty, setDifficulty] = useState<StrengthDifficulty>(
    entry?.difficulty ?? 'moderate',
  );
  const [pain, setPain] = useState(String(entry?.pain ?? 0));
  const [notes, setNotes] = useState(entry?.notes ?? '');

  const save = () => {
    const weightLb = Number(weight);
    if (!Number.isFinite(weightLb) || weightLb < 0) {
      window.alert('Enter a valid weight.');
      return;
    }
    if (
      exercise.maxWeightLb != null &&
      weightLb > exercise.maxWeightLb &&
      !window.confirm(
        `${formatWeight(weightLb, exercise.weightSuffix)} is above the ${exercise.equipment} max of ${formatWeight(exercise.maxWeightLb, exercise.weightSuffix)}. Save anyway?`,
      )
    ) {
      return;
    }
    const cleanedReps = reps.map((r) => r.trim()).filter(Boolean);
    if (!cleanedReps.length) {
      window.alert('Enter at least one set of reps.');
      return;
    }
    const logDate = clampLogDate(date);
    if (logDate !== date) {
      window.alert('New strength logs can only be dated yesterday or today.');
      setDate(logDate);
      return;
    }
    const painScore = Math.max(0, Math.min(10, Number(pain) || 0));
    const next = upsertStrengthLogEntry({
      id: entry?.id,
      exerciseId: exercise.id,
      workoutId,
      date: logDate,
      weightLb,
      setCount: cleanedReps.length,
      reps: cleanedReps,
      difficulty,
      pain: painScore,
      notes: notes.trim(),
    });
    onSaved(next);
  };

  return (
    <section className="strength-log path-surface">
      <h2 className="strength-log__title">Log · {exercise.name}</h2>
      {recommended != null && !entry ? (
        <p className="strength-empty">
          Recommended next weight: <strong>{formatRecommendedNext(exercise, last)}</strong> —
          override anytime.
        </p>
      ) : null}
      {exercise.maxWeightLb != null ? (
        <p className="strength-empty">
          Equipment limit: {formatWeight(exercise.maxWeightLb, exercise.weightSuffix)} on{' '}
          {exercise.equipment}.
        </p>
      ) : null}
      <div className="strength-log__grid">
        <label className="path-field">
          <span>{entry ? 'Date' : 'Date (yesterday or today)'}</span>
          <input
            type="date"
            min={minDate}
            max={todayKey}
            value={date}
            onChange={(e) => setDate(clampLogDate(e.target.value))}
          />
        </label>
        <label className="path-field">
          <span>Weight (lb{exercise.weightSuffix ? ` ${exercise.weightSuffix}` : ''})</span>
          <input
            type="number"
            min={0}
            max={exercise.maxWeightLb ?? undefined}
            step={exercise.weightIncrementLb}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
        <label className="path-field">
          <span>Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as StrengthDifficulty)}
          >
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="path-field">
          <span>Pain (0–10)</span>
          <input
            type="number"
            min={0}
            max={10}
            value={pain}
            onChange={(e) => setPain(e.target.value)}
          />
        </label>
      </div>

      <div className="strength-log__sets">
        <p className="today-panel__label">Sets &amp; reps</p>
        {reps.map((value, index) => (
          <div key={index} className="strength-log__set-row">
            <span>Set {index + 1}</span>
            <input
              value={value}
              onChange={(e) => {
                const next = [...reps];
                next[index] = e.target.value;
                setReps(next);
              }}
              placeholder="12 or 12 per side"
            />
            <Button
              variant="ghost"
              disabled={reps.length <= 1}
              onClick={() => setReps(reps.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button variant="ghost" onClick={() => setReps([...reps, ''])}>
          Add set
        </Button>
      </div>

      <label className="path-field">
        <span>Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      <p className="strength-log__defs">
        {DIFFICULTY_OPTIONS.map((opt) => (
          <span key={opt.value}>
            <strong>{opt.label}:</strong> {opt.definition}{' '}
          </span>
        ))}
      </p>

      <div className="strength-log__actions">
        <Button onClick={save}>Save entry</Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {entry && onDeleted ? (
          <Button
            variant="ghost"
            onClick={() => {
              if (!window.confirm('Delete this log entry? History for other dates is kept.')) {
                return;
              }
              onDeleted(deleteStrengthLogEntry(entry.id));
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function ExerciseDetailPanel({
  state,
  exercise,
  techniqueDraft,
  onTechniqueDraft,
  onTechniqueSave,
  onLog,
  onEditEntry,
  onClose,
}: {
  state: StrengthState;
  exercise: StrengthExercise;
  techniqueDraft: string | null;
  onTechniqueDraft: (value: string) => void;
  onTechniqueSave: () => void;
  onLog: () => void;
  onEditEntry: (entryId: string) => void;
  onClose: () => void;
}) {
  const history = entriesForExercise(state, exercise.id);
  const last = history[0] ?? null;
  const best = personalBestWeight(history);
  const note = techniqueDraft ?? exercise.techniqueNote;

  return (
    <div id="exercise-detail" className="strength-detail-panel">
      <section className="strength-summary path-surface">
        <div className="strength-detail-panel__head">
          <p className="path-eyebrow">Exercise detail</p>
          <button type="button" className="strength-page__back" onClick={onClose}>
            Close
          </button>
        </div>
        <h2 className="strength-summary__title path-display">{exercise.name}</h2>
        <dl className="strength-summary__grid">
          <div className="strength-exercise__stat">
            <dt>Current working weight</dt>
            <dd>{last ? formatWeight(last.weightLb, exercise.weightSuffix) : '—'}</dd>
          </div>
          <div className="strength-exercise__stat">
            <dt>Last workout</dt>
            <dd>{last?.date ?? '—'}</dd>
          </div>
          <div className="strength-exercise__stat">
            <dt>Equipment</dt>
            <dd>
              {exercise.equipment}
              {exercise.maxWeightLb != null
                ? ` · max ${formatWeight(exercise.maxWeightLb, exercise.weightSuffix)}`
                : ''}
            </dd>
          </div>
          <div className="strength-exercise__stat">
            <dt>Recommended next</dt>
            <dd className="dd--rec">{formatRecommendedNext(exercise, last)}</dd>
          </div>
          <div className="strength-exercise__stat">
            <dt>Personal best</dt>
            <dd>{best != null ? formatWeight(best, exercise.weightSuffix) : '—'}</dd>
          </div>
          <div className="strength-exercise__stat">
            <dt>Latest difficulty</dt>
            <dd>{last ? difficultyLabel(last.difficulty) : '—'}</dd>
          </div>
          <div className="strength-exercise__stat">
            <dt>Latest pain</dt>
            <dd>{last ? String(last.pain) : '—'}</dd>
          </div>
        </dl>
        <label className="path-field">
          <span>Permanent technique note</span>
          <textarea
            value={note}
            onChange={(e) => onTechniqueDraft(e.target.value)}
            onBlur={onTechniqueSave}
            rows={2}
          />
        </label>
        <div className="strength-exercise__actions">
          <Button onClick={onLog}>Log today’s result</Button>
        </div>
      </section>

      <section className="path-surface strength-summary">
        <p className="today-panel__label">History</p>
        <p className="strength-progress__hint">Tap a row to edit.</p>
        {history.length === 0 ? (
          <p className="strength-empty">No history yet.</p>
        ) : (
          <div className="strength-table-wrap">
            <table className="strength-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight</th>
                  <th>Sets</th>
                  <th>Reps</th>
                  <th>Difficulty</th>
                  <th>Pain</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr
                    key={row.id}
                    className="strength-table__row--edit"
                    onClick={() => onEditEntry(row.id)}
                  >
                    <td>{row.date}</td>
                    <td>{formatWeight(row.weightLb, exercise.weightSuffix)}</td>
                    <td>{row.setCount}</td>
                    <td>{formatReps(row.reps)}</td>
                    <td>{difficultyLabel(row.difficulty)}</td>
                    <td>{row.pain}</td>
                    <td>{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ProgressionTable({
  state,
  exercises,
  label = 'Progression',
  hint = 'Tap a cell to edit. Empty cells for yesterday/today add a new log. Tap an exercise name for history.',
  showWorkout = false,
  selectedExerciseId = null,
  onOpenCell,
  onLogToday,
  onOpenExercise,
}: {
  state: StrengthState;
  exercises: StrengthExercise[];
  label?: string;
  hint?: string;
  showWorkout?: boolean;
  selectedExerciseId?: string | null;
  onOpenCell: (exerciseId: string, date: string, entryId?: string) => void;
  onLogToday: (exerciseId: string) => void;
  onOpenExercise?: (exerciseId: string) => void;
}) {
  const todayKey = todayDateKey();
  const yesterdayKey = addDays(todayKey, -1);
  const dates = sessionDatesForExercises(
    state,
    exercises.map((e) => e.id),
    8,
  );
  const dateColumns =
    dates.includes(todayKey) || dates.length === 0 ? dates : [...dates, todayKey];

  return (
    <section className="path-surface strength-summary">
      <div className="strength-progress__head">
        <p className="today-panel__label">{label}</p>
        <p className="strength-progress__hint">{hint}</p>
      </div>
      {exercises.length === 0 ? (
        <p className="strength-empty">No exercises yet.</p>
      ) : (
        <div className="strength-table-wrap">
          <table className="strength-table strength-table--progress">
            <thead>
              <tr>
                <th className="strength-table__sticky">Exercise</th>
                <th>Equip</th>
                {showWorkout ? <th>Workout</th> : null}
                {dateColumns.map((date) => (
                  <th key={date} title={date}>
                    {formatColumnDate(date)}
                    {date === todayKey ? (
                      <span className="strength-table__tag"> today</span>
                    ) : date === yesterdayKey ? (
                      <span className="strength-table__tag"> yday</span>
                    ) : null}
                  </th>
                ))}
                <th>Next</th>
                <th aria-label="Log" />
              </tr>
            </thead>
            <tbody>
              {exercises.map((exercise) => {
                const last = latestEntry(state, exercise.id);
                const workout = state.workouts.find((w) => w.id === exercise.workoutId);
                const atMax = last ? isAtEquipmentMax(exercise, last.weightLb) : false;
                return (
                  <tr
                    key={exercise.id}
                    className={
                      selectedExerciseId === exercise.id ? 'strength-table__row--selected' : undefined
                    }
                  >
                    <th scope="row" className="strength-table__sticky strength-table__exercise">
                      {onOpenExercise ? (
                        <button
                          type="button"
                          className="strength-table__exercise-btn"
                          onClick={() => onOpenExercise(exercise.id)}
                        >
                          {exercise.name}
                        </button>
                      ) : (
                        exercise.name
                      )}
                    </th>
                    <td className="strength-table__equip">{exercise.equipment}</td>
                    {showWorkout ? (
                      <td className="strength-table__equip">
                        {workout ? `W${workout.order}` : '—'}
                      </td>
                    ) : null}
                    {dateColumns.map((date) => {
                      const entry = entryForExerciseDate(state, exercise.id, date);
                      const canAdd = date === todayKey || date === yesterdayKey;
                      if (!entry && !canAdd) {
                        return (
                          <td key={date} className="strength-table__empty">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={date}>
                          <button
                            type="button"
                            className={`strength-cell${entry ? '' : ' strength-cell--empty'}${
                              entry && isAtEquipmentMax(exercise, entry.weightLb)
                                ? ' strength-cell--max'
                                : ''
                            }`}
                            title={
                              entry
                                ? `${formatWeight(entry.weightLb, exercise.weightSuffix)} · ${formatReps(entry.reps)} · ${difficultyLabel(entry.difficulty)}${
                                    isAtEquipmentMax(exercise, entry.weightLb)
                                      ? ' · equipment max'
                                      : ''
                                  }${entry.notes ? ` · ${entry.notes}` : ''}`
                                : `Log ${formatColumnDate(date)}`
                            }
                            onClick={() => onOpenCell(exercise.id, date, entry?.id)}
                          >
                            {entry ? (
                              <>
                                <span className="strength-cell__weight">
                                  {Math.round(entry.weightLb)}
                                </span>
                                <span className="strength-cell__diff">
                                  {difficultyShort(entry.difficulty)}
                                  {isAtEquipmentMax(exercise, entry.weightLb) ? ' · max' : ''}
                                </span>
                              </>
                            ) : (
                              <span className="strength-cell__add">+</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td
                      className={`dd--rec strength-table__next${atMax ? ' strength-table__next--max' : ''}`}
                    >
                      {formatRecommendedNext(exercise, last)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="strength-cell strength-cell--log"
                        onClick={() => onLogToday(exercise.id)}
                      >
                        Log
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function StrengthWorkoutsPage() {
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState<StrengthState>(() => readStrengthState());
  const [techniqueDraft, setTechniqueDraft] = useState<string | null>(null);
  const [detailExerciseId, setDetailExerciseId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const view: View = useMemo(() => {
    const log = params.get('log');
    const workoutId = params.get('w');
    const entryId = params.get('entry') || undefined;
    const preferredDate = params.get('date') || undefined;
    if (log) {
      return {
        kind: 'log',
        exerciseId: log,
        workoutId: workoutId || getExercise(state, log)?.workoutId || null,
        entryId,
        preferredDate,
      };
    }
    if (workoutId) return { kind: 'workout', workoutId };
    return { kind: 'home' };
  }, [params, state]);

  const setView = (next: View) => {
    const nextParams = new URLSearchParams();
    if (next.kind === 'workout') nextParams.set('w', next.workoutId);
    if (next.kind === 'log') {
      nextParams.set('log', next.exerciseId);
      if (next.workoutId) nextParams.set('w', next.workoutId);
      if (next.entryId) nextParams.set('entry', next.entryId);
      if (next.preferredDate) nextParams.set('date', next.preferredDate);
    }
    setParams(nextParams, { replace: false });
  };

  const openExerciseDetail = (exerciseId: string) => {
    setTechniqueDraft(null);
    setDetailExerciseId(exerciseId);
  };

  useEffect(() => {
    if (!detailExerciseId || !detailRef.current) return;
    detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [detailExerciseId]);

  // Clear inline detail when leaving a workout context via URL.
  useEffect(() => {
    if (view.kind === 'log') setDetailExerciseId(null);
  }, [view.kind]);

  const workouts = activeWorkouts(state);
  const detailExercise = detailExerciseId ? getExercise(state, detailExerciseId) : null;

  if (view.kind === 'log') {
    const exercise = getExercise(state, view.exerciseId);
    if (!exercise) {
      return (
        <div className="strength-page path-fade-in">
          <p className="strength-empty">Exercise not found.</p>
          <button type="button" className="strength-page__back" onClick={() => setView({ kind: 'home' })}>
            ← Workouts
          </button>
        </div>
      );
    }
    return (
      <div className="strength-page path-fade-in">
        <button
          type="button"
          className="strength-page__back"
          onClick={() =>
            setView({
              kind: 'workout',
              workoutId: view.workoutId || exercise.workoutId || workouts[0]!.id,
            })
          }
        >
          ← Back to workout
        </button>
        <LogForm
          state={state}
          exercise={exercise}
          workoutId={view.workoutId}
          entry={
            view.entryId
              ? state.entries.find((e) => e.id === view.entryId) ?? null
              : null
          }
          preferredDate={view.preferredDate}
          onCancel={() =>
            setView({
              kind: 'workout',
              workoutId: view.workoutId || exercise.workoutId || workouts[0]!.id,
            })
          }
          onSaved={(next) => {
            setState(next);
            setView({
              kind: 'workout',
              workoutId: view.workoutId || exercise.workoutId || workouts[0]!.id,
            });
          }}
          onDeleted={(next) => {
            setState(next);
            setView({
              kind: 'workout',
              workoutId: view.workoutId || exercise.workoutId || workouts[0]!.id,
            });
          }}
        />
      </div>
    );
  }

  if (view.kind === 'workout') {
    const workout = state.workouts.find((w) => w.id === view.workoutId) as
      | StrengthWorkout
      | undefined;
    const exercises = exercisesForWorkout(state, view.workoutId);
    const sessionNote = state.workoutNotes.find((n) => n.workoutId === view.workoutId);

    return (
      <div className="strength-page strength-page--wide path-fade-in">
        <button
          type="button"
          className="strength-page__back"
          onClick={() => {
            setDetailExerciseId(null);
            setView({ kind: 'home' });
          }}
        >
          ← All workouts
        </button>
        <header className="strength-page__header">
          <p className="path-eyebrow">Strength log</p>
          <h1 className="path-display strength-page__title">
            {workout?.shortLabel ?? 'Workout'}
          </h1>
          <p className="strength-page__lede">
            Use Log for today’s result, or tap a cell to edit. Tap an exercise name for history and
            details below.
          </p>
          {sessionNote ? (
            <p className="strength-page__lede">Latest session note: {sessionNote.notes}</p>
          ) : null}
        </header>

        <ProgressionTable
          state={state}
          exercises={exercises}
          selectedExerciseId={detailExerciseId}
          onOpenCell={(exerciseId, date, entryId) =>
            setView({
              kind: 'log',
              exerciseId,
              workoutId: view.workoutId,
              entryId,
              preferredDate: entryId ? undefined : date,
            })
          }
          onLogToday={(exerciseId) =>
            setView({
              kind: 'log',
              exerciseId,
              workoutId: view.workoutId,
              preferredDate: todayDateKey(),
            })
          }
          onOpenExercise={openExerciseDetail}
        />

        {detailExercise ? (
          <div ref={detailRef}>
            <ExerciseDetailPanel
              state={state}
              exercise={detailExercise}
              techniqueDraft={techniqueDraft}
              onTechniqueDraft={setTechniqueDraft}
              onTechniqueSave={() => {
                if (techniqueDraft == null) return;
                setState(updateExerciseTechniqueNote(detailExercise.id, techniqueDraft));
                setTechniqueDraft(null);
              }}
              onLog={() =>
                setView({
                  kind: 'log',
                  exerciseId: detailExercise.id,
                  workoutId: view.workoutId,
                })
              }
              onEditEntry={(entryId) =>
                setView({
                  kind: 'log',
                  exerciseId: detailExercise.id,
                  workoutId: view.workoutId,
                  entryId,
                })
              }
              onClose={() => {
                setTechniqueDraft(null);
                setDetailExerciseId(null);
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const allActive = activeExercises(state);

  return (
    <div className="strength-page strength-page--wide path-fade-in">
      <header className="strength-page__header">
        <p className="path-eyebrow">Strength log</p>
        <h1 className="path-display strength-page__title">Workouts</h1>
        <p className="strength-page__lede">
          Workouts A, B, and C. Use Training for the A→B→Recovery→C rotation. Recommendations stop at
          equipment max (Bowflex 155 lb · dumbbells 25 lb).
        </p>
      </header>
      <div className="strength-pick">
        {workouts.map((workout) => {
          const count = exercisesForWorkout(state, workout.id).length;
          return (
            <button
              key={workout.id}
              type="button"
              className="strength-pick__card"
              onClick={() => {
                setDetailExerciseId(null);
                setView({ kind: 'workout', workoutId: workout.id });
              }}
            >
              <p className="strength-pick__eyebrow">Workout {workout.order}</p>
              <p className="strength-pick__name">{workout.shortLabel}</p>
              <p className="strength-pick__meta">{count} exercises · tap to train</p>
            </button>
          );
        })}
      </div>

      <ProgressionTable
        state={state}
        exercises={allActive}
        label="All exercises"
        hint="Every active lift in one table. Tap a cell to edit, or an exercise name for history below."
        showWorkout
        selectedExerciseId={detailExerciseId}
        onOpenCell={(exerciseId, date, entryId) => {
          const exercise = getExercise(state, exerciseId);
          setView({
            kind: 'log',
            exerciseId,
            workoutId: exercise?.workoutId ?? null,
            entryId,
            preferredDate: entryId ? undefined : date,
          });
        }}
        onLogToday={(exerciseId) => {
          const exercise = getExercise(state, exerciseId);
          setView({
            kind: 'log',
            exerciseId,
            workoutId: exercise?.workoutId ?? null,
            preferredDate: todayDateKey(),
          });
        }}
        onOpenExercise={openExerciseDetail}
      />

      {detailExercise ? (
        <div ref={detailRef}>
          <ExerciseDetailPanel
            state={state}
            exercise={detailExercise}
            techniqueDraft={techniqueDraft}
            onTechniqueDraft={setTechniqueDraft}
            onTechniqueSave={() => {
              if (techniqueDraft == null) return;
              setState(updateExerciseTechniqueNote(detailExercise.id, techniqueDraft));
              setTechniqueDraft(null);
            }}
            onLog={() =>
              setView({
                kind: 'log',
                exerciseId: detailExercise.id,
                workoutId: detailExercise.workoutId,
              })
            }
            onEditEntry={(entryId) =>
              setView({
                kind: 'log',
                exerciseId: detailExercise.id,
                workoutId: detailExercise.workoutId,
                entryId,
              })
            }
            onClose={() => {
              setTechniqueDraft(null);
              setDetailExerciseId(null);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

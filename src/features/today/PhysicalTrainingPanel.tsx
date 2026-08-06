import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { addDays, isSaturdaySabbath, parseLocalDateKey } from '../../domain/calendar/week';
import {
  addIntake,
  getDayMeta,
  getWaterUnit,
  setRecoveryDone,
  setWaterUnit,
  totalIntake,
  undoLastIntake,
} from '../../domain/physical/intakeTracker';
import { readPhysicalPlan, updatePlanTargets } from '../../domain/physical/planCatalog';
import {
  adjustSteps,
  effectiveSteps,
  getStepsDay,
  setStepsTotal,
} from '../../domain/physical/stepsTracker';
import { todayDateKey } from '../../domain/physical/store';
import type { StepsDayEntry } from '../../domain/physical/types';
import {
  clearMobilityOn,
  completeMobility,
  mobilityDoneOn,
} from '../../domain/physicalLife/mobility';
import { travelRecommendation } from '../../domain/physicalLife/travel';
import {
  clearWalksOn,
  upsertWalkingEntry,
  walkDoneOn,
} from '../../domain/physicalLife/walking';
import {
  bootstrapRotationFromLogs,
  completeNextSlot,
  daysSince,
  formatDaysSince,
  getLastSlot,
  getNextSlot,
  readRotationState,
  undoLastRotationIfDate,
  type RotationSlot,
} from '../../domain/strength/rotation';
import {
  activeWorkouts,
  readStrengthState,
  sessionDatesForWorkout,
} from '../../domain/strength/store';

function TodayActionRow({
  to,
  label,
  done,
  onToggle,
  primary = false,
}: {
  to: string;
  label: string;
  done: boolean;
  onToggle: () => void;
  primary?: boolean;
}) {
  return (
    <div className={`today-action-row${done ? ' today-action-row--done' : ''}`}>
      <Link
        className={`path-btn ${primary ? 'path-btn--primary' : 'path-btn--ghost'} today-action-row__btn`}
        to={to}
      >
        {label}
      </Link>
      <button
        type="button"
        className={`today-habit__check${done ? ' today-habit__check--done' : ''}`}
        aria-pressed={done}
        aria-label={`Mark ${label} ${done ? 'incomplete' : 'complete'}`}
        onClick={onToggle}
      >
        {done ? '✓' : ''}
      </button>
    </div>
  );
}

/** How far back daily targets (steps / protein / water) can be edited. */
const HEALTH_LOOKBACK_DAYS = 14;

function healthDayLabel(dateKey: string, today: string): string {
  if (dateKey === today) return 'Today';
  if (dateKey === addDays(today, -1)) return 'Yesterday';
  return parseLocalDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

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
    <div className="today-session-progress">
      <div className="today-session-progress__head">
        <p className="today-panel__label">{title}</p>
        <p className="today-session-progress__meta">
          {doneCount}/{items.length}
        </p>
      </div>
      <div className="path-progress__track" aria-hidden>
        <div className="path-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <ul className="today-session-progress__list">
        {items.map((item) => (
          <li key={item.label} className={item.done ? 'is-done' : undefined}>
            {item.done ? '✓' : '○'} {item.label}
          </li>
        ))}
      </ul>
    </div>
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
  unscheduled?: boolean;
}) {
  const todayKey = todayDateKey();
  const earliestKey = addDays(todayKey, -HEALTH_LOOKBACK_DAYS);
  const [dateKey, setDateKey] = useState(todayKey);
  const rootRef = useRef<HTMLElement | null>(null);
  const [sticky, setSticky] = useState(false);
  const [protein, setProtein] = useState(0);
  const [water, setWater] = useState(0);
  const [steps, setSteps] = useState<StepsDayEntry>(() => getStepsDay(todayKey));
  const [recoveryDone, setRecovery] = useState(false);
  const [waterUnit, setUnit] = useState<'oz' | 'ml' | 'L'>('oz');
  const [pendingProtein, setPendingProtein] = useState<number | null>(null);
  const [pendingWater, setPendingWater] = useState<number | null>(null);
  const [showStepsSet, setShowStepsSet] = useState(false);
  const [stepsDraft, setStepsDraft] = useState('');
  const [targets, setTargets] = useState(() => readPhysicalPlan().targets);
  const [strengthState, setStrengthState] = useState(() => readStrengthState());
  const [rotation, setRotation] = useState(() => bootstrapRotationFromLogs(strengthState));
  const [walkDone, setWalkDone] = useState(() => walkDoneOn(todayKey));
  const [mobilityDone, setMobilityDone] = useState(() => mobilityDoneOn(todayKey));
  const strengthWorkouts = activeWorkouts(strengthState);
  const nextSlot = getNextSlot(rotation, todayKey);
  const lastSlot = getLastSlot(rotation);
  const completedToday = rotation.lastCompletedDate === todayKey;
  /** Calendar plan for today — completion does not change which day is shown. */
  const displaySlot: RotationSlot = nextSlot;
  const travel = travelRecommendation(todayKey);
  const viewingToday = dateKey === todayKey;
  const dayLabel = healthDayLabel(dateKey, todayKey);

  const reload = useCallback(() => {
    const plan = readPhysicalPlan();
    setTargets(plan.targets);
    setProtein(totalIntake(dateKey, 'protein'));
    setWater(totalIntake(dateKey, 'water'));
    setSteps(getStepsDay(dateKey));
    setRecovery(getDayMeta(dateKey).recoveryDone);
    setUnit(getWaterUnit() || plan.targets.waterUnit);
    setStrengthState(readStrengthState());
    setRotation(bootstrapRotationFromLogs(readStrengthState()));
    setWalkDone(walkDoneOn(todayKey));
    setMobilityDone(mobilityDoneOn(todayKey));
  }, [dateKey, todayKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const ensureRecoveryComplete = () => {
    const current = readRotationState();
    if (current.lastCompletedDate === todayKey) {
      setRotation(current);
      return;
    }
    if (getNextSlot(current, todayKey).kind === 'recovery') {
      setRotation(completeNextSlot('Recovery / walk day', todayKey));
    }
  };

  const maybeUndoRecovery = () => {
    if (walkDoneOn(todayKey) || mobilityDoneOn(todayKey)) return;
    const current = readRotationState();
    if (current.lastCompletedDate === todayKey && getLastSlot(current)?.kind === 'recovery') {
      setRotation(undoLastRotationIfDate(todayKey));
    }
  };

  const toggleWalk = () => {
    if (walkDoneOn(todayKey)) {
      clearWalksOn(todayKey);
      setWalkDone(false);
      maybeUndoRecovery();
    } else {
      upsertWalkingEntry({ date: todayKey, note: 'Walk' });
      setWalkDone(true);
      ensureRecoveryComplete();
    }
  };

  const toggleMobility = () => {
    if (mobilityDoneOn(todayKey)) {
      clearMobilityOn(todayKey);
      setMobilityDone(false);
      maybeUndoRecovery();
    } else {
      completeMobility({ date: todayKey });
      setMobilityDone(true);
      ensureRecoveryComplete();
    }
  };

  const toggleWorkout = (workoutId: string, shortLabel: string) => {
    const last = getLastSlot(rotation);
    const markedToday =
      rotation.lastCompletedDate === todayKey && last?.workoutId === workoutId;

    if (markedToday) {
      setRotation(undoLastRotationIfDate(todayKey));
      return;
    }

    const upcoming = getNextSlot(rotation, todayKey);
    if (upcoming.workoutId !== workoutId) return;
    if (rotation.lastCompletedDate === todayKey) return;

    const logged = sessionDatesForWorkout(readStrengthState(), workoutId).includes(todayKey);
    if (
      logged ||
      window.confirm(`Mark ${shortLabel} complete in the rotation?`)
    ) {
      setRotation(completeNextSlot());
    }
  };

  useEffect(() => {
    // Keep "today" current if the panel stays open past midnight.
    if (viewingToday && dateKey !== todayKey) setDateKey(todayKey);
  }, [todayKey, viewingToday, dateKey]);

  const shiftDay = (delta: number) => {
    const next = addDays(dateKey, delta);
    if (next < earliestKey || next > todayKey) return;
    setPendingProtein(null);
    setPendingWater(null);
    setShowStepsSet(false);
    setDateKey(next);
  };

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
  }, [protein, water, steps, recoveryDone]);

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

  const physicalProgress = [
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
          <h2 className="path-display today-column__title">Do this today</h2>
          <p className="today-column__intro">
            {isSaturdaySabbath()
              ? 'Sabbath — rest is the plan. Optional walk or mobility only.'
              : travel.trip
                ? `${travel.trip.name}: ${travel.label}`
                : 'One next physical action. Everything else can wait.'}
          </p>
        </header>

        <hr className="today-panel__divider" />

        {viewingToday ? (
          <section className="today-panel__section today-workout">
            <p className="today-panel__label">Next action</p>
            <p
              className="path-display"
              style={{ margin: '0.15rem 0 0.35rem', fontSize: '1.35rem', lineHeight: 1.2 }}
            >
              {travel.trip ? travel.label : displaySlot.label}
            </p>
            {!travel.trip ? (
              <p className="path-body" style={{ margin: 0, opacity: 0.75, fontSize: '0.88rem' }}>
                {completedToday && lastSlot
                  ? 'Done for today.'
                  : lastSlot
                    ? `Last: ${lastSlot.shortLabel} · ${formatDaysSince(daysSince(rotation.lastCompletedDate))}`
                    : 'No rotation entry yet — start with Workout A.'}
              </p>
            ) : null}
            <div className="today-action-list">
              {travel.trip ? (
                <>
                  {travel.kind === 'hotel_strength' && displaySlot.workoutId ? (
                    <TodayActionRow
                      primary
                      to={`/workouts?w=${displaySlot.workoutId}`}
                      label={`Begin hotel strength (${displaySlot.shortLabel})`}
                      done={
                        completedToday ||
                        sessionDatesForWorkout(strengthState, displaySlot.workoutId).includes(
                          todayKey,
                        )
                      }
                      onToggle={() =>
                        toggleWorkout(displaySlot.workoutId!, displaySlot.shortLabel)
                      }
                    />
                  ) : null}
                  {travel.kind === 'walk' || travel.kind === 'travel' ? (
                    <TodayActionRow
                      primary
                      to="/training?area=physical&section=walking"
                      label="Take a Walk"
                      done={walkDone}
                      onToggle={toggleWalk}
                    />
                  ) : null}
                  {travel.kind === 'mobility' || travel.kind === 'rest' ? (
                    <TodayActionRow
                      primary
                      to="/training?area=physical&section=mobility"
                      label="Do Mobility"
                      done={mobilityDone}
                      onToggle={toggleMobility}
                    />
                  ) : null}
                  <Link className="today-action-row__more" to="/training?area=physical&section=travel">
                    Travel options
                  </Link>
                </>
              ) : displaySlot.kind === 'recovery' ? (
                <>
                  <TodayActionRow
                    primary
                    to="/training?area=physical&section=walking"
                    label="Take a Walk"
                    done={walkDone}
                    onToggle={toggleWalk}
                  />
                  <TodayActionRow
                    to="/training?area=physical&section=mobility"
                    label="Do Mobility"
                    done={mobilityDone}
                    onToggle={toggleMobility}
                  />
                </>
              ) : displaySlot.workoutId ? (
                <TodayActionRow
                  primary
                  to={`/workouts?w=${displaySlot.workoutId}`}
                  label={`Begin ${displaySlot.shortLabel}`}
                  done={
                    completedToday ||
                    sessionDatesForWorkout(strengthState, displaySlot.workoutId).includes(todayKey)
                  }
                  onToggle={() => toggleWorkout(displaySlot.workoutId!, displaySlot.shortLabel)}
                />
              ) : null}
              <Link className="today-action-row__more" to="/training?area=physical">
                All physical training
              </Link>
            </div>
            {!travel.trip && !isSaturdaySabbath() && !unscheduled ? (
              <details style={{ marginTop: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.82rem', opacity: 0.75 }}>
                  Other workouts
                </summary>
                <div className="today-action-list" style={{ marginTop: '0.45rem' }}>
                  {strengthWorkouts.map((workout) => {
                    const logged = sessionDatesForWorkout(strengthState, workout.id).includes(
                      todayKey,
                    );
                    const marked =
                      completedToday && lastSlot?.workoutId === workout.id;
                    return (
                      <TodayActionRow
                        key={workout.id}
                        to={`/workouts?w=${workout.id}`}
                        label={workout.shortLabel}
                        done={logged || marked}
                        onToggle={() => toggleWorkout(workout.id, workout.shortLabel)}
                      />
                    );
                  })}
                </div>
              </details>
            ) : null}
          </section>
        ) : (
          <section className="today-panel__section today-workout">
            <p className="today-panel__label">Strength log</p>
            <p className="path-body" style={{ opacity: 0.75, fontSize: '0.88rem', margin: 0 }}>
              Strength logging is limited to yesterday and today. Switch back to Today to open a
              workout.
            </p>
            <button
              type="button"
              className="path-btn path-btn--ghost"
              style={{ marginTop: '0.55rem' }}
              onClick={() => setDateKey(todayKey)}
            >
              Back to today
            </button>
          </section>
        )}

        <hr className="today-panel__divider" />

        <section className="today-panel__section">
          <div className="today-day-nav" role="group" aria-label="Health tracking day">
            <button
              type="button"
              className="today-day-nav__btn"
              aria-label="Previous day"
              disabled={dateKey <= earliestKey}
              onClick={() => shiftDay(-1)}
            >
              ‹
            </button>
            <div className="today-day-nav__label">
              <p className="today-panel__label" style={{ margin: 0 }}>
                Daily targets
              </p>
              <p className="today-day-nav__date">{dayLabel}</p>
            </div>
            <button
              type="button"
              className="today-day-nav__btn"
              aria-label="Next day"
              disabled={dateKey >= todayKey}
              onClick={() => shiftDay(1)}
            >
              ›
            </button>
            {!viewingToday ? (
              <button
                type="button"
                className="today-day-nav__today"
                onClick={() => {
                  setPendingProtein(null);
                  setPendingWater(null);
                  setShowStepsSet(false);
                  setDateKey(todayKey);
                }}
              >
                Today
              </button>
            ) : null}
          </div>

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
                onClick={() => setSteps(adjustSteps(-100, dateKey))}
              >
                −100
              </button>
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => setSteps(adjustSteps(100, dateKey))}
              >
                +100
              </button>
              <button
                type="button"
                className="today-intake__chip"
                onClick={() => setSteps(adjustSteps(1000, dateKey))}
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
                    setSteps(setStepsTotal(total, dateKey));
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
              undoLastIntake('protein', dateKey);
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
              undoLastIntake('water', dateKey);
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
                  onClick={() =>
                    setRecovery(setRecoveryDone(!recoveryDone, dateKey).recoveryDone)
                  }
                >
                  {recoveryDone ? '✓' : ''}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <hr className="today-panel__divider" />

        <SessionProgress
          title={`${viewingToday ? 'Today’s' : `${dayLabel} ·`} physical progress`}
          items={physicalProgress}
        />
      </div>
    </aside>
  );
}

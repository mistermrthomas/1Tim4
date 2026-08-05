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
import { activeWorkouts, readStrengthState } from '../../domain/strength/store';

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
  const strengthWorkouts = activeWorkouts(readStrengthState());
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
  }, [dateKey]);

  useEffect(() => {
    reload();
  }, [reload]);

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
          <h2 className="path-display today-column__title">Physical training</h2>
          <p className="today-column__intro">
            {isSaturdaySabbath()
              ? 'Sabbath — strength work is optional. Steps, protein, and water stay available.'
              : unscheduled
                ? 'Open the strength log for today’s split. Health targets stay here.'
                : 'Strength log for lifts. Health targets below.'}
          </p>
        </header>

        <hr className="today-panel__divider" />

        {viewingToday ? (
          <section className="today-panel__section today-workout">
            <p className="today-panel__label">Strength log</p>
            <div
              className="today-workout__cards"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            >
              {strengthWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  className="path-btn path-btn--primary"
                  to={`/workouts?w=${workout.id}`}
                  style={{ textDecoration: 'none', textAlign: 'center' }}
                >
                {workout.shortLabel}
                </Link>
              ))}
              <Link
                className="path-btn path-btn--ghost"
                to="/training?area=physical&section=strength"
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                Strength rotation
              </Link>
              <Link
                className="path-btn path-btn--ghost"
                to="/workouts"
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                Strength log
              </Link>
            </div>
            <p
              className="path-body"
              style={{ marginTop: '0.65rem', opacity: 0.75, fontSize: '0.88rem' }}
            >
              Log lifts for yesterday or today. Use Training for mobility, walking, body, and travel.
            </p>
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getScheduledDay,
  isScheduledDayActivityDone,
  markScheduleDayComplete,
  missedPriorNote,
  optionalCatchUpExtras,
  type OptionalExtra,
  type ScheduledTrainingDay,
} from '../../../domain/strength/calendarSchedule';
import { completeMobility, mobilityDoneOn } from '../../../domain/physicalLife/mobility';
import {
  upsertWalkingEntry,
  walkDoneOn,
} from '../../../domain/physicalLife/walking';

function primaryButtonLabel(day: ScheduledTrainingDay): string {
  switch (day.primaryAction) {
    case 'start_workout':
      return 'Start workout';
    case 'log_walk':
      return 'Log walk';
    case 'start_mobility':
      return 'Start mobility';
    default:
      return 'Rest day';
  }
}

function primaryHref(day: ScheduledTrainingDay): string {
  switch (day.primaryAction) {
    case 'start_workout':
      return day.workoutId
        ? `/workouts?w=${day.workoutId}`
        : '/training/physical/strength';
    case 'log_walk':
      return '/training?area=physical&section=walking';
    case 'start_mobility':
      return '/training?area=physical&section=mobility';
    default:
      return '/training?area=physical';
  }
}

function ExtraLink({ kind }: { kind: OptionalExtra }) {
  if (kind === 'walk') {
    return (
      <Link className="formation-training__extra-link" to="/training?area=physical&section=walking">
        Walk
      </Link>
    );
  }
  return (
    <Link className="formation-training__extra-link" to="/training?area=physical&section=mobility">
      Mobility
    </Link>
  );
}

export function FormationTodaysTraining({
  dateKey,
  workLine,
  workDone,
  onWorkComplete,
  practiceLine,
  practiceDone,
  onPracticeComplete,
  dayClosed,
}: {
  dateKey: string;
  workLine: string;
  workDone: boolean;
  onWorkComplete: () => void;
  practiceLine: string;
  practiceDone: boolean;
  onPracticeComplete: () => void;
  dayClosed: boolean;
}) {
  const [day, setDay] = useState(() => getScheduledDay(dateKey));
  const [tick, setTick] = useState(0);
  const missed = missedPriorNote(dateKey);
  const catchUp = optionalCatchUpExtras(dateKey);
  const done = isScheduledDayActivityDone(day, dateKey);

  useEffect(() => {
    setDay(getScheduledDay(dateKey));
    setTick((n) => n + 1);
  }, [dateKey]);

  void tick;

  const optionalOnStrength =
    day.kind === 'workout' ? day.optionalExtras : ([] as OptionalExtra[]);
  const showCatchUp = catchUp.length > 0 && !done;

  return (
    <section
      id="todays-training"
      className="formation-training"
      aria-label="Today’s training"
    >
      <p className="formation-stage__label">Today’s training</p>
      <p className="formation-training__subtitle">
        Your formation continues through how you live, move, and lead today.
      </p>

      {missed ? (
        <p className="formation-training__missed">
          Yesterday: {missed.message}
        </p>
      ) : null}

      <div className="formation-training__block">
        <p className="formation-stage__label">Physical</p>
        <p className="formation-training__title">{day.title}</p>
        <p className="formation-training__focus">{day.focus}</p>

        {day.primaryAction !== 'rest' ? (
          <div className="formation-training__actions">
            {day.primaryAction === 'log_walk' && !walkDoneOn(dateKey) ? (
              <button
                type="button"
                className="path-btn path-btn--primary"
                disabled={dayClosed}
                onClick={() => {
                  upsertWalkingEntry({ date: dateKey, note: 'Walk' });
                  markScheduleDayComplete(dateKey);
                  setTick((n) => n + 1);
                }}
              >
                Log walk
              </button>
            ) : day.primaryAction === 'start_mobility' && !mobilityDoneOn(dateKey) ? (
              <button
                type="button"
                className="path-btn path-btn--primary"
                disabled={dayClosed}
                onClick={() => {
                  completeMobility({ date: dateKey });
                  markScheduleDayComplete(dateKey);
                  setTick((n) => n + 1);
                }}
              >
                Start mobility
              </button>
            ) : day.primaryAction === 'start_workout' ? (
              <Link className="path-btn path-btn--primary" to={primaryHref(day)}>
                {primaryButtonLabel(day)}
              </Link>
            ) : (
              <Link className="path-btn path-btn--primary" to={primaryHref(day)}>
                {primaryButtonLabel(day)}
              </Link>
            )}

            {day.secondaryAction === 'start_mobility' ? (
              <Link
                className="path-btn path-btn--ghost"
                to="/training?area=physical&section=mobility"
              >
                Start mobility
              </Link>
            ) : null}

            {day.kind === 'workout' && !done ? (
              <button
                type="button"
                className="path-btn path-btn--ghost"
                disabled={dayClosed}
                onClick={() => {
                  markScheduleDayComplete(dateKey);
                  setTick((n) => n + 1);
                }}
              >
                Mark done
              </button>
            ) : null}
          </div>
        ) : (
          <p className="formation-training__rest">No required training today.</p>
        )}

        {done ? <p className="formation-training__done">Physical training logged for today.</p> : null}

        {optionalOnStrength.length > 0 ? (
          <div className="formation-training__optional">
            <p className="formation-training__optional-label">Optional</p>
            <ul>
              {optionalOnStrength.map((extra) => (
                <li key={extra}>
                  <ExtraLink kind={extra} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showCatchUp ? (
          <div className="formation-training__optional">
            <p className="formation-training__optional-label">Optional extra</p>
            <p className="formation-training__optional-hint">
              Add a walk or mobility session — only if it serves today.
            </p>
            <ul>
              {catchUp.map((extra) => (
                <li key={`catch-${extra}`}>
                  <ExtraLink kind={extra} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link className="formation-link-btn" to="/training?area=physical">
          Open training details
        </Link>
      </div>

      {workLine ? (
        <div className="formation-training__block">
          <p className="formation-stage__label">Work</p>
          <p className="formation-training__practice-line">{workLine}</p>
          <div className="formation-training__actions">
            <button
              type="button"
              className={`path-btn ${workDone ? 'path-btn--ghost' : 'path-btn--primary'}`}
              disabled={dayClosed || workDone}
              onClick={onWorkComplete}
            >
              {workDone ? 'Completed' : 'Complete'}
            </button>
          </div>
        </div>
      ) : null}

      {practiceLine ? (
        <div className="formation-training__block">
          <p className="formation-stage__label">Practice</p>
          <p className="formation-training__practice-kicker">Today’s practice:</p>
          <p className="formation-training__practice-line">{practiceLine}</p>
          <div className="formation-training__actions">
            <button
              type="button"
              className={`path-btn ${practiceDone ? 'path-btn--ghost' : 'path-btn--primary'}`}
              disabled={dayClosed || practiceDone}
              onClick={onPracticeComplete}
            >
              {practiceDone ? 'Completed' : 'Complete'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function FormationTrainingPreview({ dateKey }: { dateKey: string }) {
  const day = getScheduledDay(dateKey);
  if (day.kind === 'rest') {
    return (
      <p className="formation-training-preview">
        Later today: <span>{day.title}</span>
      </p>
    );
  }
  return (
    <p className="formation-training-preview">
      Later today:{' '}
      <span>
        {day.title} · {day.focus}
      </span>
    </p>
  );
}

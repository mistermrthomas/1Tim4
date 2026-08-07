import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getScheduledDay,
  isScheduledDayActivityDone,
  markScheduleDayComplete,
  reconcileMissedScheduleDays,
} from '../../../domain/strength/calendarSchedule';
import { todayDateKey } from '../../../domain/physical/store';

/** Compact physical card for Sunday / non-guided days. */
export function FormationPhysicalNext() {
  const dateKey = todayDateKey();
  const [day, setDay] = useState(() => getScheduledDay(dateKey));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    reconcileMissedScheduleDays(dateKey);
    setDay(getScheduledDay(dateKey));
  }, [dateKey]);

  void tick;
  const done = isScheduledDayActivityDone(day, dateKey);

  const href =
    day.primaryAction === 'start_workout'
      ? day.workoutId
        ? `/workouts?w=${day.workoutId}`
        : '/training/physical/strength'
      : day.primaryAction === 'log_walk'
        ? '/training?area=physical&section=walking'
        : day.primaryAction === 'start_mobility'
          ? '/training?area=physical&section=mobility'
          : '/training?area=physical';

  return (
    <section className="formation-stage formation-stage--after" aria-label="Physical training">
      <p className="formation-stage__label">Physical</p>
      <div className="formation-physical">
        <div className="formation-physical__card">
          <p className="formation-physical__name">{day.title}</p>
          <p className="formation-physical__meta">{day.focus}</p>
          {day.primaryAction !== 'rest' ? (
            <div className="formation-physical__actions">
              <Link className="path-btn path-btn--primary" to={href}>
                {day.primaryAction === 'start_workout'
                  ? 'Start workout'
                  : day.primaryAction === 'log_walk'
                    ? 'Log walk'
                    : 'Start mobility'}
              </Link>
              {!done ? (
                <button
                  type="button"
                  className="path-btn path-btn--ghost"
                  onClick={() => {
                    markScheduleDayComplete(dateKey);
                    setTick((n) => n + 1);
                  }}
                >
                  Mark done
                </button>
              ) : (
                <span className="formation-physical__meta">Logged</span>
              )}
            </div>
          ) : (
            <p className="formation-physical__objective">No required training today.</p>
          )}
        </div>
      </div>
    </section>
  );
}

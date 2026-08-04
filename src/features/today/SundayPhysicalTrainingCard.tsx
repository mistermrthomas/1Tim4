import { Link } from 'react-router-dom';
import type { DateKey } from '../../domain/calendar/week';
import { formatWeight, recommendedFromLast } from '../../domain/strength/progression';
import {
  activeWorkouts,
  exercisesForWorkout,
  latestEntry,
  readStrengthState,
} from '../../domain/strength/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';

export function SundayPhysicalTrainingCard({
  todayKey,
}: {
  plan: WeeklyPlan | null;
  todayKey: DateKey;
  weekStart: string;
}) {
  const state = readStrengthState();
  const workouts = activeWorkouts(state);
  const loggedToday = state.entries.filter((e) => e.date === todayKey).length;
  const w1 = workouts[0];
  const w2 = workouts[1];
  const sample = w1 ? exercisesForWorkout(state, w1.id)[0] : null;
  const last = sample ? latestEntry(state, sample.id) : null;
  const next = sample && last ? recommendedFromLast(sample, last) : null;

  return (
    <section className="sunday-physical path-surface" aria-label="Physical training">
      <p className="today-panel__label">Physical training</p>
      <dl className="sunday-physical__list">
        <div className="sunday-physical__row">
          <dt>Today</dt>
          <dd>
            <span className="sunday-physical__status sunday-physical__status--rest">
              Strength log
            </span>
            <span className="sunday-physical__detail">
              {loggedToday > 0
                ? `${loggedToday} lift${loggedToday === 1 ? '' : 's'} logged today`
                : 'Open a split when you train'}
            </span>
          </dd>
        </div>
        <div className="sunday-physical__row">
          <dt>Splits</dt>
          <dd>
            {w1 && w2
              ? `${w1.shortLabel} · ${w2.shortLabel}`
              : 'Workout 1 and Workout 2'}
          </dd>
        </div>
        <div className="sunday-physical__row">
          <dt>Library</dt>
          <dd>
            {state.exercises.filter((e) => e.active).length} active exercises ·{' '}
            {state.exercises.filter((e) => !e.active).length} historical
          </dd>
        </div>
        <div className="sunday-physical__row">
          <dt>Example next</dt>
          <dd>
            {sample && next != null
              ? `${sample.name}: ${formatWeight(next, sample.weightSuffix)}`
              : sample && last
                ? `${sample.name}: ${formatWeight(last.weightLb, sample.weightSuffix)}`
                : 'Log lifts to build recommendations'}
          </dd>
        </div>
      </dl>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          marginTop: '0.35rem',
        }}
      >
        {w1 ? (
          <Link
            className="path-btn path-btn--primary sunday-physical__action"
            to={`/workouts?w=${w1.id}`}
          >
            Workout 1 — {w1.shortLabel}
          </Link>
        ) : null}
        {w2 ? (
          <Link
            className="path-btn path-btn--ghost sunday-physical__action"
            to={`/workouts?w=${w2.id}`}
          >
            Workout 2 — {w2.shortLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

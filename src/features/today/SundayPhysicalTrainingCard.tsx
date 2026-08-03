import { Link } from 'react-router-dom';
import { shortWeekdayLabel, type DateKey } from '../../domain/calendar/week';
import { normalizePhysicalDay } from '../../domain/weeklyPlan/physicalWorkouts';
import { weekPlanPath } from '../../domain/weeklyPlan/setupStatus';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';

export function buildSundayPhysicalSummary(
  plan: WeeklyPlan | null,
  todayKey: DateKey,
): {
  todayStatus: string;
  todayDetail: string | null;
  isRestDay: boolean;
  trainingDays: number;
  nextWorkout: string | null;
  planReady: boolean;
} {
  if (!plan) {
    return {
      todayStatus: 'No training plan yet',
      todayDetail: 'Finish the training section in This week’s setup.',
      isRestDay: false,
      trainingDays: 0,
      nextWorkout: null,
      planReady: false,
    };
  }

  const days = [...plan.physical.days].sort((a, b) => a.date.localeCompare(b.date));
  const today = days.find((d) => d.date === todayKey);
  const todayBlocks = today ? normalizePhysicalDay(today).scheduledWorkouts : [];
  const trainingDays = days.filter(
    (d) => normalizePhysicalDay(d).scheduledWorkouts.length > 0,
  ).length;

  const isRestDay =
    !today ||
    today.type === 'rest' ||
    (todayBlocks.length === 0 && today.type !== 'workout' && today.type !== 'recovery');

  let todayStatus: string;
  let todayDetail: string | null = null;

  if (isRestDay) {
    todayStatus = 'Rest day';
    todayDetail =
      today?.type === 'recovery'
        ? today.workoutName.trim() || 'Recovery'
        : 'No required workout today.';
  } else if (today?.type === 'recovery') {
    todayStatus = 'Recovery';
    todayDetail = today.workoutName.trim() || todayBlocks.map((b) => b.workoutName).join(' · ') || null;
  } else {
    todayStatus =
      todayBlocks.map((b) => b.workoutName || 'Workout').filter(Boolean).join(' · ') ||
      today?.workoutName.trim() ||
      'Workout';
    todayDetail = null;
  }

  const nextDay = isRestDay
    ? days.find(
        (d) => d.date > todayKey && normalizePhysicalDay(d).scheduledWorkouts.length > 0,
      ) ??
      days.find((d) => normalizePhysicalDay(d).scheduledWorkouts.length > 0)
    : days.find(
        (d) => d.date > todayKey && normalizePhysicalDay(d).scheduledWorkouts.length > 0,
      );

  const nextWorkout = nextDay
    ? `${shortWeekdayLabel(nextDay.dayNumber)} · ${normalizePhysicalDay(nextDay)
        .scheduledWorkouts.map((b) => b.workoutName || 'Workout')
        .join(' · ')}`
    : null;

  return {
    todayStatus,
    todayDetail,
    isRestDay,
    trainingDays,
    nextWorkout,
    planReady: trainingDays > 0 || plan.physical.approved,
  };
}

export function SundayPhysicalTrainingCard({
  plan,
  todayKey,
  weekStart,
}: {
  plan: WeeklyPlan | null;
  todayKey: DateKey;
  weekStart: string;
}) {
  const summary = buildSundayPhysicalSummary(plan, todayKey);
  const href = weekPlanPath(weekStart, 3);

  return (
    <section className="sunday-physical path-surface" aria-label="Physical training">
      <p className="today-panel__label">Physical training</p>
      <dl className="sunday-physical__list">
        <div className="sunday-physical__row">
          <dt>Today</dt>
          <dd>
            <span
              className={
                summary.isRestDay
                  ? 'sunday-physical__status sunday-physical__status--rest'
                  : 'sunday-physical__status'
              }
            >
              {summary.todayStatus}
            </span>
            {summary.todayDetail ? (
              <span className="sunday-physical__detail">{summary.todayDetail}</span>
            ) : null}
          </dd>
        </div>
        <div className="sunday-physical__row">
          <dt>This week</dt>
          <dd>
            {summary.trainingDays > 0
              ? `${summary.trainingDays} training day${summary.trainingDays === 1 ? '' : 's'} planned`
              : 'No training days scheduled yet'}
          </dd>
        </div>
        <div className="sunday-physical__row">
          <dt>Next</dt>
          <dd>{summary.nextWorkout || 'Schedule workouts in the training plan.'}</dd>
        </div>
      </dl>
      <Link className="path-btn path-btn--primary sunday-physical__action" to={href}>
        {summary.planReady ? 'Review training plan' : 'Open training plan'}
      </Link>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { shortWeekdayLabel, type DateKey } from '../../domain/calendar/week';
import {
  dayWorkoutsSummary,
  getSessionsForDate,
} from '../../domain/physical/workoutTracker';
import { normalizePhysicalDay } from '../../domain/weeklyPlan/physicalWorkouts';
import { weekPlanPath } from '../../domain/weeklyPlan/setupStatus';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';

function workoutLabel(day: NonNullable<WeeklyPlan['physical']['days'][number]>): string {
  const blocks = normalizePhysicalDay(day).scheduledWorkouts;
  if (blocks.length > 0) {
    return blocks.map((b) => b.workoutName || 'Workout').join(' · ');
  }
  return day.workoutName.trim() || 'Workout';
}

export function buildSundayPhysicalSummary(
  plan: WeeklyPlan | null,
  todayKey: DateKey,
): {
  todayStatus: string;
  todayDetail: string | null;
  isRestDay: boolean;
  trainingDays: number;
  completedDays: number;
  nextWorkout: string | null;
  mondayWorkout: string | null;
  planReady: boolean;
} {
  if (!plan) {
    return {
      todayStatus: 'No training plan yet',
      todayDetail: 'Open the training plan to schedule this week.',
      isRestDay: false,
      trainingDays: 0,
      completedDays: 0,
      nextWorkout: null,
      mondayWorkout: null,
      planReady: false,
    };
  }

  const days = [...plan.physical.days].sort((a, b) => a.date.localeCompare(b.date));
  const today = days.find((d) => d.date === todayKey);
  const todayBlocks = today ? normalizePhysicalDay(today).scheduledWorkouts : [];
  const trainingDayList = days.filter(
    (d) => normalizePhysicalDay(d).scheduledWorkouts.length > 0,
  );
  const trainingDays = trainingDayList.length;
  const completedDays = trainingDayList.filter((d) => {
    const sessions = getSessionsForDate(d.date);
    return sessions.length > 0 && dayWorkoutsSummary(sessions).allDone;
  }).length;

  const monday = days.find((d) => d.dayNumber === 2);
  const mondayBlocks = monday ? normalizePhysicalDay(monday).scheduledWorkouts : [];
  const mondayWorkout =
    monday && mondayBlocks.length > 0
      ? `${shortWeekdayLabel(2)} · ${workoutLabel(monday)}`
      : null;

  const isRestDay =
    !today ||
    today.type === 'rest' ||
    (todayBlocks.length === 0 && today.type !== 'workout' && today.type !== 'recovery');

  let todayStatus: string;
  let todayDetail: string | null = null;

  if (isRestDay) {
    todayStatus = 'Rest day';
    todayDetail = mondayWorkout
      ? `Next up: ${mondayWorkout}`
      : 'No required workout today.';
  } else if (today?.type === 'recovery') {
    todayStatus = 'Recovery';
    todayDetail = today.workoutName.trim() || workoutLabel(today);
  } else {
    todayStatus = workoutLabel(today!);
    todayDetail = null;
  }

  const nextDay = isRestDay
    ? days.find(
        (d) => d.date > todayKey && normalizePhysicalDay(d).scheduledWorkouts.length > 0,
      ) ?? trainingDayList[0]
    : days.find(
        (d) => d.date > todayKey && normalizePhysicalDay(d).scheduledWorkouts.length > 0,
      );

  const nextWorkout = nextDay
    ? `${shortWeekdayLabel(nextDay.dayNumber)} · ${workoutLabel(nextDay)}`
    : null;

  return {
    todayStatus,
    todayDetail,
    isRestDay,
    trainingDays,
    completedDays,
    nextWorkout: nextWorkout || mondayWorkout,
    mondayWorkout,
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
          <dt>Next</dt>
          <dd>{summary.nextWorkout || 'Schedule workouts in the training plan.'}</dd>
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
          <dt>Progress</dt>
          <dd>
            {summary.trainingDays > 0
              ? `${summary.completedDays} of ${summary.trainingDays} training days complete`
              : 'No progress yet'}
          </dd>
        </div>
      </dl>
      <Link className="path-btn path-btn--primary sunday-physical__action" to={href}>
        {summary.planReady ? 'Open training plan' : 'Plan training'}
      </Link>
    </section>
  );
}

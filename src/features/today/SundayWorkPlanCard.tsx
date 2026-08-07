import { Link } from 'react-router-dom';
import { addDays, shortWeekdayLabel, type DateKey } from '../../domain/calendar/week';
import { weekPlanPath } from '../../domain/weeklyPlan/setupStatus';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';

export function buildSundayWorkSummary(
  plan: WeeklyPlan | null,
  todayKey: DateKey,
): {
  primaryOutcome: string;
  nextAction: string;
  priorityCount: number;
  planReady: boolean;
} {
  if (!plan) {
    return {
      primaryOutcome: 'No work plan yet',
      nextAction: 'Choose this week’s outcomes in the work plan.',
      priorityCount: 0,
      planReady: false,
    };
  }

  const outcomes = plan.work.weeklyOutcomes
    .filter((o) => o.title.trim())
    .slice()
    .sort((a, b) => a.order - b.order);
  const primaryOutcome = outcomes[0]?.title.trim() || 'No primary outcome set';
  const priorityCount = outcomes.length;

  const tomorrowKey = addDays(todayKey, 1);
  const openDays = plan.work.days
    .filter((d) => d.status !== 'removed' && d.title.trim())
    .sort((a, b) => a.date.localeCompare(b.date));

  const todayAction = openDays.find((d) => d.date === todayKey && d.status !== 'done');
  const tomorrowAction = openDays.find((d) => d.date === tomorrowKey && d.status !== 'done');
  const upcoming = openDays.find((d) => d.date >= todayKey && d.status !== 'done');

  const pick = todayAction || tomorrowAction || upcoming;
  const nextAction = pick
    ? `${shortWeekdayLabel(pick.dayNumber)} · ${pick.title.trim()}`
    : priorityCount > 0
      ? 'No daily work actions scheduled yet.'
      : 'Plan work priorities for the week.';

  return {
    primaryOutcome,
    nextAction,
    priorityCount,
    planReady: plan.work.approved && priorityCount > 0,
  };
}

export function SundayWorkPlanCard({
  plan,
  todayKey,
  weekStart,
}: {
  plan: WeeklyPlan | null;
  todayKey: DateKey;
  weekStart: string;
}) {
  const summary = buildSundayWorkSummary(plan, todayKey);
  const href = weekPlanPath(weekStart, 4);

  return (
    <section className="sunday-work path-surface" aria-label="Work plan">
      <p className="today-panel__label">Work plan</p>
      <dl className="sunday-work__list">
        <div className="sunday-work__row">
          <dt>Primary</dt>
          <dd>{summary.primaryOutcome}</dd>
        </div>
        <div className="sunday-work__row">
          <dt>Next</dt>
          <dd>{summary.nextAction}</dd>
        </div>
        <div className="sunday-work__row">
          <dt>Priorities</dt>
          <dd>
            {summary.priorityCount > 0
              ? `${summary.priorityCount} planned`
              : 'None planned'}
          </dd>
        </div>
      </dl>
      <Link className="path-btn path-btn--ghost sunday-work__action" to={href}>
        {summary.planReady ? 'Edit work plan' : 'Open work plan'}
      </Link>
    </section>
  );
}

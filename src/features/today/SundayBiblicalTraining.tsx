import { Link } from 'react-router-dom';
import { shortWeekdayLabel, type DateKey } from '../../domain/calendar/week';
import { weekPlanPath, type SetupItemView } from '../../domain/weeklyPlan/setupStatus';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';

function field(value: string | undefined | null, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function SundayBiblicalTraining({
  plan,
  mondayKey,
  weekStart,
  biblicalSetup,
}: {
  plan: WeeklyPlan | null;
  mondayKey: DateKey;
  weekStart: string;
  biblicalSetup: SetupItemView;
}) {
  const church = plan?.church;
  const biblical = plan?.biblical;
  const monday = biblical?.days.find((d) => d.date === mondayKey);
  const weekDays =
    biblical?.days
      .filter((d) => d.dayNumber >= 2 && d.dayNumber <= 7)
      .slice()
      .sort((a, b) => a.dayNumber - b.dayNumber) ?? [];

  const sermonTitle = field(church?.sermonTitle, 'Add this week’s sermon title');
  const scripture = field(
    biblical?.coreScripture || church?.primaryScripture,
    'Add the primary scripture',
  );
  const centralTruth = field(
    church?.centralTruth || biblical?.centralPrinciple,
    'Capture the central biblical truth from the sermon',
  );
  const response = field(
    church?.actOfObedience || biblical?.actOfObedience || biblical?.weeklyPractice,
    'Name the intended response for this week',
  );
  const weeklyFocus = field(
    biblical?.weeklyTheme || church?.whatToPractice,
    'Set this week’s biblical focus',
  );

  const reviewHref = weekPlanPath(weekStart, 2);
  const editHref = weekPlanPath(weekStart, biblicalSetup.status === 'not_started' ? 0 : 2);
  const primaryHref = weekPlanPath(weekStart, biblicalSetup.step);

  return (
    <>
      <section className="sunday-biblical path-surface sunday-home__sermon" aria-label="Sermon and biblical plan">
        <div className="sunday-biblical__head">
          <p className="today-panel__label">Sermon &amp; biblical plan</p>
          <span className={`sunday-biblical__badge sunday-biblical__badge--${biblicalSetup.status}`}>
            {biblicalSetup.status === 'complete'
              ? 'Complete'
              : biblicalSetup.status === 'needs_review'
                ? 'Needs review'
                : biblicalSetup.status === 'in_progress'
                  ? 'In progress'
                  : 'Not started'}
          </span>
        </div>
        <h2 className="sunday-biblical__title path-display">{sermonTitle}</h2>
        <dl className="sunday-biblical__fields">
          <div className="sunday-biblical__field">
            <dt>Primary scripture</dt>
            <dd>{scripture}</dd>
          </div>
          <div className="sunday-biblical__field">
            <dt>Central truth</dt>
            <dd>{centralTruth}</dd>
          </div>
          <div className="sunday-biblical__field">
            <dt>Intended response</dt>
            <dd>{response}</dd>
          </div>
        </dl>
        {biblicalSetup.status !== 'complete' ? (
          <p className="sunday-biblical__hint">{biblicalSetup.summary}</p>
        ) : null}
      </section>

      <section className="sunday-biblical path-surface sunday-home__focus" aria-label="This week’s biblical focus">
        <p className="today-panel__label">This week’s biblical focus</p>
        <p className="sunday-biblical__focus-text">{weeklyFocus}</p>
        {biblical?.weeklyPractice.trim() ? (
          <p className="sunday-biblical__practice">
            <span>Practice</span>
            {biblical.weeklyPractice.trim()}
          </p>
        ) : null}
      </section>

      <section className="sunday-biblical path-surface sunday-home__monday" aria-label="Monday preview">
        <p className="today-panel__label">Monday preview</p>
        <p className="sunday-biblical__monday-sub">
          {monday ? shortWeekdayLabel(monday.dayNumber) : 'Monday'} · start the week here
        </p>
        <dl className="sunday-biblical__fields sunday-biblical__fields--compact">
          <div className="sunday-biblical__field">
            <dt>Read</dt>
            <dd>
              {field(
                monday?.scripture || biblical?.coreScripture || church?.primaryScripture,
                'Complete the biblical plan to preview Monday’s reading.',
              )}
            </dd>
          </div>
          <div className="sunday-biblical__field">
            <dt>Focus</dt>
            <dd>
              {field(
                monday?.focus || monday?.title,
                'Monday’s focus appears after the plan is drafted.',
              )}
            </dd>
          </div>
          <div className="sunday-biblical__field">
            <dt>Practice</dt>
            <dd>
              {field(
                monday?.practice || biblical?.weeklyPractice,
                'Monday’s practice appears after the plan is drafted.',
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="sunday-biblical path-surface sunday-home__weekdays"
        aria-label="Daily scripture and discipleship plan"
      >
        <p className="today-panel__label">Daily scripture &amp; discipleship</p>
        {weekDays.some((d) => d.scripture.trim() || d.focus.trim() || d.practice.trim()) ? (
          <ol className="sunday-biblical__days">
            {weekDays.map((day) => (
              <li key={day.id} className="sunday-biblical__day">
                <div className="sunday-biblical__day-head">
                  <strong>{shortWeekdayLabel(day.dayNumber)}</strong>
                  <span>{day.title.trim() || '—'}</span>
                </div>
                <p className="sunday-biblical__day-scripture">
                  {day.scripture.trim() || biblical?.coreScripture.trim() || '—'}
                </p>
                <p className="sunday-biblical__day-focus">
                  {day.focus.trim() || day.practice.trim() || 'No focus set yet.'}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="sunday-biblical__hint">
            The Monday–Saturday discipleship plan will appear here after you generate or draft the
            biblical week.
          </p>
        )}
      </section>

      <div className="sunday-biblical__actions sunday-home__actions">
        {biblicalSetup.status !== 'complete' ? (
          <Link className="path-btn path-btn--primary" to={primaryHref}>
            {biblicalSetup.primaryAction}
          </Link>
        ) : (
          <Link className="path-btn path-btn--primary" to={reviewHref}>
            Review biblical plan
          </Link>
        )}
        <Link className="path-btn path-btn--ghost sunday-home__secondary" to={editHref}>
          Edit biblical plan
        </Link>
      </div>
    </>
  );
}

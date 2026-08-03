import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, nextSundayStart, toLocalDateKey } from '../../domain/calendar/week';
import { todayDateKey } from '../../domain/physical/store';
import {
  completeDay,
  evaluatePlanningDayEligibility,
  healthTargetsSnapshot,
  loadDayCompletion,
  reopenDay,
} from '../../domain/today/dayCompletion';
import { activateAndSyncWeeklyPlan } from '../../domain/weeklyPlan/activate';
import { normalizePhysicalDay } from '../../domain/weeklyPlan/physicalWorkouts';
import {
  deriveWeeklySetup,
  weekPlanPath,
  type SetupItemStatus,
  type SetupItemView,
} from '../../domain/weeklyPlan/setupStatus';
import { ensureWeeklyPlan, saveWeeklyPlan } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';
import { CompleteTodayCard } from './CompleteTodayCard';
import { SundayPhysicalTrainingCard } from './SundayPhysicalTrainingCard';
import { TomorrowPreview } from './TomorrowPreview';

function formatSundayHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function statusGlyph(status: SetupItemStatus): string {
  switch (status) {
    case 'complete':
      return '✓';
    case 'needs_review':
      return '◐';
    case 'in_progress':
      return '◎';
    default:
      return '○';
  }
}

function statusLabel(status: SetupItemStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'needs_review':
      return 'Needs review';
    case 'in_progress':
      return 'In progress';
    default:
      return 'Not started';
  }
}

function SetupRow({
  item,
  weekStart,
}: {
  item: SetupItemView;
  weekStart: string;
}) {
  const href = weekPlanPath(weekStart, item.step);
  const isComplete = item.status === 'complete';

  if (isComplete) {
    return (
      <li className="sunday-setup__item sunday-setup__item--complete">
        <div className="sunday-setup__status" aria-hidden>
          {statusGlyph(item.status)}
        </div>
        <div className="sunday-setup__compact">
          <div className="sunday-setup__compact-copy">
            <h3 className="sunday-setup__title">{item.title}</h3>
            <p className="sunday-setup__summary">{item.summary}</p>
          </div>
          <div className="sunday-setup__compact-meta">
            <span className="sunday-setup__badge">{statusLabel(item.status)}</span>
            <div className="sunday-setup__text-actions">
              <Link className="sunday-setup__text-action" to={href}>
                {item.primaryAction}
              </Link>
              {item.secondaryAction ? (
                <Link className="sunday-setup__text-action" to={href}>
                  {item.secondaryAction}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={`sunday-setup__item sunday-setup__item--${item.status}`}>
      <div className="sunday-setup__status" aria-hidden>
        {statusGlyph(item.status)}
      </div>
      <div className="sunday-setup__body">
        <div className="sunday-setup__head">
          <h3 className="sunday-setup__title">{item.title}</h3>
          <span className="sunday-setup__badge">{statusLabel(item.status)}</span>
        </div>
        <p className="sunday-setup__summary">{item.summary}</p>
        <div className="sunday-setup__actions">
          <Link className="path-btn path-btn--primary sunday-setup__primary" to={href}>
            {item.primaryAction}
          </Link>
          {item.secondaryAction ? (
            <Link className="sunday-setup__text-action" to={href}>
              {item.secondaryAction}
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function SundayPlanningHome() {
  const navigate = useNavigate();
  const weekStart = nextSundayStart();
  const mondayKey = addDays(weekStart, 1);
  const todayKey = todayDateKey();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [ready, setReady] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthOpen, setHealthOpen] = useState(false);
  const [dayCompletion, setDayCompletion] = useState(() => loadDayCompletion(todayKey));
  const [completingPlanning, setCompletingPlanning] = useState(false);

  const reload = useCallback(async () => {
    try {
      const next = await ensureWeeklyPlan(weekStart);
      setPlan(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this week’s plan.');
      setPlan(null);
    } finally {
      setReady(true);
    }
  }, [weekStart]);

  useEffect(() => {
    void reload();
    setDayCompletion(loadDayCompletion(todayKey));
  }, [reload, todayKey]);

  const setup = useMemo(() => deriveWeeklySetup(plan), [plan]);
  const planningEval = useMemo(() => evaluatePlanningDayEligibility(plan), [plan]);
  const planningClosed = dayCompletion.status === 'completed';

  const tomorrowNote = planningClosed
    ? 'Tomorrow is ready. Prepare what you need, then close Path until Monday.'
    : setup.isActive
      ? 'Review Monday, prepare what you need, and close Path until tomorrow.'
      : undefined;

  const activate = async (allowIncomplete: boolean) => {
    if (!plan) return;
    if (!allowIncomplete && !setup.canActivate) return;
    const confirmMsg = allowIncomplete
      ? 'Activate with incomplete sections? Missing tracks will need attention later.'
      : 'Activate this week? Today will use these assignments starting Monday.';
    if (!window.confirm(confirmMsg)) return;
    setActivating(true);
    setError(null);
    try {
      let toActivate = plan;
      if (allowIncomplete) {
        toActivate = {
          ...plan,
          biblical: { ...plan.biblical, approved: true },
          physical: { ...plan.physical, approved: true },
          work: { ...plan.work, approved: true },
        };
        await saveWeeklyPlan(toActivate);
      }
      const activated = await activateAndSyncWeeklyPlan(toActivate);
      setPlan(activated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activation failed');
    } finally {
      setActivating(false);
    }
  };

  if (!ready) {
    return (
      <div className="sunday-home path-fade-in">
        <p className="today-preview__loading">Preparing Sunday planning…</p>
      </div>
    );
  }

  const theme =
    plan?.biblical.weeklyTheme.trim() ||
    plan?.church.sermonTitle.trim() ||
    '';
  const trainingDays =
    plan?.physical.days.filter((d) => normalizePhysicalDay(d).scheduledWorkouts.length > 0)
      .length ?? 0;
  const workCount =
    plan?.work.weeklyOutcomes.filter((o) => o.title.trim().length > 0).length ?? 0;

  return (
    <div className="sunday-home path-fade-in">
      <header className="sunday-home__header">
        <p className="path-eyebrow">Plan the week</p>
        <h1 className="path-display sunday-home__title">{formatSundayHeader(todayKey)}</h1>
        <p className="sunday-home__lede">
          Turn today’s sermon into a week of deliberate action.
        </p>
        {setup.isActive && theme ? (
          <p className="sunday-home__theme">{theme}</p>
        ) : null}
        {planningClosed ? (
          <span className="today-complete-badge">✓ Planning complete</span>
        ) : null}
      </header>

      <div
        className={`sunday-home__layout${setup.isActive ? ' sunday-home__layout--active' : ''}`}
      >
        {setup.isActive ? (
          <section className="sunday-home__success path-surface sunday-home__activated">
            <p className="today-panel__label">Week activated</p>
            <p className="sunday-home__success-msg">Your week is ready.</p>
            <div className="sunday-home__success-actions">
              <Button onClick={() => navigate(weekPlanPath(weekStart, 5))}>
                Review week
              </Button>
              <Link
                className="path-btn path-btn--ghost sunday-home__secondary"
                to={weekPlanPath(weekStart, 0)}
              >
                Edit plan
              </Link>
            </div>
          </section>
        ) : null}

        <div className="sunday-home__physical">
          <SundayPhysicalTrainingCard plan={plan} todayKey={todayKey} weekStart={weekStart} />
        </div>

        <div className="sunday-home__tomorrow">
          <TomorrowPreview
            plan={plan}
            targetDate={mondayKey}
            showPrepare={planningClosed}
            planLink={weekPlanPath(weekStart)}
            readinessNote={tomorrowNote}
          />
        </div>

        <section className="sunday-setup path-surface sunday-home__setup" aria-label="This week’s setup">
          <p className="today-panel__label">This week’s setup</p>
          <ol className="sunday-setup__list">
            {setup.items.map((item) => (
              <SetupRow key={item.id} item={item} weekStart={weekStart} />
            ))}
          </ol>

          {!setup.isActive ? (
            <div className="sunday-setup__activate">
              <Button
                disabled={activating || !setup.canActivate}
                onClick={() => void activate(false)}
              >
                {activating ? 'Activating…' : 'Activate this week'}
              </Button>
              {!setup.canActivate ? (
                <p className="sunday-setup__activate-hint">
                  Still needed: {setup.missingSections.join(' · ')}
                </p>
              ) : (
                <p className="sunday-setup__activate-hint">
                  Review the combined week, then activate. AI generation never activates for you.
                </p>
              )}
              {!setup.canActivate ? (
                <button
                  type="button"
                  className="sunday-setup__override"
                  disabled={activating || !plan}
                  onClick={() => void activate(true)}
                >
                  Activate with incomplete sections
                </button>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="weekly-plan__error">{error}</p> : null}
        </section>

        {setup.isActive ? (
          <section className="sunday-week-summary path-surface sunday-home__summary">
            <p className="today-panel__label">This week</p>
            <ul className="sunday-week-summary__list">
              <li>
                <strong>Biblical</strong>
                <span>{theme || '—'}</span>
              </li>
              <li>
                <strong>Training</strong>
                <span>
                  {trainingDays} session{trainingDays === 1 ? '' : 's'} planned
                </span>
              </li>
              <li>
                <strong>Work</strong>
                <span>
                  {workCount} outcome{workCount === 1 ? '' : 's'} planned
                </span>
              </li>
            </ul>
          </section>
        ) : null}

        {setup.isActive ? (
          <div className="sunday-home__complete">
            <CompleteTodayCard
              variant="planning_day"
              eligible={planningEval.eligible}
              missing={planningEval.missing}
              completed={planningClosed}
              record={dayCompletion}
              summary={
                dayCompletion.summary ??
                (() => {
                  const health = healthTargetsSnapshot();
                  return {
                    biblicalPracticeCompleted: true,
                    concreteActionStatus: 'completed' as const,
                    workoutStatus: 'not_scheduled' as const,
                    workStatus: 'not_scheduled' as const,
                    healthTargetsReached: health.reached,
                    healthTargetsTotal: health.total,
                    unfinishedItems: [] as string[],
                  };
                })()
              }
              closureQuality={dayCompletion.closureQuality ?? 'completed_as_planned'}
              completing={completingPlanning}
              onComplete={() => {
                setCompletingPlanning(true);
                const health = healthTargetsSnapshot();
                setDayCompletion(
                  completeDay({
                    date: todayKey,
                    completionType: 'planning_day',
                    summary: {
                      biblicalPracticeCompleted: true,
                      concreteActionStatus: 'completed',
                      workoutStatus: 'not_scheduled',
                      workStatus: 'not_scheduled',
                      healthTargetsReached: health.reached,
                      healthTargetsTotal: health.total,
                      unfinishedItems: [],
                    },
                    closureQuality: 'completed_as_planned',
                  }),
                );
                setCompletingPlanning(false);
              }}
              onReopen={
                planningClosed
                  ? () => {
                      if (
                        !window.confirm(
                          'Reopen planning day? Your activated week stays active.',
                        )
                      ) {
                        return;
                      }
                      setDayCompletion(reopenDay(todayKey));
                    }
                  : undefined
              }
            />
          </div>
        ) : null}

        <details
          className="sunday-health path-surface sunday-home__health"
          open={healthOpen}
          onToggle={(e) => setHealthOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="sunday-health__summary">Today’s health tracking</summary>
          <div className="sunday-health__body">
            <p className="sunday-health__note">
              Optional on Sunday — planning stays primary. Open Journey or wait until Monday for
              full training execution.
            </p>
            <Link className="path-btn path-btn--ghost sunday-home__secondary" to="/workouts">
              Workouts library
            </Link>
          </div>
        </details>
      </div>

      <p className="sunday-home__meta">
        Week of {weekStart} · {toLocalDateKey()} ·{' '}
        <Link to="/journey">Journey</Link>
      </p>
    </div>
  );
}

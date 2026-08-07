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
import {
  deriveWeeklySetup,
  weekPlanPath,
} from '../../domain/weeklyPlan/setupStatus';
import { ensureWeeklyPlan, saveWeeklyPlan } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';
import { CompleteTodayCard } from './CompleteTodayCard';
import { SundayBiblicalTraining } from './SundayBiblicalTraining';
import { SundayPhysicalTrainingCard } from './SundayPhysicalTrainingCard';
import { SundaySermonEditor } from './SundaySermonEditor';
import { SundayWorkPlanCard } from './SundayWorkPlanCard';

function formatSundayHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
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
  const biblicalSetup = setup.items.find((item) => item.id === 'biblical') ?? setup.items[0]!;

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

  return (
    <div className="sunday-home path-fade-in">
      <header className="sunday-home__header">
        <p className="path-eyebrow">Plan the week</p>
        <h1 className="path-display sunday-home__title">{formatSundayHeader(todayKey)}</h1>
        <p className="sunday-home__lede">
          Turn today’s sermon into a week of deliberate Biblical training.
        </p>
        {planningClosed ? (
          <span className="today-complete-badge">✓ Planning complete</span>
        ) : null}
      </header>

      <div
        className={`sunday-home__layout${setup.isActive ? ' sunday-home__layout--active' : ''}`}
      >
        <div className="sunday-home__main">
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

          {plan ? (
            <SundaySermonEditor plan={plan} onPlanChange={setPlan} />
          ) : null}

          <SundayBiblicalTraining
            plan={plan}
            mondayKey={mondayKey}
            weekStart={weekStart}
            biblicalSetup={biblicalSetup}
          />

          {!setup.isActive ? (
            <section className="sunday-activate path-surface sunday-home__activate-card">
              <p className="today-panel__label">Activate this week</p>
              <Button
                disabled={activating || !setup.canActivate}
                onClick={() => void activate(false)}
              >
                {activating ? 'Activating…' : 'Activate this week'}
              </Button>
              {!setup.canActivate ? (
                <p className="sunday-setup__activate-hint">
                  Still needed: {setup.missingSections.join(' · ')}. Use the right column for
                  training and work.
                </p>
              ) : (
                <p className="sunday-setup__activate-hint">
                  Biblical, training, and work plans are ready. Activate when you are prepared for
                  Monday.
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
              {error ? <p className="weekly-plan__error">{error}</p> : null}
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
        </div>

        <aside className="sunday-home__rail" aria-label="Physical training and work">
          <div className="sunday-home__physical">
            <SundayPhysicalTrainingCard plan={plan} todayKey={todayKey} weekStart={weekStart} />
          </div>
          <div className="sunday-home__work">
            <SundayWorkPlanCard plan={plan} todayKey={todayKey} weekStart={weekStart} />
          </div>
          <details
            className="sunday-health path-surface sunday-home__health"
            open={healthOpen}
            onToggle={(e) => setHealthOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="sunday-health__summary">Today’s health tracking</summary>
            <div className="sunday-health__body">
              <p className="sunday-health__note">
                Optional on Sunday — Biblical planning stays primary.
              </p>
            <Link className="path-btn path-btn--ghost sunday-home__secondary" to="/workouts">
              Strength log
            </Link>
            </div>
          </details>
        </aside>
      </div>

      <p className="sunday-home__meta">
        Week of {weekStart} · {toLocalDateKey()} ·{' '}
        <Link to="/journey">Journey</Link>
      </p>
    </div>
  );
}

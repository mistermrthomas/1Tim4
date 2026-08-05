import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  loadBiblicalDay,
  saveBiblicalDay,
  type ConcreteActionDisposition,
} from '../../domain/biblical/dayLog';
import {
  addDays,
  followingSundayStart,
  isSaturdaySabbath,
  isSundayPlanningDay,
  toLocalDateKey,
} from '../../domain/calendar/week';
import { todayDateKey } from '../../domain/physical/store';
import {
  completeDay,
  evaluateSaturdayEligibility,
  evaluateWeekdayEligibility,
  loadDayCompletion,
  reopenDay,
} from '../../domain/today/dayCompletion';
import { dayAssignmentForDate } from '../../domain/sermon/fromWeeklyPlan';
import {
  completeWeeklyPlan,
  saveWeeklyPlan,
} from '../../domain/weeklyPlan/store';
import type { SaturdayReflection, WeeklyPlan, WorkDailyAssignment } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';
import { CompleteTodayCard } from './CompleteTodayCard';
import { PhysicalTrainingPanel } from './PhysicalTrainingPanel';
import { TomorrowPreview } from './TomorrowPreview';
import './TodayPage.css';

function formatWeekRange(start: string, end: string): string {
  const fmt = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y!, m! - 1, d!, 12).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export function TodayActiveWeek({
  weeklyPlan: initial,
  onPlanChange,
}: {
  weeklyPlan: WeeklyPlan;
  onPlanChange: (plan: WeeklyPlan) => void;
}) {
  const [weeklyPlan, setWeeklyPlan] = useState(initial);
  const [practiceAccepted, setPracticeAccepted] = useState(false);
  const [practiceDone, setPracticeDone] = useState(false);
  const [concreteActionStatus, setConcreteActionStatus] =
    useState<ConcreteActionDisposition>('unset');
  const [concreteActionNote, setConcreteActionNote] = useState('');
  const [scriptureReviewed, setScriptureReviewed] = useState(false);
  const [morningDone, setMorningDone] = useState(false);
  const [middayDone, setMiddayDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [intention, setIntention] = useState('');
  const [expectedTest, setExpectedTest] = useState('');
  const [biblicalReady, setBiblicalReady] = useState(false);
  const [completingWeek, setCompletingWeek] = useState(false);
  const [completingDay, setCompletingDay] = useState(false);
  const [dayCompletion, setDayCompletion] = useState(() => loadDayCompletion(todayDateKey()));
  const [progressTick, setProgressTick] = useState(0);

  const dateKey = todayDateKey();
  const sabbath = isSaturdaySabbath();
  const sunday = isSundayPlanningDay();

  useEffect(() => {
    setWeeklyPlan(initial);
  }, [initial]);

  useEffect(() => {
    const log = loadBiblicalDay(dateKey);
    setPracticeAccepted(log.practiceAccepted);
    setPracticeDone(log.practiceDone);
    setConcreteActionStatus(log.concreteActionStatus);
    setConcreteActionNote(log.concreteActionNote);
    setScriptureReviewed(log.scriptureReviewed);
    setMorningDone(log.morningDone);
    setMiddayDone(log.middayDone);
    setEveningDone(log.eveningDone);
    setIntention(log.intention);
    setExpectedTest(log.expectedTest);
    setDayCompletion(loadDayCompletion(dateKey));
    setBiblicalReady(true);
  }, [dateKey]);

  useEffect(() => {
    if (!biblicalReady) return;
    saveBiblicalDay({
      dateKey,
      practiceAccepted,
      practiceDone,
      concreteActionStatus,
      concreteActionNote,
      expectedTest,
      intention,
      morningDone,
      middayDone,
      eveningDone,
      emotion: null,
      tested: null,
      eveningNotes: {},
      scriptureReviewed,
    });
  }, [
    biblicalReady,
    dateKey,
    practiceAccepted,
    practiceDone,
    concreteActionStatus,
    concreteActionNote,
    expectedTest,
    intention,
    morningDone,
    middayDone,
    eveningDone,
    scriptureReviewed,
  ]);

  // Re-read workout tracker periodically so eligibility updates after training panel actions.
  useEffect(() => {
    const id = window.setInterval(() => setProgressTick((n) => n + 1), 1500);
    return () => window.clearInterval(id);
  }, []);

  const dayTraining = dayAssignmentForDate(weeklyPlan, dateKey);
  const weeklyPhysical = weeklyPlan.physical.days.find((d) => d.date === dateKey);
  const weeklyWork = weeklyPlan.work.days.filter(
    (d) => d.date === dateKey && d.status !== 'removed' && d.title.trim().length > 0,
  );
  const theme = weeklyPlan.biblical.weeklyTheme || weeklyPlan.church.sermonTitle || 'This week';
  const practice = dayTraining?.practice || weeklyPlan.biblical.weeklyPractice;
  const scripture = dayTraining?.scripture || weeklyPlan.biblical.coreScripture;
  const focus = dayTraining?.focus || theme;
  const reflection =
    dayTraining?.reflection ||
    'Where did you notice today’s focus — or where did you resist it?';

  const markBiblicalDone = () => {
    setScriptureReviewed(true);
    setPracticeAccepted(true);
    setPracticeDone(true);
    setConcreteActionStatus('completed');
    setMorningDone(true);
    setMiddayDone(true);
    setEveningDone(true);
  };

  const setWorkDisposition = async (
    action: WorkDailyAssignment,
    status: WorkDailyAssignment['status'],
  ) => {
    const next: WeeklyPlan = {
      ...weeklyPlan,
      work: {
        ...weeklyPlan.work,
        days: weeklyPlan.work.days.map((d) =>
          d.id === action.id ? { ...d, status } : d,
        ),
      },
    };
    const saved = await saveWeeklyPlan(next);
    setWeeklyPlan(saved);
    onPlanChange(saved);
    setProgressTick((n) => n + 1);
  };

  const weekdayEval = useMemo(() => {
    void progressTick;
    const log = loadBiblicalDay(dateKey);
    return evaluateWeekdayEligibility(weeklyPlan, dateKey, {
      ...log,
      practiceAccepted,
      practiceDone,
      concreteActionStatus,
      concreteActionNote,
      morningDone,
      middayDone,
      eveningDone,
      scriptureReviewed,
      expectedTest,
      intention,
    });
  }, [
    progressTick,
    weeklyPlan,
    dateKey,
    practiceAccepted,
    practiceDone,
    concreteActionStatus,
    concreteActionNote,
    morningDone,
    middayDone,
    eveningDone,
    scriptureReviewed,
    expectedTest,
    intention,
  ]);

  const saturdayEval = useMemo(
    () => evaluateSaturdayEligibility(weeklyPlan.saturdayReflection),
    [weeklyPlan.saturdayReflection],
  );

  const dayClosed = dayCompletion.status === 'completed';

  const handleCompleteWeekday = () => {
    if (!weekdayEval.eligible || dayClosed) return;
    setCompletingDay(true);
    const record = completeDay({
      date: dateKey,
      completionType: 'weekday',
      summary: weekdayEval.summary,
      closureQuality: weekdayEval.closureQuality,
    });
    setDayCompletion(record);
    setCompletingDay(false);
  };

  const handleReopenDay = () => {
    if (!window.confirm('Reopen today? Existing entries are kept so you can correct them.')) return;
    setDayCompletion(reopenDay(dateKey));
  };

  const patchReflection = (patch: Partial<SaturdayReflection>) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      saturdayReflection: { ...prev.saturdayReflection, ...patch },
    }));
  };

  const saveReflection = async () => {
    const saved = await saveWeeklyPlan(weeklyPlan);
    setWeeklyPlan(saved);
    onPlanChange(saved);
  };

  const markWeekComplete = async () => {
    if (!saturdayEval.eligible) return;
    if (!window.confirm('Complete the week? You can begin next Sunday when ready.')) return;
    setCompletingWeek(true);
    try {
      await saveWeeklyPlan(weeklyPlan);
      const done = await completeWeeklyPlan(weeklyPlan.id);
      setWeeklyPlan(done);
      onPlanChange(done);
      const health = weekdayEval.summary;
      setDayCompletion(
        completeDay({
          date: dateKey,
          completionType: 'weekly_reflection',
          summary: {
            biblicalPracticeCompleted: true,
            concreteActionStatus: 'completed',
            workoutStatus: 'not_scheduled',
            workStatus: 'not_scheduled',
            healthTargetsReached: health.healthTargetsReached,
            healthTargetsTotal: health.healthTargetsTotal,
            unfinishedItems: [],
          },
          closureQuality: 'completed_as_planned',
        }),
      );
    } finally {
      setCompletingWeek(false);
    }
  };

  const unscheduled =
    !weeklyPhysical ||
    weeklyPhysical.type === 'unscheduled' ||
    weeklyPhysical.type === 'rest' ||
    weeklyPhysical.type === 'recovery' ||
    weeklyPhysical.type === 'optional_movement';

  return (
    <div className="today-preview path-fade-in">
      <div className="today-grid">
        <div className="today-grid__main">
          <div className="today-grid__header">
            <p className="path-eyebrow today-preview__eyebrow">This Week</p>
            <header className="today-hero">
              <div className="today-hero__row">
                <h1 className="path-display today-hero__title">Today</h1>
                <p className="today-hero__theme">{theme}</p>
                {dayClosed ? (
                  <span className="today-complete-badge" title="Day completed">
                    ✓ {sabbath ? 'Week complete' : 'Today complete'}
                  </span>
                ) : null}
              </div>
              <p className="today-hero__meta">
                {formatWeekRange(weeklyPlan.weekStartDate, weeklyPlan.weekEndDate)}
                <span aria-hidden> · </span>
                {toLocalDateKey()}
              </p>
              <p className="today-hero__plan-link">
                <Link to="/training">Training</Link>
                <span aria-hidden> · </span>
                <Link to="/progress">Progress</Link>
                <span aria-hidden> · </span>
                <Link to="/sermon">Sunday Sermon</Link>
              </p>
            </header>
          </div>

          {sunday ? (
            <section className="today-week-banner path-surface today-grid__banner">
              <p className="today-panel__label">Sunday · Rest & reset</p>
              <p className="path-body">
                {weeklyPlan.church.sermonTitle
                  ? `This week’s sermon: ${weeklyPlan.church.sermonTitle}`
                  : 'This week’s biblical training is ready. Rest, worship, and return Monday.'}
              </p>
              <div className="today-week-banner__actions">
                <Link className="path-btn path-btn--ghost" to="/sermon">
                  Update sermon notes
                </Link>
              </div>
            </section>
          ) : null}

          {sabbath ? (
            <section className="today-week-banner today-week-banner--sabbath path-surface today-grid__banner">
              <p className="today-panel__label">Sabbath · Saturday reflection</p>
              <p className="path-body">
                Rest from structured training. Be present with family and friends. Review the week
                when ready.
              </p>
            </section>
          ) : null}

          {!sabbath && !sunday ? (
            <>
              <section className="today-biblical-day path-surface" aria-label="Today’s biblical training">
                <div className="today-biblical-day__block">
                  <p className="today-panel__label">Today’s Scripture</p>
                  <p className="today-biblical-day__scripture">{scripture || '—'}</p>
                </div>
                <div className="today-biblical-day__block">
                  <p className="today-panel__label">Today’s Focus</p>
                  <p className="today-biblical-day__text">{focus}</p>
                </div>
                <div className="today-biblical-day__block">
                  <p className="today-panel__label">Today’s Practice</p>
                  <p className="today-biblical-day__text">{practice || '—'}</p>
                </div>
                <div className="today-biblical-day__block">
                  <p className="today-panel__label">Evening Reflection</p>
                  <p className="today-biblical-day__text">{reflection}</p>
                </div>
                <div className="today-biblical-day__actions">
                  <Button
                    variant={practiceDone ? 'primary' : 'ghost'}
                    onClick={markBiblicalDone}
                  >
                    {practiceDone ? 'Practice marked done' : 'Mark practice done'}
                  </Button>
                  <label className="path-field today-biblical-day__outcome">
                    <span>Outcome</span>
                    <select
                      value={concreteActionStatus}
                      onChange={(e) => {
                        const value = e.target.value as ConcreteActionDisposition;
                        setConcreteActionStatus(value);
                        if (value === 'completed') markBiblicalDone();
                        if (value === 'not_completed' || value === 'carried_forward') {
                          setPracticeAccepted(true);
                          setMorningDone(true);
                          setMiddayDone(true);
                          setEveningDone(true);
                        }
                      }}
                    >
                      <option value="unset">Record an outcome…</option>
                      <option value="completed">Completed</option>
                      <option value="not_completed">Not completed</option>
                      <option value="carried_forward">Carry forward</option>
                    </select>
                  </label>
                  {concreteActionStatus === 'not_completed' ||
                  concreteActionStatus === 'carried_forward' ? (
                    <label className="path-field">
                      <span>Brief reason (optional)</span>
                      <input
                        value={concreteActionNote}
                        onChange={(e) => setConcreteActionNote(e.target.value)}
                        placeholder="What got in the way — or what to continue?"
                      />
                    </label>
                  ) : null}
                </div>
              </section>

              {weeklyWork.length > 0 ? (
                <section className="today-work path-surface today-grid__work">
                  <p className="today-panel__label">Work</p>
                  <ul className="today-work__list">
                    {weeklyWork.map((action) => {
                      const outcome = weeklyPlan.work.weeklyOutcomes.find(
                        (o) => o.id === action.outcomeId,
                      );
                      return (
                        <li key={action.id} className="today-work__item">
                          <div className="today-work__row">
                            <span>
                              <strong>{action.title}</strong>
                              {outcome?.title ? (
                                <span className="today-work__outcome"> · {outcome.title}</span>
                              ) : null}
                            </span>
                            <select
                              aria-label={`Outcome for ${action.title}`}
                              value={action.status}
                              onChange={(e) =>
                                void setWorkDisposition(
                                  action,
                                  e.target.value as WorkDailyAssignment['status'],
                                )
                              }
                            >
                              <option value="open">Record outcome…</option>
                              <option value="done">Completed</option>
                              <option value="deferred">Deferred</option>
                              <option value="carried_forward">Carry forward</option>
                            </select>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              <div className="today-grid__complete">
                <CompleteTodayCard
                  variant="weekday"
                  eligible={weekdayEval.eligible}
                  missing={weekdayEval.missing}
                  completed={dayClosed}
                  record={dayCompletion}
                  summary={dayClosed ? dayCompletion.summary : weekdayEval.summary}
                  closureQuality={
                    dayClosed ? dayCompletion.closureQuality : weekdayEval.closureQuality
                  }
                  completing={completingDay}
                  onComplete={handleCompleteWeekday}
                  onReopen={dayClosed ? handleReopenDay : undefined}
                />

                {dayClosed ? (
                  <>
                    <p className="complete-today__next-note">
                      Tomorrow is ready. Prepare what you need, then close Path for the night.
                    </p>
                    <TomorrowPreview
                      plan={weeklyPlan}
                      targetDate={addDays(dateKey, 1)}
                      showPrepare
                    />
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <section className="today-panel path-surface today-grid__session">
                <p className="today-panel__label">Saturday reflection</p>
                <div className="weekly-plan__grid" style={{ display: 'grid', gap: '0.75rem' }}>
                  {(
                    [
                      ['godShowed', 'What did God show me this week?'],
                      ['practicedNotJustRemembered', 'Where did I practice the sermon rather than merely remember it?'],
                      ['resistedOrDrifted', 'Where did I resist or drift?'],
                      ['trainingChanged', 'What changed in my training?'],
                      ['workMoved', 'What meaningful work moved forward?'],
                      ['carryForward', 'What should carry into next week?'],
                      ['release', 'What should be released rather than carried forward?'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="path-field">
                      <span>{label}</span>
                      <textarea
                        rows={2}
                        value={weeklyPlan.saturdayReflection[key]}
                        onChange={(e) => patchReflection({ [key]: e.target.value })}
                      />
                    </label>
                  ))}
                  <label className="path-field">
                    <span>Did I complete my act of obedience?</span>
                    <select
                      value={weeklyPlan.saturdayReflection.actOfObedienceDone}
                      onChange={(e) =>
                        patchReflection({
                          actOfObedienceDone: e.target.value as SaturdayReflection['actOfObedienceDone'],
                        })
                      }
                    >
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="partial">Partially</option>
                      <option value="no">Not yet</option>
                    </select>
                  </label>
                </div>
                <div className="today-week-banner__actions" style={{ marginTop: '0.75rem' }}>
                  <Button variant="ghost" onClick={() => void saveReflection()}>
                    Save reflection
                  </Button>
                </div>
              </section>

              <div className="today-grid__complete">
                <CompleteTodayCard
                  variant="weekly_reflection"
                  eligible={saturdayEval.eligible || weeklyPlan.status === 'completed'}
                  missing={saturdayEval.missing}
                  completed={dayClosed || weeklyPlan.status === 'completed'}
                  record={dayCompletion}
                  summary={dayCompletion.summary}
                  closureQuality={dayCompletion.closureQuality}
                  completing={completingWeek}
                  onComplete={() => void markWeekComplete()}
                  onReopen={
                    dayClosed
                      ? () => {
                          handleReopenDay();
                        }
                      : undefined
                  }
                />

                {(dayClosed || weeklyPlan.status === 'completed') && (
                  <TomorrowPreview
                    plan={weeklyPlan}
                    targetDate={followingSundayStart()}
                    showPrepare={false}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <PhysicalTrainingPanel unscheduled={unscheduled || sabbath} />
      </div>
    </div>
  );
}

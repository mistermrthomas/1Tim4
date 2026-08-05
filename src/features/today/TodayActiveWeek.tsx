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

type Session = 'morning' | 'midday' | 'evening';

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

function SessionProgress({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; done: boolean }>;
}) {
  const doneCount = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  return (
    <div className="today-progress">
      <div className="today-progress__head">
        <p className="today-progress__title">{title}</p>
        <p className="today-progress__count">
          {doneCount} of {items.length}
        </p>
      </div>
      <div className="path-progress__track today-progress__track" aria-hidden>
        <div className="path-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <ul className="today-progress__list">
        {items.map((item) => (
          <li
            key={item.label}
            className={`today-progress__item${item.done ? ' today-progress__item--done' : ''}`}
          >
            <span aria-hidden>{item.done ? '●' : '○'}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TodayActiveWeek({
  weeklyPlan: initial,
  onPlanChange,
}: {
  weeklyPlan: WeeklyPlan;
  onPlanChange: (plan: WeeklyPlan) => void;
}) {
  const [weeklyPlan, setWeeklyPlan] = useState(initial);
  const [session, setSession] = useState<Session>('morning');
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

  const weeklyBiblical = weeklyPlan.biblical.days.find((d) => d.date === dateKey);
  const weeklyPhysical = weeklyPlan.physical.days.find((d) => d.date === dateKey);
  const weeklyWork = weeklyPlan.work.days.filter(
    (d) => d.date === dateKey && d.status !== 'removed' && d.title.trim().length > 0,
  );
  const theme = weeklyPlan.biblical.weeklyTheme || weeklyPlan.church.sermonTitle || 'This week';
  const practice = weeklyBiblical?.practice || weeklyPlan.biblical.weeklyPractice;
  const scripture = weeklyBiblical?.scripture || weeklyPlan.biblical.coreScripture;
  const focus = weeklyBiblical?.focus || theme;
  const sessionPrompt =
    session === 'morning'
      ? weeklyBiblical?.morningPrompt
      : session === 'midday'
        ? weeklyBiblical?.middayPrompt
        : weeklyBiblical?.eveningPrompt;

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

  const planPath = `/plan/week/${weeklyPlan.weekStartDate}`;
  const unscheduled =
    !weeklyPhysical ||
    weeklyPhysical.type === 'unscheduled' ||
    weeklyPhysical.type === 'rest' ||
    weeklyPhysical.type === 'recovery' ||
    weeklyPhysical.type === 'optional_movement';

  const morningProgress = [
    { label: 'Scripture reviewed', done: scriptureReviewed || Boolean(scripture) },
    { label: 'Practice accepted', done: practiceAccepted || practiceDone },
    { label: 'Checkpoint answered', done: expectedTest.trim().length > 0 },
    { label: 'Morning intention set', done: intention.trim().length > 0 },
  ];

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
              <p className="today-hero__focus-label">Today’s Biblical focus</p>
              <p className="today-hero__focus">{focus}</p>
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
                <Link to={planPath}>Weekly plan</Link>
              </p>
            </header>
          </div>

          {sunday ? (
            <section className="today-week-banner path-surface today-grid__banner">
              <p className="today-panel__label">Sunday · Weekly kickoff</p>
              <p className="path-body">
                {weeklyPlan.church.sermonTitle
                  ? `Sermon: ${weeklyPlan.church.sermonTitle}`
                  : 'Capture or refine sermon notes, then live the week’s plan.'}
              </p>
              <div className="today-week-banner__actions">
                <Link className="path-btn path-btn--ghost" to={planPath}>
                  Edit Weekly Plan
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

          {!sabbath ? (
            <section className="today-plan-summary path-surface" aria-label="Today’s plan">
              <p className="today-panel__label">Today’s plan</p>
              <ul className="today-plan-summary__list">
                <li>
                  <strong>Biblical</strong>
                  <span>{practice || focus}</span>
                </li>
                <li>
                  <strong>Training</strong>
                  <span>
                    {weeklyPhysical &&
                    (weeklyPhysical.type === 'workout' ||
                      weeklyPhysical.scheduledWorkouts.length > 0)
                      ? weeklyPhysical.workoutName ||
                        weeklyPhysical.scheduledWorkouts
                          .map((b) => b.workoutTemplateId)
                          .join(' + ') ||
                        'Workout'
                      : weeklyPhysical?.type?.replaceAll('_', ' ') || 'Unscheduled'}
                  </span>
                </li>
                <li>
                  <strong>Work</strong>
                  <span>
                    {weeklyWork.map((w) => w.title).join(' · ') || 'No key actions'}
                  </span>
                </li>
              </ul>
            </section>
          ) : null}

          {!sabbath ? (
            <>
              <section className="today-brief today-brief--biblical">
                <div className="today-brief__head">
                  <h2 className="today-brief__title">Today’s spiritual assignment</h2>
                </div>
                <ul className="today-brief__list">
                  {weeklyPlan.church.sermonTitle ? (
                    <li>Sermon: {weeklyPlan.church.sermonTitle}</li>
                  ) : null}
                  {theme ? <li>This week: {theme}</li> : null}
                  {focus ? <li>Today’s focus: {focus}</li> : null}
                  {scripture ? <li>Scripture: {scripture}</li> : null}
                  {practice ? <li>Concrete action: {practice}</li> : null}
                  {weeklyPlan.biblical.actOfObedience ? (
                    <li>Weekly act of obedience: {weeklyPlan.biblical.actOfObedience}</li>
                  ) : null}
                  {sessionPrompt ? <li>{sessionPrompt}</li> : null}
                </ul>
                <p className="today-hero__plan-link">
                  <Link to={`/plan/week/${weeklyPlan.weekStartDate}`}>View This Week</Link>
                </p>
              </section>

              <div className="today-preview__modes today-grid__modes" role="group" aria-label="Session">
                {(['morning', 'midday', 'evening'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`today-mode${session === s ? ' today-mode--active' : ''}`}
                    onClick={() => setSession(s)}
                  >
                    {s[0]!.toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              <section className="today-practice today-grid__lead">
                <p className="today-panel__label">Today’s practice</p>
                <p className="today-practice__challenge">{practice || 'Set a practice in the weekly plan.'}</p>
                <div className="today-practice__actions">
                  <Button
                    variant={practiceAccepted ? 'primary' : 'ghost'}
                    onClick={() => setPracticeAccepted(true)}
                  >
                    Accept practice
                  </Button>
                </div>
                <label className="path-field" style={{ marginTop: '0.75rem' }}>
                  <span>Concrete action outcome</span>
                  <select
                    value={concreteActionStatus}
                    onChange={(e) => {
                      const value = e.target.value as ConcreteActionDisposition;
                      setConcreteActionStatus(value);
                      if (value === 'completed') setPracticeDone(true);
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
              </section>

              <div className="today-panel path-surface today-grid__session">
                {session === 'morning' ? (
                  <>
                    <section className="today-panel__section">
                      <p className="today-panel__label">Scripture</p>
                      <p className="today-section__ref">{scripture || '—'}</p>
                      <Button
                        variant="ghost"
                        onClick={() => setScriptureReviewed(true)}
                      >
                        Mark reviewed
                      </Button>
                    </section>
                    <section className="today-panel__section">
                      <p className="today-panel__label">Morning practice</p>
                      <p className="path-body">
                        {weeklyBiblical?.morningPrompt || 'Spend 10–15 minutes with today’s focus.'}
                      </p>
                    </section>
                    {weeklyBiblical?.teaching ? (
                      <section className="today-panel__section">
                        <p className="today-panel__label">Explanation</p>
                        <p className="path-body today-block__teaching">{weeklyBiblical.teaching}</p>
                      </section>
                    ) : null}
                    <label className="path-field">
                      <span>Where might this be tested today?</span>
                      <textarea
                        rows={2}
                        value={expectedTest}
                        onChange={(e) => setExpectedTest(e.target.value)}
                      />
                    </label>
                    <label className="path-field">
                      <span>Morning intention</span>
                      <textarea
                        rows={2}
                        value={intention}
                        onChange={(e) => setIntention(e.target.value)}
                      />
                    </label>
                    <SessionProgress title="Morning progress" items={morningProgress} />
                    <div className="today-session-action">
                      <Button
                        className="today-session-action__btn"
                        onClick={() => setMorningDone(true)}
                        disabled={morningDone}
                      >
                        {morningDone ? 'Morning complete' : 'Complete morning session'}
                      </Button>
                    </div>
                  </>
                ) : null}
                {session === 'midday' ? (
                  <>
                    <p className="path-body">{weeklyBiblical?.middayPrompt || 'Have you practiced once yet?'}</p>
                    <div className="today-session-action">
                      <Button
                        className="today-session-action__btn"
                        onClick={() => setMiddayDone(true)}
                        disabled={middayDone}
                      >
                        {middayDone ? 'Midday complete' : 'Complete midday check'}
                      </Button>
                    </div>
                  </>
                ) : null}
                {session === 'evening' ? (
                  <>
                    <p className="path-body">
                      {weeklyBiblical?.eveningPrompt || 'What evidence did you see — or avoid?'}
                    </p>
                    <div className="today-session-action">
                      <Button
                        className="today-session-action__btn"
                        onClick={() => setEveningDone(true)}
                        disabled={eveningDone}
                      >
                        {eveningDone ? 'Evening complete' : 'Complete evening reflection'}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>

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
                  onReview={() => setSession('evening')}
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

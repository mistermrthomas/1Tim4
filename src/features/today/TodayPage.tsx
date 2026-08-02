import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MorningMode } from '../../domain/formation/types';
import { loadBiblicalDay, saveBiblicalDay } from '../../domain/biblical/dayLog';
import {
  followingSundayStart,
  isSaturdaySabbath,
  isSundayPlanningDay,
  toLocalDateKey,
} from '../../domain/calendar/week';
import { todayDateKey } from '../../domain/physical/store';
import { buildDailyBrief, resolveActivePlan } from '../../domain/training/activePlan';
import { getActiveFormationPlanForDate } from '../../domain/churchNotes/store';
import type { WeeklyFormationPlan } from '../../domain/churchNotes/types';
import { getActivePlanForDate, saveWeeklyPlan } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan, WorkDailyAssignment } from '../../domain/weeklyPlan/types';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import { Button } from '../../ui/Button';
import { startNextWeekPath } from '../weeklyPlan/WeeklyPlanWorkspace';
import { PhysicalTrainingPanel } from './PhysicalTrainingPanel';
import { pickPreviewDay, resolvePreviewDay } from './resolvePreviewDay';
import './TodayPage.css';

type Session = 'morning' | 'midday' | 'evening';

const MODE_HINTS: Record<MorningMode, string> = {
  full: 'Full loop',
  short: 'Busy day',
  two_minute: 'Reset',
};

function teachingParagraphs(text: string, max: number): string[] {
  const parts = text
    .split(/(?<=\.)\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= max) return parts;
  return [...parts.slice(0, max - 1), parts.slice(max - 1).join(' ')];
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


export function TodayPage() {
  const [pack, setPack] = useState<InstalledSeasonPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [morningMode, setMorningMode] = useState<MorningMode>('full');
  const [session, setSession] = useState<Session>('morning');
  const [expectedTest, setExpectedTest] = useState('');
  const [practiceNote, setPracticeNote] = useState('');
  const [intention, setIntention] = useState('');
  const [emotion, setEmotion] = useState<string | null>(null);
  const [tested, setTested] = useState<'yes' | 'not_yet' | 'unsure' | null>(null);
  const [eveningNotes, setEveningNotes] = useState<Record<string, string>>({});
  const [morningDone, setMorningDone] = useState(false);
  const [middayDone, setMiddayDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [practiceAccepted, setPracticeAccepted] = useState(false);
  const [practiceDone, setPracticeDone] = useState(false);
  const [scriptureReviewed, setScriptureReviewed] = useState(false);
  const [biblicalReady, setBiblicalReady] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [formationPlan, setFormationPlan] = useState<WeeklyFormationPlan | null>(null);
  const dateKey = todayDateKey();
  const sabbath = isSaturdaySabbath();
  const sundayKickoff = isSundayPlanningDay();

  useEffect(() => {
    let cancelled = false;
    loadSeasonPack()
      .then((loaded) => {
        if (!cancelled) setPack(loaded);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getActivePlanForDate(dateKey)
      .then((plan) => {
        if (!cancelled) setWeeklyPlan(plan);
      })
      .catch(() => {
        if (!cancelled) setWeeklyPlan(null);
      });
    getActiveFormationPlanForDate(dateKey)
      .then((plan) => {
        if (!cancelled) setFormationPlan(plan);
      })
      .catch(() => {
        if (!cancelled) setFormationPlan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  useEffect(() => {
    const log = loadBiblicalDay(todayDateKey());
    setExpectedTest(log.expectedTest);
    setIntention(log.intention);
    setEmotion(log.emotion);
    setTested(log.tested);
    setEveningNotes(log.eveningNotes);
    setMorningDone(log.morningDone);
    setMiddayDone(log.middayDone);
    setEveningDone(log.eveningDone);
    setPracticeAccepted(log.practiceAccepted);
    setPracticeDone(log.practiceDone);
    setScriptureReviewed(log.scriptureReviewed);
    setBiblicalReady(true);
  }, []);

  useEffect(() => {
    if (!biblicalReady) return;
    saveBiblicalDay({
      dateKey: todayDateKey(),
      practiceAccepted,
      practiceDone,
      expectedTest,
      intention,
      morningDone,
      middayDone,
      eveningDone,
      emotion,
      tested,
      eveningNotes,
      scriptureReviewed,
    });
  }, [
    biblicalReady,
    practiceAccepted,
    practiceDone,
    expectedTest,
    intention,
    morningDone,
    middayDone,
    eveningDone,
    emotion,
    tested,
    eveningNotes,
    scriptureReviewed,
  ]);

  const model = useMemo(() => {
    if (!pack) return null;
    const day = pickPreviewDay(pack, 'w1d1');
    return resolvePreviewDay(pack, day, morningMode);
  }, [pack, morningMode]);

  if (error) {
    return (
      <div className="today-preview">
        <p className="today-preview__error">Could not load season pack: {error}</p>
      </div>
    );
  }

  if (!pack || !model) {
    return (
      <div className="today-preview">
        <p className="today-preview__loading">Preparing today’s training…</p>
      </div>
    );
  }

  const scriptureBody =
    model.scripture.mode === 'full_text'
      ? model.scripture.text
      : model.scripture.mode === 'paraphrase'
        ? model.scripture.paraphrase
        : null;

  const teachingSource = model.morning.explanation || model.teaching.summary;
  const teachingMax =
    morningMode === 'two_minute' ? 1 : morningMode === 'short' ? 2 : 3;
  const teachingLines = teachingParagraphs(
    `${model.teaching.title}. ${teachingSource}${model.teaching.application ? ` ${model.teaching.application}` : ''}`,
    teachingMax,
  );

  const becomingLine =
    morningMode === 'two_minute'
      ? `${model.primaryFocus[0]?.toUpperCase()}${model.primaryFocus.slice(1)} under pressure — stay steady.`
      : `${model.primaryFocus[0]?.toUpperCase()}${model.primaryFocus.slice(1)} is the strength to remain steady when pressure invites a reactive response.`;

  const canCompleteMorning =
    expectedTest.trim().length > 0 && intention.trim().length > 0 && !morningDone;

  const incompleteMorning: string[] = [];
  if (!expectedTest.trim()) incompleteMorning.push('checkpoint');
  if (!intention.trim()) incompleteMorning.push('intention');

  const setCount = model.workoutItems.reduce((sum, item) => sum + item.sets, 0);
  const plan = resolveActivePlan(pack, model.week.weekIndex, `Day ${model.day.dayInWeek}`);
  const sessionLabel =
    session === 'morning' ? 'Morning' : session === 'midday' ? 'Midday' : 'Evening';
  const brief = buildDailyBrief(
    {
      primaryFocus: model.primaryFocus,
      week: model.week,
      day: model.day,
      scriptureLabel: model.scripture.reference.canonicalLabel,
      teachingTitle: model.teaching.title,
      practicePrompt: model.assignment.prompt,
      workoutTitle: model.workoutTitle,
      recoveryTitle: model.recoveryTitle,
      workoutSetCount: setCount,
      exerciseCount: model.workoutItems.length,
    },
    plan,
    sessionLabel,
  );

  const weeklyBiblical = weeklyPlan?.biblical.days.find((d) => d.date === dateKey);
  const weeklyPhysical = weeklyPlan?.physical.days.find((d) => d.date === dateKey);
  const weeklyWork = (weeklyPlan?.work.days ?? []).filter(
    (d) => d.date === dateKey && d.status !== 'removed' && d.title.trim().length > 0,
  );
  const weeklyFocus = weeklyBiblical?.focus || weeklyPlan?.biblical.weeklyTheme || brief.focus;
  const weeklyPractice = weeklyBiblical?.practice || weeklyPlan?.biblical.weeklyPractice || model.assignment.prompt;
  const weeklyScripture =
    weeklyBiblical?.scripture || weeklyPlan?.biblical.coreScripture || model.scripture.reference.canonicalLabel;
  const weeklyTeaching = weeklyBiblical?.teaching || teachingLines[0] || '';
  const sessionPrompt =
    session === 'morning'
      ? weeklyBiblical?.morningPrompt
      : session === 'midday'
        ? weeklyBiblical?.middayPrompt
        : weeklyBiblical?.eveningPrompt;

  const toggleWorkAction = async (action: WorkDailyAssignment) => {
    if (!weeklyPlan) return;
    const nextStatus = action.status === 'done' ? 'open' : 'done';
    const next: WeeklyPlan = {
      ...weeklyPlan,
      work: {
        ...weeklyPlan.work,
        days: weeklyPlan.work.days.map((d) =>
          d.id === action.id ? { ...d, status: nextStatus } : d,
        ),
      },
    };
    const saved = await saveWeeklyPlan(next);
    setWeeklyPlan(saved);
  };

  const morningProgress = [
    { label: 'Scripture reviewed', done: scriptureReviewed || Boolean(scriptureBody) },
    { label: 'Practice accepted', done: practiceAccepted || practiceDone },
    { label: 'Checkpoint answered', done: expectedTest.trim().length > 0 },
    { label: 'Morning intention set', done: intention.trim().length > 0 },
  ];

  const middayProgress = [
    { label: 'Practice recalled', done: practiceAccepted || practiceDone },
    { label: 'Tested status set', done: Boolean(tested) },
    { label: 'Response noted', done: Boolean(emotion) },
    { label: 'Midday check complete', done: middayDone },
  ];

  const eveningProgress = [
    { label: 'Patience practiced named', done: Boolean(eveningNotes[model.eveningPrompts[0]?.id ?? '']?.trim()) },
    { label: 'Quick reaction named', done: Boolean(eveningNotes[model.eveningPrompts[1]?.id ?? '']?.trim()) },
    { label: 'Tomorrow intention set', done: Boolean(eveningNotes[model.eveningPrompts[2]?.id ?? '']?.trim()) },
    { label: 'Evening reflection complete', done: eveningDone },
  ];

  return (
    <div className="today-preview path-fade-in">
      <div className="today-grid">
        <div className="today-grid__main">
          <div className="today-grid__header">
            <p className="path-eyebrow today-preview__eyebrow">{brief.hierarchyLine}</p>

            <header className="today-hero">
              <div className="today-hero__row">
                <h1 className="path-display today-hero__title">Today</h1>
                <p className="today-hero__theme">
                  {weeklyPlan?.biblical.weeklyTheme || plan.seasonTitle}
                </p>
              </div>
              <p className="today-hero__focus-label">Today’s focus</p>
              <p className="today-hero__focus">{weeklyFocus}</p>
              <p className="today-hero__meta">
                {weeklyPlan
                  ? `${weeklyPlan.weekStartDate} → ${weeklyPlan.weekEndDate}`
                  : `Week ${model.week.weekIndex}: ${model.week.theme}`}
                <span aria-hidden> · </span>
                {sessionLabel}
                <span aria-hidden> · </span>
                {toLocalDateKey()}
              </p>
              <p className="today-hero__plan-link">
                <Link to="/journey">View active plan</Link>
                <span aria-hidden> · </span>
                <Link to="/plan">Manage plan</Link>
                <span aria-hidden> · </span>
                <Link to={startNextWeekPath()}>Weekly plan</Link>
                <span aria-hidden> · </span>
                <Link to="/church-notes">Church notes</Link>
              </p>
            </header>
          </div>

          {formationPlan ? (
            <section className="today-week-banner path-surface" aria-label="Sermon formation">
              <p className="today-panel__label">This week’s theme</p>
              <p className="path-body">{formationPlan.weeklyTheme}</p>
              {(() => {
                const day = formationPlan.dailyPlan.find((d) => d.date === dateKey);
                if (!day) return null;
                return (
                  <>
                    <p className="today-week-banner__note">
                      <strong>Before you read</strong> — {day.beforeReadingPrompt}
                    </p>
                    <p className="today-week-banner__note">
                      <strong>After you read</strong> — {day.reflectionQuestion}
                    </p>
                    {formationPlan.memoryVerse ? (
                      <p className="today-week-banner__note">
                        Memory verse · {formationPlan.memoryVerse}
                      </p>
                    ) : null}
                  </>
                );
              })()}
              <p className="today-week-banner__note">
                Formation layer only — your Bible-reading plan stays intact. Read Scripture, then
                close the app.
              </p>
            </section>
          ) : null}

          {sundayKickoff && (!weeklyPlan || weeklyPlan.status !== 'active') ? (
            <section className="today-week-banner path-surface">
              <p className="today-panel__label">Sunday · Weekly kickoff</p>
              <p className="path-body">
                Capture church notes, set biblical practice, schedule workouts, and choose three work
                outcomes for the week ahead.
              </p>
              <div className="today-week-banner__actions">
                <Link className="path-btn path-btn--primary" to="/church-notes">
                  Capture church notes
                </Link>
                <Link className="path-btn path-btn--ghost" to={startNextWeekPath()}>
                  Build this week’s plan
                </Link>
                <Link className="path-btn path-btn--ghost" to={`/plan/week/${followingSundayStart()}`}>
                  Start next week
                </Link>
              </div>
            </section>
          ) : null}

          {sabbath ? (
            <section className="today-week-banner today-week-banner--sabbath path-surface">
              <p className="today-panel__label">Sabbath</p>
              <p className="path-body">
                Rest from structured training. Be present with family and friends.
              </p>
              <p className="today-week-banner__note">
                No required biblical lesson, workout, or work plan. Steps, protein, and water remain
                available if you want them — without pressure.
              </p>
            </section>
          ) : null}

          {weeklyPlan?.status === 'active' && !sabbath ? (
            <section className="today-plan-summary path-surface" aria-label="Today’s plan">
              <p className="today-panel__label">Today’s plan</p>
              <ul className="today-plan-summary__list">
                <li>
                  <strong>Biblical</strong>
                  <span>{weeklyPractice}</span>
                </li>
                <li>
                  <strong>Physical</strong>
                  <span>
                    {weeklyPhysical?.type === 'workout'
                      ? weeklyPhysical.workoutName || 'Workout'
                      : weeklyPhysical?.type?.replaceAll('_', ' ') || 'Unscheduled'}
                  </span>
                </li>
                <li>
                  <strong>Work</strong>
                  <span>
                    {weeklyWork.filter((w) => w.title.trim()).map((w) => w.title).join(' · ') ||
                      'No key actions'}
                  </span>
                </li>
              </ul>
            </section>
          ) : null}

          {!sabbath ? (
          <section className="today-brief today-brief--biblical" aria-labelledby="today-brief-title">
            <div className="today-brief__head">
              <h2 id="today-brief-title" className="today-brief__title">
                Today’s spiritual assignment
              </h2>
            </div>
            <ul className="today-brief__list">
              {weeklyBiblical ? (
                <>
                  <li>{weeklyScripture}</li>
                  <li>{weeklyPractice}</li>
                  {sessionPrompt ? <li>{sessionPrompt}</li> : null}
                </>
              ) : (
                brief.spiritual.map((item) => <li key={item}>{item}</li>)
              )}
            </ul>
          </section>
          ) : null}

          {!sabbath ? (
          <>
          <div
            className="today-preview__modes today-grid__modes"
            role="group"
            aria-label="Morning length"
          >
            {(['full', 'short', 'two_minute'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`today-preview__mode${morningMode === mode ? ' today-preview__mode--active' : ''}`}
                onClick={() => {
                  setMorningMode(mode);
                  setMorningDone(false);
                  setPracticeAccepted(false);
                  setPracticeDone(false);
                }}
              >
                <span className="today-preview__mode-label">
                  {mode === 'two_minute' ? 'Two-min' : mode === 'short' ? 'Short' : 'Full'}
                </span>
                <span className="today-preview__mode-hint">{MODE_HINTS[mode]}</span>
              </button>
            ))}
          </div>

          <div className="today-grid__lead today-column today-column--spiritual">
          <header className="today-column__header">
            <h2 className="path-display today-column__title">Biblical training</h2>
            <p className="today-column__intro">
              What Christian character am I deliberately practicing today?
            </p>
            <div className="today-preview__sessions" role="tablist" aria-label="Biblical session">
              {(
                [
                  ['morning', 'Morning', morningDone],
                  ['midday', 'Midday', middayDone],
                  ['evening', 'Evening', eveningDone],
                ] as const
              ).map(([key, label, done]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={session === key}
                  className={`today-preview__session${session === key ? ' today-preview__session--active' : ''}`}
                  onClick={() => setSession(key)}
                >
                  {label}
                  {done ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </header>

          <p className="today-becoming">{becomingLine}</p>

          <section className="today-practice">
            <p className="today-panel__label">Today’s practice</p>
            <p className="today-practice__challenge">{weeklyPractice}</p>
            {morningMode !== 'two_minute' ? (
              <p className="today-practice__signal">
                {weeklyBiblical?.focus || model.assignment.successSignal}
              </p>
            ) : null}
            <div className="today-practice__actions">
              <Button
                variant={practiceAccepted ? 'ghost' : 'primary'}
                className="today-practice__btn"
                disabled={practiceAccepted}
                onClick={() => {
                  setPracticeAccepted(true);
                  setScriptureReviewed(true);
                }}
              >
                {practiceAccepted ? 'Practice accepted' : 'Accept today’s practice'}
              </Button>
              <Button
                variant="ghost"
                className="today-practice__btn"
                disabled={!practiceAccepted || practiceDone}
                onClick={() => setPracticeDone(true)}
              >
                {practiceDone ? 'Marked practiced' : 'Mark as practiced'}
              </Button>
            </div>
            {morningMode === 'full' ? (
              <label className="path-field today-practice__note">
                <span className="today-field__hint">Optional note</span>
                <input
                  value={practiceNote}
                  onChange={(e) => setPracticeNote(e.target.value)}
                  placeholder="One line for tonight"
                />
              </label>
            ) : null}
          </section>
          </div>

          <div className="today-grid__session today-column today-column--spiritual">
          {session === 'morning' && (
            <div className="today-panel today-panel--spiritual">
              <section className="today-panel__section">
                <p className="today-panel__label">Scripture</p>
                <p className="today-section__ref">
                  {weeklyScripture}
                  {model.scripture.mode === 'paraphrase' && !weeklyBiblical ? ' · paraphrase' : ''}
                </p>
                {scriptureBody ? (
                  <blockquote className="path-scripture today-section__scripture">
                    {scriptureBody}
                  </blockquote>
                ) : (
                  <p className="path-body">
                    Full text is unavailable for {model.scripture.reference.canonicalLabel}.
                  </p>
                )}
                {model.scripture.mode === 'full_text' ? (
                  <p className="today-field__hint">{model.scripture.attribution}</p>
                ) : null}
              </section>

              <hr className="today-panel__divider" />

              <section className="today-panel__section">
                <p className="today-panel__label">Teaching</p>
                {weeklyBiblical?.teaching ? (
                  <p className="path-body today-block__teaching">{weeklyTeaching}</p>
                ) : (
                  teachingLines.map((line) => (
                    <p key={line.slice(0, 24)} className="path-body today-block__teaching">
                      {line}
                    </p>
                  ))
                )}
              </section>

              <hr className="today-panel__divider" />

              <section className="today-checkpoint">
                <p className="today-panel__label">Morning checkpoint</p>
                <p className="today-checkpoint__question">
                  Where are you most likely to feel pressured today?
                </p>
                <p className="today-checkpoint__help">
                  Identify one specific person, meeting, task, or situation.
                </p>
                <input
                  className="today-checkpoint__input"
                  value={expectedTest}
                  onChange={(e) => setExpectedTest(e.target.value)}
                  placeholder="One concrete moment…"
                />
              </section>

              <hr className="today-panel__divider" />

              <section className="today-panel__section">
                <p className="today-panel__label">Prayer & intention</p>
                <p className="today-block__prayer">{model.prayerPrompt}</p>
                <p className="today-intention__prompt">
                  Today I want to become someone who…
                </p>
                <input
                  className="today-checkpoint__input"
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="responds with patience instead of reacting"
                />
              </section>

              <hr className="today-panel__divider" />

              <SessionProgress title="Session progress" items={morningProgress} />

              {morningDone ? (
                <p className="today-preview__done">
                  Morning complete. Carry your intention into the day
                  {expectedTest.trim()
                    ? ` — especially when tested in “${expectedTest.trim()}”.`
                    : '.'}
                </p>
              ) : (
                <div className="today-session-action">
                  <Button
                    className="today-session-action__btn"
                    disabled={!canCompleteMorning}
                    onClick={() => {
                      setMorningDone(true);
                      setSession('midday');
                    }}
                  >
                    Complete Morning Session →
                  </Button>
                  {!canCompleteMorning ? (
                    <p className="today-session-action__hint">
                      Still needed: {incompleteMorning.join(' and ')}.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {session === 'midday' && (
            <div className="today-panel today-panel--spiritual">
              <section className="today-panel__section">
                <p className="today-panel__label">Midday check-in</p>
                <p className="today-practice__challenge">{model.assignment.prompt}</p>
                {expectedTest.trim() ? (
                  <p className="today-practice__signal">
                    You expected pressure in: <strong>{expectedTest.trim()}</strong>
                  </p>
                ) : null}
                <p className="path-body">
                  {model.middayPrompt ?? 'Have you been tested yet today?'}
                </p>
              </section>

              <hr className="today-panel__divider" />

              <section className="today-checkpoint">
                <p className="today-panel__label">Checkpoint</p>
                <p className="today-checkpoint__question">Where have you already been tested?</p>
                <div className="path-chip-row">
                  {(
                    [
                      ['yes', 'Yes — tested'],
                      ['not_yet', 'Not yet'],
                      ['unsure', 'Unsure'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`path-chip${tested === key ? ' path-chip--active' : ''}`}
                      onClick={() => setTested(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="today-checkpoint__question">How did you respond?</p>
                <div className="path-chip-row">
                  {['Steady', 'Pressed', 'Tired', 'Hopeful'].map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`path-chip${emotion === e ? ' path-chip--active' : ''}`}
                      onClick={() => setEmotion(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                {tested === 'yes' ? (
                  <p className="path-body">
                    Course correction: be quick to hear, slow to speak. A gentle answer turns away
                    wrath.
                  </p>
                ) : null}
                {tested === 'not_yet' ? (
                  <p className="path-body">Stay ready. Watch for the moment you named this morning.</p>
                ) : null}
                {tested === 'unsure' ? (
                  <p className="path-body">
                    Name one pressurized moment so far — even a small one counts.
                  </p>
                ) : null}
              </section>

              <hr className="today-panel__divider" />

              <SessionProgress title="Session progress" items={middayProgress} />

              {middayDone ? (
                <p className="today-preview__done">Midday check saved. Keep training your form.</p>
              ) : (
                <div className="today-session-action">
                  <Button
                    className="today-session-action__btn"
                    disabled={!emotion || !tested}
                    onClick={() => {
                      setMiddayDone(true);
                      setSession('evening');
                    }}
                  >
                    Complete Midday Session →
                  </Button>
                  {!emotion || !tested ? (
                    <p className="today-session-action__hint">
                      Still needed: {!tested ? 'tested status' : ''}
                      {!tested && !emotion ? ' and ' : ''}
                      {!emotion ? 'response' : ''}.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {session === 'evening' && (
            <div className="today-panel today-panel--spiritual">
              <section className="today-panel__section">
                <p className="today-panel__label">Evening reflection</p>
                <p className="today-practice__challenge">
                  Review the day without shame. Name what happened when pressure came.
                </p>
              </section>

              <hr className="today-panel__divider" />

              <section className="today-checkpoint">
                {(
                  [
                    ['practice', 'Where did you practice patience?', 'One honest moment…'],
                    ['react', 'Where did you react too quickly?', 'Without shame — just name it…'],
                    ['carry', 'What will you carry into tomorrow?', 'One intention for tomorrow…'],
                  ] as const
                ).map(([key, label, placeholder], index) => {
                  const promptId = model.eveningPrompts[index]?.id ?? key;
                  return (
                    <div key={key} className="today-checkpoint__stack">
                      <p className="today-checkpoint__question">{label}</p>
                      <textarea
                        className="today-checkpoint__textarea"
                        value={eveningNotes[promptId] ?? ''}
                        onChange={(e) =>
                          setEveningNotes((prev) => ({ ...prev, [promptId]: e.target.value }))
                        }
                        placeholder={placeholder}
                      />
                    </div>
                  );
                })}
              </section>

              <hr className="today-panel__divider" />

              <SessionProgress title="Session progress" items={eveningProgress} />

              {eveningDone ? (
                <p className="today-preview__done">
                  Evening complete. Missing perfection doesn’t erase who you are becoming. Rest, then
                  train again.
                </p>
              ) : (
                <div className="today-session-action">
                  <Button
                    className="today-session-action__btn"
                    onClick={() => setEveningDone(true)}
                  >
                    Complete Evening Session →
                  </Button>
                </div>
              )}
            </div>
          )}
          </div>

          {weeklyPlan?.status === 'active' && weeklyWork.length > 0 ? (
            <section className="today-work path-surface">
              <p className="today-panel__label">Work</p>
              <p className="today-column__intro">Key actions for today — separate from biblical and physical tracks.</p>
              <ul className="today-work__list">
                {weeklyWork.map((action) => {
                  const outcome = weeklyPlan.work.weeklyOutcomes.find((o) => o.id === action.outcomeId);
                  return (
                    <li key={action.id} className="today-work__item">
                      <label className="today-work__check">
                        <input
                          type="checkbox"
                          checked={action.status === 'done'}
                          onChange={() => void toggleWorkAction(action)}
                        />
                        <span>
                          <strong>{action.title || 'Untitled action'}</strong>
                          {outcome?.title ? (
                            <span className="today-work__outcome"> · {outcome.title}</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
          </>
          ) : null}
        </div>

        <PhysicalTrainingPanel pack={pack} day={model.day} />
      </div>
    </div>
  );
}

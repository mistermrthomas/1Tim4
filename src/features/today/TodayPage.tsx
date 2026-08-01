import { useEffect, useMemo, useState } from 'react';
import type { MorningMode } from '../../domain/formation/types';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import { Button } from '../../ui/Button';
import { pickPreviewDay, resolvePreviewDay } from './resolvePreviewDay';
import './TodayPage.css';

type Session = 'morning' | 'midday' | 'evening';
type HabitKey = 'protein' | 'water' | 'movement' | 'recovery';

const MODE_HINTS: Record<MorningMode, string> = {
  full: 'Full loop',
  short: 'Busy day',
  two_minute: 'Reset',
};

function excerptText(text: string, limit: number): { short: string; truncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return { short: trimmed, truncated: false };
  const cut = trimmed.slice(0, limit);
  const boundary = cut.lastIndexOf(' ');
  return { short: `${(boundary > 60 ? cut.slice(0, boundary) : cut).trim()}…`, truncated: true };
}

function teachingParagraphs(text: string, max: number): string[] {
  const parts = text
    .split(/(?<=\.)\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= max) return parts;
  return [...parts.slice(0, max - 1), parts.slice(max - 1).join(' ')];
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
  const [scriptureExpanded, setScriptureExpanded] = useState(false);
  const [habits, setHabits] = useState<Record<HabitKey, boolean>>({
    protein: false,
    water: false,
    movement: false,
    recovery: false,
  });

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

  const excerptLimit =
    morningMode === 'two_minute' ? 110 : morningMode === 'short' ? 160 : 220;
  const scriptureExcerpt = scriptureBody ? excerptText(scriptureBody, excerptLimit) : null;

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

  const setCount = model.workoutItems.reduce((sum, item) => sum + item.sets, 0);
  const coachLead =
    morningMode === 'two_minute'
      ? excerptText(model.coachCard, 90).short
      : morningMode === 'short'
        ? excerptText(model.coachCard, 130).short
        : model.coachCard.length > 140
          ? `${model.coachCard.slice(0, 137).trim()}…`
          : model.coachCard;

  const proteinCurrent = morningMode === 'full' ? 72 : morningMode === 'short' ? 48 : 24;
  const waterCurrent = morningMode === 'two_minute' ? 24 : 48;

  const habitRows: Array<{
    key: HabitKey;
    label: string;
    detail: string;
    percent: number;
  }> = [
    {
      key: 'protein',
      label: 'Protein',
      detail: `${proteinCurrent} / 120g`,
      percent: Math.round((proteinCurrent / 120) * 100),
    },
    {
      key: 'water',
      label: 'Water',
      detail: `${waterCurrent} / 80 oz`,
      percent: Math.round((waterCurrent / 80) * 100),
    },
    {
      key: 'movement',
      label: 'Movement',
      detail: model.workoutTitle
        ? habits.movement
          ? 'Workout completed'
          : 'Workout scheduled'
        : model.day.sessionType === 'rest_walk'
          ? 'Walk / rest day'
          : 'Movement planned',
      percent: habits.movement ? 100 : model.workoutTitle ? 55 : 30,
    },
    {
      key: 'recovery',
      label: 'Recovery',
      detail: habits.recovery ? 'Bedtime protected' : 'Protect bedtime',
      percent: habits.recovery ? 100 : 25,
    },
  ];

  const checkpointPrompt =
    session === 'morning'
      ? 'Where are you most likely to feel pressured today?'
      : session === 'midday'
        ? 'Where have you already been tested?'
        : 'How did you respond when patience was required?';

  const checkpointValue =
    session === 'morning'
      ? expectedTest
      : session === 'midday'
        ? emotion && tested
          ? `${emotion} · ${tested.replace('_', ' ')}`
          : ''
        : Object.values(eveningNotes).find((v) => v.trim()) ?? '';

  const setCheckpoint = (value: string) => {
    if (session === 'morning') setExpectedTest(value);
    else if (session === 'evening') {
      const firstId = model.eveningPrompts[0]?.id;
      if (firstId) setEveningNotes((prev) => ({ ...prev, [firstId]: value }));
    }
  };

  const completionItems = [
    { label: 'Scripture reviewed', done: scriptureReviewed || scriptureExpanded },
    { label: 'Practice accepted', done: practiceAccepted || practiceDone },
    { label: 'Movement', done: habits.movement || !model.workoutTitle },
    { label: 'Water target', done: habits.water },
    { label: 'Reflection', done: eveningDone || (session === 'evening' && Boolean(checkpointValue.trim())) },
  ];

  const toggleHabit = (key: HabitKey) => {
    setHabits((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="today-preview path-fade-in">
      <header className="today-hero">
        <p className="path-eyebrow">Season 01 · Week {model.week.weekIndex} of 6</p>
        <div className="today-hero__row">
          <h1 className="path-display today-hero__title">Today</h1>
          <p className="today-hero__theme">{model.seasonTitle}</p>
        </div>
        <p className="today-hero__meta">
          Primary {model.primaryFocus}
          <span aria-hidden> · </span>
          Secondary {model.secondaryFocus}
          <span aria-hidden> · </span>
          {model.week.theme}
        </p>
        <p className="today-hero__coach">{coachLead}</p>
      </header>

      <div className="today-preview__controls">
        <div className="today-preview__modes" role="group" aria-label="Morning length">
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
                setScriptureExpanded(false);
              }}
            >
              <span className="today-preview__mode-label">
                {mode === 'two_minute' ? 'Two-min' : mode === 'short' ? 'Short' : 'Full'}
              </span>
              <span className="today-preview__mode-hint">{MODE_HINTS[mode]}</span>
            </button>
          ))}
        </div>

        <div className="today-preview__sessions" role="tablist" aria-label="Daily sessions">
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
      </div>

      {session === 'morning' && (
        <div className="today-grid">
          <div className="today-grid__main">
            <section className="today-block">
              <p className="today-block__label">Becoming</p>
              <p className="today-block__becoming">{becomingLine}</p>
            </section>

            <section className="today-practice path-surface">
              <p className="path-eyebrow">Today’s practice</p>
              <p className="today-practice__challenge">{model.assignment.prompt}</p>
              {morningMode !== 'two_minute' ? (
                <p className="today-practice__signal">{model.assignment.successSignal}</p>
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
                  <span className="path-label">Quick note</span>
                  <input
                    value={practiceNote}
                    onChange={(e) => setPracticeNote(e.target.value)}
                    placeholder="Optional — one line for tonight"
                  />
                </label>
              ) : null}
            </section>

            <section className="today-block today-block--scripture">
              <p className="today-block__label">Scripture</p>
              <p className="today-section__ref">
                {model.scripture.reference.canonicalLabel}
                {model.scripture.mode === 'paraphrase' ? ' · paraphrase' : ''}
              </p>
              {scriptureExcerpt ? (
                <blockquote className="path-scripture today-section__scripture">
                  {scriptureExpanded || !scriptureExcerpt.truncated
                    ? scriptureBody
                    : scriptureExcerpt.short}
                </blockquote>
              ) : null}
              {scriptureExcerpt?.truncated ? (
                <button
                  type="button"
                  className="today-section__more"
                  onClick={() => {
                    setScriptureExpanded((v) => !v);
                    setScriptureReviewed(true);
                  }}
                >
                  {scriptureExpanded ? 'Show less' : 'Read full passage'}
                </button>
              ) : null}
              {model.scripture.mode === 'full_text' ? (
                <p className="path-label">{model.scripture.attribution}</p>
              ) : null}
            </section>

            <section className="today-block">
              <p className="today-block__label">Teaching</p>
              {teachingLines.map((line) => (
                <p key={line.slice(0, 24)} className="path-body today-block__teaching">
                  {line}
                </p>
              ))}
            </section>

            <section className="today-block today-block--prayer">
              <p className="today-block__label">Prayer & intention</p>
              <p className="today-block__prayer">{model.prayerPrompt}</p>
              <label className="path-field">
                <span className="path-label">One intention for today</span>
                <input
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="Who am I becoming in the pressurized moment?"
                />
              </label>
            </section>

            {morningDone ? (
              <p className="today-preview__done">
                Morning complete. Carry your intention into the day
                {expectedTest.trim() ? ` — especially when tested in “${expectedTest.trim()}”.` : '.'}
              </p>
            ) : (
              <Button
                className="today-preview__complete"
                disabled={!canCompleteMorning}
                onClick={() => {
                  setMorningDone(true);
                  setSession('midday');
                }}
              >
                Complete Morning
              </Button>
            )}
          </div>

          <aside className="today-grid__side">
            <div className="path-surface today-side-panel">
              <p className="path-display today-side-panel__title">Daily foundations</p>
              <p className="today-side-panel__intro">
                Train the body to support the character you are building.
              </p>
              <ul className="today-habits">
                {habitRows.map((habit) => (
                  <li key={habit.key} className="today-habit">
                    <div className="today-habit__head">
                      <div>
                        <p className="today-habit__label">{habit.label}</p>
                        <p className="today-habit__detail">{habit.detail}</p>
                      </div>
                      <button
                        type="button"
                        className={`today-habit__check${habits[habit.key] ? ' today-habit__check--done' : ''}`}
                        aria-pressed={habits[habit.key]}
                        aria-label={`Mark ${habit.label} ${habits[habit.key] ? 'incomplete' : 'complete'}`}
                        onClick={() => toggleHabit(habit.key)}
                      >
                        {habits[habit.key] ? '✓' : ''}
                      </button>
                    </div>
                    <div className="path-progress__track" aria-hidden>
                      <div
                        className="path-progress__fill"
                        style={{ width: `${habits[habit.key] ? 100 : habit.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {morningMode !== 'two_minute' && (model.workoutTitle || model.recoveryTitle) ? (
                <div className="today-side-panel__workout">
                  <p className="path-label">Movement plan</p>
                  <p className="today-side-panel__workout-title">
                    {model.workoutTitle ?? model.recoveryTitle}
                  </p>
                  {model.workoutTitle ? (
                    <p className="today-side-panel__workout-meta">
                      {setCount || '—'} sets · {morningMode.replace('_', ' ')}
                    </p>
                  ) : null}
                  {morningMode === 'full' && model.workoutItems.length ? (
                    <ul className="today-section__list">
                      {model.workoutItems.map((item) => (
                        <li key={`${item.name}-${item.reps}`}>
                          {item.name} — {item.sets} × {item.reps}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="path-surface today-side-panel">
              <p className="path-display today-side-panel__title">Today’s checkpoint</p>
              <label className="path-field">
                <span className="path-label">{checkpointPrompt}</span>
                <input
                  value={session === 'morning' ? expectedTest : checkpointValue}
                  onChange={(e) => setCheckpoint(e.target.value)}
                  placeholder="One concrete moment…"
                />
              </label>
            </div>

            <div className="path-surface today-side-panel today-side-panel--status">
              <p className="path-display today-side-panel__title">Daily completion</p>
              <ul className="today-completion">
                {completionItems.map((item) => (
                  <li
                    key={item.label}
                    className={`today-completion__item${item.done ? ' today-completion__item--done' : ''}`}
                  >
                    <span className="today-completion__mark" aria-hidden>
                      {item.done ? '✓' : '○'}
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {session === 'midday' && (
        <div className="today-grid">
          <div className="today-grid__main">
            <section className="today-practice path-surface">
              <p className="path-eyebrow">Form check</p>
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

            <section className="today-block">
              <p className="today-block__label">How are you?</p>
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
              <p className="today-block__label">Tested?</p>
              <div className="path-chip-row">
                {(
                  [
                    ['yes', 'Yes'],
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
              {tested === 'yes' ? (
                <p className="path-body">
                  Course correction: be quick to hear, slow to speak. A gentle answer turns away wrath.
                </p>
              ) : null}
              {tested === 'not_yet' ? (
                <p className="path-body">Stay ready. Watch for the moment you named this morning.</p>
              ) : null}
              {tested === 'unsure' ? (
                <p className="path-body">Name one pressurized moment so far — even a small one counts.</p>
              ) : null}
            </section>

            {middayDone ? (
              <p className="today-preview__done">Midday check saved. Keep training your form.</p>
            ) : (
              <Button
                className="today-preview__complete"
                disabled={!emotion || !tested}
                onClick={() => {
                  setMiddayDone(true);
                  setSession('evening');
                }}
              >
                Complete Midday
              </Button>
            )}
          </div>

          <aside className="today-grid__side">
            <div className="path-surface today-side-panel">
              <p className="path-display today-side-panel__title">Daily foundations</p>
              <p className="today-side-panel__intro">
                Train the body to support the character you are building.
              </p>
              <ul className="today-habits">
                {habitRows.map((habit) => (
                  <li key={habit.key} className="today-habit">
                    <div className="today-habit__head">
                      <div>
                        <p className="today-habit__label">{habit.label}</p>
                        <p className="today-habit__detail">{habit.detail}</p>
                      </div>
                      <button
                        type="button"
                        className={`today-habit__check${habits[habit.key] ? ' today-habit__check--done' : ''}`}
                        aria-pressed={habits[habit.key]}
                        onClick={() => toggleHabit(habit.key)}
                      >
                        {habits[habit.key] ? '✓' : ''}
                      </button>
                    </div>
                    <div className="path-progress__track" aria-hidden>
                      <div
                        className="path-progress__fill"
                        style={{ width: `${habits[habit.key] ? 100 : habit.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="path-surface today-side-panel today-side-panel--status">
              <p className="path-display today-side-panel__title">Daily completion</p>
              <ul className="today-completion">
                {completionItems.map((item) => (
                  <li
                    key={item.label}
                    className={`today-completion__item${item.done ? ' today-completion__item--done' : ''}`}
                  >
                    <span className="today-completion__mark" aria-hidden>
                      {item.done ? '✓' : '○'}
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {session === 'evening' && (
        <div className="today-grid">
          <div className="today-grid__main">
            <section className="today-practice path-surface">
              <p className="path-eyebrow">Evidence</p>
              <p className="today-practice__challenge">
                Review the day without shame. Name what happened when pressure came.
              </p>
            </section>

            <section className="today-block">
              <p className="today-block__label">Reflection</p>
              {model.eveningPrompts.map((p) => (
                <label key={p.id} className="path-field">
                  <span className="path-label">{p.text}</span>
                  <textarea
                    value={eveningNotes[p.id] ?? ''}
                    onChange={(e) =>
                      setEveningNotes((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    placeholder="A few honest words…"
                  />
                </label>
              ))}
            </section>

            <section className="today-block">
              <p className="today-block__label">Body & recovery</p>
              <p className="path-body">
                Session: {model.day.sessionType}
                {model.workoutTitle ? ` · ${model.workoutTitle}` : ''}
                {model.recoveryTitle ? ` · ${model.recoveryTitle}` : ''}
              </p>
              <p className="path-body">
                How is your energy and readiness to rest? (Preview — full logging comes next.)
              </p>
            </section>

            {eveningDone ? (
              <p className="today-preview__done">
                Evening complete. Missing perfection doesn’t erase who you are becoming. Rest, then
                train again.
              </p>
            ) : (
              <Button className="today-preview__complete" onClick={() => setEveningDone(true)}>
                Complete Evening
              </Button>
            )}
          </div>

          <aside className="today-grid__side">
            <div className="path-surface today-side-panel">
              <p className="path-display today-side-panel__title">Daily foundations</p>
              <ul className="today-habits">
                {habitRows.map((habit) => (
                  <li key={habit.key} className="today-habit">
                    <div className="today-habit__head">
                      <div>
                        <p className="today-habit__label">{habit.label}</p>
                        <p className="today-habit__detail">{habit.detail}</p>
                      </div>
                      <button
                        type="button"
                        className={`today-habit__check${habits[habit.key] ? ' today-habit__check--done' : ''}`}
                        aria-pressed={habits[habit.key]}
                        onClick={() => toggleHabit(habit.key)}
                      >
                        {habits[habit.key] ? '✓' : ''}
                      </button>
                    </div>
                    <div className="path-progress__track" aria-hidden>
                      <div
                        className="path-progress__fill"
                        style={{ width: `${habits[habit.key] ? 100 : habit.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="path-surface today-side-panel today-side-panel--status">
              <p className="path-display today-side-panel__title">Daily completion</p>
              <ul className="today-completion">
                {completionItems.map((item) => (
                  <li
                    key={item.label}
                    className={`today-completion__item${item.done ? ' today-completion__item--done' : ''}`}
                  >
                    <span className="today-completion__mark" aria-hidden>
                      {item.done ? '✓' : '○'}
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

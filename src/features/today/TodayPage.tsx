import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MorningMode } from '../../domain/formation/types';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import { Button } from '../../ui/Button';
import { PATH_MEDIA } from '../../ui/media';
import { pickPreviewDay, resolvePreviewDay } from './resolvePreviewDay';
import './TodayPage.css';

type Session = 'morning' | 'midday' | 'evening';
type HabitKey = 'protein' | 'water' | 'movement' | 'recovery';

const MODE_HINTS: Record<MorningMode, string> = {
  full: 'Full loop',
  short: 'Busy day',
  two_minute: 'Reset',
};

const SCRIPTURE_EXCERPT_CHARS = 180;

function excerptText(text: string, limit = SCRIPTURE_EXCERPT_CHARS): { short: string; truncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return { short: trimmed, truncated: false };
  const cut = trimmed.slice(0, limit);
  const boundary = cut.lastIndexOf(' ');
  return { short: `${(boundary > 80 ? cut.slice(0, boundary) : cut).trim()}…`, truncated: true };
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`today-section path-surface${open ? ' today-section--open' : ''}`}>
      <button
        type="button"
        className="today-section__toggle"
        onClick={onToggle}
        aria-expanded={open}
        disabled={!onToggle}
      >
        <span className="today-section__title">{title}</span>
        {onToggle ? <span className="today-section__chevron">{open ? '▾' : '▸'}</span> : null}
      </button>
      {open ? <div className="today-section__body path-fade-in">{children}</div> : null}
    </section>
  );
}

export function TodayPage() {
  const [pack, setPack] = useState<InstalledSeasonPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [morningMode, setMorningMode] = useState<MorningMode>('full');
  const [session, setSession] = useState<Session>('morning');
  const [openSection, setOpenSection] = useState('scripture');
  const [expectedTest, setExpectedTest] = useState('');
  const [intention, setIntention] = useState('');
  const [emotion, setEmotion] = useState<string | null>(null);
  const [tested, setTested] = useState<'yes' | 'not_yet' | 'unsure' | null>(null);
  const [eveningNotes, setEveningNotes] = useState<Record<string, string>>({});
  const [morningDone, setMorningDone] = useState(false);
  const [middayDone, setMiddayDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [practiceAccepted, setPracticeAccepted] = useState(false);
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

  const selectSession = (next: Session) => {
    setSession(next);
    setOpenSection(next === 'morning' ? 'scripture' : next === 'midday' ? 'check' : 'evidence');
  };

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

  const scriptureExcerpt = scriptureBody ? excerptText(scriptureBody) : null;
  const teachingSummary = model.morning.explanation || model.teaching.summary;
  const teachingExcerpt = excerptText(teachingSummary, 140);

  const canCompleteMorning =
    expectedTest.trim().length > 0 && intention.trim().length > 0 && !morningDone;

  const setCount = model.workoutItems.reduce((sum, item) => sum + item.sets, 0);
  const coachLead =
    model.coachCard.length > 120 ? `${model.coachCard.slice(0, 117).trim()}…` : model.coachCard;

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
      detail: habits.protein ? `${proteinCurrent} / 120g` : `${proteinCurrent} / 120g`,
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
          ? 'Workout done'
          : 'Workout planned'
        : model.day.sessionType === 'rest_walk'
          ? 'Walk / rest day'
          : 'Movement planned',
      percent: habits.movement ? 100 : model.workoutTitle ? 55 : 30,
    },
    {
      key: 'recovery',
      label: 'Recovery',
      detail: habits.recovery ? 'Sleep protected' : 'Protect sleep',
      percent: habits.recovery ? 100 : 25,
    },
  ];

  const toggleHabit = (key: HabitKey) => {
    setHabits((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="today-preview path-fade-in">
      <header className="today-hero path-scene">
        <img className="path-scene__img" src={PATH_MEDIA.heroStudy} alt="" />
        <div className="path-scene__veil" />
        <div className="today-hero__copy path-scene__content">
          <div className="today-hero__topline">
            <p className="path-eyebrow">Season 01 · Week {model.week.weekIndex} of 6</p>
            <h1 className="path-display today-hero__title">Today</h1>
          </div>
          <p className="today-hero__theme">{model.seasonTitle}</p>
          <p className="today-hero__meta">
            <span>{model.week.theme}</span>
            <span className="today-hero__dot" aria-hidden>
              ·
            </span>
            <span>
              Primary {model.primaryFocus} · Secondary {model.secondaryFocus}
            </span>
          </p>
          <p className="today-hero__coach">{coachLead}</p>
        </div>
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
                setOpenSection('scripture');
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
              onClick={() => selectSession(key)}
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
            <article className="today-practice path-surface">
              <p className="path-eyebrow">Today’s practice</p>
              <p className="today-practice__challenge">{model.assignment.prompt}</p>
              <p className="today-practice__signal">{model.assignment.successSignal}</p>
              <label className="path-field today-practice__field">
                <span className="path-label">Where will this be tested?</span>
                <input
                  value={expectedTest}
                  onChange={(e) => setExpectedTest(e.target.value)}
                  placeholder="e.g. the 2pm meeting, bedtime with the kids…"
                />
              </label>
              <div className="today-practice__actions">
                <Button
                  variant={practiceAccepted ? 'ghost' : 'primary'}
                  className="today-practice__accept"
                  onClick={() => setPracticeAccepted(true)}
                  disabled={practiceAccepted}
                >
                  {practiceAccepted ? 'Challenge accepted' : 'Accept today’s challenge'}
                </Button>
                <button
                  type="button"
                  className="today-practice__link"
                  onClick={() => setOpenSection(openSection === 'prayer' ? '' : 'prayer')}
                >
                  Reflect tonight
                </button>
              </div>
            </article>

            <Section
              title="Becoming"
              open={openSection === 'becoming'}
              onToggle={() => setOpenSection(openSection === 'becoming' ? '' : 'becoming')}
            >
              <p className="path-body">
                Training <strong>{model.primaryFocus}</strong> under pressure — week{' '}
                {model.week.weekIndex}: {model.week.intent}
              </p>
            </Section>

            <Section
              title="Scripture & teaching"
              open={openSection === 'scripture'}
              onToggle={() => setOpenSection(openSection === 'scripture' ? '' : 'scripture')}
            >
              <p className="today-section__ref">
                {model.scripture.reference.canonicalLabel}
                {model.scripture.mode === 'paraphrase' ? ' · paraphrase' : ''}
              </p>
              {scriptureExcerpt ? (
                <>
                  <blockquote className="path-scripture today-section__scripture">
                    {scriptureExpanded || !scriptureExcerpt.truncated
                      ? scriptureBody
                      : scriptureExcerpt.short}
                  </blockquote>
                  {scriptureExcerpt.truncated ? (
                    <button
                      type="button"
                      className="today-section__more"
                      onClick={() => setScriptureExpanded((v) => !v)}
                    >
                      {scriptureExpanded ? 'Show less' : 'Continue reading'}
                    </button>
                  ) : null}
                </>
              ) : null}
              {model.scripture.mode === 'full_text' ? (
                <p className="path-label">{model.scripture.attribution}</p>
              ) : null}
              <p className="path-label">Teaching</p>
              <p className="path-body">
                <strong>{model.teaching.title}.</strong>{' '}
                {scriptureExpanded || !teachingExcerpt.truncated
                  ? teachingSummary
                  : teachingExcerpt.short}
              </p>
              {!scriptureExpanded && teachingExcerpt.truncated ? (
                <button
                  type="button"
                  className="today-section__more"
                  onClick={() => setScriptureExpanded(true)}
                >
                  Continue reading
                </button>
              ) : null}
            </Section>

            <Section
              title="Prayer & intention"
              open={openSection === 'prayer' || openSection === 'intention'}
              onToggle={() =>
                setOpenSection(
                  openSection === 'prayer' || openSection === 'intention' ? '' : 'prayer',
                )
              }
            >
              <p className="path-body">{model.intentionPrompt}</p>
              <label className="path-field">
                <span className="path-label">One intention for today</span>
                <input
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="Who am I becoming in the pressurized moment?"
                />
              </label>
              <p className="path-label">Prayer</p>
              <p className="path-body">{model.prayerPrompt}</p>
            </Section>

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
                  selectSession('midday');
                }}
              >
                Complete Morning
              </Button>
            )}
          </div>

          <aside className="today-grid__side">
            <div className="path-surface today-side-panel">
              <p className="path-display today-side-panel__title">Train the body</p>
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

              {(model.workoutTitle || model.recoveryTitle) && (
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
                  {model.workoutItems.length ? (
                    <ul className="today-section__list">
                      {model.workoutItems.map((item) => (
                        <li key={`${item.name}-${item.reps}`}>
                          {item.name} — {item.sets} × {item.reps}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>

            <div
              className={`path-surface today-side-panel${eveningDone ? '' : ' today-side-panel--locked'}`}
            >
              <p className="path-display today-side-panel__title">Evening reflection</p>
              <p className="path-body">
                {eveningDone
                  ? 'Reflection captured. Rest, then train again.'
                  : 'Unlocks after midday — evidence without shame.'}
              </p>
            </div>
          </aside>
        </div>
      )}

      {session === 'midday' && (
        <div className="today-grid today-grid--single">
          <div className="today-grid__main">
            <Section title="Form check" open>
              <p className="path-label">Morning focus</p>
              <p className="path-body">
                {model.assignment.prompt}
                {expectedTest.trim() ? (
                  <>
                    <br />
                    You expected a test in: <strong>{expectedTest.trim()}</strong>
                  </>
                ) : null}
              </p>
              {model.middayPrompt ? (
                <p className="path-body">{model.middayPrompt}</p>
              ) : (
                <p className="path-body">Have you been tested yet today?</p>
              )}

              <p className="path-label">How are you?</p>
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

              <p className="path-label">Tested?</p>
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
            </Section>

            {middayDone ? (
              <p className="today-preview__done">Midday check saved. Keep training your form.</p>
            ) : (
              <Button
                className="today-preview__complete"
                disabled={!emotion || !tested}
                onClick={() => {
                  setMiddayDone(true);
                  selectSession('evening');
                }}
              >
                Complete Midday
              </Button>
            )}
          </div>
        </div>
      )}

      {session === 'evening' && (
        <div className="today-grid today-grid--single">
          <div className="today-grid__main">
            <Section
              title="Evidence"
              open={openSection === 'evidence'}
              onToggle={() => setOpenSection(openSection === 'evidence' ? '' : 'evidence')}
            >
              {model.eveningPrompts.map((p) => (
                <label key={p.id} className="path-field">
                  <span className="path-label">{p.text}</span>
                  <textarea
                    value={eveningNotes[p.id] ?? ''}
                    onChange={(e) => setEveningNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="A few honest words…"
                  />
                </label>
              ))}
            </Section>

            <Section
              title="Body & recovery"
              open={openSection === 'body'}
              onToggle={() => setOpenSection(openSection === 'body' ? '' : 'body')}
            >
              <p className="path-body">
                Session: {model.day.sessionType}
                {model.workoutTitle ? ` · ${model.workoutTitle}` : ''}
                {model.recoveryTitle ? ` · ${model.recoveryTitle}` : ''}
              </p>
              <p className="path-body">
                How is your energy and readiness to rest? (Preview — full logging comes next.)
              </p>
            </Section>

            {eveningDone ? (
              <p className="today-preview__done">
                Evening complete. Missing perfection doesn’t erase who you are becoming. Rest, then train
                again.
              </p>
            ) : (
              <Button className="today-preview__complete" onClick={() => setEveningDone(true)}>
                Complete Evening
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

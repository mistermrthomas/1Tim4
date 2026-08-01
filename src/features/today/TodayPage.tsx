import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MorningMode } from '../../domain/formation/types';
import { loadSeasonPack } from '../../content/bundled/loadSeasonPack';
import type { InstalledSeasonPack } from '../../content/types';
import { Button } from '../../ui/Button';
import { ProgressMeter } from '../../ui/ProgressMeter';
import { PATH_MEDIA } from '../../ui/media';
import { pickPreviewDay, resolvePreviewDay } from './resolvePreviewDay';
import './TodayPage.css';

type Session = 'morning' | 'midday' | 'evening';

const MODE_HINTS: Record<MorningMode, string> = {
  full: 'Full loop',
  short: 'Busy day',
  two_minute: 'Reset',
};

function Section({
  title,
  open,
  onToggle,
  children,
  media,
  scene = 'card',
}: {
  title: string;
  open: boolean;
  onToggle?: () => void;
  children: ReactNode;
  media?: string;
  scene?: 'card' | 'train';
}) {
  const showScene = Boolean(media && (open || scene === 'train'));
  return (
    <section
      className={`today-section path-surface${open ? ' today-section--open' : ''}${showScene ? ' today-section--scene' : ''}${scene === 'train' && showScene ? ' today-section--train' : ''}${scene === 'train' && !open ? ' today-section--train-collapsed' : ''}`}
    >
      {showScene ? (
        <>
          <img className="path-scene__img today-section__scene-img" src={media} alt="" />
          <div
            className={`path-scene__veil${scene === 'train' ? ' path-scene__veil--card' : ' path-scene__veil--soft'}`}
          />
        </>
      ) : null}
      <button
        type="button"
        className="today-section__toggle path-scene__content"
        onClick={onToggle}
        aria-expanded={open}
        disabled={!onToggle}
      >
        <span className="today-section__title">{title}</span>
        {onToggle ? <span className="today-section__chevron">{open ? '▾' : '▸'}</span> : null}
      </button>
      {open ? (
        <div className="today-section__body path-fade-in path-scene__content">{children}</div>
      ) : null}
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

  const canCompleteMorning =
    expectedTest.trim().length > 0 && intention.trim().length > 0 && !morningDone;

  const setCount = model.workoutItems.reduce((sum, item) => sum + item.sets, 0);

  return (
    <div className="today-preview path-fade-in">
      <header className="today-hero path-scene">
        <img className="path-scene__img" src={PATH_MEDIA.heroStudy} alt="" />
        <div className="path-scene__veil" />
        <div className="today-hero__copy path-scene__content">
          <p className="path-eyebrow">Preview · Season pack</p>
          <h1 className="path-display today-hero__title">Today</h1>
          <p className="today-hero__theme">{model.seasonTitle}</p>
          <p className="path-body today-hero__meta">
            Week {model.week.weekIndex}: {model.week.theme}
            <br />
            Primary {model.primaryFocus} · Secondary {model.secondaryFocus}
          </p>
          <p className="today-hero__coach">{model.coachCard}</p>
        </div>
      </header>

      <div className="today-preview__modes" role="group" aria-label="Morning length">
        {(['full', 'short', 'two_minute'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`today-preview__mode${morningMode === mode ? ' today-preview__mode--active' : ''}`}
            onClick={() => {
              setMorningMode(mode);
              setMorningDone(false);
              setOpenSection('scripture');
            }}
          >
            <span className="today-preview__mode-label">
              {mode === 'two_minute' ? 'Two-minute' : mode === 'short' ? 'Short' : 'Full'}
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

      {session === 'morning' && (
        <div className="today-grid">
          <div className="today-grid__main">
            <Section
              title="Becoming"
              open={openSection === 'becoming'}
              onToggle={() => setOpenSection(openSection === 'becoming' ? '' : 'becoming')}
            >
              <p className="path-label">This season</p>
              <p className="path-body">
                You are training <strong>{model.primaryFocus}</strong> under pressure — week{' '}
                {model.week.weekIndex}: {model.week.intent}
              </p>
            </Section>

            <Section
              title="Scripture & teaching"
              open={openSection === 'scripture'}
              onToggle={() => setOpenSection(openSection === 'scripture' ? '' : 'scripture')}
              media={PATH_MEDIA.scriptureDesk}
              scene="card"
            >
              <p className="today-section__ref">
                {model.scripture.reference.canonicalLabel}
                {model.scripture.mode === 'paraphrase' ? ' · paraphrase' : ''}
              </p>
              {scriptureBody ? <blockquote className="path-scripture">{scriptureBody}</blockquote> : null}
              {model.scripture.mode === 'full_text' ? (
                <p className="path-label">{model.scripture.attribution}</p>
              ) : null}
              <p className="path-label">Teaching of Jesus</p>
              <p className="path-body">
                <strong>{model.teaching.title}.</strong> {model.morning.explanation || model.teaching.summary}
              </p>
              <p className="path-body">{model.teaching.application}</p>
            </Section>

            <Section
              title="Today’s assignment"
              open={openSection === 'assignment'}
              onToggle={() => setOpenSection(openSection === 'assignment' ? '' : 'assignment')}
            >
              <p className="path-body">{model.assignment.prompt}</p>
              <p className="path-label">{model.assignment.successSignal}</p>
              <label className="path-field">
                <span className="path-label">Where do you expect this to be tested?</span>
                <textarea
                  value={expectedTest}
                  onChange={(e) => setExpectedTest(e.target.value)}
                  placeholder="e.g. the 2pm meeting, bedtime with the kids…"
                />
              </label>
            </Section>

            <Section
              title="Train"
              open={openSection === 'train'}
              onToggle={() => setOpenSection(openSection === 'train' ? '' : 'train')}
              media={PATH_MEDIA.trainDumbbells}
              scene="train"
            >
              <div className="today-train">
                <p className="path-body">{model.morning.bodyAction.summary}</p>
                {model.workoutTitle ? (
                  <>
                    <div className="today-train__stats">
                      <div>
                        <p className="path-label">Session</p>
                        <p>{model.workoutTitle}</p>
                      </div>
                      <div>
                        <p className="path-label">Sets</p>
                        <p>{setCount || '—'}</p>
                      </div>
                      <div>
                        <p className="path-label">Mode</p>
                        <p>{morningMode.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <ul className="today-section__list">
                      {model.workoutItems.map((item) => (
                        <li key={`${item.name}-${item.reps}`}>
                          {item.name} — {item.sets} × {item.reps}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {model.recoveryTitle ? <p className="path-body">Recovery: {model.recoveryTitle}</p> : null}
                {model.day.sessionType === 'rest_walk' ? (
                  <p className="path-body">Session type: rest / walk day.</p>
                ) : null}
              </div>
            </Section>

            <Section
              title="Intention & prayer"
              open={openSection === 'intention'}
              onToggle={() => setOpenSection(openSection === 'intention' ? '' : 'intention')}
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
              <p className="path-display today-side-panel__title">Supporting practices</p>
              <p className="path-body today-side-panel__intro">
                Fuel the training. These stay simple — adherence over perfection.
              </p>
              <div className="today-side-panel__meters">
                <ProgressMeter label="Protein" valueLabel="Target set" percent={morningMode === 'full' ? 35 : 20} />
                <ProgressMeter label="Water" valueLabel="Hydrate" percent={morningMode === 'two_minute' ? 15 : 40} />
                <ProgressMeter label="Movement" valueLabel={model.day.sessionType} percent={55} />
                <ProgressMeter label="Recovery" valueLabel="Protect sleep" percent={25} />
              </div>
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
              media={PATH_MEDIA.trainPlates}
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

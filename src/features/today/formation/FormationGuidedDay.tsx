import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestFormationReflect } from '../../../domain/aiPlanning/formationReflect';
import { readFormationReflectSettings } from '../../../domain/aiPlanning/reflectSettings';
import {
  listPriorJournalSnippets,
  loadBiblicalDay,
  saveBiblicalDay,
  type BiblicalDayLog,
} from '../../../domain/biblical/dayLog';
import { fetchWebPassage } from '../../../domain/scripture/fetchWebPassage';
import {
  formatFormationDate,
  formatFormationTime,
  greetingForNow,
  resolveActiveDay,
  sermonConnectionCopy,
} from '../../../domain/today/formationDay';
import { saveWeeklyPlan } from '../../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../../domain/weeklyPlan/types';
import { ScripturePassage } from './ScripturePassage';
import {
  FormationTodaysTraining,
  FormationTrainingPreview,
} from './FormationTodaysTraining';

const OBSERVE_MIN = 12;

function useLiveClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function isFormationComplete(log: BiblicalDayLog): boolean {
  const observationReady = (log.morningReflection ?? '').trim().length >= OBSERVE_MIN;
  const reflectAnswered = Boolean((log.reflectAnswer ?? '').trim());
  // Spiritual journal complete after Observe + Respond. Practice can finish in Today's Training.
  return observationReady && reflectAnswered;
}

export function FormationGuidedDay({
  weeklyPlan,
  dateKey,
  dayClosed,
  onPlanChange,
}: {
  weeklyPlan: WeeklyPlan;
  dateKey: string;
  dayClosed: boolean;
  onPlanChange?: (plan: WeeklyPlan) => void;
}) {
  const day = resolveActiveDay(weeklyPlan, dateKey);
  const [log, setLog] = useState<BiblicalDayLog>(() => loadBiblicalDay(dateKey));
  const [reflectStatus, setReflectStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    log.reflectQuestion ? 'ready' : 'idle',
  );
  const [reflectError, setReflectError] = useState<string | null>(null);
  const [passageText, setPassageText] = useState('');
  const [formationOpen, setFormationOpen] = useState(() => !isFormationComplete(loadBiblicalDay(dateKey)));
  const [trainingRevealed, setTrainingRevealed] = useState(() =>
    isFormationComplete(loadBiblicalDay(dateKey)),
  );
  const reflectRequestRef = useRef(0);
  const trainingRef = useRef<HTMLDivElement | null>(null);
  const now = useLiveClock();

  useEffect(() => {
    const next = loadBiblicalDay(dateKey);
    setLog(next);
    setReflectStatus(next.reflectQuestion ? 'ready' : 'idle');
    setReflectError(null);
    const complete = isFormationComplete(next);
    setFormationOpen(!complete);
    setTrainingRevealed(complete);
  }, [dateKey]);

  const persist = useCallback(
    (patch: Partial<BiblicalDayLog>) => {
      setLog((prev) => {
        const next = { ...prev, ...patch, dateKey };
        saveBiblicalDay(next);
        return next;
      });
    },
    [dateKey],
  );

  const scripture = day?.scripture || weeklyPlan.biblical.coreScripture;
  const practice = day?.practice || weeklyPlan.biblical.weeklyPractice;
  const connection = sermonConnectionCopy(weeklyPlan, day);
  const workDay = weeklyPlan.work.days.find(
    (d) => d.date === dateKey && d.status !== 'removed' && d.title.trim().length > 0,
  );
  const workLine = workDay?.title.trim() || '';
  const workDone = workDay?.status === 'done';

  const observation = log.morningReflection ?? '';
  const observationReady = observation.trim().length >= OBSERVE_MIN;
  const reflectAnswered = Boolean((log.reflectAnswer ?? '').trim());
  const reflectReady =
    reflectAnswered ||
    Boolean((log.reflectQuestion ?? '').trim()) ||
    reflectStatus === 'ready' ||
    reflectStatus === 'error';
  const showReflect = observationReady;
  const showPractice = observationReady && reflectReady;
  const formationComplete = isFormationComplete(log);

  useEffect(() => {
    let cancelled = false;
    void fetchWebPassage(scripture).then((result) => {
      if (cancelled) return;
      setPassageText(result.ok ? result.passage.text : '');
    });
    return () => {
      cancelled = true;
    };
  }, [scripture]);

  const generateReflectQuestion = useCallback(async () => {
    if (dayClosed) return;
    const obs = (loadBiblicalDay(dateKey).morningReflection ?? '').trim();
    if (obs.length < OBSERVE_MIN) return;

    const requestId = ++reflectRequestRef.current;
    setReflectStatus('loading');
    setReflectError(null);
    try {
      const settings = await readFormationReflectSettings();
      const result = await requestFormationReflect({
        scriptureReference: scripture,
        scriptureText: passageText.slice(0, 6_000),
        sermonTitle: weeklyPlan.church.sermonTitle,
        sermonCentralTruth: connection.centralTruth,
        sermonNotes: weeklyPlan.church.sermonNotes,
        observation: obs,
        priorJournal: listPriorJournalSnippets(dateKey),
        reflectPrompt: settings.reflectPrompt ?? '',
      });
      if (requestId !== reflectRequestRef.current) return;
      persist({
        reflectQuestion: result.question,
        morningDone: true,
        scriptureReviewed: true,
      });
      setReflectStatus('ready');
    } catch (err) {
      if (requestId !== reflectRequestRef.current) return;
      const fallback =
        'Why do you think this part of the passage stood out to you today?';
      persist({
        reflectQuestion: fallback,
        morningDone: true,
        scriptureReviewed: true,
      });
      setReflectStatus('error');
      setReflectError(err instanceof Error ? err.message : 'Using a simple follow-up instead.');
    }
  }, [
    connection.centralTruth,
    dateKey,
    dayClosed,
    passageText,
    persist,
    scripture,
    weeklyPlan.church.sermonNotes,
    weeklyPlan.church.sermonTitle,
  ]);

  useEffect(() => {
    if (!observationReady || dayClosed) return;
    if ((log.reflectQuestion ?? '').trim()) {
      setReflectStatus('ready');
      return;
    }
    if (reflectStatus === 'loading') return;
    void generateReflectQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observationReady, dateKey]);

  const markScriptureReviewed = useCallback(() => {
    persist({ scriptureReviewed: true });
  }, [persist]);

  const markWorkComplete = useCallback(async () => {
    if (!workDay || workDay.status === 'done') return;
    const next: WeeklyPlan = {
      ...weeklyPlan,
      work: {
        ...weeklyPlan.work,
        days: weeklyPlan.work.days.map((d) =>
          d.id === workDay.id ? { ...d, status: 'done' as const } : d,
        ),
      },
    };
    const saved = await saveWeeklyPlan(next);
    onPlanChange?.(saved);
  }, [onPlanChange, weeklyPlan, workDay]);

  const canContinue = formationComplete && showPractice;

  // Reveal training once the spiritual steps are ready; keep Scripture open until Continue / return.
  useEffect(() => {
    if (canContinue || formationComplete) setTrainingRevealed(true);
  }, [canContinue, formationComplete]);

  const continueToTraining = useCallback(() => {
    setTrainingRevealed(true);
    setFormationOpen(false);
    window.setTimeout(() => {
      trainingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

  return (
    <div className="formation-flow formation-flow--quiet">
      <header className="formation-hero formation-hero--quiet">
        <p className="formation-hero__greeting">{greetingForNow(now)}</p>
        <p className="formation-hero__datetime">
          <span className="formation-hero__date">{formatFormationDate(now)}</span>
          <span className="formation-hero__sep" aria-hidden>
            ·
          </span>
          <span className="formation-hero__time">{formatFormationTime(now)}</span>
        </p>
        <h1 className="formation-hero__title">
          {formationComplete && !formationOpen
            ? 'Continue today’s formation'
            : 'Begin today’s formation'}
        </h1>
        <p className="formation-hero__soft">
          {weeklyPlan.church.sermonTitle || weeklyPlan.biblical.weeklyTheme || 'This week'}
        </p>
      </header>

      {formationComplete && !formationOpen ? (
        <section className="formation-complete-summary" aria-label="Morning formation complete">
          <p className="formation-stage__label">Morning formation complete</p>
          <p className="formation-complete-summary__ref">{scripture}</p>
          <button
            type="button"
            className="formation-text-btn"
            onClick={() => setFormationOpen(true)}
          >
            View journal entry
          </button>
        </section>
      ) : (
        <>
          <section className="formation-stage formation-stage--read" aria-label="Today’s reading">
            <p className="formation-stage__label">Read</p>
            <div className="formation-reading">
              <ScripturePassage
                reference={scripture}
                mode="full"
                onReviewed={markScriptureReviewed}
              />
            </div>
          </section>

          <section className="formation-stage formation-stage--observe" aria-label="Observe">
            <p className="formation-stage__label">Observe</p>
            <h2 className="formation-stage__question">What stood out to you?</h2>
            <p className="formation-stage__hint">
              Notice before you apply. Write what you saw in the text — a word, a tension, a
              surprise.
            </p>
            <label className="path-field formation-journal">
              <span className="visually-hidden">Observation journal</span>
              <textarea
                rows={7}
                value={observation}
                disabled={dayClosed}
                placeholder="Write freely…"
                onChange={(e) => {
                  const value = e.target.value;
                  const patch: Partial<BiblicalDayLog> = {
                    morningReflection: value,
                    morningDone: value.trim().length >= OBSERVE_MIN,
                  };
                  if (log.reflectQuestion && value.trim().length < OBSERVE_MIN) {
                    patch.reflectQuestion = '';
                    patch.reflectAnswer = '';
                    setReflectStatus('idle');
                  }
                  persist(patch);
                }}
                onBlur={() => {
                  if (
                    observation.trim().length >= OBSERVE_MIN &&
                    !(log.reflectQuestion ?? '').trim() &&
                    reflectStatus !== 'loading'
                  ) {
                    void generateReflectQuestion();
                  }
                }}
              />
            </label>
          </section>

          {showReflect ? (
            <section className="formation-stage" aria-label="Reflect">
              <p className="formation-stage__label">Reflect</p>
              {reflectStatus === 'loading' ? (
                <p className="formation-stage__hint">Listening to your observation…</p>
              ) : (
                <>
                  <h2 className="formation-stage__question">
                    {log.reflectQuestion || 'Why do you think this stood out today?'}
                  </h2>
                  {reflectError ? (
                    <p className="formation-stage__hint">{reflectError}</p>
                  ) : (
                    <p className="formation-stage__hint">One question. Answer honestly.</p>
                  )}
                  {!dayClosed && log.reflectQuestion ? (
                    <button
                      type="button"
                      className="formation-text-btn"
                      onClick={() => void generateReflectQuestion()}
                    >
                      Ask a different question
                    </button>
                  ) : null}
                </>
              )}
              <p className="formation-stage__label formation-stage__label--nested">Respond</p>
              <label className="path-field formation-journal">
                <span className="visually-hidden">Reflection journal</span>
                <textarea
                  rows={6}
                  value={log.reflectAnswer}
                  disabled={dayClosed || reflectStatus === 'loading'}
                  placeholder="Write your response…"
                  onChange={(e) => persist({ reflectAnswer: e.target.value })}
                />
              </label>
            </section>
          ) : null}

          {showPractice ? (
            <section className="formation-stage" aria-label="Practice">
              <p className="formation-stage__label">Practice</p>
              <h2 className="formation-stage__question">One faithful action</h2>
              <p className="formation-practice__line">
                {practice || 'Stay with what you noticed in Scripture today.'}
              </p>
              <label className="path-field">
                <span>What will you do — or what happened?</span>
                <textarea
                  rows={3}
                  value={log.concreteActionNote}
                  disabled={dayClosed}
                  placeholder="Keep it concrete."
                  onChange={(e) =>
                    persist({
                      concreteActionNote: e.target.value,
                      practiceAccepted: true,
                      concreteActionStatus:
                        e.target.value.trim().length > 0 ? 'completed' : 'unset',
                    })
                  }
                />
              </label>
            </section>
          ) : null}

          {formationComplete ? (
            <button
              type="button"
              className="formation-text-btn"
              onClick={() => setFormationOpen(false)}
            >
              Collapse morning formation
            </button>
          ) : null}
        </>
      )}

      {!trainingRevealed ? <FormationTrainingPreview dateKey={dateKey} /> : null}

      {canContinue && formationOpen ? (
        <button
          type="button"
          className="path-btn path-btn--primary formation-continue-btn"
          onClick={continueToTraining}
        >
          Continue to Today’s Training
        </button>
      ) : null}

      {trainingRevealed ? (
        <div ref={trainingRef}>
          <FormationTodaysTraining
            dateKey={dateKey}
            workLine={workLine}
            workDone={workDone}
            onWorkComplete={() => void markWorkComplete()}
            practiceLine={practice || 'Stay with what you noticed in Scripture today.'}
            practiceDone={log.practiceDone}
            onPracticeComplete={() =>
              persist({
                practiceDone: true,
                practiceAccepted: true,
                concreteActionStatus: 'completed',
              })
            }
            dayClosed={dayClosed}
          />
        </div>
      ) : null}

      <p className="formation-footnote">
        Scripture teaches. Your journal is the record of formation — not a streak.
        <Link to="/progress"> View history</Link>
      </p>
    </div>
  );
}

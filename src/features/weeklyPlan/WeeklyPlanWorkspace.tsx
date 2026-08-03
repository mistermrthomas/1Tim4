import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { SermonPlan } from '../../../shared/sermonPlanSchema';
import { applySermonPlanToWeeklyPlan } from '../../domain/aiPlanning/applySermonPlan';
import {
  notesAreMeaningful,
  requestSermonPlan,
  SermonPlanClientError,
} from '../../domain/aiPlanning/client';
import { readAiPlanningSettings } from '../../domain/aiPlanning/settings';
import {
  followingSundayStart,
  nextSundayStart,
  shortWeekdayLabel,
} from '../../domain/calendar/week';
import { readPhysicalPlan } from '../../domain/physical/planCatalog';
import { newId } from '../../domain/physical/store';
import { activateAndSyncWeeklyPlan } from '../../domain/weeklyPlan/activate';
import { applyBiblicalDefaultsFromChurch } from '../../domain/weeklyPlan/factory';
import { normalizePhysicalDay } from '../../domain/weeklyPlan/physicalWorkouts';
import { ensureWeeklyPlanByRef, saveWeeklyPlan } from '../../domain/weeklyPlan/store';
import type { WeeklyPlan } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';
import { TrainingPlanStep } from './TrainingPlanStep';
import './WeeklyPlanWorkspace.css';

const STEPS = [
  'Sermon',
  'Weekly Biblical focus',
  'Faith plan',
  'Training plan',
  'Work plan',
  'Review & activate',
] as const;

const LOADING_MESSAGES = [
  'Building your week from the sermon notes…',
  'Identifying the central truth…',
  'Developing the Monday–Friday progression…',
  'Turning the message into concrete practices…',
  'Preparing the Saturday reflection…',
];

function hasSermonContent(plan: WeeklyPlan): boolean {
  return Boolean(
    plan.church.sermonTitle.trim() ||
      plan.church.sermonNotes.trim() ||
      plan.church.sermonUrl.trim() ||
      plan.church.primaryScripture.trim(),
  );
}

export function WeeklyPlanWorkspace() {
  const { weekId, weekStart: weekStartParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = weekId || weekStartParam || nextSundayStart();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const stepFromQuery = Number(searchParams.get('step'));
  const [step, setStep] = useState(
    Number.isFinite(stepFromQuery) && stepFromQuery >= 0 && stepFromQuery <= 5
      ? stepFromQuery
      : 0,
  );

  useEffect(() => {
    const raw = searchParams.get('step');
    if (raw == null) return;
    const next = Number(raw);
    if (Number.isFinite(next) && next >= 0 && next <= 5) setStep(next);
  }, [searchParams]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]!);
  const [adjustment, setAdjustment] = useState('');
  const [lastAiPlan, setLastAiPlan] = useState<SermonPlan | null>(null);
  const [pendingAiPlan, setPendingAiPlan] = useState<SermonPlan | null>(null);
  const [templates, setTemplates] = useState(() => readPhysicalPlan().templates);
  useEffect(() => {
    // Re-read after catalog seed migrations (e.g. Core Finisher) land in localStorage.
    setTemplates(readPhysicalPlan().templates);
  }, []);

  const load = useCallback(async () => {
    try {
      const next = await ensureWeeklyPlanByRef(ref);
      setPlan(next);
      setLastAiPlan(next.biblical.aiProposal ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ref]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!generating) return;
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]!);
    }, 2200);
    return () => window.clearInterval(id);
  }, [generating]);

  const patch = (updater: (prev: WeeklyPlan) => WeeklyPlan) => {
    setPlan((prev) => (prev ? updater(prev) : prev));
    setMessage(null);
  };

  const generateBiblicalPlan = async (opts?: { regenerate?: boolean }) => {
    if (!plan || generating) return;
    if (!notesAreMeaningful(plan.church.sermonNotes)) {
      setAiError('Add meaningful sermon notes (at least a few sentences) before generating.');
      return;
    }
    setGenerating(true);
    setAiError(null);
    setMessage(null);
    setLoadingMsg(LOADING_MESSAGES[0]!);
    try {
      const settings = await readAiPlanningSettings();
      const result = await requestSermonPlan({
        sermonTitle: plan.church.sermonTitle,
        sermonDate: plan.church.sermonDate,
        sermonNotes: plan.church.sermonNotes,
        primaryScripture: plan.church.primaryScripture || undefined,
        sermonSpeaker: plan.church.speaker || undefined,
        churchName: plan.church.churchName || undefined,
        sermonUrl: plan.church.sermonUrl || undefined,
        additionalContext: plan.church.additionalContext || undefined,
        planningPrompt: settings.planningPrompt,
        model: settings.model,
        adjustmentInstruction: opts?.regenerate ? adjustment : undefined,
        currentPlan: opts?.regenerate ? lastAiPlan ?? plan.biblical.aiProposal ?? undefined : undefined,
      });
      if (opts?.regenerate) {
        setPendingAiPlan(result.plan);
        setMessage('Regenerated plan ready — accept to replace the current draft.');
      } else {
        const next = applySermonPlanToWeeklyPlan(plan, result.plan, {
          modelUsed: result.modelUsed,
          promptVersion: settings.promptVersion,
        });
        const saved = await saveWeeklyPlan(next);
        setPlan(saved);
        setLastAiPlan(result.plan);
        setStep(2);
        setMessage('Biblical plan generated — review and edit before activating.');
      }
    } catch (e) {
      if (e instanceof SermonPlanClientError) {
        setAiError(e.message);
      } else {
        setAiError(e instanceof Error ? e.message : 'Generation failed');
      }
    } finally {
      setGenerating(false);
    }
  };

  const acceptPendingAi = async () => {
    if (!plan || !pendingAiPlan) return;
    const settings = await readAiPlanningSettings();
    const next = applySermonPlanToWeeklyPlan(plan, pendingAiPlan, {
      modelUsed: plan.aiMeta?.modelUsed || 'unknown',
      promptVersion: settings.promptVersion,
      regenerated: true,
    });
    const saved = await saveWeeklyPlan(next);
    setPlan(saved);
    setLastAiPlan(pendingAiPlan);
    setPendingAiPlan(null);
    setAdjustment('');
    setMessage('Updated Biblical plan from regeneration.');
    setStep(2);
  };

  const saveDraft = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const saved = await saveWeeklyPlan(plan);
      setPlan(saved);
      setMessage('Draft saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!plan) return;
    if (!window.confirm('Activate this week? Today will load these assignments.')) return;
    setSaving(true);
    try {
      const activated = await activateAndSyncWeeklyPlan(plan);
      setPlan(activated);
      setMessage('Week activated');
      navigate('/today');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="weekly-plan__error">{error}</p>;
  if (!plan) return <p className="weekly-plan__loading">Loading weekly plan…</p>;

  const sermonReady = hasSermonContent(plan);

  return (
    <div className="weekly-plan path-fade-in">
      <header className="weekly-plan__hero">
        <p className="path-eyebrow">Sunday planning</p>
        <h1 className="path-display weekly-plan__title">Build this week’s plan</h1>
        <p className="path-body weekly-plan__lede">
          Start with the sermon. Then shape faith, training, and work for Sunday through Saturday.
          Tracks stay independent.
        </p>
        <p className="weekly-plan__meta">
          This week: {plan.weekStartDate} → {plan.weekEndDate} · {plan.status}
        </p>
      </header>

      <div className="weekly-plan__toolbar">
        <Button variant="ghost" onClick={() => void saveDraft()} disabled={saving}>
          Save draft
        </Button>
        <Link className="path-btn path-btn--ghost" to="/today">
          Today
        </Link>
        <Link className="path-btn path-btn--ghost" to="/journey">
          Journey
        </Link>
        <Link className="path-btn path-btn--ghost" to="/workouts">
          Workouts
        </Link>
        <Link className="path-btn path-btn--ghost" to="/settings">
          Settings
        </Link>
        {message ? <p className="weekly-plan__status">{message}</p> : null}
      </div>

      {generating ? (
        <div className="weekly-plan__loading-banner path-surface" role="status" aria-live="polite">
          <p className="weekly-plan__h3">AI planning</p>
          <p className="path-body">{loadingMsg}</p>
          <p className="weekly-plan__note">Your sermon notes stay saved. This may take a moment.</p>
        </div>
      ) : null}

      <div className="weekly-plan__steps" role="tablist" aria-label="Planning steps">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={step === index}
            className={`weekly-plan__step-btn${step === index ? ' weekly-plan__step-btn--active' : ''}`}
            onClick={() => setStep(index)}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">1. What was this week’s sermon?</h2>
          {!sermonReady ? (
            <div className="weekly-plan__note" style={{ marginBottom: '1rem' }}>
              <p>
                <strong>Start with this week’s sermon.</strong>
              </p>
              <p>Add your church notes or paste the link to the sermon you need to watch.</p>
              <div className="weekly-plan__toolbar" style={{ marginTop: '0.75rem' }}>
                <Button
                  onClick={() => {
                    const el = document.getElementById('sermon-notes-field');
                    el?.focus();
                  }}
                >
                  Add Sermon Notes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const el = document.getElementById('sermon-url-field');
                    el?.focus();
                  }}
                >
                  Add Sermon Link
                </Button>
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Build Week Manually
                </Button>
              </div>
            </div>
          ) : null}
          <div className="weekly-plan__grid">
            <label className="path-field">
              <span>Sermon title — optional</span>
              <input
                value={plan.church.sermonTitle}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, sermonTitle: e.target.value } }))
                }
                placeholder="Leave blank for AI"
              />
              <span className="weekly-plan__field-help">
                Leave blank and AI will create one from your notes.
              </span>
            </label>
            <label className="path-field">
              <span>Sermon date</span>
              <input
                type="date"
                value={plan.church.sermonDate}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, sermonDate: e.target.value } }))
                }
              />
            </label>
            <label className="path-field">
              <span>Speaker (optional)</span>
              <input
                value={plan.church.speaker}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, speaker: e.target.value } }))
                }
              />
            </label>
            <label className="path-field">
              <span>Church name (optional)</span>
              <input
                value={plan.church.churchName}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, churchName: e.target.value } }))
                }
              />
            </label>
            <label className="path-field">
              <span>Primary Scripture</span>
              <input
                value={plan.church.primaryScripture}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    church: { ...p.church, primaryScripture: e.target.value },
                  }))
                }
              />
            </label>
            <label className="path-field">
              <span>Sermon link (optional)</span>
              <input
                id="sermon-url-field"
                type="url"
                placeholder="https://"
                value={plan.church.sermonUrl}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, sermonUrl: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Sermon notes</span>
              <textarea
                id="sermon-notes-field"
                rows={8}
                placeholder="Paste or write anything you captured during church."
                value={plan.church.sermonNotes}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, sermonNotes: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Additional personal context (optional)</span>
              <textarea
                rows={4}
                placeholder="What you are struggling with, a decision, a relationship, hurry, pride, resistance — anything you want the plan to address."
                value={plan.church.additionalContext}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    church: { ...p.church, additionalContext: e.target.value },
                  }))
                }
              />
            </label>
          </div>
          <p className="weekly-plan__note">
            AI suggestions are based on your notes — not divine revelation. Review against Scripture
            before activating. You can also build the week manually.
          </p>
          {aiError ? <p className="weekly-plan__error">{aiError}</p> : null}
          <div className="weekly-plan__toolbar">
            <Button
              onClick={() => void generateBiblicalPlan()}
              disabled={generating || !notesAreMeaningful(plan.church.sermonNotes)}
            >
              Generate This Week’s Biblical Plan
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)} disabled={generating}>
              Continue manually
            </Button>
            <Button variant="ghost" onClick={() => void saveDraft()} disabled={saving || generating}>
              Save draft
            </Button>
          </div>
          {aiError ? (
            <div className="weekly-plan__toolbar">
              <Button variant="ghost" onClick={() => void generateBiblicalPlan()} disabled={generating}>
                Try Again
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Continue Manually
              </Button>
            </div>
          ) : null}
        </section>
      )}

      {step === 1 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">2. Weekly Biblical focus</h2>
          <div className="weekly-plan__grid">
            <label className="path-field weekly-plan__span-2">
              <span>What was the central truth?</span>
              <textarea
                rows={3}
                value={plan.church.centralTruth}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, centralTruth: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>What needs to change in me?</span>
              <textarea
                rows={3}
                value={plan.church.whatNeedsToChange}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    church: { ...p.church, whatNeedsToChange: e.target.value },
                  }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>What should I practice this week?</span>
              <textarea
                rows={3}
                value={plan.church.whatToPractice}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, whatToPractice: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>What is one concrete act of obedience?</span>
              <textarea
                rows={2}
                placeholder="Observable this week — not a vague aspiration."
                value={plan.church.actOfObedience}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, actOfObedience: e.target.value } }))
                }
              />
            </label>
          </div>
          <div className="weekly-plan__toolbar">
            <Button
              onClick={() => {
                patch((p) => applyBiblicalDefaultsFromChurch(p));
                setStep(2);
              }}
            >
              Build faith plan draft
            </Button>
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">3. Faith plan</h2>
          <p className="weekly-plan__note">
            Review all content against Scripture and your own judgment before activating. Based on
            your notes — edit freely. This is not divine revelation.
          </p>
          {pendingAiPlan ? (
            <div className="weekly-plan__pending path-surface">
              <p className="path-body">
                A regenerated plan is ready. Accepting replaces the current faith-track draft (sermon
                notes are kept).
              </p>
              <div className="weekly-plan__toolbar">
                <Button onClick={() => void acceptPendingAi()}>Accept regenerated plan</Button>
                <Button variant="ghost" onClick={() => setPendingAiPlan(null)}>
                  Keep current draft
                </Button>
              </div>
            </div>
          ) : null}
          <div className="weekly-plan__grid">
            <label className="path-field weekly-plan__span-2">
              <span>Weekly Biblical theme</span>
              <input
                value={plan.biblical.weeklyTheme}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: { ...p.biblical, weeklyTheme: e.target.value },
                    aiMeta: p.aiMeta
                      ? { ...p.aiMeta, generationSource: p.aiMeta.generationSource === 'manual' ? 'manual' : 'ai-edited' }
                      : p.aiMeta,
                  }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Central principle</span>
              <input
                value={plan.biblical.centralPrinciple}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: { ...p.biblical, centralPrinciple: e.target.value },
                  }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Weekly application / practice</span>
              <input
                value={plan.biblical.weeklyPractice}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: { ...p.biblical, weeklyPractice: e.target.value },
                  }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Act of obedience</span>
              <input
                value={plan.biblical.actOfObedience}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: { ...p.biblical, actOfObedience: e.target.value },
                  }))
                }
              />
            </label>
            <label className="path-field">
              <span>Core Scripture</span>
              <input
                value={plan.biblical.coreScripture}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: { ...p.biblical, coreScripture: e.target.value },
                  }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Why this matters</span>
              <textarea
                rows={2}
                value={plan.biblical.whyThisMatters || plan.biblical.sermonSummary}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: {
                      ...p.biblical,
                      whyThisMatters: e.target.value,
                      sermonSummary: e.target.value,
                    },
                  }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Supporting Scriptures (comma-separated)</span>
              <input
                value={plan.biblical.supportingScriptures.join(', ')}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: {
                      ...p.biblical,
                      supportingScriptures: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Watch for</span>
              <input
                value={(plan.biblical.watchFor ?? []).join(' · ')}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: {
                      ...p.biblical,
                      watchFor: e.target.value
                        .split('·')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Weekly prayer</span>
              <textarea
                rows={2}
                value={plan.biblical.weeklyPrayer || ''}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: { ...p.biblical, weeklyPrayer: e.target.value },
                  }))
                }
              />
            </label>
          </div>

          <div className="weekly-plan__regen path-surface">
            <h3 className="weekly-plan__h3">Regenerate</h3>
            <label className="path-field">
              <span>What should change?</span>
              <textarea
                rows={2}
                placeholder="Make practices more challenging, less journaling, focus more on a passage…"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
              />
            </label>
            <div className="weekly-plan__toolbar">
              <Button
                variant="ghost"
                onClick={() => void generateBiblicalPlan({ regenerate: true })}
                disabled={generating || !notesAreMeaningful(plan.church.sermonNotes)}
              >
                Regenerate complete plan
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (!window.confirm('Discard the generated Biblical plan fields?')) return;
                  patch((p) => ({
                    ...p,
                    biblical: {
                      ...p.biblical,
                      weeklyTheme: '',
                      centralPrinciple: '',
                      weeklyPractice: '',
                      actOfObedience: '',
                      aiProposal: null,
                    },
                    aiMeta: {
                      generationSource: 'manual',
                      generatedAt: null,
                      promptVersion: null,
                      modelUsed: null,
                    },
                  }));
                  setLastAiPlan(null);
                }}
              >
                Discard generated result
              </Button>
            </div>
            {aiError ? <p className="weekly-plan__error">{aiError}</p> : null}
          </div>

          {plan.biblical.days.map((day, index) => (
            <div key={day.id} className="weekly-plan__day">
              <p className="weekly-plan__day-label">
                {shortWeekdayLabel(day.dayNumber)} · Day {day.dayNumber}
                {day.dayNumber === 7 ? ' · Sabbath reflection' : ''}
              </p>
              {day.dayNumber === 7 ? (
                <label className="path-field">
                  <span>Saturday Sabbath / reflection prompt</span>
                  <input
                    value={day.eveningPrompt}
                    onChange={(e) =>
                      patch((p) => {
                        const days = [...p.biblical.days];
                        days[index] = { ...day, eveningPrompt: e.target.value };
                        return { ...p, biblical: { ...p.biblical, days } };
                      })
                    }
                    placeholder="What did God show me this week?"
                  />
                </label>
              ) : (
                <div className="weekly-plan__grid">
                  <label className="path-field">
                    <span>Focus</span>
                    <input
                      value={day.focus}
                      onChange={(e) =>
                        patch((p) => {
                          const days = [...p.biblical.days];
                          days[index] = { ...day, focus: e.target.value };
                          return { ...p, biblical: { ...p.biblical, days } };
                        })
                      }
                    />
                  </label>
                  <label className="path-field">
                    <span>Scripture</span>
                    <input
                      value={day.scripture}
                      onChange={(e) =>
                        patch((p) => {
                          const days = [...p.biblical.days];
                          days[index] = { ...day, scripture: e.target.value };
                          return { ...p, biblical: { ...p.biblical, days } };
                        })
                      }
                    />
                  </label>
                  <label className="path-field weekly-plan__span-2">
                    <span>Practice</span>
                    <input
                      value={day.practice}
                      onChange={(e) =>
                        patch((p) => {
                          const days = [...p.biblical.days];
                          days[index] = { ...day, practice: e.target.value };
                          return { ...p, biblical: { ...p.biblical, days } };
                        })
                      }
                    />
                  </label>
                  <label className="path-field">
                    <span>Morning</span>
                    <input
                      value={day.morningPrompt}
                      onChange={(e) =>
                        patch((p) => {
                          const days = [...p.biblical.days];
                          days[index] = { ...day, morningPrompt: e.target.value };
                          return { ...p, biblical: { ...p.biblical, days } };
                        })
                      }
                    />
                  </label>
                  <label className="path-field">
                    <span>Midday</span>
                    <input
                      value={day.middayPrompt}
                      onChange={(e) =>
                        patch((p) => {
                          const days = [...p.biblical.days];
                          days[index] = { ...day, middayPrompt: e.target.value };
                          return { ...p, biblical: { ...p.biblical, days } };
                        })
                      }
                    />
                  </label>
                  <label className="path-field weekly-plan__span-2">
                    <span>Evening</span>
                    <input
                      value={day.eveningPrompt}
                      onChange={(e) =>
                        patch((p) => {
                          const days = [...p.biblical.days];
                          days[index] = { ...day, eveningPrompt: e.target.value };
                          return { ...p, biblical: { ...p.biblical, days } };
                        })
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          ))}

          <div className="weekly-plan__toolbar">
            <Button
              onClick={() =>
                patch((p) => ({
                  ...p,
                  biblical: { ...p.biblical, approved: true },
                }))
              }
            >
              Approve faith track
            </Button>
            <Button onClick={() => setStep(3)}>Continue</Button>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </section>
      )}

      {step === 3 && plan && (
        <TrainingPlanStep
          plan={plan}
          patch={patch}
          onContinue={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">5. Work plan</h2>
          <p className="weekly-plan__note">Three meaningful outcomes. Assign focus across Monday–Friday.</p>
          <div className="weekly-plan__grid">
            {plan.work.weeklyOutcomes.map((outcome, index) => (
              <label key={outcome.id} className="path-field weekly-plan__span-2">
                <span>Weekly outcome {index + 1}</span>
                <input
                  value={outcome.title}
                  onChange={(e) =>
                    patch((p) => {
                      const weeklyOutcomes = [...p.work.weeklyOutcomes];
                      weeklyOutcomes[index] = { ...outcome, title: e.target.value };
                      return { ...p, work: { ...p.work, weeklyOutcomes } };
                    })
                  }
                />
              </label>
            ))}
          </div>
          <h3 className="weekly-plan__h3">Daily actions</h3>
          {plan.work.days.map((day, index) => (
            <div key={day.id} className="weekly-plan__day">
              <p className="weekly-plan__day-label">{shortWeekdayLabel(day.dayNumber)}</p>
              <div className="weekly-plan__grid">
                <label className="path-field weekly-plan__span-2">
                  <span>Key action</span>
                  <input
                    value={day.title}
                    onChange={(e) =>
                      patch((p) => {
                        const days = [...p.work.days];
                        days[index] = { ...day, title: e.target.value };
                        return { ...p, work: { ...p.work, days } };
                      })
                    }
                  />
                </label>
                <label className="path-field">
                  <span>Supports outcome</span>
                  <select
                    value={day.outcomeId ?? ''}
                    onChange={(e) =>
                      patch((p) => {
                        const days = [...p.work.days];
                        days[index] = { ...day, outcomeId: e.target.value || null };
                        return { ...p, work: { ...p.work, days } };
                      })
                    }
                  >
                    <option value="">—</option>
                    {plan.work.weeklyOutcomes.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title || `Outcome ${o.order + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
          <div className="weekly-plan__toolbar">
            <Button
              onClick={() => {
                patch((p) => {
                  if (p.work.days.some((d) => d.dayNumber === 2 && d.title)) return p;
                  const days = [...p.work.days];
                  for (let i = 2; i <= 6; i += 1) {
                    if (!days.some((d) => d.dayNumber === i)) {
                      days.push({
                        id: newId('wday'),
                        date: p.physical.days.find((d) => d.dayNumber === i)?.date ?? p.weekStartDate,
                        dayNumber: i,
                        title: '',
                        outcomeId: p.work.weeklyOutcomes[0]?.id ?? null,
                        priority: 1,
                        status: 'open',
                        notes: '',
                        optional: false,
                      });
                    }
                  }
                  return { ...p, work: { ...p.work, days, approved: true } };
                });
              }}
            >
              Approve work track
            </Button>
            <Button onClick={() => setStep(5)}>Continue to review</Button>
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">6. Review & activate</h2>
          <div className="weekly-plan__review">
            <div>
              <h3 className="weekly-plan__h3">Faith</h3>
              <p className="path-body">
                <strong>{plan.biblical.weeklyTheme || 'Theme unset'}</strong>
              </p>
              <p className="path-body">{plan.biblical.coreScripture}</p>
              <p className="path-body">{plan.biblical.weeklyPractice}</p>
              <p className="path-body">Act of obedience: {plan.biblical.actOfObedience || '—'}</p>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Edit faith plan
              </Button>
            </div>
            <div>
              <h3 className="weekly-plan__h3">Training</h3>
              <ul className="weekly-plan__review-list">
                {plan.physical.days.map((d) => {
                  const blocks = normalizePhysicalDay(d).scheduledWorkouts;
                  const label =
                    blocks.length > 0
                      ? d.workoutName ||
                        blocks
                          .map(
                            (b) =>
                              templates.find((t) => t.id === b.workoutTemplateId)?.name ?? 'Workout',
                          )
                          .join(' + ')
                      : d.type.replaceAll('_', ' ');
                  return (
                    <li key={d.id}>
                      {shortWeekdayLabel(d.dayNumber)}: {label}
                    </li>
                  );
                })}
              </ul>
              <Button variant="ghost" onClick={() => setStep(3)}>
                Edit training plan
              </Button>
            </div>
            <div>
              <h3 className="weekly-plan__h3">Work</h3>
              <ul className="weekly-plan__review-list">
                {plan.work.weeklyOutcomes
                  .filter((o) => o.title.trim())
                  .map((o) => (
                    <li key={o.id}>{o.title}</li>
                  ))}
              </ul>
              <Button variant="ghost" onClick={() => setStep(4)}>
                Edit work plan
              </Button>
            </div>
          </div>
          <div className="weekly-plan__toolbar">
            <Button onClick={() => void activate()} disabled={saving || plan.status === 'active'}>
              {plan.status === 'active' ? 'Week active' : 'Activate week'}
            </Button>
            <Button variant="ghost" onClick={() => void saveDraft()} disabled={saving}>
              Save draft
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

export function startNextWeekPath(): string {
  return `/plan/week/${nextSundayStart()}`;
}

export function startFollowingWeekPath(): string {
  return `/plan/week/${followingSundayStart()}`;
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  followingSundayStart,
  nextSundayStart,
  shortWeekdayLabel,
} from '../../domain/calendar/week';
import { readPhysicalPlan } from '../../domain/physical/planCatalog';
import { newId } from '../../domain/physical/store';
import { activateAndSyncWeeklyPlan } from '../../domain/weeklyPlan/activate';
import {
  applyBiblicalDefaultsFromChurch,
  suggestPhysicalSchedule,
} from '../../domain/weeklyPlan/factory';
import { ensureWeeklyPlanByRef, saveWeeklyPlan } from '../../domain/weeklyPlan/store';
import type { PhysicalDayType, WeeklyPlan } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';
import './WeeklyPlanWorkspace.css';

const STEPS = [
  'Sermon',
  'Weekly biblical focus',
  'Faith plan',
  'Training plan',
  'Work plan',
  'Review & activate',
] as const;

const PHYSICAL_TYPES: Array<{ value: PhysicalDayType; label: string }> = [
  { value: 'workout', label: 'Workout' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'optional_movement', label: 'Optional movement' },
  { value: 'rest', label: 'Full rest' },
  { value: 'unscheduled', label: 'Unscheduled' },
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
  const navigate = useNavigate();
  const ref = weekId || weekStartParam || nextSundayStart();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const templates = useMemo(() => readPhysicalPlan().templates, []);

  const load = useCallback(async () => {
    try {
      const next = await ensureWeeklyPlanByRef(ref);
      setPlan(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ref]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (updater: (prev: WeeklyPlan) => WeeklyPlan) => {
    setPlan((prev) => (prev ? updater(prev) : prev));
    setMessage(null);
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
        {message ? <p className="weekly-plan__status">{message}</p> : null}
      </div>

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
              <span>Sermon title</span>
              <input
                value={plan.church.sermonTitle}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, sermonTitle: e.target.value } }))
                }
              />
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
          </div>
          <div className="weekly-plan__toolbar">
            <Button onClick={() => setStep(1)}>Continue to weekly biblical focus</Button>
            <Button variant="ghost" onClick={() => void saveDraft()} disabled={saving}>
              Save draft
            </Button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">2. Weekly biblical focus</h2>
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
            Review all content against Scripture and your own judgment before activating.
          </p>
          <div className="weekly-plan__grid">
            <label className="path-field weekly-plan__span-2">
              <span>Weekly biblical theme</span>
              <input
                value={plan.biblical.weeklyTheme}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: { ...p.biblical, weeklyTheme: e.target.value },
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

      {step === 3 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">4. Training plan</h2>
          <p className="weekly-plan__note">
            Assign workouts from your catalog. Saturday defaults to Sabbath / full rest. Training is
            not an extension of the sermon.
          </p>
          <div className="weekly-plan__toolbar">
            <Button
              variant="ghost"
              onClick={() => patch((p) => suggestPhysicalSchedule(p, p.physical.desiredWorkoutCount))}
            >
              Suggest 4-day rhythm
            </Button>
          </div>
          {plan.physical.days.map((day, index) => (
            <div key={day.id} className="weekly-plan__day">
              <p className="weekly-plan__day-label">{shortWeekdayLabel(day.dayNumber)}</p>
              <div className="weekly-plan__grid">
                <label className="path-field">
                  <span>Day type</span>
                  <select
                    value={day.type}
                    onChange={(e) => {
                      const type = e.target.value as PhysicalDayType;
                      patch((p) => {
                        const days = [...p.physical.days];
                        days[index] = {
                          ...day,
                          type,
                          workoutTemplateId: type === 'workout' ? day.workoutTemplateId : null,
                          workoutName:
                            type === 'rest'
                              ? 'Sabbath / Full Rest'
                              : type === 'workout'
                                ? day.workoutName
                                : type.replaceAll('_', ' '),
                          isRequired: type === 'workout',
                        };
                        return { ...p, physical: { ...p.physical, days } };
                      });
                    }}
                  >
                    {PHYSICAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="path-field">
                  <span>Workout template</span>
                  <select
                    value={day.workoutTemplateId ?? ''}
                    disabled={day.type !== 'workout'}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      const tmpl = templates.find((t) => t.id === id);
                      patch((p) => {
                        const days = [...p.physical.days];
                        days[index] = {
                          ...day,
                          workoutTemplateId: id,
                          workoutName: tmpl?.name ?? '',
                          type: id ? 'workout' : day.type,
                        };
                        return { ...p, physical: { ...p.physical, days } };
                      });
                    }}
                  >
                    <option value="">—</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
          <div className="weekly-plan__toolbar">
            <Button
              onClick={() =>
                patch((p) => ({ ...p, physical: { ...p.physical, approved: true } }))
              }
            >
              Approve training track
            </Button>
            <Button onClick={() => setStep(4)}>Continue</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        </section>
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
                {plan.physical.days.map((d) => (
                  <li key={d.id}>
                    {shortWeekdayLabel(d.dayNumber)}:{' '}
                    {d.type === 'workout' ? d.workoutName || 'Workout' : d.type.replaceAll('_', ' ')}
                  </li>
                ))}
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

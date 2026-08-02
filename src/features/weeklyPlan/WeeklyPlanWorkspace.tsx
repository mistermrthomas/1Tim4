import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  followingSundayStart,
  nextSundayStart,
  shortWeekdayLabel,
  weekRangeFor,
} from '../../domain/calendar/week';
import { readPhysicalPlan } from '../../domain/physical/planCatalog';
import { newId } from '../../domain/physical/store';
import { activateAndSyncWeeklyPlan } from '../../domain/weeklyPlan/activate';
import {
  applyBiblicalDefaultsFromChurch,
  suggestPhysicalSchedule,
} from '../../domain/weeklyPlan/factory';
import { ensureWeeklyPlan, saveWeeklyPlan } from '../../domain/weeklyPlan/store';
import type { PhysicalDayType, WeeklyPlan } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';
import './WeeklyPlanWorkspace.css';

const STEPS = [
  'Church notes',
  'Personal response',
  'Biblical plan',
  'Physical plan',
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

export function WeeklyPlanWorkspace() {
  const { weekStart: weekStartParam } = useParams();
  const navigate = useNavigate();
  const weekStart = weekStartParam || nextSundayStart();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const templates = useMemo(() => readPhysicalPlan().templates, []);

  const load = useCallback(async () => {
    try {
      const next = await ensureWeeklyPlan(weekStart);
      setPlan(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [weekStart]);

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

  const range = weekRangeFor(new Date(`${plan.weekStartDate}T12:00:00`));

  return (
    <div className="weekly-plan path-fade-in">
      <header className="weekly-plan__hero">
        <p className="path-eyebrow">Sunday planning</p>
        <h1 className="path-display weekly-plan__title">Weekly kickoff</h1>
        <p className="path-body weekly-plan__lede">
          Turn church notes, physical training, and work priorities into one intentional
          Sunday–Saturday plan. Tracks stay independent.
        </p>
        <p className="weekly-plan__meta">
          Week of {plan.weekStartDate} → {plan.weekEndDate} · Status: {plan.status}
        </p>
      </header>

      <div className="weekly-plan__toolbar">
        <Button variant="ghost" onClick={() => void saveDraft()} disabled={saving}>
          Save draft
        </Button>
        <Link className="path-btn path-btn--ghost" to="/today">
          Back to Today
        </Link>
        <Link className="path-btn path-btn--ghost" to="/plan">
          Manage templates
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
          <h2 className="weekly-plan__h2">1. Church notes</h2>
          <p className="weekly-plan__note">
            Paste or write anything you captured during church. Rough notes are fine.
          </p>
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
              <span>Speaker (optional)</span>
              <input
                value={plan.church.speaker}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, speaker: e.target.value } }))
                }
              />
            </label>
            <label className="path-field">
              <span>Church or series (optional)</span>
              <input
                value={plan.church.churchOrSeries}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    church: { ...p.church, churchOrSeries: e.target.value },
                  }))
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
              <span>Sermon link (optional)</span>
              <input
                value={plan.church.sermonUrl}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, sermonUrl: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Sermon notes</span>
              <textarea
                rows={8}
                placeholder="Paste or write anything you captured during church."
                value={plan.church.sermonNotes}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, sermonNotes: e.target.value } }))
                }
              />
            </label>
          </div>
          <Button onClick={() => setStep(1)}>Continue</Button>
        </section>
      )}

      {step === 1 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">2. Personal response</h2>
          <div className="weekly-plan__grid">
            <label className="path-field weekly-plan__span-2">
              <span>What stood out most?</span>
              <textarea
                rows={3}
                value={plan.church.stoodOutMost}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, stoodOutMost: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Why do you think it stood out?</span>
              <textarea
                rows={3}
                value={plan.church.whyItStoodOut}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, whyItStoodOut: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Where could this change your behavior this week?</span>
              <textarea
                rows={3}
                value={plan.church.behaviorChange}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, behaviorChange: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Specific relationship, decision, habit, or situation? (optional)</span>
              <input
                value={plan.church.additionalContext}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    church: { ...p.church, additionalContext: e.target.value },
                  }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Anything you disagreed with or are uncertain about? (optional)</span>
              <input
                value={plan.church.uncertainty}
                onChange={(e) =>
                  patch((p) => ({ ...p, church: { ...p.church, uncertainty: e.target.value } }))
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
              Build biblical draft
            </Button>
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">3. Biblical plan</h2>
          <p className="weekly-plan__note">
            Review all generated content against Scripture and your own judgment before activating
            the plan. AI synthesis arrives in a later pass — this draft is editable now.
          </p>
          <div className="weekly-plan__grid">
            <label className="path-field weekly-plan__span-2">
              <span>Weekly theme</span>
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
              <span>Measurable weekly practice</span>
              <input
                placeholder="When interrupted, pause and ask one clarifying question."
                value={plan.biblical.weeklyPractice}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: { ...p.biblical, weeklyPractice: e.target.value },
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
            <label className="path-field">
              <span>Sermon summary</span>
              <input
                value={plan.biblical.sermonSummary}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    biblical: { ...p.biblical, sermonSummary: e.target.value },
                  }))
                }
              />
            </label>
          </div>

          {plan.biblical.days.map((day, index) => (
            <div key={day.id} className="weekly-plan__day">
              <p className="weekly-plan__day-label">
                {shortWeekdayLabel(day.dayNumber)} · Day {day.dayNumber}
                {!day.isRequired ? ' · Sabbath' : ''}
              </p>
              {day.dayNumber === 7 ? (
                <p className="weekly-plan__note">No required structured lesson.</p>
              ) : (
                <div className="weekly-plan__grid">
                  <label className="path-field">
                    <span>Title</span>
                    <input
                      value={day.title}
                      onChange={(e) =>
                        patch((p) => {
                          const days = [...p.biblical.days];
                          days[index] = { ...day, title: e.target.value };
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
                  <label className="path-field weekly-plan__span-2">
                    <span>Observable practice</span>
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
                  <label className="path-field weekly-plan__span-2">
                    <span>Teaching</span>
                    <textarea
                      rows={2}
                      value={day.teaching}
                      onChange={(e) =>
                        patch((p) => {
                          const days = [...p.biblical.days];
                          days[index] = { ...day, teaching: e.target.value };
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
              onClick={() => {
                patch((p) => ({
                  ...p,
                  biblical: { ...p.biblical, approved: true },
                }));
                setStep(3);
              }}
            >
              Approve biblical track
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">4. Physical plan</h2>
          <p className="weekly-plan__note">
            Uses existing workout templates. Saturday defaults to Sabbath / Full Rest. AI scheduling
            will propose later — assign templates manually or apply the suggested rhythm.
          </p>
          <div className="weekly-plan__toolbar">
            <Button
              variant="ghost"
              onClick={() => patch((p) => suggestPhysicalSchedule(p, p.physical.desiredWorkoutCount))}
            >
              Suggest 4-day rhythm
            </Button>
            <label className="path-field">
              <span>Desired workouts</span>
              <input
                type="number"
                min={1}
                max={6}
                value={plan.physical.desiredWorkoutCount}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    physical: {
                      ...p.physical,
                      desiredWorkoutCount: Number(e.target.value) || 4,
                    },
                  }))
                }
              />
            </label>
          </div>

          {plan.physical.days.map((day, index) => (
            <div key={day.id} className="weekly-plan__phys-row">
              <p className="weekly-plan__day-label">{shortWeekdayLabel(day.dayNumber)}</p>
              <label className="path-field">
                <span>Type</span>
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
                <span>Template</span>
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
                        isRequired: Boolean(id),
                      };
                      return { ...p, physical: { ...p.physical, days } };
                    });
                  }}
                >
                  <option value="">None</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}

          <div className="weekly-plan__toolbar">
            <Button
              onClick={() => {
                patch((p) => ({ ...p, physical: { ...p.physical, approved: true } }));
                setStep(4);
              }}
            >
              Approve physical track
            </Button>
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="weekly-plan__section path-surface">
          <h2 className="weekly-plan__h2">5. Work plan</h2>
          <p className="weekly-plan__note">
            Keep this to three weekly outcomes. Saturday stays clear of required work by default.
          </p>
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
            <label className="path-field weekly-plan__span-2">
              <span>Difficult or avoided task</span>
              <input
                value={plan.work.avoidedTask}
                onChange={(e) =>
                  patch((p) => ({ ...p, work: { ...p.work, avoidedTask: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Deadlines / meetings</span>
              <textarea
                rows={2}
                value={plan.work.deadlines}
                onChange={(e) =>
                  patch((p) => ({ ...p, work: { ...p.work, deadlines: e.target.value } }))
                }
              />
            </label>
            <label className="path-field weekly-plan__span-2">
              <span>Constraints or travel</span>
              <input
                value={plan.work.constraints}
                onChange={(e) =>
                  patch((p) => ({ ...p, work: { ...p.work, constraints: e.target.value } }))
                }
              />
            </label>
          </div>

          <p className="weekly-plan__h2" style={{ marginTop: '0.5rem' }}>
            Daily actions
          </p>
          {range.days
            .filter((d) => d.dayNumber !== 7)
            .map((d) => {
              const actions = plan.work.days.filter((a) => a.date === d.dateKey);
              return (
                <div key={d.dateKey} className="weekly-plan__day">
                  <p className="weekly-plan__day-label">{shortWeekdayLabel(d.dayNumber)}</p>
                  {actions.map((action) => (
                    <label key={action.id} className="path-field">
                      <span>Key action</span>
                      <input
                        value={action.title}
                        onChange={(e) =>
                          patch((p) => ({
                            ...p,
                            work: {
                              ...p.work,
                              days: p.work.days.map((item) =>
                                item.id === action.id ? { ...item, title: e.target.value } : item,
                              ),
                            },
                          }))
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="weekly-plan__step-btn"
                    onClick={() =>
                      patch((p) => ({
                        ...p,
                        work: {
                          ...p.work,
                          days: [
                            ...p.work.days,
                            {
                              id: newId('wday'),
                              date: d.dateKey,
                              dayNumber: d.dayNumber,
                              title: '',
                              outcomeId: p.work.weeklyOutcomes[0]?.id ?? null,
                              priority: actions.length + 1,
                              status: 'open',
                              notes: '',
                              optional: false,
                            },
                          ],
                        },
                      }))
                    }
                  >
                    Add action
                  </button>
                </div>
              );
            })}

          <div className="weekly-plan__toolbar">
            <Button
              onClick={() => {
                patch((p) => ({ ...p, work: { ...p.work, approved: true } }));
                setStep(5);
              }}
            >
              Approve work track
            </Button>
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
            <div className="weekly-plan__review-block">
              <h3>Biblical</h3>
              <p className="path-body">{plan.biblical.weeklyTheme || '—'}</p>
              <p className="weekly-plan__note">{plan.biblical.coreScripture}</p>
              <p className="weekly-plan__note">{plan.biblical.weeklyPractice}</p>
              <ul>
                {plan.biblical.days
                  .filter((d) => d.enabled && d.dayNumber <= 6)
                  .map((d) => (
                    <li key={d.id}>
                      {shortWeekdayLabel(d.dayNumber)}: {d.title}
                    </li>
                  ))}
              </ul>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Edit biblical
              </Button>
            </div>
            <div className="weekly-plan__review-block">
              <h3>Physical</h3>
              <ul>
                {plan.physical.days.map((d) => (
                  <li key={d.id}>
                    {shortWeekdayLabel(d.dayNumber)}:{' '}
                    {d.type === 'workout' ? d.workoutName || 'Workout' : d.type.replaceAll('_', ' ')}
                  </li>
                ))}
              </ul>
              <Button variant="ghost" onClick={() => setStep(3)}>
                Edit physical
              </Button>
            </div>
            <div className="weekly-plan__review-block">
              <h3>Work</h3>
              <ul>
                {plan.work.weeklyOutcomes
                  .filter((o) => o.title.trim())
                  .map((o) => (
                    <li key={o.id}>{o.title}</li>
                  ))}
              </ul>
              <Button variant="ghost" onClick={() => setStep(4)}>
                Edit work
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

/** Path to plan the upcoming Sunday week (or today when already Sunday). */
export function startNextWeekPath(): string {
  return `/plan/week/${nextSundayStart()}`;
}

/** Path to draft the week after the current Sunday boundary. */
export function startFollowingWeekPath(): string {
  return `/plan/week/${followingSundayStart()}`;
}

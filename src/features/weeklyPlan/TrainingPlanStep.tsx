import { useEffect, useMemo, useState } from 'react';
import { applyTrainingPlanToWeeklyPlan } from '../../domain/aiTraining/applyTrainingPlan';
import {
  buildTrainingCatalogContext,
  intakeReadyForGeneration,
} from '../../domain/aiTraining/catalogContext';
import { requestTrainingPlan, TrainingPlanClientError } from '../../domain/aiTraining/client';
import { readAiTrainingSettings } from '../../domain/aiTraining/settings';
import { shortWeekdayLabel } from '../../domain/calendar/week';
import { readPhysicalPlan } from '../../domain/physical/planCatalog';
import { buildTrainingWeekSummaryFromHistory } from '../../domain/physical/trainingWeekSummary';
import { addDays } from '../../domain/calendar/week';
import {
  addWorkoutToDay,
  classificationLabel,
  moveWorkoutInDay,
  normalizePhysicalDay,
  removeWorkoutFromDay,
  templateClassification,
} from '../../domain/weeklyPlan/physicalWorkouts';
import { suggestPhysicalSchedule } from '../../domain/weeklyPlan/factory';
import type {
  PhysicalDayType,
  TrainingCoachingIntake,
  TrainingPrimaryGoal,
  WeeklyPlan,
} from '../../domain/weeklyPlan/types';
import { emptyTrainingCoachingIntake } from '../../domain/weeklyPlan/types';
import { Button } from '../../ui/Button';

const PHYSICAL_TYPES: Array<{ value: PhysicalDayType; label: string }> = [
  { value: 'workout', label: 'Workout' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'optional_movement', label: 'Optional movement' },
  { value: 'rest', label: 'Full rest' },
  { value: 'unscheduled', label: 'Unscheduled' },
];

const GOAL_OPTIONS: Array<{ value: TrainingPrimaryGoal; label: string }> = [
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'lose_fat', label: 'Lose fat' },
  { value: 'maintain_consistency', label: 'Maintain consistency' },
  { value: 'improve_strength', label: 'Improve strength' },
  { value: 'improve_mobility', label: 'Improve mobility' },
  { value: 'recover_reduce_fatigue', label: 'Recover and reduce fatigue' },
  { value: 'get_back_on_track', label: 'Get back on track' },
  { value: 'custom', label: 'Custom' },
];

const CONSTRAINT_OPTIONS = [
  'Travel',
  'Limited time',
  'Soreness',
  'Poor sleep',
  'Shoulder discomfort',
  'No Bowflex access',
  'Need a lighter week',
  'Want more core work',
  'Want more walking',
  'Other',
];

const DAY_OPTIONS = [
  { dayNumber: 1, label: 'Sun' },
  { dayNumber: 2, label: 'Mon' },
  { dayNumber: 3, label: 'Tue' },
  { dayNumber: 4, label: 'Wed' },
  { dayNumber: 5, label: 'Thu' },
  { dayNumber: 6, label: 'Fri' },
  { dayNumber: 7, label: 'Sat' },
];

type CoachPhase = 'goal' | 'availability' | 'last_week' | 'constraints' | 'review';

const PHASES: CoachPhase[] = ['goal', 'availability', 'last_week', 'constraints', 'review'];

export function TrainingPlanStep({
  plan,
  patch,
  onContinue,
  onBack,
}: {
  plan: WeeklyPlan;
  patch: (fn: (p: WeeklyPlan) => WeeklyPlan) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const templates = useMemo(() => readPhysicalPlan().templates, []);
  const [mode, setMode] = useState<'coach' | 'manual'>(() =>
    plan.physical.aiProposal || plan.physical.coachingIntake ? 'coach' : 'coach',
  );
  const [phase, setPhase] = useState<CoachPhase>(() =>
    plan.physical.aiProposal ||
    (plan.physical.days.some((d) => normalizePhysicalDay(d).scheduledWorkouts.length > 0) &&
      plan.physical.coachingIntake)
      ? 'review'
      : 'goal',
  );
  const [intake, setIntake] = useState<TrainingCoachingIntake>(
    () => plan.physical.coachingIntake ?? emptyTrainingCoachingIntake(),
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState('');
  const [historyPrefillNote, setHistoryPrefillNote] = useState<string | null>(null);

  useEffect(() => {
    const priorStart = addDays(plan.weekStartDate, -7);
    const summary = buildTrainingWeekSummaryFromHistory(priorStart);
    if (summary.source === 'manual' && summary.completedWorkouts === 0) return;

    setIntake((prev) => {
      if (prev.lastWeek.plannedCount != null || prev.lastWeek.completedCount != null) return prev;
      return {
        ...prev,
        lastWeek: {
          ...prev.lastWeek,
          plannedCount: summary.plannedWorkouts || null,
          completedCount: summary.completedWorkouts || null,
          feltStrong: prev.lastWeek.feltStrong || summary.strongWorkouts.join(', '),
          painDiscomfort:
            prev.lastWeek.painDiscomfort || summary.painOrCautionNotes.slice(0, 3).join('; '),
        },
        priorWeekSummary: summary,
      };
    });
    setHistoryPrefillNote(
      `Prefilled from last week’s history (${summary.completedWorkouts} completed of ${summary.plannedWorkouts || '—'} planned). Confirm or edit.`,
    );
  }, [plan.weekStartDate]);

  const persistIntake = (next: TrainingCoachingIntake) => {
    setIntake(next);
    patch((p) => ({
      ...p,
      physical: { ...p.physical, coachingIntake: next },
    }));
  };

  const generate = async (opts?: { regenerate?: boolean }) => {
    if (!intakeReadyForGeneration(intake)) {
      setError('Finish the coaching check-in before generating a plan.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const settings = await readAiTrainingSettings();
      const catalogContext = buildTrainingCatalogContext(plan.weekStartDate);
      const result = await requestTrainingPlan({
        weekStartDate: plan.weekStartDate,
        intake: {
          ...intake,
          priorWeekSummary: catalogContext.priorWeekSummary,
        },
        planningPrompt: settings.planningPrompt,
        model: settings.model,
        catalogContext,
        adjustmentInstruction: opts?.regenerate ? adjustment.trim() || undefined : undefined,
        currentPlan: opts?.regenerate ? plan.physical.aiProposal ?? undefined : undefined,
      });
      patch((p) =>
        applyTrainingPlanToWeeklyPlan(p, result.plan, {
          modelUsed: result.modelUsed,
          promptVersion: settings.promptVersion,
        }),
      );
      setPhase('review');
      setAdjustment('');
    } catch (e) {
      if (e instanceof TrainingPlanClientError) setError(e.message);
      else setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const phaseIndex = PHASES.indexOf(phase);

  if (mode === 'manual') {
    return (
      <section className="weekly-plan__section path-surface">
        <h2 className="weekly-plan__h2">4. Training plan</h2>
        <p className="weekly-plan__note">
          Manual mode — assign workout templates yourself. AI coaching remains available anytime.
        </p>
        <div className="weekly-plan__toolbar">
          <Button variant="ghost" onClick={() => setMode('coach')}>
            Back to AI coaching
          </Button>
          <Button
            variant="ghost"
            onClick={() => patch((p) => suggestPhysicalSchedule(p, p.physical.desiredWorkoutCount))}
          >
            Suggest 4-day rhythm
          </Button>
        </div>
        <ManualDayEditors plan={plan} patch={patch} templates={templates} />
        <div className="weekly-plan__toolbar">
          <Button
            onClick={() =>
              patch((p) => ({ ...p, physical: { ...p.physical, approved: true } }))
            }
          >
            Approve training track
          </Button>
          <Button onClick={onContinue}>Continue</Button>
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="weekly-plan__section path-surface">
      <h2 className="weekly-plan__h2">4. Training plan</h2>
      <p className="weekly-plan__note">
        Short Sunday coaching check-in. Path uses your goals, availability, last week, catalog, and
        known exercise settings — then you review before activating.
      </p>

      <div className="weekly-plan__toolbar">
        <Button variant="ghost" onClick={() => setMode('manual')}>
          Plan manually instead
        </Button>
      </div>

      {phase !== 'review' ? (
        <div className="weekly-plan__coach-phases" aria-label="Coaching steps">
          {PHASES.filter((p) => p !== 'review').map((p, i) => (
            <button
              key={p}
              type="button"
              className={`weekly-plan__step-btn${phase === p ? ' weekly-plan__step-btn--active' : ''}`}
              onClick={() => setPhase(p)}
            >
              {i + 1}. {p === 'goal' ? 'Goal' : p === 'availability' ? 'Availability' : p === 'last_week' ? 'Last week' : 'Constraints'}
            </button>
          ))}
        </div>
      ) : null}

      {phase === 'goal' ? (
        <div className="weekly-plan__coach-block">
          <h3 className="weekly-plan__h3">What are you trying to accomplish this week?</h3>
          <label className="path-field">
            <span>Primary goal</span>
            <select
              value={intake.primaryGoal}
              onChange={(e) =>
                persistIntake({
                  ...intake,
                  primaryGoal: e.target.value as TrainingPrimaryGoal,
                })
              }
            >
              {GOAL_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="path-field">
            <span>Secondary goal (optional)</span>
            <select
              value={intake.secondaryGoal ?? ''}
              onChange={(e) =>
                persistIntake({
                  ...intake,
                  secondaryGoal: (e.target.value || null) as TrainingPrimaryGoal | null,
                })
              }
            >
              <option value="">—</option>
              {GOAL_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="path-field weekly-plan__span-2">
            <span>Optional context</span>
            <textarea
              rows={3}
              value={intake.customGoalContext}
              onChange={(e) => persistIntake({ ...intake, customGoalContext: e.target.value })}
              placeholder="Anything the coach should know about this week’s focus…"
            />
          </label>
        </div>
      ) : null}

      {phase === 'availability' ? (
        <div className="weekly-plan__coach-block">
          <h3 className="weekly-plan__h3">How many days can you realistically train?</h3>
          <div className="weekly-plan__chip-row">
            {([3, 4, 5, 6] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={`weekly-plan__chip${intake.trainingDaysCount === n ? ' weekly-plan__chip--on' : ''}`}
                onClick={() => persistIntake({ ...intake, trainingDaysCount: n })}
              >
                {n} days
              </button>
            ))}
          </div>
          <p className="weekly-plan__note">Preferred training days</p>
          <div className="weekly-plan__chip-row">
            {DAY_OPTIONS.map((d) => {
              const on = intake.preferredDays.includes(d.dayNumber);
              return (
                <button
                  key={d.dayNumber}
                  type="button"
                  className={`weekly-plan__chip${on ? ' weekly-plan__chip--on' : ''}`}
                  onClick={() => {
                    const preferredDays = on
                      ? intake.preferredDays.filter((x) => x !== d.dayNumber)
                      : [...intake.preferredDays, d.dayNumber].sort((a, b) => a - b);
                    persistIntake({ ...intake, preferredDays });
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <label className="path-field">
            <span>Minutes available per workout</span>
            <input
              type="number"
              min={15}
              max={120}
              value={intake.minutesPerWorkout}
              onChange={(e) =>
                persistIntake({
                  ...intake,
                  minutesPerWorkout: Number(e.target.value) || 45,
                })
              }
            />
          </label>
          <label className="path-field weekly-plan__check">
            <input
              type="checkbox"
              checked={intake.includeWalkingCardio}
              onChange={(e) =>
                persistIntake({ ...intake, includeWalkingCardio: e.target.checked })
              }
            />
            <span>Include walking or cardio</span>
          </label>
          <p className="weekly-plan__note">Must remain rest days</p>
          <div className="weekly-plan__chip-row">
            {DAY_OPTIONS.map((d) => {
              const on = intake.mustRestDays.includes(d.dayNumber);
              return (
                <button
                  key={d.dayNumber}
                  type="button"
                  className={`weekly-plan__chip${on ? ' weekly-plan__chip--on' : ''}`}
                  onClick={() => {
                    const mustRestDays = on
                      ? intake.mustRestDays.filter((x) => x !== d.dayNumber)
                      : [...intake.mustRestDays, d.dayNumber].sort((a, b) => a - b);
                    persistIntake({ ...intake, mustRestDays });
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {phase === 'last_week' ? (
        <div className="weekly-plan__coach-block">
          <h3 className="weekly-plan__h3">Review last week</h3>
          {historyPrefillNote ? <p className="weekly-plan__note">{historyPrefillNote}</p> : null}
          <div className="weekly-plan__grid">
            <label className="path-field">
              <span>Workouts planned</span>
              <input
                type="number"
                min={0}
                value={intake.lastWeek.plannedCount ?? ''}
                onChange={(e) =>
                  persistIntake({
                    ...intake,
                    lastWeek: {
                      ...intake.lastWeek,
                      plannedCount: e.target.value === '' ? null : Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="path-field">
              <span>Workouts completed</span>
              <input
                type="number"
                min={0}
                value={intake.lastWeek.completedCount ?? ''}
                onChange={(e) =>
                  persistIntake({
                    ...intake,
                    lastWeek: {
                      ...intake.lastWeek,
                      completedCount: e.target.value === '' ? null : Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            {(
              [
                ['feltStrong', 'What felt strong?'],
                ['tooEasy', 'What felt too easy?'],
                ['tooDifficult', 'What felt too difficult?'],
                ['painDiscomfort', 'Pain or discomfort?'],
                ['skippedWhy', 'What did you skip and why?'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="path-field weekly-plan__span-2">
                <span>{label}</span>
                <textarea
                  rows={2}
                  value={intake.lastWeek[key]}
                  onChange={(e) =>
                    persistIntake({
                      ...intake,
                      lastWeek: { ...intake.lastWeek, [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {phase === 'constraints' ? (
        <div className="weekly-plan__coach-block">
          <h3 className="weekly-plan__h3">Anything this week’s plan should account for?</h3>
          <div className="weekly-plan__chip-row">
            {CONSTRAINT_OPTIONS.map((tag) => {
              const on = intake.constraints.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`weekly-plan__chip${on ? ' weekly-plan__chip--on' : ''}`}
                  onClick={() => {
                    const constraints = on
                      ? intake.constraints.filter((t) => t !== tag)
                      : [...intake.constraints, tag];
                    persistIntake({ ...intake, constraints });
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <label className="path-field weekly-plan__span-2">
            <span>Other notes</span>
            <textarea
              rows={3}
              value={intake.constraintNotes}
              onChange={(e) => persistIntake({ ...intake, constraintNotes: e.target.value })}
            />
          </label>
        </div>
      ) : null}

      {phase === 'review' ? (
        <div className="weekly-plan__coach-block">
          {plan.physical.aiProposal ? (
            <>
              <h3 className="weekly-plan__h3">{plan.physical.aiProposal.weeklyTrainingGoal}</h3>
              <p className="weekly-plan__note">{plan.physical.aiProposal.coachingSummary}</p>
              <p className="weekly-plan__note">
                Progression: {plan.physical.aiProposal.progressionApproach}
              </p>
              <p className="weekly-plan__note">
                Recovery: {plan.physical.aiProposal.recoveryGuidance}
              </p>
              {(plan.physical.aiProposal.suggestedCatalogAdditions?.length ?? 0) > 0 ? (
                <div className="weekly-plan__pending">
                  <p className="weekly-plan__note">
                    Suggested catalog additions (not added automatically):
                  </p>
                  <ul>
                    {plan.physical.aiProposal.suggestedCatalogAdditions!.map((s) => (
                      <li key={s.proposedName}>
                        {s.proposedName} · {s.equipment} — {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="weekly-plan__note">Generate a plan from the coaching check-in, then edit.</p>
          )}

          <ManualDayEditors plan={plan} patch={patch} templates={templates} />

          <label className="path-field weekly-plan__span-2">
            <span>What should change? (optional regenerate)</span>
            <textarea
              rows={2}
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              placeholder="e.g. Shorter sessions, more core, avoid incline press…"
            />
          </label>
          <div className="weekly-plan__toolbar">
            <Button
              variant="ghost"
              disabled={generating}
              onClick={() => void generate({ regenerate: true })}
            >
              {generating ? 'Regenerating…' : 'Regenerate week'}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="weekly-plan__error">{error}</p> : null}

      <div className="weekly-plan__toolbar">
        {phase !== 'review' && phaseIndex > 0 ? (
          <Button variant="ghost" onClick={() => setPhase(PHASES[phaseIndex - 1]!)}>
            Back
          </Button>
        ) : (
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        )}

        {phase !== 'review' && phase !== 'constraints' ? (
          <Button onClick={() => setPhase(PHASES[phaseIndex + 1]!)}>Continue</Button>
        ) : null}

        {phase === 'constraints' ? (
          <Button disabled={generating || !intakeReadyForGeneration(intake)} onClick={() => void generate()}>
            {generating ? 'Generating training plan…' : 'Generate training plan'}
          </Button>
        ) : null}

        {phase === 'review' ? (
          <>
            <Button
              onClick={() =>
                patch((p) => ({ ...p, physical: { ...p.physical, approved: true } }))
              }
            >
              Approve training track
            </Button>
            <Button onClick={onContinue}>Continue</Button>
          </>
        ) : null}
      </div>
    </section>
  );
}

function ManualDayEditors({
  plan,
  patch,
  templates,
}: {
  plan: WeeklyPlan;
  patch: (fn: (p: WeeklyPlan) => WeeklyPlan) => void;
  templates: ReturnType<typeof readPhysicalPlan>['templates'];
}) {
  return (
    <>
      {plan.physical.days.map((day, index) => {
        const normalized = normalizePhysicalDay(day);
        const assignedIds = new Set(
          normalized.scheduledWorkouts.map((b) => b.workoutTemplateId).filter(Boolean),
        );
        const addable = templates.filter((t) => !assignedIds.has(t.id));
        return (
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
                      const clearWorkouts = type !== 'workout' && type !== 'recovery';
                      const norm = normalizePhysicalDay(day);
                      days[index] = {
                        ...norm,
                        type,
                        scheduledWorkouts: clearWorkouts ? [] : norm.scheduledWorkouts,
                        workoutTemplateId: clearWorkouts ? null : norm.workoutTemplateId,
                        workoutName:
                          type === 'rest'
                            ? 'Sabbath / Full Rest'
                            : type === 'workout' || type === 'recovery'
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
            </div>

            {(day.type === 'workout' || day.type === 'recovery') && (
              <div className="weekly-plan__workout-stack">
                {normalized.scheduledWorkouts.length === 0 ? (
                  <p className="weekly-plan__note">No workouts assigned yet.</p>
                ) : (
                  normalized.scheduledWorkouts.map((block, blockIndex) => {
                    const tmpl = templates.find((t) => t.id === block.workoutTemplateId);
                    const kind = block.classification ?? templateClassification(tmpl);
                    const exerciseCount = block.exercises?.length ?? tmpl?.exercises.length ?? 0;
                    return (
                      <div key={block.id} className="weekly-plan__workout-card">
                        <div className="weekly-plan__workout-card-main">
                          <p className="weekly-plan__workout-card-name">
                            {block.workoutName || tmpl?.name || 'Workout'}
                          </p>
                          <p className="weekly-plan__workout-card-meta">
                            {classificationLabel(kind)}
                            {block.estimatedMinutes != null
                              ? ` · ${block.estimatedMinutes} min`
                              : tmpl?.estimatedDuration
                                ? ` · ${tmpl.estimatedDuration}`
                                : ''}
                            {` · ${exerciseCount} exercises`}
                            {block.rationale ? ` · ${block.rationale}` : ''}
                          </p>
                          {block.exercises?.some((ex) => ex.cautionNote) ? (
                            <p className="weekly-plan__workout-card-meta">
                              Caution on{' '}
                              {block.exercises
                                .filter((ex) => ex.cautionNote)
                                .map((ex) => ex.exerciseId)
                                .slice(0, 2)
                                .join(', ')}
                            </p>
                          ) : null}
                        </div>
                        <div className="weekly-plan__workout-card-actions">
                          <button
                            type="button"
                            className="weekly-plan__icon-btn"
                            disabled={blockIndex === 0}
                            aria-label="Move up"
                            onClick={() =>
                              patch((p) => {
                                const days = [...p.physical.days];
                                days[index] = moveWorkoutInDay(
                                  days[index]!,
                                  block.id,
                                  -1,
                                  templates,
                                );
                                return { ...p, physical: { ...p.physical, days } };
                              })
                            }
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="weekly-plan__icon-btn"
                            disabled={blockIndex >= normalized.scheduledWorkouts.length - 1}
                            aria-label="Move down"
                            onClick={() =>
                              patch((p) => {
                                const days = [...p.physical.days];
                                days[index] = moveWorkoutInDay(
                                  days[index]!,
                                  block.id,
                                  1,
                                  templates,
                                );
                                return { ...p, physical: { ...p.physical, days } };
                              })
                            }
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="weekly-plan__icon-btn weekly-plan__icon-btn--danger"
                            aria-label="Remove workout"
                            onClick={() =>
                              patch((p) => {
                                const days = [...p.physical.days];
                                days[index] = removeWorkoutFromDay(
                                  days[index]!,
                                  block.id,
                                  templates,
                                );
                                return { ...p, physical: { ...p.physical, days } };
                              })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="weekly-plan__add-workout">
                  <label className="path-field">
                    <span>Add another workout</span>
                    <select
                      value=""
                      disabled={addable.length === 0}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        patch((p) => {
                          const days = [...p.physical.days];
                          days[index] = addWorkoutToDay(
                            { ...days[index]!, type: 'workout', isRequired: true },
                            id,
                            templates,
                          );
                          return { ...p, physical: { ...p.physical, days } };
                        });
                      }}
                    >
                      <option value="">
                        {addable.length ? 'Choose a template…' : 'All templates assigned'}
                      </option>
                      {addable.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.classification && t.classification !== 'primary'
                            ? ` (${classificationLabel(t.classification)})`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

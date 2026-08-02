import type { SermonPlan } from '../../../shared/sermonPlanSchema';
import type { TrainingPlan } from '../../../shared/trainingPlanSchema';
import type { DateKey } from '../calendar/week';
import type { ResistanceUnit } from '../physical/types';
import type { TrainingWeekSummary } from '../physical/trainingWeekSummary';

export type WeeklyPlanStatus = 'draft' | 'active' | 'completed' | 'archived';

export type GenerationSource = 'manual' | 'ai' | 'ai-edited';

export interface WeeklyPlanAiMeta {
  generationSource: GenerationSource;
  generatedAt: string | null;
  promptVersion: string | null;
  modelUsed: string | null;
}

export type PhysicalDayType =
  | 'workout'
  | 'recovery'
  | 'optional_movement'
  | 'rest'
  | 'unscheduled';

/** Organizational metadata for a workout template / scheduled block. */
export type WorkoutClassification =
  | 'primary'
  | 'accessory'
  | 'finisher'
  | 'mobility'
  | 'recovery'
  | 'cardio';

/** Week-specific exercise row (AI or manual override). */
export interface ScheduledExerciseSpec {
  exerciseId: string;
  sets: number;
  reps: string;
  load: number | null;
  loadUnit: ResistanceUnit;
  note: string;
  cautionNote: string;
  order: number;
  restSeconds?: number;
  progressionInstruction?: string;
}

/** One scheduled workout block on a physical day (ordered). */
export interface ScheduledWorkoutBlock {
  id: string;
  /** Optional reusable template id; week exercises win when present. */
  workoutTemplateId: string | null;
  order: number;
  workoutName?: string;
  classification?: WorkoutClassification;
  estimatedMinutes?: number;
  rationale?: string;
  /** Authoritative exercise list for this week when non-empty. */
  exercises?: ScheduledExerciseSpec[];
}

export type TrainingPrimaryGoal =
  | 'build_muscle'
  | 'lose_fat'
  | 'maintain_consistency'
  | 'improve_strength'
  | 'improve_mobility'
  | 'recover_reduce_fatigue'
  | 'get_back_on_track'
  | 'custom';

export interface TrainingCoachingIntake {
  primaryGoal: TrainingPrimaryGoal;
  secondaryGoal: TrainingPrimaryGoal | null;
  customGoalContext: string;
  trainingDaysCount: 3 | 4 | 5 | 6;
  /** PATH dayNumber 1=Sun … 7=Sat */
  preferredDays: number[];
  minutesPerWorkout: number;
  includeWalkingCardio: boolean;
  mustRestDays: number[];
  lastWeek: {
    plannedCount: number | null;
    completedCount: number | null;
    feltStrong: string;
    tooEasy: string;
    tooDifficult: string;
    painDiscomfort: string;
    skippedWhy: string;
  };
  /** Quick constraint tags */
  constraints: string[];
  constraintNotes: string;
  /** Snapshot used at generation time (history and/or manual). */
  priorWeekSummary?: TrainingWeekSummary | null;
}

export function emptyTrainingCoachingIntake(): TrainingCoachingIntake {
  return {
    primaryGoal: 'maintain_consistency',
    secondaryGoal: null,
    customGoalContext: '',
    trainingDaysCount: 4,
    preferredDays: [2, 3, 5, 6],
    minutesPerWorkout: 45,
    includeWalkingCardio: true,
    mustRestDays: [7],
    lastWeek: {
      plannedCount: null,
      completedCount: null,
      feltStrong: '',
      tooEasy: '',
      tooDifficult: '',
      painDiscomfort: '',
      skippedWhy: '',
    },
    constraints: [],
    constraintNotes: '',
    priorWeekSummary: null,
  };
}

/** Sermon capture — starting context for the week (not nested under a season). */
export interface ChurchEntry {
  sermonDate: DateKey;
  sermonTitle: string;
  speaker: string;
  churchName: string;
  primaryScripture: string;
  sermonNotes: string;
  sermonUrl: string;
  /** Weekly biblical focus answers */
  centralTruth: string;
  whatNeedsToChange: string;
  whatToPractice: string;
  actOfObedience: string;
  additionalContext: string;
  uncertainty: string;
  /** @deprecated legacy field aliases kept during migration */
  churchOrSeries?: string;
  stoodOutMost?: string;
  whyItStoodOut?: string;
  behaviorChange?: string;
}

export interface BiblicalDailyAssignment {
  id: string;
  date: DateKey;
  dayNumber: number;
  title: string;
  focus: string;
  scripture: string;
  teaching: string;
  practice: string;
  morningPrompt: string;
  middayPrompt: string;
  eveningPrompt: string;
  prayer: string;
  isRequired: boolean;
  enabled: boolean;
}

export interface BiblicalWeeklyPlan {
  sermonSummary: string;
  centralPrinciple: string;
  weeklyTheme: string;
  weeklyPractice: string;
  actOfObedience: string;
  coreScripture: string;
  supportingScriptures: string[];
  days: BiblicalDailyAssignment[];
  sourceNotes: string;
  approved: boolean;
  whyThisMatters?: string;
  watchFor?: string[];
  weeklyPrayer?: string;
  /** Last validated AI proposal (editable copy lives in fields above). */
  aiProposal?: SermonPlan | null;
  saturdayAi?: SermonPlan['saturday'] | null;
}

export interface PhysicalDailyAssignment {
  id: string;
  date: DateKey;
  dayNumber: number;
  type: PhysicalDayType;
  /** Ordered workout blocks for the day (primary + finishers, etc.). */
  scheduledWorkouts: ScheduledWorkoutBlock[];
  /**
   * First scheduled template id (legacy / convenience).
   * Prefer `scheduledWorkouts`. Migrated from single-template days.
   */
  workoutTemplateId: string | null;
  /** Display summary, e.g. "Chest and Triceps + Core Finisher". */
  workoutName: string;
  notes: string;
  isRequired: boolean;
}

export interface PhysicalWeeklyPlan {
  desiredWorkoutCount: number;
  days: PhysicalDailyAssignment[];
  approved: boolean;
  /** Sunday coaching questionnaire answers. */
  coachingIntake?: TrainingCoachingIntake | null;
  /** Last validated AI training proposal. */
  aiProposal?: TrainingPlan | null;
  aiMeta?: {
    generationSource: GenerationSource;
    generatedAt: string | null;
    promptVersion: string | null;
    modelUsed: string | null;
  };
}

export interface WorkOutcome {
  id: string;
  title: string;
  order: number;
}

export interface WorkDailyAssignment {
  id: string;
  date: DateKey;
  dayNumber: number;
  title: string;
  outcomeId: string | null;
  priority: number;
  status: 'open' | 'done' | 'deferred' | 'removed';
  notes: string;
  optional: boolean;
}

export interface WorkWeeklyPlan {
  weeklyOutcomes: WorkOutcome[];
  avoidedTask: string;
  deadlines: string;
  delegatedItems: string;
  deferredItems: string;
  constraints: string;
  days: WorkDailyAssignment[];
  approved: boolean;
}

export interface SaturdayReflection {
  godShowed: string;
  practicedNotJustRemembered: string;
  resistedOrDrifted: string;
  actOfObedienceDone: '' | 'yes' | 'no' | 'partial';
  trainingChanged: string;
  workMoved: string;
  carryForward: string;
  release: string;
  completedAt: string | null;
}

/** Standalone weekly plan — primary product entity. No parent season. */
export interface WeeklyPlan {
  id: string;
  weekStartDate: DateKey;
  weekEndDate: DateKey;
  status: WeeklyPlanStatus;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  completedAt: string | null;
  church: ChurchEntry;
  biblical: BiblicalWeeklyPlan;
  physical: PhysicalWeeklyPlan;
  work: WorkWeeklyPlan;
  saturdayReflection: SaturdayReflection;
  aiMeta?: WeeklyPlanAiMeta;
}

export interface WeeklyPlanIndex {
  version: 2;
  /** weekStartDate → plan id */
  byWeekStart: Record<string, string>;
  /** Currently active plan id (at most one) */
  activePlanId: string | null;
}

export function emptySaturdayReflection(): SaturdayReflection {
  return {
    godShowed: '',
    practicedNotJustRemembered: '',
    resistedOrDrifted: '',
    actOfObedienceDone: '',
    trainingChanged: '',
    workMoved: '',
    carryForward: '',
    release: '',
    completedAt: null,
  };
}

export function emptyAiMeta(): WeeklyPlanAiMeta {
  return {
    generationSource: 'manual',
    generatedAt: null,
    promptVersion: null,
    modelUsed: null,
  };
}

/** Normalize legacy church/biblical/physical fields after load. */
export function normalizeWeeklyPlan(plan: WeeklyPlan): WeeklyPlan {
  const church = plan.church ?? ({} as ChurchEntry);
  const physicalDays = (plan.physical?.days ?? []).map((day) => {
    const existing = Array.isArray(day.scheduledWorkouts) ? day.scheduledWorkouts : null;
    let scheduledWorkouts: ScheduledWorkoutBlock[];
    if (existing && existing.length > 0) {
      scheduledWorkouts = existing
        .filter(
          (b) =>
            Boolean(b?.workoutTemplateId) ||
            (Array.isArray(b?.exercises) && b.exercises.length > 0),
        )
        .map((block, index) => ({
          ...block,
          id: block.id || `sw_legacy_${day.id}_${index}`,
          workoutTemplateId: block.workoutTemplateId ?? null,
          order: typeof block.order === 'number' ? block.order : index,
        }))
        .sort((a, b) => a.order - b.order)
        .map((block, index) => ({ ...block, order: index }));
    } else if (day.workoutTemplateId) {
      scheduledWorkouts = [
        {
          id: `sw_legacy_${day.id}`,
          workoutTemplateId: day.workoutTemplateId,
          order: 0,
        },
      ];
    } else {
      scheduledWorkouts = [];
    }
    return {
      ...day,
      scheduledWorkouts,
      workoutTemplateId: scheduledWorkouts[0]?.workoutTemplateId ?? null,
    };
  });

  return {
    ...plan,
    completedAt: plan.completedAt ?? null,
    saturdayReflection: plan.saturdayReflection ?? emptySaturdayReflection(),
    aiMeta: plan.aiMeta ?? emptyAiMeta(),
    church: {
      sermonDate: church.sermonDate ?? plan.weekStartDate,
      sermonTitle: church.sermonTitle ?? '',
      speaker: church.speaker ?? '',
      churchName: church.churchName || church.churchOrSeries || '',
      primaryScripture: church.primaryScripture ?? '',
      sermonNotes: church.sermonNotes ?? '',
      sermonUrl: church.sermonUrl ?? '',
      centralTruth: church.centralTruth || church.stoodOutMost || '',
      whatNeedsToChange: church.whatNeedsToChange || church.whyItStoodOut || '',
      whatToPractice: church.whatToPractice || church.behaviorChange || '',
      actOfObedience: church.actOfObedience || plan.biblical?.actOfObedience || '',
      additionalContext: church.additionalContext ?? '',
      uncertainty: church.uncertainty ?? '',
    },
    biblical: {
      ...plan.biblical,
      actOfObedience: plan.biblical?.actOfObedience || church.actOfObedience || '',
      supportingScriptures: plan.biblical?.supportingScriptures ?? [],
      days: plan.biblical?.days ?? [],
      approved: plan.biblical?.approved ?? false,
      sermonSummary: plan.biblical?.sermonSummary ?? '',
      centralPrinciple: plan.biblical?.centralPrinciple ?? '',
      weeklyTheme: plan.biblical?.weeklyTheme ?? '',
      weeklyPractice: plan.biblical?.weeklyPractice ?? '',
      coreScripture: plan.biblical?.coreScripture ?? '',
      sourceNotes: plan.biblical?.sourceNotes ?? '',
    },
    physical: {
      ...plan.physical,
      desiredWorkoutCount: plan.physical?.desiredWorkoutCount ?? 4,
      approved: plan.physical?.approved ?? false,
      days: physicalDays,
      coachingIntake: plan.physical?.coachingIntake ?? null,
      aiProposal: plan.physical?.aiProposal ?? null,
      aiMeta: plan.physical?.aiMeta ?? undefined,
    },
  };
}

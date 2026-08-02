import type { DateKey } from '../calendar/week';

export type WeeklyPlanStatus = 'draft' | 'active' | 'completed' | 'archived';

export type PhysicalDayType =
  | 'workout'
  | 'recovery'
  | 'optional_movement'
  | 'rest'
  | 'unscheduled';

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
}

export interface PhysicalDailyAssignment {
  id: string;
  date: DateKey;
  dayNumber: number;
  type: PhysicalDayType;
  workoutTemplateId: string | null;
  workoutName: string;
  notes: string;
  isRequired: boolean;
}

export interface PhysicalWeeklyPlan {
  desiredWorkoutCount: number;
  days: PhysicalDailyAssignment[];
  approved: boolean;
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

/** Normalize legacy church/biblical fields after load. */
export function normalizeWeeklyPlan(plan: WeeklyPlan): WeeklyPlan {
  const church = plan.church ?? ({} as ChurchEntry);
  return {
    ...plan,
    completedAt: plan.completedAt ?? null,
    saturdayReflection: plan.saturdayReflection ?? emptySaturdayReflection(),
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
  };
}

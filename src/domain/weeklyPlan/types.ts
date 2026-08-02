import type { DateKey } from '../calendar/week';

export type WeeklyPlanStatus = 'draft' | 'active' | 'completed' | 'archived';

export type PhysicalDayType =
  | 'workout'
  | 'recovery'
  | 'optional_movement'
  | 'rest'
  | 'unscheduled';

export interface ChurchEntry {
  sermonDate: DateKey;
  sermonTitle: string;
  speaker: string;
  churchOrSeries: string;
  primaryScripture: string;
  sermonNotes: string;
  sermonUrl: string;
  stoodOutMost: string;
  whyItStoodOut: string;
  behaviorChange: string;
  additionalContext: string;
  uncertainty: string;
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
  coreScripture: string;
  supportingScriptures: string[];
  days: BiblicalDailyAssignment[];
  /** Provenance labels for review UI */
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

export interface WeeklyPlan {
  id: string;
  weekStartDate: DateKey;
  weekEndDate: DateKey;
  status: WeeklyPlanStatus;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  church: ChurchEntry;
  biblical: BiblicalWeeklyPlan;
  physical: PhysicalWeeklyPlan;
  work: WorkWeeklyPlan;
}

export interface WeeklyPlanIndex {
  version: 1;
  /** weekStartDate → plan id */
  byWeekStart: Record<string, string>;
  /** Currently active plan id (at most one) */
  activePlanId: string | null;
}

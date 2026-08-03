/** Derived Sunday weekly-setup checklist statuses (no duplicate manual status fields). */

import { notesAreMeaningful } from '../aiPlanning/client';
import { normalizePhysicalDay } from './physicalWorkouts';
import type { WeeklyPlan } from './types';

export type SetupItemStatus = 'not_started' | 'in_progress' | 'complete' | 'needs_review';

export interface SetupItemView {
  id: 'biblical' | 'training' | 'work' | 'review';
  title: string;
  status: SetupItemStatus;
  summary: string;
  primaryAction: string;
  secondaryAction?: string;
  /** Workspace step index for deep link */
  step: number;
}

export interface WeeklySetupState {
  items: SetupItemView[];
  biblicalComplete: boolean;
  trainingComplete: boolean;
  workComplete: boolean;
  allTracksComplete: boolean;
  isActive: boolean;
  canActivate: boolean;
  missingSections: string[];
}

function hasSermonContent(plan: WeeklyPlan): boolean {
  return Boolean(
    plan.church.sermonTitle.trim() ||
      plan.church.sermonNotes.trim() ||
      plan.church.sermonUrl.trim() ||
      plan.church.primaryScripture.trim(),
  );
}

function biblicalPlanFieldsPresent(plan: WeeklyPlan): boolean {
  // Require week-level content — draft day scaffolds alone do not count as a plan.
  return Boolean(
    plan.biblical.weeklyTheme.trim() ||
      plan.biblical.weeklyPractice.trim() ||
      plan.biblical.centralPrinciple.trim() ||
      plan.biblical.aiProposal ||
      plan.biblical.days.some(
        (d) => d.dayNumber >= 2 && d.dayNumber <= 6 && d.practice.trim().length > 12,
      ),
  );
}

function trainingSchedulePresent(plan: WeeklyPlan): boolean {
  const days = plan.physical.days;
  const hasBlocks = days.some((d) => normalizePhysicalDay(d).scheduledWorkouts.length > 0);
  const intentionalRest = days.filter((d) => d.type === 'rest' || d.type === 'recovery').length >= 1;
  const intake = plan.physical.coachingIntake;
  const hasGoal = Boolean(intake?.primaryGoal);
  return hasBlocks || (hasGoal && intentionalRest) || Boolean(plan.physical.aiProposal);
}

function workOutcomesCount(plan: WeeklyPlan): number {
  return plan.work.weeklyOutcomes.filter((o) => o.title.trim().length > 0).length;
}

function countTrainingDays(plan: WeeklyPlan): number {
  return plan.physical.days.filter(
    (d) => normalizePhysicalDay(d).scheduledWorkouts.length > 0,
  ).length;
}

function countCoreFinishers(plan: WeeklyPlan): number {
  return plan.physical.days.reduce((total, day) => {
    const blocks = normalizePhysicalDay(day).scheduledWorkouts;
    return (
      total +
      blocks.filter(
        (block) =>
          block.workoutTemplateId === 'tmpl_core_finisher' ||
          /core\s*finisher/i.test(block.workoutName ?? ''),
      ).length
    );
  }, 0);
}

function completeTrainingSummary(plan: WeeklyPlan): string {
  const trainingDays = countTrainingDays(plan);
  if (trainingDays <= 0) return 'Training / recovery schedule approved';
  const finishers = countCoreFinishers(plan);
  const daysLabel = `${trainingDays} training day${trainingDays === 1 ? '' : 's'}`;
  if (finishers <= 0) return daysLabel;
  return `${daysLabel} · ${finishers} core finisher${finishers === 1 ? '' : 's'}`;
}

export function deriveBiblicalStatus(plan: WeeklyPlan): SetupItemView {
  const sermon = hasSermonContent(plan);
  const notesOk = notesAreMeaningful(plan.church.sermonNotes);
  const fields = biblicalPlanFieldsPresent(plan);
  const approved = plan.biblical.approved;

  if (approved && (fields || notesOk)) {
    const theme =
      plan.biblical.weeklyTheme.trim() ||
      plan.church.sermonTitle.trim() ||
      'Biblical plan approved';
    return {
      id: 'biblical',
      title: 'Sermon & Biblical Plan',
      status: 'complete',
      summary: theme,
      primaryAction: 'Review',
      secondaryAction: 'Edit',
      step: 2,
    };
  }

  if (fields && !approved) {
    return {
      id: 'biblical',
      title: 'Sermon & Biblical Plan',
      status: 'needs_review',
      summary: 'Biblical plan drafted. Review and approve before activating.',
      primaryAction: 'Review Plan',
      secondaryAction: 'Edit',
      step: 2,
    };
  }

  if (sermon || notesOk) {
    return {
      id: 'biblical',
      title: 'Sermon & Biblical Plan',
      status: 'in_progress',
      summary: notesOk
        ? 'Sermon notes saved. Biblical plan has not been approved.'
        : 'Sermon started. Add notes and generate the Monday–Friday plan.',
      primaryAction: 'Continue',
      step: notesOk ? 2 : 0,
    };
  }

  return {
    id: 'biblical',
    title: 'Sermon & Biblical Plan',
    status: 'not_started',
    summary: 'Add this week’s sermon notes and generate the Monday–Friday plan.',
    primaryAction: 'Add Sermon Notes',
    step: 0,
  };
}

export function deriveTrainingStatus(plan: WeeklyPlan): SetupItemView {
  const approved = plan.physical.approved;
  const schedule = trainingSchedulePresent(plan);
  const intake = plan.physical.coachingIntake;
  const hasIntake = Boolean(intake?.primaryGoal);

  if (approved && schedule) {
    return {
      id: 'training',
      title: 'Training Plan',
      status: 'complete',
      summary: completeTrainingSummary(plan),
      primaryAction: 'Review',
      secondaryAction: 'Edit',
      step: 3,
    };
  }

  if (plan.physical.aiProposal && !approved) {
    return {
      id: 'training',
      title: 'Training Plan',
      status: 'needs_review',
      summary: 'Training preferences saved. Generated plan needs review.',
      primaryAction: 'Review Plan',
      step: 3,
    };
  }

  if (hasIntake || schedule) {
    return {
      id: 'training',
      title: 'Training Plan',
      status: 'in_progress',
      summary: hasIntake
        ? 'Training preferences saved. Finish and approve the plan.'
        : 'Training days started. Approve when ready.',
      primaryAction: 'Continue',
      step: 3,
    };
  }

  return {
    id: 'training',
    title: 'Training Plan',
    status: 'not_started',
    summary: 'Set your goal, availability, and constraints for the week.',
    primaryAction: 'Plan Training',
    step: 3,
  };
}

export function deriveWorkStatus(plan: WeeklyPlan): SetupItemView {
  const count = workOutcomesCount(plan);
  const approved = plan.work.approved;

  if (approved && count > 0) {
    return {
      id: 'work',
      title: 'Work Plan',
      status: 'complete',
      summary: `${count} weekly outcome${count === 1 ? '' : 's'}`,
      primaryAction: 'Review',
      secondaryAction: 'Edit',
      step: 4,
    };
  }

  if (count > 0 && !approved) {
    return {
      id: 'work',
      title: 'Work Plan',
      status: 'in_progress',
      summary: `${count} outcome${count === 1 ? '' : 's'} drafted. Approve when ready.`,
      primaryAction: 'Continue',
      step: 4,
    };
  }

  return {
    id: 'work',
    title: 'Work Plan',
    status: 'not_started',
    summary: 'Choose three meaningful outcomes for the week.',
    primaryAction: 'Plan Work',
    step: 4,
  };
}

export function deriveWeeklySetup(plan: WeeklyPlan | null): WeeklySetupState {
  if (!plan) {
    return {
      items: [
        {
          id: 'biblical',
          title: 'Sermon & Biblical Plan',
          status: 'not_started',
          summary: 'Add this week’s sermon notes and generate the Monday–Friday plan.',
          primaryAction: 'Add Sermon Notes',
          step: 0,
        },
        {
          id: 'training',
          title: 'Training Plan',
          status: 'not_started',
          summary: 'Set your goal, availability, and constraints for the week.',
          primaryAction: 'Plan Training',
          step: 3,
        },
        {
          id: 'work',
          title: 'Work Plan',
          status: 'not_started',
          summary: 'Choose three meaningful outcomes for the week.',
          primaryAction: 'Plan Work',
          step: 4,
        },
        {
          id: 'review',
          title: 'Review & Activate',
          status: 'not_started',
          summary: 'Complete the sections above before activating the week.',
          primaryAction: 'Review and Activate',
          step: 5,
        },
      ],
      biblicalComplete: false,
      trainingComplete: false,
      workComplete: false,
      allTracksComplete: false,
      isActive: false,
      canActivate: false,
      missingSections: ['Sermon & Biblical Plan', 'Training Plan', 'Work Plan'],
    };
  }

  const biblical = deriveBiblicalStatus(plan);
  const training = deriveTrainingStatus(plan);
  const work = deriveWorkStatus(plan);
  const biblicalComplete = biblical.status === 'complete';
  const trainingComplete = training.status === 'complete';
  const workComplete = work.status === 'complete';
  const allTracksComplete = biblicalComplete && trainingComplete && workComplete;
  const isActive = plan.status === 'active';

  const missingSections: string[] = [];
  if (!biblicalComplete) missingSections.push('Sermon & Biblical Plan');
  if (!trainingComplete) missingSections.push('Training Plan');
  if (!workComplete) missingSections.push('Work Plan');

  const review: SetupItemView = isActive
    ? {
        id: 'review',
        title: 'Review & Activate',
        status: 'complete',
        summary: 'Week activated. Monday is ready.',
        primaryAction: 'Open Week',
        step: 5,
      }
    : allTracksComplete
      ? {
          id: 'review',
          title: 'Review & Activate',
          status: 'needs_review',
          summary: 'Your biblical, training, and work plans are ready.',
          primaryAction: 'Review and Activate',
          step: 5,
        }
      : {
          id: 'review',
          title: 'Review & Activate',
          status: 'not_started',
          summary: 'Complete the sections above before activating the week.',
          primaryAction: 'Review and Activate',
          step: 5,
        };

  return {
    items: [biblical, training, work, review],
    biblicalComplete,
    trainingComplete,
    workComplete,
    allTracksComplete,
    isActive,
    canActivate: allTracksComplete && !isActive,
    missingSections,
  };
}

export function weekPlanPath(weekStart: string, step?: number): string {
  const base = `/plan/week/${weekStart}`;
  if (step == null || step < 0) return base;
  return `${base}?step=${step}`;
}

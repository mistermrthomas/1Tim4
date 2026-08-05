import type { WeeklyPlan } from '../weeklyPlan/types';
import type { BiblicalDailyAssignmentView, BiblicalWeekRecord, SermonRecord } from './types';

/** True when AI (or equivalent) has produced weekday biblical training. */
export function hasGeneratedBiblicalTraining(plan: WeeklyPlan | null | undefined): boolean {
  if (!plan) return false;
  if (plan.biblical.aiProposal) return true;
  if (plan.aiMeta?.generatedAt) return true;
  const weekdays = plan.biblical.days.filter((d) => d.dayNumber >= 2 && d.dayNumber <= 6);
  return weekdays.some((d) => Boolean(d.focus?.trim() && d.practice?.trim()));
}

export function sermonRecordFromPlan(plan: WeeklyPlan): SermonRecord {
  return {
    id: plan.id,
    sermonDate: plan.church.sermonDate,
    title: plan.church.sermonTitle,
    notes: plan.church.sermonNotes,
    primaryScripture: plan.church.primaryScripture,
    speaker: plan.church.speaker,
    church: plan.church.churchName,
    sermonLink: plan.church.sermonUrl,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function firstReflectionLine(prompt: string): string {
  return (
    prompt
      .split(/\n+/)
      .map((s) => s.trim())
      .find(Boolean) ?? ''
  );
}

export function biblicalWeekFromPlan(plan: WeeklyPlan): BiblicalWeekRecord {
  const dailyAssignments: BiblicalDailyAssignmentView[] = plan.biblical.days.map((d) => ({
    date: d.date,
    scripture: d.scripture,
    focus: d.focus,
    practice: d.practice,
    reflection: firstReflectionLine(d.eveningPrompt),
  }));

  return {
    id: plan.id,
    sermonId: plan.id,
    weekStart: plan.weekStartDate,
    weekEnd: plan.weekEndDate,
    centralTruth: plan.biblical.centralPrinciple || plan.church.centralTruth,
    intendedResponse: plan.biblical.weeklyPractice || plan.church.whatToPractice,
    weeklyActOfObedience: plan.biblical.actOfObedience || plan.church.actOfObedience,
    dailyAssignments,
    active: plan.status === 'active',
    generatedAt: plan.aiMeta?.generatedAt || plan.updatedAt,
  };
}

export function dayAssignmentForDate(
  plan: WeeklyPlan,
  dateKey: string,
): BiblicalDailyAssignmentView | null {
  const day = plan.biblical.days.find((d) => d.date === dateKey);
  if (!day) return null;
  return {
    date: day.date,
    scripture: day.scripture || plan.biblical.coreScripture,
    focus: day.focus || plan.biblical.weeklyTheme,
    practice: day.practice || plan.biblical.weeklyPractice,
    reflection: firstReflectionLine(day.eveningPrompt),
  };
}

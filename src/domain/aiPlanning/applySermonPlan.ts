import type { SermonPlan } from '../../../shared/sermonPlanSchema';
import { newId } from '../physical/store';
import type { BiblicalDailyAssignment, WeeklyPlan } from '../weeklyPlan/types';

const WEEKDAY_TO_DAY_NUMBER: Record<string, number> = {
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
};

function joinLines(items: string[]): string {
  return items.map((s) => s.trim()).filter(Boolean).join('\n');
}

/** Map AI structured plan onto the weekly plan biblical track (editable draft). */
export function applySermonPlanToWeeklyPlan(
  plan: WeeklyPlan,
  ai: SermonPlan,
  meta: { modelUsed: string; promptVersion: string; regenerated?: boolean },
): WeeklyPlan {
  const byDayNumber = new Map<number, BiblicalDailyAssignment>();
  for (const day of plan.biblical.days) {
    byDayNumber.set(day.dayNumber, day);
  }

  const sunday = byDayNumber.get(1);
  if (sunday) {
    byDayNumber.set(1, {
      ...sunday,
      title: 'Weekly kickoff',
      focus: ai.centralTruth,
      scripture: ai.primaryScripture,
      teaching: ai.whyThisMatters,
      practice: ai.weeklyPractice,
      morningPrompt: 'Based on your notes, name the central truth in one sentence.',
      middayPrompt: 'Where might this truth meet you today?',
      eveningPrompt: 'What did you notice about this sermon’s call?',
      prayer: ai.weeklyPrayer,
      isRequired: true,
      enabled: true,
    });
  }

  for (const day of ai.days) {
    const dayNumber = WEEKDAY_TO_DAY_NUMBER[day.day];
    if (!dayNumber) continue;
    const existing = byDayNumber.get(dayNumber);
    const date = existing?.date ?? plan.physical.days.find((d) => d.dayNumber === dayNumber)?.date;
    if (!date) continue;
    byDayNumber.set(dayNumber, {
      id: existing?.id ?? newId('bday'),
      date,
      dayNumber,
      title: day.dailyFocus.slice(0, 80),
      focus: day.dailyFocus,
      scripture: day.scripture.join('; '),
      teaching: day.explanation,
      practice: day.concreteAction,
      morningPrompt: joinLines(day.morningPractice),
      middayPrompt: day.middayCheckpoint,
      eveningPrompt: joinLines(day.eveningReflection),
      prayer: '',
      isRequired: true,
      enabled: true,
    });
  }

  const saturday = byDayNumber.get(7);
  if (saturday) {
    byDayNumber.set(7, {
      ...saturday,
      title: 'Sabbath',
      focus: ai.saturday.sabbathFocus,
      scripture: ai.primaryScripture,
      teaching: ai.saturday.sabbathFocus,
      practice: '',
      morningPrompt: '',
      middayPrompt: '',
      eveningPrompt: joinLines([
        ...ai.saturday.reflectionQuestions,
        ai.saturday.carryForwardQuestion,
      ]),
      prayer: ai.weeklyPrayer,
      isRequired: false,
      enabled: true,
    });
  }

  const days = Array.from(byDayNumber.values()).sort((a, b) => a.dayNumber - b.dayNumber);

  return {
    ...plan,
    church: {
      ...plan.church,
      centralTruth: ai.centralTruth,
      whatToPractice: ai.weeklyPractice,
      actOfObedience: ai.actOfObedience,
      primaryScripture: plan.church.primaryScripture || ai.primaryScripture,
    },
    biblical: {
      ...plan.biblical,
      weeklyTheme: ai.weeklyTitle,
      centralPrinciple: ai.centralTruth,
      weeklyPractice: ai.weeklyPractice,
      actOfObedience: ai.actOfObedience,
      coreScripture: ai.primaryScripture,
      supportingScriptures: ai.supportingScriptures,
      sermonSummary: ai.whyThisMatters,
      sourceNotes:
        'Based on your sermon notes. Review against Scripture before activating — this is not divine revelation.',
      days,
      approved: false,
      aiProposal: ai,
      whyThisMatters: ai.whyThisMatters,
      watchFor: ai.watchFor,
      weeklyPrayer: ai.weeklyPrayer,
      saturdayAi: ai.saturday,
    },
    aiMeta: {
      generationSource: meta.regenerated ? 'ai-edited' : 'ai',
      generatedAt: new Date().toISOString(),
      promptVersion: meta.promptVersion,
      modelUsed: meta.modelUsed,
    },
    saturdayReflection: {
      ...plan.saturdayReflection,
      // Seed reflection prompts; user fills answers on Saturday.
    },
    updatedAt: new Date().toISOString(),
  };
}

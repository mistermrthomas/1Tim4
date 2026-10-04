import { addDays, type DateKey, weekdayFromDateKey } from '../calendar/week';
import { newId } from '../physical/store';
import type { StructuredChurchAnalysis } from '../../../shared/churchNotesAnalysis';
import type {
  FormationDailyPlan,
  SermonAnalysis,
  SermonNote,
  WeeklyFormationPlan,
} from './types';

/** First Monday strictly after the sermon date (Sunday sermon → next day). */
export function mondayAfterSermon(sermonDate: DateKey): DateKey {
  const day = weekdayFromDateKey(sermonDate); // 0=Sun … 6=Sat
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  return addDays(sermonDate, daysUntilMonday);
}

export function buildWeeklyFormationPlan(input: {
  userId: string;
  sermonNote: SermonNote;
  analysis: SermonAnalysis;
  edited: StructuredChurchAnalysis;
  startDate?: DateKey;
}): WeeklyFormationPlan {
  const startDate = input.startDate ?? mondayAfterSermon(input.sermonNote.sermonDate);
  const endDate = addDays(startDate, 6);
  const now = new Date().toISOString();

  const centralQuestion =
    input.edited.personalQuestions[0] ||
    'What is forming me this week — Scripture, or the environment around me?';

  const weeklyObedience =
    input.edited.practicalResponse[0] ||
    'Practice one concrete act of obedience tied to this week’s theme.';

  const byDay = new Map(input.edited.sevenDayPlan.map((d) => [d.dayNumber, d]));

  const dailyPlan: FormationDailyPlan[] = Array.from({ length: 7 }, (_, i) => {
    const dayNumber = i + 1;
    const source = byDay.get(dayNumber);
    const isWeeklyReview = dayNumber === 5 || dayNumber === 6;
    return {
      dayNumber,
      date: addDays(startDate, i),
      theme: source?.theme || input.edited.weeklyTheme,
      beforeReadingPrompt:
        source?.beforeReadingPrompt ||
        'Ask the Holy Spirit to show you what is shaping your thinking.',
      reflectionQuestion:
        source?.reflectionQuestion ||
        (isWeeklyReview
          ? 'Where did you notice transformation — or drift — this week?'
          : centralQuestion),
      prayerPrompt: source?.prayerPrompt || input.edited.prayerFocus[0] || 'Pray for a teachable heart.',
      isWeeklyReview,
    };
  });

  return {
    id: newId('wform'),
    userId: input.userId,
    sermonNoteId: input.sermonNote.id,
    analysisId: input.analysis.id,
    startDate,
    endDate,
    weeklyTheme: input.edited.weeklyTheme,
    memoryVerse: input.edited.memoryVerse.reference,
    centralQuestion,
    weeklyObedience,
    dailyPlan,
    preservesReadingPlan: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDraftSermonNote(
  userId: string,
  sermonDate: DateKey,
  partial?: Partial<SermonNote>,
): SermonNote {
  const now = new Date().toISOString();
  return {
    id: partial?.id ?? newId('snote'),
    userId,
    sermonDate: partial?.sermonDate ?? sermonDate,
    church: partial?.church ?? '',
    speaker: partial?.speaker ?? '',
    title: partial?.title ?? '',
    series: partial?.series ?? '',
    primaryScripture: partial?.primaryScripture ?? '',
    rawNotes: partial?.rawNotes ?? '',
    sourceLinks: partial?.sourceLinks ?? '',
    announcementsNotes: partial?.announcementsNotes ?? '',
    status: partial?.status ?? 'draft',
    createdAt: partial?.createdAt ?? now,
    updatedAt: now,
  };
}

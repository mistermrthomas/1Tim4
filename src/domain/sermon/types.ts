import type { DateKey } from '../calendar/week';

/** Sermon capture — primary user input for biblical training. */
export type SermonRecord = {
  id: string;
  sermonDate: DateKey;
  title: string;
  notes: string;
  primaryScripture: string;
  speaker: string;
  church: string;
  sermonLink: string;
  createdAt: string;
  updatedAt: string;
};

/** One day of generated biblical training. */
export type BiblicalDailyAssignmentView = {
  date: DateKey;
  scripture: string;
  focus: string;
  practice: string;
  reflection: string;
};

/** Generated Sunday–Saturday biblical week from a sermon. */
export type BiblicalWeekRecord = {
  id: string;
  sermonId: string;
  weekStart: DateKey;
  weekEnd: DateKey;
  centralTruth: string;
  intendedResponse: string;
  weeklyActOfObedience: string;
  dailyAssignments: BiblicalDailyAssignmentView[];
  active: boolean;
  generatedAt: string;
};

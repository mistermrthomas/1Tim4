import type { DateKey } from '../calendar/week';
import type { StructuredChurchAnalysis } from '../../../shared/churchNotesAnalysis';

export type SermonNoteStatus = 'draft' | 'analyzed' | 'approved';

export interface SermonNote {
  id: string;
  userId: string;
  sermonDate: DateKey;
  church: string;
  speaker: string;
  title: string;
  series: string;
  primaryScripture: string;
  /** Immutable original notes — never overwritten by AI */
  rawNotes: string;
  sourceLinks: string;
  announcementsNotes: string;
  status: SermonNoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SermonAnalysis {
  id: string;
  sermonNoteId: string;
  model: string;
  promptVersion: string;
  /** Original AI response */
  structuredAnalysis: StructuredChurchAnalysis;
  /** User-edited copy (approved version when saved) */
  userEditedAnalysis: StructuredChurchAnalysis;
  generatedAt: string;
  approvedAt: string | null;
}

export interface FormationDailyPlan {
  dayNumber: number;
  date: DateKey;
  theme: string;
  beforeReadingPrompt: string;
  reflectionQuestion: string;
  prayerPrompt: string;
  /** True for Friday/Saturday weekly review day */
  isWeeklyReview: boolean;
}

export interface WeeklyFormationPlan {
  id: string;
  userId: string;
  sermonNoteId: string;
  analysisId: string;
  startDate: DateKey;
  endDate: DateKey;
  weeklyTheme: string;
  memoryVerse: string;
  centralQuestion: string;
  weeklyObedience: string;
  dailyPlan: FormationDailyPlan[];
  /** Does not replace AppData.readingPlan — layered reflection only */
  preservesReadingPlan: true;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChurchNotesIndex {
  version: 1;
  noteIds: string[];
  activeFormationPlanId: string | null;
}

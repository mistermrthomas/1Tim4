export interface UserProfile {
  id: string;
  name: string;
  createdAt: string;
}

/** Journey stage within a single day */
export type JourneyStage = 'prepare' | 'live' | 'reflect';

export type PrayerStatus = 'active' | 'partially_answered' | 'answered';

/** Tags for future AI theme detection and verse suggestions */
export type GrowthTheme =
  | 'patience'
  | 'self-control'
  | 'faithfulness'
  | 'anxiety'
  | 'prayer'
  | 'trust'
  | 'leadership'
  | 'family'
  | 'anger'
  | 'gratitude'
  | 'peace'
  | 'love'
  | 'joy'
  | 'kindness'
  | 'gentleness'
  | 'other';

export interface ChapterReference {
  book: string;
  chapter: number;
}

export interface VerseReference {
  reference: string;
  text: string;
}

export interface QuestionResponse {
  questionId: string;
  questionText: string;
  answer: string;
}

export interface PrepareEntry {
  completedAt: string;
  chaptersRead: ChapterReference[];
  keyVerses: VerseReference[];
  standoutVerses: VerseReference[];
  notes: string;
  responses: QuestionResponse[];
}

export interface LiveEntry {
  completedAt: string;
  responses: QuestionResponse[];
}

export interface ReflectEntry {
  completedAt: string;
  responses: QuestionResponse[];
  /** IDs of lessons learned extracted from this reflection */
  lessonIds: string[];
}

export interface DailyEntry {
  date: string;
  prepare?: PrepareEntry;
  live?: LiveEntry;
  reflect?: ReflectEntry;
}

export interface TrainingFocus {
  id: string;
  title: string;
  description: string;
  startedAt: string;
  endedAt?: string;
  themes: GrowthTheme[];
}

export interface TrainingVerse {
  id: string;
  reference: string;
  text: string;
  startedAt: string;
  endedAt?: string;
  linkedFocusId?: string;
  themes: GrowthTheme[];
}

export interface LessonLearned {
  id: string;
  text: string;
  sourceDate: string;
  sourceType: JourneyStage;
  focusId?: string;
  themes: GrowthTheme[];
  createdAt: string;
}

export interface PrayerRequest {
  id: string;
  text: string;
  createdAt: string;
  status: PrayerStatus;
  statusUpdatedAt: string;
  notes?: string;
}

export interface ReadingLogEntry {
  id: string;
  book: string;
  chapter: number;
  date: string;
}

/** How far the daily reading progresses through a book */
export type ReadingScopeMode = 'whole_book' | 'chapter_range';

/** Current reading position for "Today's Reading" display */
export interface ReadingPlan {
  currentBook: string;
  currentChapter: number;
  chaptersCompletedInBook: number[];
  /** Read from startChapter through endChapter (inclusive), in order */
  scopeMode?: ReadingScopeMode;
  startChapter?: number;
  endChapter?: number;
  /** Thematic chapter tied to training focus (not necessarily where reading starts) */
  anchorChapter?: number;
  anchorLabel?: string;
}

export interface JourneyLogItem {
  id: string;
  date: string;
  stage: JourneyStage;
  preview: string;
  focusTitle?: string;
  book?: string;
  themes: GrowthTheme[];
}

/** Fruit of the Spirit options in the initial assessment */
export type FruitOfSpirit =
  | 'Love'
  | 'Joy'
  | 'Peace'
  | 'Patience'
  | 'Kindness'
  | 'Goodness'
  | 'Faithfulness'
  | 'Gentleness'
  | 'Self-Control';

export type AssessmentFocusKey =
  | 'patience'
  | 'peace'
  | 'self-control'
  | 'faithfulness'
  | 'gentleness'
  | 'love'
  | 'joy'
  | 'kindness'
  | 'goodness'
  | 'trust'
  | 'prayer'
  | 'anxiety'
  | 'family'
  | 'work';

export interface AssessmentSuggestion {
  focusKey: AssessmentFocusKey;
  focusTitle: string;
  focusDescription: string;
  focusThemes: GrowthTheme[];
  whyFocus: string;
  /** How the personalized "why" was produced */
  guidanceSource?: 'ai' | 'rules';
  verseReference: string;
  verseText: string;
  readingLabel: string;
  readingBook: string;
  /** Thematic chapter (verse context) — reading still starts at readingStartChapter */
  readingChapter: number;
  readingStartChapter: number;
  readingEndChapter: number;
  readingScope: ReadingScopeMode;
  readingProgressLabel: string;
  dailyEmphasis: string;
  translation: string;
}

export type SpiritualAssessmentStatus = 'in_progress' | 'completed' | 'accepted';

export interface SpiritualAssessment {
  status: SpiritualAssessmentStatus;
  startedAt: string;
  completedAt?: string;
  acceptedAt?: string;
  sectionIndex: number;
  answers: Record<string, string>;
  suggestion?: AssessmentSuggestion;
  acceptedFocusTitle?: string;
  acceptedVerseReference?: string;
}

export type ServingLaneKey =
  | 'encouraging'
  | 'practical'
  | 'organize'
  | 'teach'
  | 'creative'
  | 'hospitality'
  | 'support'
  | 'mentor'
  | 'lead';

export interface ServingLaneResult {
  key: ServingLaneKey;
  title: string;
  score: number;
  summary: string;
}

export interface ServingSuggestion {
  primaryLane: ServingLaneKey;
  primaryTitle: string;
  headline: string;
  whySummary: string;
  lanes: ServingLaneResult[];
  strengths: string[];
  watchouts: string[];
}

export type ServingDiscoveryStatus = 'in_progress' | 'completed';

export interface ServingDiscovery {
  status: ServingDiscoveryStatus;
  startedAt: string;
  completedAt?: string;
  sectionIndex: number;
  answers: Record<string, string>;
  suggestion?: ServingSuggestion;
}

export interface OnboardingProgress {
  dismissed?: boolean;
  backupExported?: boolean;
  homeScreenAdded?: boolean;
}

export type TrailStartMode = 'quick_read' | 'quick_path' | 'assessment';

export interface AppData {
  version: 1;
  /** ISO timestamp — last known sync with cloud (for merge on other devices) */
  cloudSyncedAt?: string;
  /** How the user began — assessment intake vs quick reading / path pick */
  trailStartMode?: TrailStartMode | null;
  journeyStartedAt: string;
  trainingFocus: TrainingFocus | null;
  trainingFocusHistory: TrainingFocus[];
  trainingVerse: TrainingVerse | null;
  trainingVerseArchive: TrainingVerse[];
  dailyEntries: Record<string, DailyEntry>;
  prayers: PrayerRequest[];
  lessonsLearned: LessonLearned[];
  readingLog: ReadingLogEntry[];
  readingPlan: ReadingPlan;
  spiritualAssessment: SpiritualAssessment | null;
  servingDiscovery?: ServingDiscovery | null;
  onboardingProgress?: OnboardingProgress;
  lastBackupAt?: string;
}

export type AppMode = 'new' | 'demo' | 'live';

export interface AppContextValue {
  data: AppData;
  appMode: AppMode;
  isEmpty: boolean;
  today: string;
  todayEntry: DailyEntry;
  loadDemoData: () => void;
  startFreshTrail: () => void;
  savePrepare: (entry: Omit<PrepareEntry, 'completedAt'>) => void;
  saveLive: (entry: Omit<LiveEntry, 'completedAt'>) => void;
  saveReflect: (
    entry: Omit<ReflectEntry, 'completedAt' | 'lessonIds'>,
    newLessons: string[],
  ) => void;
  addPrayer: (text: string) => void;
  updatePrayerStatus: (id: string, status: PrayerStatus) => void;
  updatePrayerNotes: (id: string, notes: string) => void;
  getJourneyLog: (filters?: JourneyLogFilters) => JourneyLogItem[];
  getRelatedLessons: (focusId: string) => LessonLearned[];
  getBooksCompleted: () => string[];
  getChapterCount: () => number;
  setTrainingFocus: (focus: Omit<TrainingFocus, 'id' | 'startedAt'>) => void;
  setTrainingVerse: (verse: Omit<TrainingVerse, 'id' | 'startedAt' | 'endedAt'>) => void;
  archiveTrainingVerse: () => void;
  spiritualAssessment: SpiritualAssessment | null;
  startAssessment: () => void;
  saveAssessmentProgress: (sectionIndex: number, answers: Record<string, string>) => void;
  completeAssessment: (answers: Record<string, string>) => Promise<AssessmentSuggestion>;
  acceptAssessmentPlan: (plan: {
    focusTitle: string;
    focusDescription: string;
    focusThemes: GrowthTheme[];
    verseReference: string;
    verseText: string;
    readingBook: string;
    readingChapter: number;
    readingStartChapter: number;
    readingEndChapter: number;
    readingScope: ReadingScopeMode;
    readingAnchorLabel?: string;
  }) => void;
  resetSpiritualAssessment: () => void;
  exportTrailBackup: (profileName: string) => void;
  importTrailBackup: (file: File) => Promise<void>;
  servingDiscovery: ServingDiscovery | null;
  startServingDiscovery: () => void;
  saveServingProgress: (sectionIndex: number, answers: Record<string, string>) => void;
  completeServingDiscovery: (answers: Record<string, string>) => ServingSuggestion;
  dismissOnboardingChecklist: () => void;
  markOnboardingItem: (key: keyof OnboardingProgress, value?: boolean) => void;
  quickStartPassage: (book: string, chapter: number) => void;
  quickStartWithPath: (focusKey: AssessmentFocusKey) => void;
  getSuggestedPassage: () => { book: string; chapter: number; label: string; hint: string };
}

export interface JourneyLogFilters {
  dateFrom?: string;
  dateTo?: string;
  focusId?: string;
  book?: string;
  theme?: GrowthTheme;
}

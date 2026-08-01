export type ContentPackKind =
  | 'foundation'
  | 'formation'
  | 'season'
  | 'scripture'
  | 'workouts'
  | 'prompts'
  | 'coaching'
  | 'nutrition'
  | 'safety'
  | 'expansion';

export type PublicationStatus = 'draft' | 'review' | 'published' | 'yanked';
export type ReviewStatus = 'unreviewed' | 'theologically_reviewed' | 'legal_reviewed';

export interface ContentPackManifest {
  packId: string;
  version: string;
  schemaVersion: string;
  kind: ContentPackKind;
  locale: string;
  publicationStatus: PublicationStatus;
  translationDependencies: string[];
  contentOwner: string;
  reviewStatus: ReviewStatus;
  checksumSha256: string;
  minAppVersion: string;
  releaseNotes: string;
  entries: Array<{ path: string; type: string }>;
}

export interface FocusEntry {
  id: string;
  displayName: string;
  summary: string;
  fruitTag: string;
  lifePressureAffinity: string[];
  weekCopy: Record<string, { title: string; body: string }>;
}

export interface AssignmentEntry {
  id: string;
  focusKey: string;
  stageKeys: string[];
  contextTags: string[];
  prompt: string;
  successSignal: string;
  avoid: string;
}

export interface PromptEntry {
  id: string;
  stage: 'morning' | 'midday' | 'evening';
  slot: string;
  text: string;
  focusKeys: string[];
}

export interface TeachingEntry {
  id: string;
  lens: 'jesus_primary';
  title: string;
  summary: string;
  primaryReferenceId: string;
  supportingReferenceIds: string[];
  application: string;
}

export interface ScriptureReferenceEntry {
  referenceId: string;
  bookCode: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  canonicalLabel: string;
}

export interface ScriptureTextEntry {
  referenceId: string;
  translationId: string;
  textBody: string;
  attribution: string;
}

export interface WorkoutTemplateEntry {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'recovery';
  daysPerWeek: number;
  sessions: Array<{
    id: string;
    title: string;
    sessionKind: 'strength' | 'mobility' | 'walk' | 'recovery';
    dayIndex: number;
    blocks: Array<{
      name: string;
      items: Array<{
        exerciseId: string;
        sets: number;
        reps: string;
        rpe?: number;
        restSec?: number;
      }>;
    }>;
  }>;
}

export interface ExerciseEntry {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string[];
  contraindications: string[];
}

export interface CoachingMessageEntry {
  id: string;
  intent: string;
  situation: string[];
  tone: string;
  template: string;
}

export interface NutritionEntry {
  id: string;
  guidance: string;
  proteinHeuristic: string;
  hydrationHeuristic: string;
}

export interface SafetyEntry {
  id: string;
  crisisResources: Array<{ label: string; contact: string }>;
  medicalDeferral: string;
}

export interface FoundationPackData {
  foci: FocusEntry[];
  assignments: AssignmentEntry[];
  prompts: PromptEntry[];
  teachings: TeachingEntry[];
  scriptureReferences: ScriptureReferenceEntry[];
  scriptureTexts: ScriptureTextEntry[];
  workouts: { templates: WorkoutTemplateEntry[]; exercises: ExerciseEntry[] };
  coachingMessages: CoachingMessageEntry[];
  nutrition: NutritionEntry[];
  safety: SafetyEntry[];
}

/** Season pack — six-week formation content (see content/schemas/season-pack.schema.json) */
export interface SeasonMeta {
  id: string;
  title: string;
  theme: string;
  primaryFocusKey: string;
  secondaryFocusKey: string;
  physicalTemplateId: string;
  weekCount: number;
  reassessmentWeekIndex: number;
  graceDays: number;
  summary: string;
}

export interface SeasonWeekEntry {
  weekIndex: number;
  stageKey: string;
  theme: string;
  intent: string;
}

export interface MorningVariantEntry {
  id: string;
  mode: 'full' | 'short' | 'two_minute';
  teachingId: string;
  primaryReferenceId: string;
  supportingReferenceIds?: string[];
  explanation?: string;
  intentionPromptId: string;
  bodyAction: {
    kind: 'workout_ref' | 'mobility' | 'walk' | 'breath_stand';
    summary: string;
    workoutSessionId?: string;
    recoveryDayId?: string;
  };
  prayerPromptId: string;
}

export interface SeasonDayEntry {
  dayKey: string;
  weekIndex: number;
  dayInWeek: number;
  morningVariantIds: {
    full: string;
    short: string;
    two_minute: string;
  };
  assignmentId: string;
  eveningPromptIds: string[];
  middayPromptId?: string;
  sessionType: 'workout' | 'recovery' | 'rest_walk';
  workoutSessionId?: string | null;
  recoveryDayId?: string | null;
  coachIntentKeys: string[];
  optionalJournalPromptId?: string;
}

export interface CoachIntentEntry {
  intentKey: string;
  groundingReferenceIds: string[];
  jesusTeachingId: string;
  supportingReferenceIds?: string[];
  template: string;
  priorityLens: 'jesus_primary';
  situation?: string[];
}

export interface RecoveryDayEntry {
  id: string;
  title: string;
  mobilityNotes: string;
  walkMinutes: number;
  recoveryPromptId: string;
}

export interface SeasonPackData {
  season: SeasonMeta;
  weeks: SeasonWeekEntry[];
  days: SeasonDayEntry[];
  morningVariants: MorningVariantEntry[];
  teachings: TeachingEntry[];
  scriptureReferences: ScriptureReferenceEntry[];
  scriptureTexts: ScriptureTextEntry[];
  assignments: AssignmentEntry[];
  prompts: PromptEntry[];
  coachIntents: CoachIntentEntry[];
  workouts: { templates: WorkoutTemplateEntry[]; exercises: ExerciseEntry[] };
  recoveryDays: RecoveryDayEntry[];
}

export interface InstalledContentPack {
  manifest: ContentPackManifest;
  data: FoundationPackData;
  source: 'bundled' | 'remote';
  installedAt: string;
}

export interface InstalledSeasonPack {
  manifest: ContentPackManifest;
  data: SeasonPackData;
  source: 'bundled' | 'remote';
  installedAt: string;
}

export interface DailyContentSnapshot {
  packId: string;
  packVersion: string;
  focusKey: string;
  stageKey: string;
  morningMode: 'full' | 'short' | 'two_minute';
  teachingId: string;
  referenceId: string;
  assignmentId: string;
  workoutTemplateId: string;
  workoutSessionId: string;
  promptIds: string[];
  meta: { source: 'bundled' | 'offline_local' | 'remote'; resolvedAt: string };
}

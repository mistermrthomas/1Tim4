import type {
  AppData,
  DailyEntry,
  LessonLearned,
  LiveEntry,
  PrayerRequest,
  PrepareEntry,
  QuestionResponse,
  ReadingLogEntry,
  ReflectEntry,
} from '../types';
import { getTrailRevisionTime } from './trailRevision';

function mergeResponses(local: QuestionResponse[], cloud: QuestionResponse[]): QuestionResponse[] {
  const byId = new Map<string, QuestionResponse>();
  for (const r of cloud) byId.set(r.questionId, r);
  for (const r of local) {
    const existing = byId.get(r.questionId);
    if (!existing || r.answer.trim().length >= existing.answer.trim().length) {
      byId.set(r.questionId, r);
    }
  }
  return [...byId.values()];
}

function pickLaterStage<T extends { completedAt: string }>(
  local?: T,
  cloud?: T,
): T | undefined {
  if (!local) return cloud;
  if (!cloud) return local;
  return Date.parse(local.completedAt) >= Date.parse(cloud.completedAt) ? local : cloud;
}

function mergePrepare(local?: PrepareEntry, cloud?: PrepareEntry): PrepareEntry | undefined {
  if (!local) return cloud;
  if (!cloud) return local;
  const picked = pickLaterStage(local, cloud)!;
  return {
    ...picked,
    notes: local.notes.trim().length >= cloud.notes.trim().length ? local.notes : cloud.notes,
    responses: mergeResponses(local.responses, cloud.responses),
  };
}

function mergeLive(local?: LiveEntry, cloud?: LiveEntry): LiveEntry | undefined {
  const picked = pickLaterStage(local, cloud);
  if (!local || !cloud) return picked;
  return {
    ...picked!,
    responses: mergeResponses(local.responses, cloud.responses),
  };
}

function mergeReflect(local?: ReflectEntry, cloud?: ReflectEntry): ReflectEntry | undefined {
  const picked = pickLaterStage(local, cloud);
  if (!local || !cloud) return picked;
  return {
    ...picked!,
    responses: mergeResponses(local.responses, cloud.responses),
    lessonIds: [...new Set([...local.lessonIds, ...cloud.lessonIds])],
  };
}

function mergeDailyEntry(local: DailyEntry, cloud: DailyEntry): DailyEntry {
  return {
    date: local.date || cloud.date,
    prepare: mergePrepare(local.prepare, cloud.prepare),
    live: mergeLive(local.live, cloud.live),
    reflect: mergeReflect(local.reflect, cloud.reflect),
  };
}

function unionById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of cloud) map.set(item.id, item);
  for (const item of local) map.set(item.id, item);
  return [...map.values()];
}

/** Combine two trails without dropping journal entries from either side. */
export function mergeAppData(local: AppData, cloud: AppData): AppData {
  const localNewer = getTrailRevisionTime(local) >= getTrailRevisionTime(cloud);
  const base = structuredClone(localNewer ? local : cloud);
  const other = localNewer ? cloud : local;

  const dailyEntries = { ...base.dailyEntries };
  for (const [date, otherEntry] of Object.entries(other.dailyEntries)) {
    const baseEntry = dailyEntries[date];
    if (!baseEntry) {
      dailyEntries[date] = otherEntry;
    } else {
      dailyEntries[date] = mergeDailyEntry(
        localNewer ? baseEntry : otherEntry,
        localNewer ? otherEntry : baseEntry,
      );
    }
  }

  return {
    ...base,
    dailyEntries,
    prayers: unionById(local.prayers, cloud.prayers) as PrayerRequest[],
    lessonsLearned: unionById(local.lessonsLearned, cloud.lessonsLearned) as LessonLearned[],
    readingLog: unionById(local.readingLog, cloud.readingLog) as ReadingLogEntry[],
    trainingFocus: base.trainingFocus ?? other.trainingFocus,
    trainingVerse: base.trainingVerse ?? other.trainingVerse,
    trainingFocusHistory: unionById(
      base.trainingFocusHistory,
      other.trainingFocusHistory,
    ) as AppData['trainingFocusHistory'],
    trainingVerseArchive: unionById(
      base.trainingVerseArchive,
      other.trainingVerseArchive,
    ) as AppData['trainingVerseArchive'],
    spiritualAssessment: base.spiritualAssessment ?? other.spiritualAssessment,
    servingDiscovery: base.servingDiscovery ?? other.servingDiscovery,
    onboardingProgress: {
      ...other.onboardingProgress,
      ...base.onboardingProgress,
    },
    readingPlan:
      (base.readingPlan?.currentBook?.trim() ? base.readingPlan : other.readingPlan) ??
      base.readingPlan,
    trailStartMode: base.trailStartMode ?? other.trailStartMode,
  };
}

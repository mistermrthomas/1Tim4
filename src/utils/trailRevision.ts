import type { AppData, DailyEntry } from '../types';
import { isAppDataEmpty } from '../data/emptyData';

/** Latest activity timestamp on this trail (local journal, prayers, sync marker). */
export function getTrailRevisionTime(data: AppData): number {
  let max = 0;
  if (data.cloudSyncedAt) {
    max = Math.max(max, Date.parse(data.cloudSyncedAt));
  }

  for (const entry of Object.values(data.dailyEntries)) {
    max = Math.max(max, dailyEntryRevisionTime(entry));
  }

  for (const prayer of data.prayers) {
    if (prayer.statusUpdatedAt) max = Math.max(max, Date.parse(prayer.statusUpdatedAt));
    if (prayer.createdAt) max = Math.max(max, Date.parse(prayer.createdAt));
  }

  for (const lesson of data.lessonsLearned) {
    if (lesson.createdAt) max = Math.max(max, Date.parse(lesson.createdAt));
    if (lesson.sourceDate) max = Math.max(max, Date.parse(lesson.sourceDate));
  }

  for (const log of data.readingLog) {
    if (log.date) max = Math.max(max, Date.parse(log.date));
  }

  if (data.spiritualAssessment?.completedAt) {
    max = Math.max(max, Date.parse(data.spiritualAssessment.completedAt));
  }

  return Number.isFinite(max) ? max : 0;
}

function dailyEntryRevisionTime(entry: DailyEntry): number {
  let max = 0;
  if (entry.prepare?.completedAt) max = Math.max(max, Date.parse(entry.prepare.completedAt));
  if (entry.live?.completedAt) max = Math.max(max, Date.parse(entry.live.completedAt));
  if (entry.reflect?.completedAt) max = Math.max(max, Date.parse(entry.reflect.completedAt));
  return max;
}

export function hasTrailJournalEntries(data: AppData): boolean {
  return Object.values(data.dailyEntries).some(
    (entry) => entry.prepare || entry.live || entry.reflect,
  );
}

export function hasMeaningfulTrailContent(data: AppData): boolean {
  return (
    !isAppDataEmpty(data) ||
    !!data.spiritualAssessment ||
    !!data.servingDiscovery ||
    hasTrailJournalEntries(data)
  );
}

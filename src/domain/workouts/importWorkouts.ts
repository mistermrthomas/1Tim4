/**
 * Import a workout export produced by collectWorkoutExport / serializeWorkoutExport.
 * Validates the whole file before writing. A failed read never touches localStorage.
 */

import { isWorkoutExportKey, type WorkoutExportFile } from './exportWorkouts';

/** Undo snapshot. Not a workout key, so export will not pick it up. */
export const WORKOUT_IMPORT_BACKUP_KEY = 'path-import-undo-v1';

export const WORKOUT_IMPORT_MAX_CHARS = 8_000_000;

const PRIMARY_BAGS = [
  {
    key: 'path-strength-log-v1',
    label: 'Strength',
    singular: 'entry',
    plural: 'entries',
    field: 'entries',
  },
  {
    key: 'path-walking-v1',
    label: 'Walking',
    singular: 'entry',
    plural: 'entries',
    field: 'entries',
  },
  {
    key: 'path-mobility-v1',
    label: 'Mobility',
    singular: 'entry',
    plural: 'entries',
    field: 'entries',
  },
  {
    key: 'path-body-metrics-v1',
    label: 'Body',
    singular: 'entry',
    plural: 'entries',
    field: 'entries',
  },
] as const;

const EXTRA_BAGS = [
  {
    key: 'path-physical-tracker-v1',
    label: 'Sessions',
    singular: 'session',
    plural: 'sessions',
    field: 'sessions',
  },
  {
    key: 'path-physical-plan-v1',
    label: 'Training plan',
    singular: 'template',
    plural: 'templates',
    field: 'templates',
  },
  {
    key: 'path-strength-rotation-v1',
    label: 'Strength rotation',
    singular: 'item',
    plural: 'items',
    field: '',
  },
  {
    key: 'path-strength-group-picks-v1',
    label: 'Strength group picks',
    singular: 'item',
    plural: 'items',
    field: '',
  },
  {
    key: 'path-day-completion-v1',
    label: 'Completed days',
    singular: 'day',
    plural: 'days',
    field: '*',
  },
  {
    key: 'path-training-day-status-v1',
    label: 'Training days',
    singular: 'day',
    plural: 'days',
    field: '*',
  },
] as const;

export class WorkoutImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkoutImportError';
  }
}

export interface WorkoutImportBagSummary {
  key: string;
  label: string;
  present: boolean;
  count: number | null;
  detail: string;
}

export interface WorkoutImportSummary {
  exportedAt: string;
  bags: WorkoutImportBagSummary[];
  replacedKeyCount: number;
}

interface WorkoutImportBackup {
  version: 1;
  savedAt: string;
  entries: Record<string, string | null>;
}

export function parseWorkoutExport(text: string): WorkoutExportFile {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    throw new WorkoutImportError('Paste or choose a workout export file first. Nothing was changed.');
  }
  if (trimmed.length > WORKOUT_IMPORT_MAX_CHARS) {
    throw new WorkoutImportError('That workout export is too large to import. Nothing was changed.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    throw new WorkoutImportError('That text is not valid JSON. Nothing was changed.');
  }
  return assertWorkoutExport(parsed);
}

export function summarizeWorkoutImport(file: WorkoutExportFile): WorkoutImportSummary {
  const valid = assertWorkoutExport(file);
  const bags: WorkoutImportBagSummary[] = PRIMARY_BAGS.map((bag) =>
    summarizeBag(valid.keys, bag.key, bag.label, bag.singular, bag.plural, bag.field, true),
  );

  const seen = new Set<string>(PRIMARY_BAGS.map((bag) => bag.key));
  for (const bag of EXTRA_BAGS) {
    seen.add(bag.key);
    if (!Object.prototype.hasOwnProperty.call(valid.keys, bag.key)) continue;
    bags.push(summarizeBag(valid.keys, bag.key, bag.label, bag.singular, bag.plural, bag.field, false));
  }

  const extras = Object.keys(valid.keys)
    .filter((key) => !seen.has(key))
    .sort();
  for (const key of extras) {
    bags.push(summarizeBag(valid.keys, key, labelForKey(key), 'item', 'items', '', false));
  }

  return {
    exportedAt: valid.exportedAt,
    bags,
    replacedKeyCount: Object.keys(valid.keys).length,
  };
}

/**
 * Replace workout keys from a validated export.
 * Writes an undo snapshot first. Keys absent from the file are left alone.
 * An empty export writes nothing.
 */
export function applyWorkoutImport(file: WorkoutExportFile, now: Date = new Date()): void {
  const valid = assertWorkoutExport(file);
  const names = Object.keys(valid.keys);
  if (names.length === 0) return;

  const entries: Record<string, string | null> = {};
  for (const key of names) {
    entries[key] = readRaw(key);
  }
  const backup: WorkoutImportBackup = {
    version: 1,
    savedAt: now.toISOString(),
    entries,
  };
  try {
    localStorage.setItem(WORKOUT_IMPORT_BACKUP_KEY, JSON.stringify(backup));
  } catch {
    throw new WorkoutImportError(
      'Could not back up the workouts already on this device, so nothing was imported.',
    );
  }

  try {
    for (const key of names) {
      localStorage.setItem(key, encodeStoredValue(valid.keys[key]));
    }
  } catch {
    throw new WorkoutImportError(
      'Could not finish saving the import. Restore previous workouts to undo what was written.',
    );
  }
}

export function hasWorkoutImportBackup(): boolean {
  return readBackup() !== null;
}

/** Put back the workout values saved just before the last import. */
export function restoreWorkoutImportBackup(): void {
  const backup = readBackup();
  if (!backup) {
    throw new WorkoutImportError('There is no previous workout backup to restore.');
  }
  for (const [key, raw] of Object.entries(backup.entries)) {
    if (raw == null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
  }
  localStorage.removeItem(WORKOUT_IMPORT_BACKUP_KEY);
}

/** Values export parsed from JSON are written back with JSON.stringify. Raw non-JSON strings stay raw. */
export function encodeStoredValue(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function summarizeBag(
  keys: Record<string, unknown>,
  key: string,
  label: string,
  singular: string,
  plural: string,
  field: string,
  always: boolean,
): WorkoutImportBagSummary {
  const present = Object.prototype.hasOwnProperty.call(keys, key);
  if (!present) {
    return {
      key,
      label,
      present: false,
      count: null,
      detail: always ? 'Not in this file — left as it is' : 'Included',
    };
  }
  const count = countField(keys[key], field);
  return {
    key,
    label,
    present: true,
    count,
    detail: count == null ? 'Included' : `${count} ${count === 1 ? singular : plural}`,
  };
}

function countField(value: unknown, field: string): number | null {
  if (!field) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (field === '*') return Object.keys(record).length;
  const list = record[field];
  return Array.isArray(list) ? list.length : null;
}

function labelForKey(key: string): string {
  return key
    .replace(/^path-/, '')
    .replace(/-v\d+$/, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function assertWorkoutExport(value: unknown): WorkoutExportFile {
  if (!isPlainObject(value)) {
    throw new WorkoutImportError('That file is not a Path workout export. Nothing was changed.');
  }
  const exportedAt = value.exportedAt;
  const appVersion = value.appVersion;
  const keys = value.keys;
  if (typeof exportedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(exportedAt)) {
    throw new WorkoutImportError('That file is not a Path workout export. Nothing was changed.');
  }
  if (typeof appVersion !== 'string' || appVersion.trim() === '' || appVersion.length > 40) {
    throw new WorkoutImportError('That file is not a Path workout export. Nothing was changed.');
  }
  if (!isPlainObject(keys)) {
    throw new WorkoutImportError('That file is not a Path workout export. Nothing was changed.');
  }

  const safe = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(keys)) {
    if (!isWorkoutExportKey(key)) {
      throw new WorkoutImportError(
        `That file includes "${key}", which is not workout history. Nothing was changed.`,
      );
    }
    safe[key] = keys[key];
  }

  return {
    exportedAt,
    appVersion,
    keys: safe,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readBackup(): WorkoutImportBackup | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(WORKOUT_IMPORT_BACKUP_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isBackup(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isBackup(value: unknown): value is WorkoutImportBackup {
  if (!isPlainObject(value)) return false;
  if (value.version !== 1 || typeof value.savedAt !== 'string') return false;
  if (!isPlainObject(value.entries)) return false;
  for (const [key, raw] of Object.entries(value.entries)) {
    if (!isWorkoutExportKey(key)) return false;
    if (raw !== null && typeof raw !== 'string') return false;
  }
  return true;
}

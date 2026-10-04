/**
 * Read-only export of workout history stored in this browser.
 * Never writes, clears, or migrates localStorage.
 */

export const WORKOUT_EXPORT_APP_VERSION = '0.0.0';

/** Named stores to include whenever they exist. */
export const WORKOUT_EXPORT_KEYS = [
  'path-strength-log-v1',
  'path-physical-tracker-v1',
  'path-walking-v1',
  'path-mobility-v1',
  'path-body-metrics-v1',
] as const;

/**
 * Other path-* keys that belong with workout history:
 * strength (including rotation and group picks), physical plan/tracker,
 * walking, mobility, day completion, strength-calendar day status, and body.
 */
const RELATED_WORKOUT_KEY =
  /(?:^|[-_])(?:strength|walking|mobility|rotation|body)(?:[-_]|$)|physical[-_](?:plan|tracker)|day[-_]completion|training[-_]day[-_]status/i;

export interface WorkoutExportFile {
  exportedAt: string;
  appVersion: string;
  keys: Record<string, unknown>;
}

export type WorkoutExportDelivery = 'shared' | 'downloaded' | 'copied' | 'cancelled';

export function isWorkoutExportKey(key: string): boolean {
  if ((WORKOUT_EXPORT_KEYS as readonly string[]).includes(key)) return true;
  return key.startsWith('path-') && RELATED_WORKOUT_KEY.test(key);
}

export function collectWorkoutExport(now: Date = new Date()): WorkoutExportFile {
  const keys: Record<string, unknown> = {};
  const included = new Set<string>();

  const add = (key: string) => {
    if (included.has(key) || !isWorkoutExportKey(key)) return;
    included.add(key);
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return;
    }
    if (raw == null) return;
    keys[key] = parseStoredValue(raw);
  };

  for (const key of WORKOUT_EXPORT_KEYS) add(key);
  for (const key of listStorageKeys()) add(key);

  return {
    exportedAt: now.toISOString(),
    appVersion: WORKOUT_EXPORT_APP_VERSION,
    keys,
  };
}

export function workoutExportFilename(exportedAt: string): string {
  const date = /^\d{4}-\d{2}-\d{2}/.test(exportedAt) ? exportedAt.slice(0, 10) : 'export';
  return `path-workouts-${date}.json`;
}

export function serializeWorkoutExport(file: WorkoutExportFile): string {
  return JSON.stringify(file, null, 2);
}

/**
 * iPhone Safari and home-screen web apps: share a File when the browser allows it.
 * Otherwise download the JSON. Copy to the clipboard only if both of those fail.
 * A dismissed share sheet does not fall through to a download.
 */
export async function deliverWorkoutExport(
  file: WorkoutExportFile,
): Promise<WorkoutExportDelivery> {
  const json = serializeWorkoutExport(file);
  const filename = workoutExportFilename(file.exportedAt);
  const shareFile = new File([json], filename, { type: 'application/json' });

  const shared = await tryShareFile(shareFile);
  if (shared === 'shared' || shared === 'cancelled') return shared;
  if (tryDownload(json, filename)) return 'downloaded';
  await copyJson(json);
  return 'copied';
}

function parseStoredValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function listStorageKeys(): string[] {
  try {
    const storage = localStorage;
    if (typeof storage.length !== 'number' || typeof storage.key !== 'function') return [];
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

function isShareCancel(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function tryShareFile(file: File): Promise<'shared' | 'cancelled' | 'unavailable'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unavailable';
  }
  const data: ShareData = { files: [file], title: 'Path workouts' };
  if (typeof navigator.canShare === 'function') {
    try {
      if (!navigator.canShare(data)) return 'unavailable';
    } catch {
      return 'unavailable';
    }
  }
  try {
    await navigator.share(data);
    return 'shared';
  } catch (error) {
    if (isShareCancel(error)) return 'cancelled';
    return 'unavailable';
  }
}

function tryDownload(json: string, filename: string): boolean {
  try {
    if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch {
    return false;
  }
}

async function copyJson(json: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Could not save or copy the workout export.');
  }
  await navigator.clipboard.writeText(json);
}

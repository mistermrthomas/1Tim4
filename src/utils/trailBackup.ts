import type { AppData } from '../types';

export const TRAIL_BACKUP_VERSION = 1;

export interface TrailBackupFile {
  pathBackupVersion: number;
  profileId: string;
  profileName: string;
  exportedAt: string;
  appData: AppData;
}

export function buildTrailBackup(
  profileId: string,
  profileName: string,
  appData: AppData,
): TrailBackupFile {
  return {
    pathBackupVersion: TRAIL_BACKUP_VERSION,
    profileId,
    profileName,
    exportedAt: new Date().toISOString(),
    appData: structuredClone(appData),
  };
}

export function serializeTrailBackup(backup: TrailBackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function parseTrailBackup(raw: string): TrailBackupFile {
  const parsed = JSON.parse(raw) as TrailBackupFile;
  if (parsed.pathBackupVersion !== TRAIL_BACKUP_VERSION) {
    throw new Error('This backup file is from an unsupported version of Path.');
  }
  if (!parsed.appData || parsed.appData.version !== 1) {
    throw new Error('Backup is missing valid trail data.');
  }
  if (!parsed.profileId || !parsed.profileName) {
    throw new Error('Backup is missing profile information.');
  }
  return parsed;
}

export function downloadTrailBackup(backup: TrailBackupFile): void {
  const blob = new Blob([serializeTrailBackup(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = backup.exportedAt.slice(0, 10);
  const safeName = backup.profileName.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'trail';
  anchor.href = url;
  anchor.download = `path-${safeName}-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

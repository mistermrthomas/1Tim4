import type { AppData } from '../types';
import type { UserProfile } from '../types';
import { isAppDataEmpty } from '../data/emptyData';
import { normalizeAppData } from '../storage/normalizeAppData';
import { mergeAppData } from '../utils/mergeAppData';
import { getTrailRevisionTime, hasMeaningfulTrailContent } from '../utils/trailRevision';
import { supabase } from '../lib/supabase';
import { ensureProfileInRegistry, listProfiles } from '../storage/profiles';
import { getAppMode, loadAppData, saveAppData, setAppMode, type AppMode } from '../storage/storage';

export interface CloudTrailRow {
  profile_id: string;
  profile_name: string;
  app_data: AppData;
  app_mode: AppMode;
  updated_at: string;
}

const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingPush = new Map<
  string,
  {
    userId: string;
    profileId: string;
    profileName: string;
    getData: () => AppData;
    getMode: () => AppMode;
  }
>();

export async function fetchCloudTrails(userId: string): Promise<CloudTrailRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('path_profile_trails')
    .select('profile_id, profile_name, app_data, app_mode, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CloudTrailRow[];
}

export async function pushCloudTrail(
  userId: string,
  profileId: string,
  profileName: string,
  appData: AppData,
  appMode: AppMode,
): Promise<string> {
  if (!supabase) return new Date().toISOString();

  const now = new Date().toISOString();
  const payload: AppData = {
    ...appData,
    cloudSyncedAt: now,
  };

  const { data, error } = await supabase
    .from('path_profile_trails')
    .upsert(
      {
        user_id: userId,
        profile_id: profileId,
        profile_name: profileName,
        app_data: payload,
        app_mode: appMode,
        updated_at: now,
      },
      { onConflict: 'user_id,profile_id' },
    )
    .select('updated_at')
    .single();

  if (error) throw error;
  saveAppData(profileId, payload);
  return (data?.updated_at as string) ?? now;
}

/**
 * Never replace a journal that exists on-device with an empty or older cloud snapshot.
 */
function shouldReplaceLocalWithCloud(
  local: AppData,
  cloud: AppData,
  cloudUpdatedAt: string,
): boolean {
  const localHasContent = hasMeaningfulTrailContent(local);
  const cloudHasContent = hasMeaningfulTrailContent(cloud);

  if (localHasContent && !cloudHasContent) return false;
  if (!localHasContent && cloudHasContent) return true;

  const localRev = getTrailRevisionTime(local);
  const cloudRev = Date.parse(cloudUpdatedAt);
  return cloudRev > localRev;
}

function resolveSyncedData(
  local: AppData,
  cloud: AppData,
  cloudUpdatedAt: string,
): AppData {
  const localHasContent = hasMeaningfulTrailContent(local);
  const cloudHasContent = hasMeaningfulTrailContent(cloud);

  if (localHasContent && cloudHasContent) {
    return {
      ...mergeAppData(local, cloud),
      cloudSyncedAt: cloudUpdatedAt,
    };
  }

  if (localHasContent && !cloudHasContent) {
    return local;
  }

  return {
    ...cloud,
    cloudSyncedAt: cloudUpdatedAt,
  };
}

function hasTrailContent(data: AppData): boolean {
  return hasMeaningfulTrailContent(data);
}

/** Two-way sync on sign-in: merge cloud ↔ local per profile. */
export async function syncUserTrailsOnLogin(
  userId: string,
  localProfiles: UserProfile[],
  activeProfileId: string | null,
): Promise<{ activeProfileReloaded: boolean }> {
  const cloudRows = await fetchCloudTrails(userId);
  const cloudById = new Map(cloudRows.map((r) => [r.profile_id, r]));
  let activeProfileReloaded = false;

  for (const row of cloudRows) {
    ensureProfileInRegistry(row.profile_id, row.profile_name);
    const local = loadAppData(row.profile_id);
    const cloud = normalizeAppData(row.app_data);

    if (!shouldReplaceLocalWithCloud(local, cloud, row.updated_at)) {
      if (hasTrailContent(local)) {
        const mode = getAppMode(row.profile_id) ?? (isAppDataEmpty(local) ? 'new' : 'live');
        await pushCloudTrail(userId, row.profile_id, row.profile_name, local, mode);
      }
      continue;
    }

    const merged = resolveSyncedData(local, cloud, row.updated_at);
    saveAppData(row.profile_id, merged);
    setAppMode(row.profile_id, row.app_mode);
    if (row.profile_id === activeProfileId) activeProfileReloaded = true;
  }

  const allProfiles = listProfiles();
  for (const profile of allProfiles) {
    const local = loadAppData(profile.id);
    if (!hasTrailContent(local)) continue;

    const cloud = cloudById.get(profile.id);
    if (!cloud || !shouldReplaceLocalWithCloud(local, cloud.app_data, cloud.updated_at)) {
      const mode = getAppMode(profile.id) ?? (isAppDataEmpty(local) ? 'new' : 'live');
      await pushCloudTrail(userId, profile.id, profile.name, local, mode);
    }
  }

  for (const profile of localProfiles) {
    if (!cloudById.has(profile.id) && hasTrailContent(loadAppData(profile.id))) {
      const local = loadAppData(profile.id);
      const mode = getAppMode(profile.id) ?? 'live';
      await pushCloudTrail(userId, profile.id, profile.name, local, mode);
    }
  }

  return { activeProfileReloaded };
}

export function scheduleCloudTrailPush(
  userId: string,
  profileId: string,
  profileName: string,
  getData: () => AppData,
  getMode: () => AppMode,
  onSynced?: (at: string) => void,
  onError?: (message: string) => void,
): void {
  if (!supabase) return;

  pendingPush.set(profileId, { userId, profileId, profileName, getData, getMode });

  const existing = syncTimers.get(profileId);
  if (existing) clearTimeout(existing);

  syncTimers.set(
    profileId,
    setTimeout(() => {
      void (async () => {
        const pending = pendingPush.get(profileId);
        if (!pending) return;
        try {
          const at = await pushCloudTrail(
            pending.userId,
            pending.profileId,
            pending.profileName,
            pending.getData(),
            pending.getMode(),
          );
          onSynced?.(at);
        } catch (err) {
          onError?.(err instanceof Error ? err.message : 'Cloud sync failed');
        }
      })();
    }, 800),
  );
}

/** Push pending changes immediately (e.g. before the tab closes). */
export function flushCloudTrailPush(profileId: string): void {
  const t = syncTimers.get(profileId);
  if (t) clearTimeout(t);
  syncTimers.delete(profileId);

  const pending = pendingPush.get(profileId);
  if (!pending || !supabase) return;

  void pushCloudTrail(
    pending.userId,
    pending.profileId,
    pending.profileName,
    pending.getData(),
    pending.getMode(),
  );
  pendingPush.delete(profileId);
}

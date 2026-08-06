import { hasMeaningfulWeeklyPlan } from '../domain/weeklyPlan/meaningful';
import {
  getActiveWeeklyPlan,
  listWeeklyPlans,
  replaceWeeklyPlanFromCloud,
  setActiveWeeklyPlanId,
} from '../domain/weeklyPlan/store';
import { normalizeWeeklyPlan, type WeeklyPlan } from '../domain/weeklyPlan/types';
import { supabase } from '../lib/supabase';
import { getActiveProfileId } from '../storage/profiles';

export type CloudWeeklyPlanRow = {
  profile_id: string;
  week_start_date: string;
  week_end_date: string;
  plan_id: string;
  status: WeeklyPlan['status'];
  payload: WeeklyPlan;
  activated_at: string | null;
  updated_at: string;
  revision: number;
};

const PENDING_KEY = 'path-weekly-plan-pending-v1';
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingPush = new Map<string, { userId: string; profileId: string; plan: WeeklyPlan }>();

type PendingMap = Record<string, true>;

function readPending(): PendingMap {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PendingMap;
  } catch {
    return {};
  }
}

function writePending(map: PendingMap): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent('path-weekly-plan-pending'));
}

export function listPendingWeeklyPlanSyncIds(): string[] {
  return Object.keys(readPending());
}

export function hasPendingWeeklyPlanSync(): boolean {
  return listPendingWeeklyPlanSyncIds().length > 0;
}

function markPending(planId: string): void {
  const next = readPending();
  next[planId] = true;
  writePending(next);
}

function clearPending(planId: string): void {
  const next = readPending();
  if (!(planId in next)) return;
  delete next[planId];
  writePending(next);
}

function timerKey(profileId: string, weekStart: string): string {
  return `${profileId}:${weekStart}`;
}

export async function fetchCloudWeeklyPlans(
  userId: string,
  profileId: string,
): Promise<CloudWeeklyPlanRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('path_weekly_plans')
    .select(
      'profile_id, week_start_date, week_end_date, plan_id, status, payload, activated_at, updated_at, revision',
    )
    .eq('user_id', userId)
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CloudWeeklyPlanRow[];
}

export async function pushCloudWeeklyPlan(
  userId: string,
  profileId: string,
  plan: WeeklyPlan,
): Promise<string> {
  if (!supabase) return plan.updatedAt;

  const normalized = normalizeWeeklyPlan(plan);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('path_weekly_plans')
    .upsert(
      {
        user_id: userId,
        profile_id: profileId,
        week_start_date: normalized.weekStartDate,
        week_end_date: normalized.weekEndDate,
        plan_id: normalized.id,
        status: normalized.status,
        payload: normalized,
        activated_at: normalized.activatedAt,
        updated_at: now,
        revision: Date.now(),
      },
      { onConflict: 'user_id,profile_id,week_start_date' },
    )
    .select('updated_at')
    .single();

  if (error) throw error;
  clearPending(normalized.id);
  return (data?.updated_at as string) ?? now;
}

/**
 * Prefer cloud when it is newer or local is empty.
 * Never replace meaningful local content with an empty cloud row.
 * Prefer newer updatedAt when both sides have content.
 */
export function shouldReplaceLocalWeeklyPlanWithCloud(
  local: WeeklyPlan | null,
  cloud: WeeklyPlan,
  cloudUpdatedAt: string,
): boolean {
  const localMeaningful = hasMeaningfulWeeklyPlan(local);
  const cloudMeaningful = hasMeaningfulWeeklyPlan(cloud);

  if (localMeaningful && !cloudMeaningful) return false;
  if (!localMeaningful && cloudMeaningful) return true;
  if (!localMeaningful && !cloudMeaningful) {
    return Date.parse(cloudUpdatedAt) > Date.parse(local?.updatedAt ?? '1970-01-01T00:00:00.000Z');
  }

  const localPending = Boolean(local && readPending()[local.id]);
  if (localPending && local) {
    // Keep local until it syncs, unless cloud is strictly newer by >2s (other device won).
    return Date.parse(cloudUpdatedAt) > Date.parse(local.updatedAt) + 2000;
  }

  return Date.parse(cloudUpdatedAt) > Date.parse(local!.updatedAt);
}

export async function syncWeeklyPlansOnLogin(
  userId: string,
  profileId = getActiveProfileId() ?? 'default',
): Promise<{ reloaded: boolean }> {
  const cloudRows = await fetchCloudWeeklyPlans(userId, profileId);
  const localPlans = await listWeeklyPlans();
  const localByWeek = new Map(localPlans.map((p) => [p.weekStartDate, p]));
  let reloaded = false;

  for (const row of cloudRows) {
    const cloudPlan = normalizeWeeklyPlan({
      ...row.payload,
      id: row.plan_id || row.payload.id,
      weekStartDate: row.week_start_date,
      weekEndDate: row.week_end_date,
      status: row.status,
      activatedAt: row.activated_at,
      updatedAt: row.updated_at,
    });
    const local = localByWeek.get(row.week_start_date) ?? null;

    if (shouldReplaceLocalWeeklyPlanWithCloud(local, cloudPlan, row.updated_at)) {
      await replaceWeeklyPlanFromCloud(cloudPlan);
      localByWeek.set(cloudPlan.weekStartDate, cloudPlan);
      reloaded = true;
    } else if (local && hasMeaningfulWeeklyPlan(local)) {
      await pushCloudWeeklyPlan(userId, profileId, local);
      clearPending(local.id);
    }
  }

  for (const local of localByWeek.values()) {
    if (!hasMeaningfulWeeklyPlan(local)) continue;
    const cloud = cloudRows.find((r) => r.week_start_date === local.weekStartDate);
    if (!cloud) {
      await pushCloudWeeklyPlan(userId, profileId, local);
      clearPending(local.id);
      continue;
    }
    if (!shouldReplaceLocalWeeklyPlanWithCloud(local, normalizeWeeklyPlan(cloud.payload), cloud.updated_at)) {
      if (Date.parse(local.updatedAt) >= Date.parse(cloud.updated_at)) {
        await pushCloudWeeklyPlan(userId, profileId, local);
        clearPending(local.id);
      }
    }
  }

  // Align active pointer from cloud statuses.
  const activeCandidates = [...localByWeek.values()]
    .filter((p) => p.status === 'active')
    .sort((a, b) => (b.activatedAt ?? b.updatedAt).localeCompare(a.activatedAt ?? a.updatedAt));
  if (activeCandidates[0]) {
    const previous = await getActiveWeeklyPlan();
    await setActiveWeeklyPlanId(activeCandidates[0].id);
    if (previous?.id !== activeCandidates[0].id) reloaded = true;
  }

  return { reloaded };
}

export function scheduleCloudWeeklyPlanPush(
  userId: string,
  profileId: string,
  plan: WeeklyPlan,
  onSynced?: (at: string) => void,
  onError?: (message: string) => void,
): void {
  if (!supabase) return;
  if (!hasMeaningfulWeeklyPlan(plan)) return;

  markPending(plan.id);
  const key = timerKey(profileId, plan.weekStartDate);
  pendingPush.set(key, { userId, profileId, plan });

  const existing = syncTimers.get(key);
  if (existing) clearTimeout(existing);

  syncTimers.set(
    key,
    setTimeout(() => {
      void (async () => {
        const pending = pendingPush.get(key);
        if (!pending) return;
        try {
          const at = await pushCloudWeeklyPlan(pending.userId, pending.profileId, pending.plan);
          pendingPush.delete(key);
          onSynced?.(at);
        } catch (err) {
          onError?.(err instanceof Error ? err.message : 'Weekly plan cloud sync failed');
        }
      })();
    }, 700),
  );
}

/** Flush pending weekly-plan pushes (e.g. before unload). */
export function flushCloudWeeklyPlanPushes(): void {
  for (const [key, pending] of pendingPush) {
    const t = syncTimers.get(key);
    if (t) clearTimeout(t);
    syncTimers.delete(key);
    void pushCloudWeeklyPlan(pending.userId, pending.profileId, pending.plan).catch(() => undefined);
    pendingPush.delete(key);
  }
}

export function notifyWeeklyPlanSaved(plan: WeeklyPlan): void {
  if (!supabase || !hasMeaningfulWeeklyPlan(plan)) return;
  void supabase.auth.getSession().then(({ data }) => {
    const userId = data.session?.user?.id;
    if (!userId) {
      markPending(plan.id);
      return;
    }
    const profileId = getActiveProfileId() ?? 'default';
    scheduleCloudWeeklyPlanPush(userId, profileId, plan);
  });
}

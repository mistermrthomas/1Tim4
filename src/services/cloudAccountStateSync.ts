import { supabase } from '../lib/supabase';
import {
  ACCOUNT_BAG_KEYS,
  isMeaningfulAccountBag,
  readAccountBagPayload,
  writeAccountBagPayloadSilent,
  type AccountBagKey,
} from './accountBags';

export type CloudAccountBagRow = {
  bag_key: AccountBagKey;
  payload: unknown;
  updated_at: string;
  revision: number;
};

export type AccountStateSyncResult = {
  reloaded: boolean;
  pulled: number;
  pushed: number;
};

const REV_KEY = 'path-account-bag-rev-v1';
const PENDING_KEY = 'path-account-bag-pending-v1';

const syncTimers = new Map<AccountBagKey, ReturnType<typeof setTimeout>>();
const pendingPush = new Map<AccountBagKey, { userId: string; bagKey: AccountBagKey }>();

type RevMap = Partial<Record<AccountBagKey, string>>;
type PendingMap = Partial<Record<AccountBagKey, true>>;

function readRevs(): RevMap {
  try {
    const raw = localStorage.getItem(REV_KEY);
    return raw ? (JSON.parse(raw) as RevMap) : {};
  } catch {
    return {};
  }
}

function writeRevs(map: RevMap): void {
  localStorage.setItem(REV_KEY, JSON.stringify(map));
}

function stampLocalRev(bagKey: AccountBagKey, at = new Date().toISOString()): string {
  const map = readRevs();
  map[bagKey] = at;
  writeRevs(map);
  return at;
}

function getLocalRev(bagKey: AccountBagKey): string | null {
  return readRevs()[bagKey] ?? null;
}

function readPending(): PendingMap {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingMap) : {};
  } catch {
    return {};
  }
}

function writePending(map: PendingMap): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent('path-account-bag-pending'));
}

function markPending(bagKey: AccountBagKey): void {
  const next = readPending();
  next[bagKey] = true;
  writePending(next);
}

function clearPending(bagKey: AccountBagKey): void {
  const next = readPending();
  if (!(bagKey in next)) return;
  delete next[bagKey];
  writePending(next);
}

export function hasPendingAccountBagSync(): boolean {
  return Object.keys(readPending()).length > 0;
}

export async function fetchCloudAccountBags(userId: string): Promise<CloudAccountBagRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('path_account_bags')
    .select('bag_key, payload, updated_at, revision')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as CloudAccountBagRow[];
}

export async function pushCloudAccountBag(
  userId: string,
  bagKey: AccountBagKey,
  payload: unknown,
): Promise<string> {
  if (!supabase) return new Date().toISOString();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('path_account_bags')
    .upsert(
      {
        user_id: userId,
        bag_key: bagKey,
        payload,
        updated_at: now,
        revision: Date.now(),
      },
      { onConflict: 'user_id,bag_key' },
    )
    .select('updated_at')
    .single();
  if (error) throw error;
  const at = (data?.updated_at as string) ?? now;
  stampLocalRev(bagKey, at);
  clearPending(bagKey);
  return at;
}

function shouldApplyCloud(args: {
  local: unknown;
  cloud: unknown;
  cloudUpdatedAt: string;
  localRev: string | null;
  bagKey: AccountBagKey;
}): boolean {
  const localMeaningful = isMeaningfulAccountBag(args.bagKey, args.local);
  const cloudMeaningful = isMeaningfulAccountBag(args.bagKey, args.cloud);

  if (localMeaningful && !cloudMeaningful) return false;
  if (!localMeaningful && cloudMeaningful) return true;
  if (!localMeaningful && !cloudMeaningful) return false;

  // Both meaningful.
  if (!args.localRev) {
    // First sync after upgrade: keep local device data (it has the workouts).
    return false;
  }
  return Date.parse(args.cloudUpdatedAt) > Date.parse(args.localRev);
}

export async function syncAccountBagsOnLogin(userId: string): Promise<AccountStateSyncResult> {
  const cloudRows = await fetchCloudAccountBags(userId);
  const cloudByKey = new Map(cloudRows.map((r) => [r.bag_key, r]));
  let reloaded = false;
  let pulled = 0;
  let pushed = 0;

  for (const bagKey of ACCOUNT_BAG_KEYS) {
    const local = readAccountBagPayload(bagKey);
    const cloud = cloudByKey.get(bagKey);
    const localRev = getLocalRev(bagKey);
    const localMeaningful = isMeaningfulAccountBag(bagKey, local);

    if (
      cloud &&
      shouldApplyCloud({
        local,
        cloud: cloud.payload,
        cloudUpdatedAt: cloud.updated_at,
        localRev,
        bagKey,
      })
    ) {
      writeAccountBagPayloadSilent(bagKey, cloud.payload);
      stampLocalRev(bagKey, cloud.updated_at);
      clearPending(bagKey);
      reloaded = true;
      pulled += 1;
      continue;
    }

    if (localMeaningful) {
      if (!cloud || !localRev || Date.parse(localRev) >= Date.parse(cloud.updated_at)) {
        await pushCloudAccountBag(userId, bagKey, local);
        pushed += 1;
      }
    }
  }

  return { reloaded, pulled, pushed };
}

export function scheduleCloudAccountBagPush(userId: string, bagKey: AccountBagKey): void {
  if (!supabase) return;
  const payload = readAccountBagPayload(bagKey);
  if (!isMeaningfulAccountBag(bagKey, payload)) return;

  stampLocalRev(bagKey);
  markPending(bagKey);
  pendingPush.set(bagKey, { userId, bagKey });

  const existing = syncTimers.get(bagKey);
  if (existing) clearTimeout(existing);

  syncTimers.set(
    bagKey,
    setTimeout(() => {
      void (async () => {
        const pending = pendingPush.get(bagKey);
        if (!pending) return;
        try {
          const latest = readAccountBagPayload(pending.bagKey);
          if (!isMeaningfulAccountBag(pending.bagKey, latest)) {
            pendingPush.delete(bagKey);
            clearPending(bagKey);
            return;
          }
          await pushCloudAccountBag(pending.userId, pending.bagKey, latest);
          pendingPush.delete(bagKey);
          window.dispatchEvent(
            new CustomEvent('path-account-bag-synced', { detail: { bagKey: pending.bagKey } }),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Account data upload failed';
          window.dispatchEvent(
            new CustomEvent('path-account-bag-sync-error', { detail: { message, bagKey } }),
          );
        }
      })();
    }, 600),
  );
}

export function flushCloudAccountBagPushes(): void {
  for (const [bagKey, pending] of pendingPush) {
    const t = syncTimers.get(bagKey);
    if (t) clearTimeout(t);
    syncTimers.delete(bagKey);
    const latest = readAccountBagPayload(pending.bagKey);
    if (latest != null) {
      void pushCloudAccountBag(pending.userId, pending.bagKey, latest).catch(() => undefined);
    }
    pendingPush.delete(bagKey);
  }
}

/** Call after any user-facing localStorage write for a bag. */
export function notifyAccountBagSaved(bagKey: AccountBagKey): void {
  if (!supabase) return;
  void supabase.auth.getSession().then(({ data }) => {
    const userId = data.session?.user?.id;
    if (!userId) {
      stampLocalRev(bagKey);
      markPending(bagKey);
      return;
    }
    scheduleCloudAccountBagPush(userId, bagKey);
  });
}

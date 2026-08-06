import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isCloudSyncConfigured, supabase } from '../lib/supabase';
import {
  flushCloudAccountBagPushes,
  syncAccountBagsOnLogin,
} from '../services/cloudAccountStateSync';
import { flushCloudTrailPush, syncUserTrailsOnLogin } from '../services/cloudTrailSync';
import {
  flushCloudWeeklyPlanPushes,
  syncWeeklyPlansOnLogin,
} from '../services/cloudWeeklyPlanSync';
import { getActiveProfileId, listProfiles } from '../storage/profiles';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'unconfigured';

export interface AuthContextValue {
  isCloudConfigured: boolean;
  user: User | null;
  session: Session | null;
  cloudSyncStatus: CloudSyncStatus;
  cloudSyncMessage: string | null;
  lastCloudSyncAt: string | null;
  /** Increments when a sync changes local data — pages can refetch without remounting. */
  cloudDataEpoch: number;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutCloud: () => Promise<void>;
  /** Quiet refresh — used on focus/online; not a user-facing Sync button. */
  refreshCloudSync: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getRedirectUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Could not load your account.';
}

function permissionHint(msg: string): boolean {
  return /permission denied|42501/i.test(msg);
}

function missingTableHint(msg: string, table: string): boolean {
  return new RegExp(`relation .*${table}.* does not exist|Could not find the table`, 'i').test(msg);
}

export function AuthProvider({
  children,
  onActiveProfileShouldReload,
}: {
  children: ReactNode;
  onActiveProfileShouldReload?: () => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(
    isCloudSyncConfigured ? 'idle' : 'unconfigured',
  );
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | null>(null);
  const [cloudDataEpoch, setCloudDataEpoch] = useState(0);

  const reloadRef = useRef(onActiveProfileShouldReload);
  reloadRef.current = onActiveProfileShouldReload;
  const syncInFlightRef = useRef(false);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const runCloudMerge = useCallback(async (userId: string) => {
    if (syncInFlightRef.current) return false;
    syncInFlightRef.current = true;
    setCloudSyncStatus('syncing');
    setCloudSyncMessage(null);
    try {
      const activeId = getActiveProfileId();
      const { activeProfileReloaded } = await syncUserTrailsOnLogin(
        userId,
        listProfiles(),
        activeId,
      );

      let weeklyReloaded = false;
      let bagsReloaded = false;
      const warnings: string[] = [];

      try {
        const weekly = await syncWeeklyPlansOnLogin(userId, activeId ?? 'default');
        weeklyReloaded = weekly.reloaded;
      } catch (weeklyErr) {
        const msg = errorMessage(weeklyErr);
        warnings.push(
          missingTableHint(msg, 'path_weekly_plans')
            ? 'Sermon weeks need the path_weekly_plans migration in Supabase.'
            : permissionHint(msg)
              ? 'Sermon weeks need database grants in Supabase.'
              : `Sermon weeks: ${msg}`,
        );
      }

      try {
        const bags = await syncAccountBagsOnLogin(userId);
        bagsReloaded = bags.reloaded;
      } catch (bagErr) {
        const msg = errorMessage(bagErr);
        warnings.push(
          missingTableHint(msg, 'path_account_bags')
            ? 'Workouts need the path_account_bags migration in Supabase.'
            : permissionHint(msg)
              ? 'Workouts need database grants in Supabase.'
              : `Training logs: ${msg}`,
        );
      }

      const at = new Date().toISOString();
      setLastCloudSyncAt(at);
      const reloaded = activeProfileReloaded || weeklyReloaded || bagsReloaded;
      if (warnings.length) {
        setCloudSyncStatus('error');
        setCloudSyncMessage(warnings.join(' '));
      } else {
        setCloudSyncStatus('synced');
        setCloudSyncMessage('Signed in — your training saves to this account automatically.');
      }

      if (reloaded) {
        setCloudDataEpoch((n) => n + 1);
        reloadRef.current?.();
        window.dispatchEvent(new CustomEvent('path-cloud-synced', { detail: { at } }));
      }
      return reloaded;
    } catch (err) {
      const msg = errorMessage(err);
      setCloudSyncStatus('error');
      setCloudSyncMessage(
        permissionHint(msg)
          ? 'Cloud access blocked by database permissions. Run the grants SQL in Supabase.'
          : msg || 'Could not load your account.',
      );
      return false;
    } finally {
      syncInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const flushAll = () => {
      flushCloudWeeklyPlanPushes();
      flushCloudAccountBagPushes();
      const activeId = getActiveProfileId();
      if (activeId) flushCloudTrailPush(activeId);
    };
    const onOnline = () => {
      const current = userRef.current;
      if (current) void runCloudMerge(current.id);
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const current = userRef.current;
      if (current) void runCloudMerge(current.id);
    };
    const onPushError = (event: Event) => {
      const message =
        event instanceof CustomEvent && typeof event.detail?.message === 'string'
          ? event.detail.message
          : 'Upload to your account failed.';
      setCloudSyncStatus('error');
      setCloudSyncMessage(
        permissionHint(message)
          ? 'Upload blocked by database permissions. Run the grants SQL in Supabase.'
          : message,
      );
    };
    window.addEventListener('pagehide', flushAll);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('path-weekly-plan-sync-error', onPushError);
    window.addEventListener('path-account-bag-sync-error', onPushError);
    return () => {
      window.removeEventListener('pagehide', flushAll);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('path-weekly-plan-sync-error', onPushError);
      window.removeEventListener('path-account-bag-sync-error', onPushError);
    };
  }, [runCloudMerge]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void runCloudMerge(data.session.user.id);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (event === 'SIGNED_IN' && nextSession?.user) {
        void runCloudMerge(nextSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCloudSyncStatus('idle');
        setCloudSyncMessage(null);
        setLastCloudSyncAt(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [runCloudMerge]);

  const signInWithOAuth = useCallback(async (provider: 'apple' | 'google') => {
    if (!supabase) {
      throw new Error('Cloud login is not configured on this deployment.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl(),
        skipBrowserRedirect: false,
      },
    });
    if (error) throw error;
  }, []);

  const signInWithApple = useCallback(() => signInWithOAuth('apple'), [signInWithOAuth]);
  const signInWithGoogle = useCallback(() => signInWithOAuth('google'), [signInWithOAuth]);

  const signOutCloud = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCloudSyncStatus('idle');
    setCloudSyncMessage(null);
  }, []);

  const refreshCloudSync = useCallback(async () => {
    if (!user) return false;
    return runCloudMerge(user.id);
  }, [user, runCloudMerge]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isCloudConfigured: isCloudSyncConfigured,
      user,
      session,
      cloudSyncStatus,
      cloudSyncMessage,
      lastCloudSyncAt,
      cloudDataEpoch,
      signInWithApple,
      signInWithGoogle,
      signOutCloud,
      refreshCloudSync,
    }),
    [
      user,
      session,
      cloudSyncStatus,
      cloudSyncMessage,
      lastCloudSyncAt,
      cloudDataEpoch,
      signInWithApple,
      signInWithGoogle,
      signOutCloud,
      refreshCloudSync,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

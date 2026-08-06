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
import { syncUserTrailsOnLogin } from '../services/cloudTrailSync';
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
  return 'Could not sync with cloud.';
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
      let weeklyWarning: string | null = null;
      try {
        const weekly = await syncWeeklyPlansOnLogin(userId, activeId ?? 'default');
        weeklyReloaded = weekly.reloaded;
      } catch (weeklyErr) {
        const msg = errorMessage(weeklyErr);
        weeklyWarning =
          /relation .*path_weekly_plans.* does not exist|Could not find the table/i.test(msg)
            ? 'Trail synced. Run the path_weekly_plans migration to sync sermons across devices.'
            : /permission denied|42501/i.test(msg)
              ? 'Trail synced. Sermon sync needs a database permission fix — run the grants SQL in Supabase.'
              : `Trail synced. Sermon sync issue: ${msg}`;
      }

      const at = new Date().toISOString();
      setLastCloudSyncAt(at);
      setCloudSyncStatus(weeklyWarning ? 'error' : 'synced');
      setCloudSyncMessage(
        weeklyWarning ??
          (weeklyReloaded || activeProfileReloaded
            ? 'Synced with your account.'
            : 'Synced with your account.'),
      );

      if (activeProfileReloaded || weeklyReloaded) {
        setCloudDataEpoch((n) => n + 1);
        reloadRef.current?.();
        window.dispatchEvent(new CustomEvent('path-cloud-synced', { detail: { at } }));
      }
      return activeProfileReloaded || weeklyReloaded;
    } catch (err) {
      const msg = errorMessage(err);
      setCloudSyncStatus('error');
      setCloudSyncMessage(
        /permission denied|42501/i.test(msg)
          ? 'Cloud sync blocked by database permissions. Run the grants SQL in Supabase, then Sync now.'
          : msg || 'Could not sync with cloud.',
      );
      return false;
    } finally {
      syncInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const onHide = () => flushCloudWeeklyPlanPushes();
    const onOnline = () => {
      const current = userRef.current;
      if (current) void runCloudMerge(current.id);
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('online', onOnline);
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
      // Avoid TOKEN_REFRESHED / INITIAL_SESSION loops — initial load uses getSession above.
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
      throw new Error('Cloud sync is not configured on this deployment.');
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

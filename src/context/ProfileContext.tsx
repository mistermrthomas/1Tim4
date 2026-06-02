import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserProfile } from '../types';
import {
  addProfile,
  clearActiveProfile,
  ensureProfilesInitialized,
  getActiveProfile,
  listProfiles,
  setActiveProfileId,
} from '../storage/profiles';

export interface ProfileContextValue {
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  selectProfile: (profileId: string) => void;
  createAndSelectProfile: (name: string) => UserProfile;
  signOutProfile: () => void;
  refreshProfiles: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    ensureProfilesInitialized();
    return listProfiles();
  });
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(() => getActiveProfile());

  const refreshProfiles = useCallback(() => {
    ensureProfilesInitialized();
    setProfiles(listProfiles());
    setActiveProfile(getActiveProfile());
  }, []);

  const selectProfile = useCallback(
    (profileId: string) => {
      setActiveProfileId(profileId);
      setActiveProfile(getActiveProfile());
    },
    [],
  );

  const createAndSelectProfile = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Profile name is required');
      const profile = addProfile(trimmed);
      setActiveProfileId(profile.id);
      setProfiles(listProfiles());
      setActiveProfile(profile);
      return profile;
    },
    [],
  );

  const signOutProfile = useCallback(() => {
    clearActiveProfile();
    setActiveProfile(null);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles,
      activeProfile,
      selectProfile,
      createAndSelectProfile,
      signOutProfile,
      refreshProfiles,
    }),
    [profiles, activeProfile, selectProfile, createAndSelectProfile, signOutProfile, refreshProfiles],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}

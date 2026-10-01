import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, Farm } from '../types';
import { getProfile } from '../api/profile';
import { isAuthenticated, getToken } from '../api/auth';
import { ApiError } from '../api/client';

export type ProfileStatus = 'idle' | 'loading' | 'success' | 'onboarding' | 'error';

interface ProfileContextType {
  profile: Profile | null;
  farms: Farm[];
  status: ProfileStatus;
  error: string | null;
  isOnboarding: boolean;
  refreshProfile: () => Promise<void>;
  updateLocalProfile: (newProfile: Profile) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [status, setStatus] = useState<ProfileStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    if (!isAuthenticated()) {
      setStatus('idle');
      setProfile(null);
      setFarms([]);
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const response = await getProfile();
      // Read profile as response.profile
      const loadedProfile = response.profile || null;
      // Read farms defensively as response.farms ?? response.profile?.farms ?? []
      const loadedFarms = (response as any).farms ?? (response.profile as any)?.farms ?? [];

      setProfile(loadedProfile);
      setFarms(Array.isArray(loadedFarms) ? loadedFarms : []);
      setStatus('success');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        // 404 Profile not found: switch to onboarding mode
        setStatus('onboarding');
        setProfile(null);
        setFarms([]);
      } else {
        setStatus('error');
        setError(err?.message || 'Failed to load profile. Please check your connection.');
      }
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const refreshProfile = useCallback(async () => {
    await fetchProfileData();
  }, [fetchProfileData]);

  const updateLocalProfile = (newProfile: Profile) => {
    setProfile(newProfile);
  };

  const value: ProfileContextType = {
    profile,
    farms,
    status,
    error,
    isOnboarding: status === 'onboarding',
    refreshProfile,
    updateLocalProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

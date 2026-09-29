'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getProfile } from '@/services/auth-api';
import type { Profile } from '@/types/auth';

interface ProfileContextValue {
  /* Null until the fetch resolves (or if it failed). */
  profile: Profile | null;
  /* True if the fetch failed — lets a page show an error rather than a
     loading state that never resolves. */
  failed: boolean;
  /* For pages that change the profile (e.g. the profile page's name edit),
     so the header/sidebar/greeting pick up the change without a refetch. */
  setProfile: (profile: Profile) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  failed: false,
  setProfile: () => {},
});

/* Fetches the signed-in member's profile once for the whole dashboard shell.
   Header, Sidebar, WelcomeHeading and every AnnouncementRow used to each
   call GET /auth/profile themselves — one request per component instance on
   every load. The dashboard layout persists across client-side navigation,
   so this runs once per page load, and a role change made in the admin
   panel still shows up on the next full load. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    getProfile(token)
      .then(setProfile)
      .catch(() => setFailed(true));
  }, []);

  return <ProfileContext.Provider value={{ profile, failed, setProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  return useContext(ProfileContext);
}

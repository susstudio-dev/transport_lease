import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useMyProfile } from '@/features/profiles/hooks';
import type { Profile } from '@/features/profiles/types';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Subscribes to Supabase auth state and mirrors the session into the store.
 * Mount once at the app root (via App.tsx).
 */
export function useAuthBootstrap(): void {
  const setSession = useAuthStore((s) => s.setSession);
  const setSessionLoaded = useAuthStore((s) => s.setSessionLoaded);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setSessionLoaded(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setSessionLoaded(true);
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setSessionLoaded, queryClient]);
}

export type UseAuthResult = {
  session: ReturnType<typeof useAuthStore.getState>['session'];
  user: ReturnType<typeof useAuthStore.getState>['session'] extends infer S
    ? S extends { user: infer U }
      ? U
      : null
    : null;
  profile: Profile | null;
  status: Status;
};

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const sessionLoaded = useAuthStore((s) => s.sessionLoaded);
  const profileQuery = useMyProfile();

  let status: Status;
  if (!sessionLoaded) {
    status = 'loading';
  } else if (!session) {
    status = 'unauthenticated';
  } else if (profileQuery.isPending) {
    status = 'loading';
  } else if (!profileQuery.data) {
    status = 'unauthenticated';
  } else {
    status = 'authenticated';
  }

  return {
    session,
    user: session?.user ?? null,
    profile: profileQuery.data ?? null,
    status,
  };
}

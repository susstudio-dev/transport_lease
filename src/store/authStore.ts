import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

/**
 * Session state. Profile is loaded via React Query (`useMyProfile`), so we
 * don't duplicate it here.
 *
 * `sessionLoaded` flips to true once the initial getSession() call resolves —
 * routes use this to distinguish "still checking" from "definitely signed out".
 */
type AuthState = {
  session: Session | null;
  sessionLoaded: boolean;
  setSession: (session: Session | null) => void;
  setSessionLoaded: (loaded: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  sessionLoaded: false,
  setSession: (session) => set({ session }),
  setSessionLoaded: (sessionLoaded) => set({ sessionLoaded }),
  reset: () => set({ session: null, sessionLoaded: true }),
}));

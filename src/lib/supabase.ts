import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';
import type { Database } from '@/types/database';

function makeClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured) {
    // Stub client used until env vars are set. Any real call will surface a
    // configuration error to the user via the global error boundary.
    return createClient<Database>('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: { persistSession: false },
    });
  }
  return createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = makeClient();

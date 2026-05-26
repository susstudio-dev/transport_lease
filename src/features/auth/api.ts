import { supabase } from '@/lib/supabase';
import type { LoginInput } from './schemas';

export async function signIn({ email, password }: LoginInput): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Verify account is active. If not, sign out immediately so no session persists.
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', data.user.id)
    .single();

  if (pErr) {
    await supabase.auth.signOut();
    throw new Error('We could not load your profile. Contact your administrator.');
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    throw new Error('Your account is deactivated. Contact your administrator.');
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

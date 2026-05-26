import { supabase } from '@/lib/supabase';
import { isRole } from '@/lib/permissions';
import type { Profile } from './types';
import type { ProfileRow } from '@/types/database';

function decodeProfile(row: ProfileRow): Profile {
  if (!isRole(row.role)) {
    throw new Error(`Profile has unknown role: ${row.role}`);
  }
  return {
    id: row.id,
    role: row.role,
    corporateId: row.corporate_id,
    fullName: row.full_name,
    phone: row.phone,
    mustChangePassword: row.must_change_password,
    isActive: row.is_active,
  };
}

/** Fetch the current user's profile row. Returns null if no session. */
export async function fetchMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (error) throw error;
  return decodeProfile(data as ProfileRow);
}

/** Clears the must_change_password flag for the current user. */
export async function markPasswordChanged(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { error } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id);

  if (error) throw error;
}

import type { PostgrestError, AuthError } from '@supabase/supabase-js';

/**
 * Map raw Supabase/Postgres errors to user-facing messages.
 * Never expose raw error text in toasts — route through here.
 */
export function mapSupabaseError(error: unknown): string {
  if (error === null || error === undefined) return 'An unknown error occurred.';

  if (isAuthError(error)) {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Email or password is incorrect.';
      case 'Email not confirmed':
        return 'Please confirm your email before signing in.';
      case 'User already registered':
        return 'An account with this email already exists.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }

  if (isPostgrestError(error)) {
    if (error.code === '23505') return 'A record with these details already exists.';
    if (error.code === '23503') return 'This action references data that no longer exists.';
    if (error.code === '23514') return 'The data does not satisfy a required rule.';
    if (error.code === '42501' || error.code === 'PGRST301') {
      return 'You do not have permission to perform this action.';
    }
    if (error.code === 'PGRST116') return 'No matching record found.';
    return 'Something went wrong. Please try again.';
  }

  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    '__isAuthError' in error &&
    (error as { __isAuthError: unknown }).__isAuthError === true
  );
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

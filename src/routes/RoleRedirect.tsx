import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { defaultLandingFor } from '@/lib/permissions';

/**
 * Renders at "/" — sends each user to their role's landing page, or to
 * /force-password-change if they still need to set a new password.
 */
export function RoleRedirect() {
  const { status, profile } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !profile) return <Navigate to="/login" replace />;
  if (profile.mustChangePassword) return <Navigate to="/force-password-change" replace />;
  return <Navigate to={defaultLandingFor(profile.role)} replace />;
}

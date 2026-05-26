import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Props = {
  /**
   * Set to true on the /force-password-change route — without it, users who
   * are mid-password-change would be redirected to it forever.
   */
  allowMustChangePassword?: boolean;
};

export function ProtectedRoute({ allowMustChangePassword = false }: Props) {
  const { status, profile } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (
    profile?.mustChangePassword &&
    !allowMustChangePassword &&
    location.pathname !== '/force-password-change'
  ) {
    return <Navigate to="/force-password-change" replace />;
  }

  return <Outlet />;
}

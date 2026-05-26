import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { defaultLandingFor, hasRole, type UserRole } from '@/lib/permissions';

type Props = {
  allow: readonly UserRole[];
};

export function RoleRoute({ allow }: Props) {
  const { profile, status } = useAuth();

  if (status === 'loading') return null;
  if (!profile) return <Navigate to="/login" replace />;
  if (!hasRole(profile.role, allow)) {
    return <Navigate to={defaultLandingFor(profile.role)} replace />;
  }
  return <Outlet />;
}

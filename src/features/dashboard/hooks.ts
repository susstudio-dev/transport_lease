import { useQuery } from '@tanstack/react-query';
import { fetchAdminKpis, fetchCorporateKpis, fetchRecentActivity } from './api';

export const dashboardKeys = {
  adminKpis: ['dashboard', 'admin-kpis'] as const,
  corporateKpis: ['dashboard', 'corporate-kpis'] as const,
  recentActivity: (limit: number) => ['dashboard', 'recent-activity', limit] as const,
};

export function useAdminKpis() {
  return useQuery({
    queryKey: dashboardKeys.adminKpis,
    queryFn: fetchAdminKpis,
    staleTime: 60_000,
  });
}

export function useCorporateKpis() {
  return useQuery({
    queryKey: dashboardKeys.corporateKpis,
    queryFn: fetchCorporateKpis,
    staleTime: 60_000,
  });
}

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(limit),
    queryFn: () => fetchRecentActivity(limit),
    staleTime: 30_000,
  });
}

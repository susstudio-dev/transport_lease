import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { fetchMyProfile, markPasswordChanged } from './api';

export const profileKeys = {
  me: (userId: string | undefined) => ['profile', 'me', userId] as const,
};

export function useMyProfile() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  return useQuery({
    queryKey: profileKeys.me(userId),
    queryFn: fetchMyProfile,
    enabled: !!userId,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useMarkPasswordChanged() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  return useMutation({
    mutationFn: markPasswordChanged,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.me(userId) });
    },
  });
}

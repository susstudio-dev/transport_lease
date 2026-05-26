import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signIn, signOut, sendPasswordReset, updatePassword } from './api';

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signIn,
    onSuccess: () => {
      // Force profile refetch so the post-login redirect has fresh data.
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useSendPasswordReset() {
  return useMutation({ mutationFn: sendPasswordReset });
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword });
}

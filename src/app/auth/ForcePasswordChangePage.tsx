import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mapSupabaseError } from '@/lib/errors';
import { defaultLandingFor } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useUpdatePassword } from '@/features/auth/hooks';
import { useMarkPasswordChanged } from '@/features/profiles/hooks';
import { forcePasswordChangeSchema, type ForcePasswordChangeInput } from '@/features/auth/schemas';
import { AuthCard } from './AuthCard';

/**
 * Forced page when profile.mustChangePassword = true (typically right after
 * super_admin creates a user). User cannot reach any other authenticated route
 * until they pick a new password — enforced in ProtectedRoute and RoleRedirect.
 */
export function ForcePasswordChangePage() {
  const { status, profile } = useAuth();
  const navigate = useNavigate();
  const updatePwd = useUpdatePassword();
  const markChanged = useMarkPasswordChanged();

  const form = useForm<ForcePasswordChangeInput>({
    resolver: zodResolver(forcePasswordChangeSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (status === 'loading') {
    return (
      <AuthCard title="One moment…">
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthCard>
    );
  }

  if (status === 'unauthenticated' || !profile) return <Navigate to="/login" replace />;
  if (!profile.mustChangePassword) {
    return <Navigate to={defaultLandingFor(profile.role)} replace />;
  }

  function onSubmit(values: ForcePasswordChangeInput) {
    updatePwd.mutate(values.password, {
      onSuccess: () => {
        markChanged.mutate(undefined, {
          onSuccess: () => {
            toast.success('Password updated.');
            if (profile) navigate(defaultLandingFor(profile.role), { replace: true });
          },
        });
      },
    });
  }

  const isPending = updatePwd.isPending || markChanged.isPending;
  const error = updatePwd.error ?? markChanged.error;

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="For security, please set a new password before continuing."
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{mapSupabaseError(error)}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>
                  At least 8 characters, with an uppercase, lowercase, and a number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useUpdatePassword } from '@/features/auth/hooks';
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schemas';
import { AuthCard } from './AuthCard';

/**
 * Lands here from the recovery email link. Supabase auto-detects the recovery
 * token in the URL (detectSessionInUrl: true on the client) and creates a
 * temporary session. We then let the user set a new password.
 */
export function ResetPasswordPage() {
  const updatePwd = useUpdatePassword();
  const navigate = useNavigate();
  const { status, session } = useAuth();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  function onSubmit(values: ResetPasswordInput) {
    updatePwd.mutate(values.password, {
      onSuccess: async () => {
        toast.success('Password updated. Please sign in.');
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      },
    });
  }

  // Recovery session is required to update password.
  if (status === 'loading') {
    return (
      <AuthCard title="Reset password">
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthCard>
    );
  }

  if (!session) {
    return (
      <AuthCard title="Reset password" subtitle="This reset link is invalid or has expired.">
        <Button className="w-full" onClick={() => navigate('/forgot-password', { replace: true })}>
          Request a new link
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password">
      {updatePwd.isError && (
        <Alert variant="destructive">
          <AlertDescription>{mapSupabaseError(updatePwd.error)}</AlertDescription>
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
          <Button type="submit" className="w-full" disabled={updatePwd.isPending}>
            {updatePwd.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}

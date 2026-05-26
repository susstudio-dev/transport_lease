import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isSupabaseConfigured } from '@/lib/env';
import { mapSupabaseError } from '@/lib/errors';
import { useAuth } from '@/hooks/useAuth';
import { useSignIn } from '@/features/auth/hooks';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { AuthCard } from './AuthCard';

export function LoginPage() {
  const { status } = useAuth();
  const location = useLocation();
  const signIn = useSignIn();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Clear server error on input change.
  useEffect(() => {
    const sub = form.watch(() => signIn.reset());
    return () => sub.unsubscribe();
  }, [form, signIn]);

  if (status === 'authenticated') {
    const from = (location.state as { from?: Location } | null)?.from?.pathname;
    return <Navigate to={from ?? '/'} replace />;
  }

  function onSubmit(values: LoginInput) {
    signIn.mutate(values);
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Fleet Leasing Portal"
      footer={
        <Link to="/forgot-password" className="text-primary hover:underline">
          Forgot your password?
        </Link>
      }
    >
      {!isSupabaseConfigured && (
        <Alert variant="warning">
          <AlertDescription>
            Supabase environment variables are not set. Update <code>.env.local</code> to enable
            authentication.
          </AlertDescription>
        </Alert>
      )}

      {signIn.isError && (
        <Alert variant="destructive">
          <AlertDescription>{mapSupabaseError(signIn.error)}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={signIn.isPending}>
            {signIn.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}

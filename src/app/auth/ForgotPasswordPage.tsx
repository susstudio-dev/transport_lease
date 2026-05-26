import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
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
import { mapSupabaseError } from '@/lib/errors';
import { useSendPasswordReset } from '@/features/auth/hooks';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/schemas';
import { AuthCard } from './AuthCard';

export function ForgotPasswordPage() {
  const sendReset = useSendPasswordReset();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  function onSubmit(values: ForgotPasswordInput) {
    sendReset.mutate(values.email);
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new password."
      footer={
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sendReset.isSuccess ? (
        <Alert variant="info">
          <AlertDescription>
            If an account exists for that email, a reset link is on its way. Check your inbox (and
            spam folder).
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {sendReset.isError && (
            <Alert variant="destructive">
              <AlertDescription>{mapSupabaseError(sendReset.error)}</AlertDescription>
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
              <Button type="submit" className="w-full" disabled={sendReset.isPending}>
                {sendReset.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          </Form>
        </>
      )}
    </AuthCard>
  );
}
